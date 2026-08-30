import { promises as fs, constants as fsConstants } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { parseMt5Log, type Mt5LogSession } from './mt5LogParser.js';
import { evaluateQualityGate, type QualityGateVerdict } from './qualityGate.js';

const DEFAULT_TERMINAL_PATH = 'C:\\Program Files\\MetaTrader 5\\terminal64.exe';
const DEFAULT_MT5_DATA_DIR = 'C:\\Users\\fadwe\\AppData\\Roaming\\MetaQuotes\\Terminal\\D0E8209F77C8CF37AD8BF550E51FF075';
const DEFAULT_MT5_TESTER_DIR = 'C:\\Users\\fadwe\\AppData\\Roaming\\MetaQuotes\\Tester\\D0E8209F77C8CF37AD8BF550E51FF075';
const BACKTEST_TIMEOUT_MS = 180_000;

export interface BacktestOptions {
  pair: string;
  timeframe: string;
  fromDate?: string;
  toDate?: string;
  deposit?: number;
  leverage?: number;
  model?: number; // 0 = every tick, 1 = 1-min OHLC
}

export interface BacktestExecutionResult {
  session: Mt5LogSession | null;
  rawLog?: string;
  passedQualityGate: boolean;
  qualityGateVerdict?: QualityGateVerdict;
  qualityNotes: string[];
  error?: string;
  /**
   * Presente cuando el backtest reveló algo corregible regenerando el código: un crash en
   * runtime (p. ej. "array out of range") o un EA que corrió limpio pero nunca abrió ni una
   * operación en todo el histórico (condiciones de entrada demasiado restrictivas). A diferencia
   * de un símbolo inexistente en la cuenta o un timeout ambiguo, esto SÍ es responsabilidad del
   * código/estrategia generados, así que mql5Generator.ts lo usa para disparar el mismo bucle de
   * auto-optimización que ya existe para fallos de Quality Gate, en vez de darlo por perdido.
   */
  retriableCodeIssue?: string;
}

function normalizeSymbol(pair: string): string {
  return pair.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

const execFileAsync = promisify(execFile);

/**
 * Comprueba si ya hay una instancia del terminal de MT5 en ejecución. Es determinante: cuando
 * `terminal64.exe /config:<ini>` se lanza y YA hay un terminal abierto, Windows reenvía la
 * config a esa instancia por línea de comandos y el proceso nuevo sale al instante — pero la
 * instancia ya abierta IGNORA la sección [Tester] de una config reenviada y el backtest nunca
 * corre. El sondeo entonces agota los 180s sin encontrar nada. Confirmado en los logs del
 * terminal: una prueba de TSLA con MT5 ya abierto no dejó ni una línea de "Startup"/"Tester".
 */
export async function isTerminalRunning(terminalExe: string): Promise<boolean> {
  const exeName = path.basename(terminalExe);
  try {
    const { stdout } = await execFileAsync(
      'tasklist',
      ['/FI', `IMAGENAME eq ${exeName}`, '/NH', '/FO', 'CSV'],
      { windowsHide: true }
    );
    return stdout.toLowerCase().includes(exeName.toLowerCase());
  } catch {
    // Si tasklist no está disponible o falla, no bloqueamos — que el test lo intente.
    return false;
  }
}

async function resolveTerminalPath(): Promise<string | null> {
  const candidate = process.env.MT5_TERMINAL_PATH || DEFAULT_TERMINAL_PATH;
  try {
    await fs.access(candidate, fsConstants.F_OK);
    return candidate;
  } catch {
    return null;
  }
}

async function findRecentAgentLogs(baseDir: string, sinceDate: Date): Promise<string[]> {
  try {
    const agentDirs = await fs.readdir(baseDir, { withFileTypes: true });
    const logFiles: { path: string; mtime: Date }[] = [];

    for (const dir of agentDirs) {
      if (dir.isDirectory() && (dir.name.startsWith('Agent-') || dir.name === 'logs')) {
        const logsSubdir = dir.name === 'logs' ? path.join(baseDir, 'logs') : path.join(baseDir, dir.name, 'logs');
        try {
          const files = await fs.readdir(logsSubdir);
          for (const f of files) {
            if (f.endsWith('.log')) {
              const fullPath = path.join(logsSubdir, f);
              const stat = await fs.stat(fullPath);
              if (stat.mtime >= sinceDate) {
                logFiles.push({ path: fullPath, mtime: stat.mtime });
              }
            }
          }
        } catch {
          // ignore folder read errors
        }
      }
    }

    if (logFiles.length === 0) return [];
    logFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    return logFiles.map((log) => log.path);
  } catch {
    return [];
  }
}

function formatLogDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/** Líneas del log PRINCIPAL del terminal (`<dataDir>/logs/YYYYMMDD.log`) desde `sinceDate` en adelante. */
async function readRecentMainTerminalLines(dataDir: string, sinceDate: Date): Promise<string[]> {
  const logPath = path.join(dataDir, 'logs', `${formatLogDate(new Date())}.log`);
  const rawContent = await fs.readFile(logPath, 'utf16le');
  const content = rawContent.charCodeAt(0) === 0xfeff ? rawContent.slice(1) : rawContent;

  return content.split(/\r?\n/).filter((line) => {
    const m = line.match(/(\d{2}):(\d{2}):(\d{2})\.\d{3}/);
    if (!m) return false;
    const lineTime = new Date(sinceDate);
    lineTime.setHours(Number(m[1]), Number(m[2]), Number(m[3]), 0);
    return lineTime.getTime() >= sinceDate.getTime() - 5000;
  });
}

/**
 * Cuando el terminal no llega a lanzar el test (símbolo inexistente en la cuenta conectada,
 * .ex5 no encontrado, etc.) no se genera ningún log de agente nuevo — solo queda "tester didn't
 * start" en el log PRINCIPAL del terminal, que `findRecentAgentLogs` nunca mira porque solo revisa
 * las carpetas `Agent-N/logs`. Sin esto, ese fallo determinista (2-3s) se reportaba como "no se
 * pudo confirmar la finalización dentro del tiempo límite" — un mensaje que sugiere "puede seguir
 * corriendo, prueba más tarde" para algo que ya falló y no va a completarse nunca por mucho que se
 * espere. Confirmado reproduciendo el fallo con BTC/USD: el bróker de la cuenta MetaQuotes-Demo
 * conectada no tiene un símbolo llamado exactamente "BTCUSD".
 */
async function findTesterStartupError(dataDir: string, sinceDate: Date): Promise<string | null> {
  try {
    const recentLines = await readRecentMainTerminalLines(dataDir, sinceDate);
    if (!recentLines.some((l) => /tester didn't start/i.test(l))) return null;

    const symbolLine = recentLines.find((l) => /symbol .* not exist/i.test(l));
    const symbolMatch = symbolLine?.match(/symbol\s+(\S+)\s+not exist/i);
    if (symbolMatch) {
      return `El símbolo "${symbolMatch[1]}" no existe en la cuenta conectada al terminal — el bróker probablemente usa otro nombre para este instrumento (sufijo/prefijo distinto, p. ej. "${symbolMatch[1]}.a"). Revisa el Market Watch de MetaTrader para el nombre exacto.`;
    }
    return 'El backtest headless no llegó a arrancar en MetaTrader (revisa el log del terminal para el motivo exacto).';
  } catch {
    return null;
  }
}

/**
 * El test SÍ arranca pero el .mq5 generado crashea en runtime (p. ej. "array out of range" al
 * acceder a un buffer de indicador/precio más allá de lo copiado con CopyBuffer/CopyClose) — MT5
 * lo registra como "last test passed with result "critical runtime error ..."" en el log principal
 * del terminal en pocos segundos. A diferencia de un símbolo inexistente, esto SÍ es un bug real y
 * corregible en el código: mql5Generator.ts usa este mensaje para regenerar el EA vía el mismo
 * bucle de auto-optimización que ya existe para fallos de Quality Gate, en vez de quedarse sin
 * saber por qué el backtest nunca terminó. Confirmado reproduciendo el fallo: un EA que copiaba
 * solo 2 elementos de un buffer con CopyBuffer(..., 2, ...) pero accedía al índice [2] (un tercer
 * elemento nunca copiado) crasheaba con error 502 en 2.6s.
 */
async function findRuntimeCrashError(dataDir: string, sinceDate: Date): Promise<string | null> {
  try {
    const recentLines = await readRecentMainTerminalLines(dataDir, sinceDate);
    const crashLine = recentLines.find((l) => /critical runtime error/i.test(l));
    if (!crashLine) return null;

    const match = crashLine.match(/"([^"]*critical runtime error[^"]*)"/i);
    const detail = match ? match[1] : crashLine.trim();
    return `El EA compilado crasheó con un error crítico en tiempo de ejecución durante el backtest: ${detail}. Corrige la causa exacta (p. ej. si es "array out of range", revisa que el tamaño copiado con CopyBuffer/CopyClose cubra todos los índices que se acceden después).`;
  } catch {
    return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Los logs de MetaTrader (tanto el del terminal principal como los de Agent-N) se escriben
 * SIEMPRE en UTF-16LE con BOM, nunca en UTF-8 \u2014 confirmado en todos los logs inspeccionados
 * (agentes de tester y terminal principal). `fs.readFile(path, 'utf-8')` sobre un archivo as\u00ED
 * NO lanza excepci\u00F3n en Node: decodifica cada car\u00E1cter de 2 bytes como basura silenciosamente,
 * as\u00ED que un `try utf-8, catch \u2192 utf16le` nunca cae al fallback correcto. Esto hac\u00EDa que
 * `/final balance/i.test(content)` no encontrara NUNCA la marca de finalizaci\u00F3n, ni siquiera en
 * backtests que s\u00ED terminaron bien en MetaTrader \u2014 cada test se reportaba como "no se pudo
 * confirmar la finalizaci\u00F3n" tras agotar los 180s, sin importar el resultado real. Confirmado
 * reproduciendo el fallo: el mismo archivo le\u00EDdo como 'utf-8' no contiene "final balance"
 * (falso), le\u00EDdo como 'utf16le' s\u00ED (verdadero).
 */
async function readLogFileAnyEncoding(filePath: string): Promise<string> {
  try {
    const raw = await fs.readFile(filePath, 'utf16le');
    return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  } catch {
    return '';
  }
}

/**
 * El log del tester es acumulativo (todas las sesiones del día en el mismo fichero) y MT5 puede
 * reusar una instancia ya abierta por IPC. Sin correlacionar el job con su sesión, el polling
 * rompía en cuanto veía CUALQUIER línea `final balance` (incluidas las de sesiones anteriores) y
 * el Quality Gate se evaluaba sobre el backtest equivocado. La clave de correlación es el nombre
 * único del `.ex5` (lleva un nanoid por job). Si no hay balance autoritativo → null (fail closed).
 */
function findCompletedSessionForExpert(
  rawLog: string,
  expectedExpertFile: string
): Mt5LogSession | null {
  const expectedName = expectedExpertFile.toLowerCase();
  const sessions = parseMt5Log(rawLog);

  for (let i = sessions.length - 1; i >= 0; i--) {
    const candidate = sessions[i];
    const loggedName = candidate.expertFile
      ?.replace(/\\/g, '/')
      .split('/')
      .pop()
      ?.toLowerCase();

    if (loggedName === expectedName && candidate.finalBalance !== null) {
      return candidate;
    }
  }

  return null;
}

export async function runHeadlessBacktest(
  code: string,
  baseFilename: string,
  options: BacktestOptions
): Promise<BacktestExecutionResult> {
  const terminalExe = await resolveTerminalPath();
  if (!terminalExe) {
    return {
      session: null,
      passedQualityGate: false,
      qualityNotes: ['MetaTrader 5 terminal no encontrado en el entorno para simulación headless automática.'],
    };
  }

  // El backtest headless necesita arrancar SU PROPIA instancia limpia de MT5. Si ya hay una
  // abierta (p. ej. la tienes tú mirando gráficos), la config del tester que le reenviamos se
  // ignora en silencio y el sondeo agota los 180s para nada. Cortar aquí con un aviso claro.
  if (await isTerminalRunning(terminalExe)) {
    return {
      session: null,
      passedQualityGate: false,
      error: 'MetaTrader 5 ya está abierto',
      qualityNotes: [
        `MetaTrader 5 (${path.basename(terminalExe)}) ya está abierto. El backtest headless necesita arrancar su propia instancia limpia — una ya en marcha ignora la configuración del tester y la simulación nunca corre. Cierra MetaTrader 5 y vuelve a generar (o pulsa "Optimizar" para reintentar solo el backtest).`,
      ],
    };
  }

  const dataDir = process.env.MT5_DATA_DIR || DEFAULT_MT5_DATA_DIR;
  const testerDir = process.env.MT5_TESTER_DIR || DEFAULT_MT5_TESTER_DIR;
  const expertsDir = path.join(dataDir, 'MQL5', 'Experts');
  const filesDir = path.join(dataDir, 'MQL5', 'Files');

  await fs.mkdir(expertsDir, { recursive: true });
  await fs.mkdir(filesDir, { recursive: true });

  const id = nanoid(8);
  const cleanName = baseFilename.replace(/\.mq5$/i, '').replace(/[^A-Za-z0-9_]/g, '_');
  const mq5FileName = `${cleanName}_${id}.mq5`;
  const ex5FileName = `${cleanName}_${id}.ex5`;
  const mq5Path = path.join(expertsDir, mq5FileName);
  const iniPath = path.join(dataDir, `autotester_${id}.ini`);
  const reportPath = path.join(filesDir, `Report_${id}.htm`);

  // 1. Escribir y compilar en la carpeta Experts de MT5
  await fs.writeFile(mq5Path, code, 'utf-8');

  const { compileMql5 } = await import('./mql5Compiler.js');
  const compileRes = await compileMql5(code, mq5FileName);
  if (compileRes.status === 'errors') {
    return {
      session: null,
      passedQualityGate: false,
      qualityNotes: [`Fallo de compilación previo al backtest: ${compileRes.errors.join(', ')}`],
    };
  }

  // 2. Configurar el archivo INI de prueba (rango 6-12 meses recomendado por doc 20)
  const symbol = normalizeSymbol(options.pair);
  const period = options.timeframe || 'H1';
  const fromDate = options.fromDate || '2025.08.01';
  const toDate = options.toDate || '2026.08.18';
  const deposit = options.deposit ?? 10000;
  const leverage = options.leverage ?? 100;
  const model = options.model ?? 0; // 0 = Every tick based on real ticks

  const iniContent = `[Tester]
Expert=${ex5FileName}
Symbol=${symbol}
Period=${period}
Deposit=${deposit}
Currency=USD
Leverage=${leverage}
Model=${model}
ExecutionMode=0
Optimization=0
FromDate=${fromDate}
ToDate=${toDate}
ForwardMode=0
Report=${reportPath}
ReplaceReport=1
ShutdownTerminal=1
Visual=0
`;

  await fs.writeFile(iniPath, iniContent, 'utf-8');

  const startTime = new Date(Date.now() - 5000); // 5s buffer

  // 3. Ejecutar terminal64.exe /config:<iniPath>
  // Si ya había una instancia de MT5 abierta con este mismo perfil, MT5 reenvía la
  // configuración a esa instancia por IPC y este proceso vuelve casi al instante —
  // el test real sigue corriendo en segundo plano en la instancia ya abierta. Por eso
  // NO se puede usar el cierre de este proceso como señal de "test terminado": hay que
  // sondear el log del agente hasta encontrar la marca de finalización ("final balance")
  // o agotar el timeout.
  execFile(terminalExe, [`/config:${iniPath}`], { timeout: BACKTEST_TIMEOUT_MS }, (err) => {
    if (err) console.warn(`[mql5Backtester] Aviso en ejecución de terminal: ${err.message}`);
  });

  // 4. Sondear el log del agente hasta que aparezca completo, se agote el timeout, o el
  // terminal reporte que el test nunca llegó a arrancar (p. ej. símbolo inexistente en la
  // cuenta conectada) — ese último caso es determinista y ocurre en 2-3s, así que se corta
  // el sondeo de inmediato en vez de esperar los BACKTEST_TIMEOUT_MS completos para nada.
  const pollDeadline = Date.now() + BACKTEST_TIMEOUT_MS;
  const pollIntervalMs = 3000;
  let rawLog = '';
  let session: Mt5LogSession | null = null;
  let startupError: string | null = null;
  let runtimeCrashError: string | null = null;
  while (Date.now() < pollDeadline) {
    const recentLogPaths = await findRecentAgentLogs(testerDir, startTime);
    for (const logPath of recentLogPaths) {
      const content = await readLogFileAnyEncoding(logPath);
      const completedSession = findCompletedSessionForExpert(content, ex5FileName);
      if (completedSession) {
        rawLog = content;
        session = completedSession;
        break;
      }
    }
    if (session) break;

    startupError = await findTesterStartupError(dataDir, startTime);
    if (startupError) break;
    runtimeCrashError = await findRuntimeCrashError(dataDir, startTime);
    if (runtimeCrashError) break;
    await delay(pollIntervalMs);
  }

  // 5. Evaluar Quality Gate cuantitativo (Doc 20 §4)
  const qualityNotes: string[] = [];
  let passedQualityGate = false;
  let qualityGateVerdict: QualityGateVerdict | undefined;
  let zeroTradesIssue: string | undefined;

  if (!rawLog && runtimeCrashError) {
    qualityNotes.push(runtimeCrashError);
  } else if (!rawLog && startupError) {
    qualityNotes.push(startupError);
  } else if (!rawLog) {
    qualityNotes.push(
      `No se pudo confirmar la finalización del backtest headless dentro del tiempo límite (${Math.round(BACKTEST_TIMEOUT_MS / 1000)}s). Si MetaTrader ya estaba abierto, es posible que el test siga en curso en esa ventana — sube el log manualmente cuando termine.`
    );
  } else if (!session || session.deals.length === 0) {
    qualityNotes.push('El EA no ejecutó ninguna operación durante la simulación histórica.');
    zeroTradesIssue =
      'El backtest se completó sin errores pero el EA no abrió ninguna operación en todo el histórico probado (2025.08.01–2026.08.18). Las condiciones de entrada son demasiado restrictivas o nunca coinciden con el comportamiento real del precio en ese periodo — relájalas (rango de precios más amplio, menos condiciones simultáneas obligatorias) o revisa si hay un error de lógica que impide que la señal dispare nunca.';
  } else {
    qualityGateVerdict = evaluateQualityGate(session.stats);
    passedQualityGate = qualityGateVerdict.passed;

    for (const c of qualityGateVerdict.criteria) {
      qualityNotes.push(`[${c.passed ? 'PASA' : 'FALLA'}] ${c.name}: ${c.actual} (Objetivo: ${c.target})`);
    }

    if (qualityGateVerdict.recommendedAction && qualityGateVerdict.recommendedAction !== 'approve') {
      qualityNotes.push(`Acción correctiva sugerida: ${qualityGateVerdict.recommendedAction}`);
    }
  }

  // Limpieza de archivos temporales
  await Promise.all([
    fs.unlink(iniPath).catch(() => {}),
    fs.unlink(mq5Path).catch(() => {}),
  ]);

  return {
    session,
    rawLog: rawLog ? rawLog.slice(-5000) : undefined,
    passedQualityGate,
    qualityGateVerdict,
    qualityNotes,
    retriableCodeIssue: runtimeCrashError ?? zeroTradesIssue ?? undefined,
  };
}
