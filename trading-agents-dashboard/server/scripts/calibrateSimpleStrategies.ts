/**
 * Script de calibración y prueba en vivo de las 3 estrategias simples:
 * - FOREX (EUR/USD)
 * - ACCIONES (TSLA)
 * - CRIPTOMONEDAS (BTC/USD)
 *
 * Ejecuta en vivo con OmniRoute auto/best-coding, valida contratos y compila en MetaEditor.
 */
import { cloneBaselinePresets } from '../src/config/baselinePresets.js';
import { executeRun } from '../src/engine/orchestrator.js';
import { validateStrategyProposal } from '../src/engine/strategyValidator.js';
import { generateMql5 } from '../src/engine/mql5Generator.js';
import { validateMql5SourceRun } from '../src/engine/mql5Eligibility.js';
import { hashConfiguration } from '../src/config/configValidation.js';
import type { AgentConfigPreset, Run, StrategyProposalLite } from '../src/types.js';

const SNAPSHOTS: Record<string, string> = {
  'EUR/USD': `=== SNAPSHOT DE MERCADO REAL (EUR/USD · H1) ===
Sesión determinista: FX_LONDON_OPEN
Precio Actual (Cierre): 1.08550 | Apertura: 1.08480 | Máx: 1.08620 | Mín: 1.08420
Medias Móviles: EMA(20): 1.08450 | EMA(50): 1.08300 | SMA(200): 1.07900
RSI(14): 58.4 | MACD(12,26,9): 0.00045 | Señal: 0.00030 | Histograma: 0.00015
ATR (14 periodos / Volatilidad): 0.00120
Volumen OHLCV: último 1850 | media20 1400 | ratio 1.32x`,

  TSLA: `=== SNAPSHOT DE MERCADO REAL (TSLA · H1) ===
Sesión determinista: US_REGULAR_OPEN
Precio Actual (Cierre): 245.50 | Apertura: 242.00 | Máx: 247.20 | Mín: 241.50
Medias Móviles: EMA(20): 241.80 | EMA(50): 238.50 | SMA(200): 225.00
RSI(14): 62.1 | MACD(12,26,9): 1.85 | Señal: 1.20 | Histograma: 0.65
ATR (14 periodos / Volatilidad): 4.50
Volumen OHLCV: último 2800000 | media20 2100000 | ratio 1.33x
Gap vs cierre anterior: +1.50 (+0.62%)`,

  'BTC/USD': `=== SNAPSHOT DE MERCADO REAL (BTC/USD · H1) ===
Sesión determinista: 24x7
Precio Actual (Cierre): 64200 | Apertura: 63800 | Máx: 64600 | Mín: 63500
Medias Móviles: EMA(20): 63500 | EMA(50): 62400 | SMA(200): 59800
RSI(14): 61.5 | MACD(12,26,9): 420.0 | Señal: 310.0 | Histograma: 110.0
ATR (14 periodos / Volatilidad): 950.0
Volumen OHLCV: último 450 | media20 320 | ratio 1.41x`,
};

async function testPreset(preset: AgentConfigPreset) {
  console.log(`\n============================================================`);
  console.log(`TEST PRESET: ${preset.name} (${preset.id})`);
  console.log(`Activo: ${preset.referenceAsset} | TF: ${preset.defaultTimeframe}`);
  console.log(`Agentes (${preset.agents.length}): ${preset.agents.map((a) => a.id).join(' -> ')}`);
  console.log(`============================================================`);

  const snapshot = SNAPSHOTS[preset.referenceAsset];
  const run: Run = {
    id: `calib-${preset.key.toLowerCase()}-${Date.now()}`,
    pair: preset.referenceAsset,
    timeframe: preset.defaultTimeframe,
    status: 'running',
    createdAt: new Date().toISOString(),
    results: preset.agents.map((a) => ({ agentId: a.id, status: 'waiting' })),
    configuration: structuredClone(preset),
    configurationHash: hashConfiguration(preset),
    executionMode: 'real',
    marketSnapshot: snapshot,
    issues: [],
    retryCount: 0,
    maxRetries: 2,
  };

  console.log(`\n[1/3] Ejecutando orquestador en modo 'real' con OmniRoute...`);
  const t0 = Date.now();
  await executeRun(run, preset.agents);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`Ejecución terminada en ${elapsed}s. Estado: ${run.status} | FinalState: ${run.finalState}`);

  for (const res of run.results) {
    console.log(`\n--- Agente: ${res.agentId} (${res.status}) [${res.durationMs ?? 0}ms] ---`);
    if (res.error) {
      console.error(`  ERROR: ${res.error}`);
    }
    if (res.analysis) {
      console.log(`  [Analista] status: ${res.analysis.status}, bias: ${res.analysis.bias}, conf: ${res.analysis.confidence}`);
      console.log(`  Conclusión: ${res.analysis.conclusion}`);
      console.log(`  Hechos (${res.analysis.facts.length}):`, res.analysis.facts.slice(0, 2));
      console.log(`  Inferencias (${res.analysis.inferences.length}):`, res.analysis.inferences.slice(0, 2));
    }
    if (res.strategy) {
      const s = res.strategy;
      console.log(`  [Estrategia] dirección: ${s.direction}`);
      console.log(`  Condición entrada: "${s.condicionEntrada}"`);
      console.log(`  Precios: Entrada=${s.entryPriceNum} | SL=${s.stopLossNum} | TP=${s.takeProfitNum}`);
      console.log(`  Riesgo: ${s.riskPercent}%`);

      const atrMatch = snapshot.match(/ATR \(14[^)]*\):\s*([0-9.]+)/i);
      const atr = atrMatch ? Number(atrMatch[1]) : 1;
      const riskDist = Math.abs((s.entryPriceNum ?? 0) - (s.stopLossNum ?? 0));
      const rewardDist = Math.abs((s.takeProfitNum ?? 0) - (s.entryPriceNum ?? 0));
      const rr = riskDist > 0 ? (rewardDist / riskDist).toFixed(2) : '0';
      const slAtr = (riskDist / atr).toFixed(2);
      console.log(`  Métricas calculadas: R:R = 1:${rr} (mín 1:1.60) | Distancia SL = ${slAtr} ATR (rango 1.25 - 2.50 ATR)`);

      const val = validateStrategyProposal(s, {
        minRrRatio: preset.riskPolicy.minRrRatio,
        maxRiskPercent: preset.riskPolicy.maxRiskPercent,
        atrValue: atr,
        minStopAtr: preset.riskPolicy.minStopAtr,
        maxStopAtr: preset.riskPolicy.maxStopAtr,
      });
      console.log(`  Gate determinista de riesgo: ${val.valid ? 'PASS' : 'FAIL -> ' + val.error}`);
    }
    if (res.verdict) {
      const v = res.verdict;
      console.log(`  [Juez] Veredicto: ${v.veredicto.toUpperCase()}`);
      console.log(`  Razón: ${v.razon}`);
      if (v.objeciones?.length) console.log(`  Objeciones:`, v.objeciones);
      if (v.unresolvedBlockers?.length) console.log(`  UnresolvedBlockers:`, v.unresolvedBlockers);
    }
  }

  if (run.issues && run.issues.length > 0) {
    console.log(`\nIssues registrados en el run:`, run.issues);
  }

  const stratResult = run.results.find((r) => r.strategy)?.strategy;
  const verdictResult = run.results.find((r) => r.verdict)?.verdict;

  if (stratResult && (verdictResult?.veredicto === 'go' || run.finalState === 'validated')) {
    const eligibilityError = validateMql5SourceRun(run, stratResult);
    console.log(`\n[2/3] Elegibilidad MQL5: ${eligibilityError ? 'BLOQUEADO: ' + eligibilityError : 'ELEGIBLE (GO)'}`);
    if (eligibilityError) {
      return { ok: false, run, mqlResult: null };
    }

    console.log(`Generando EA MQL5 para ${preset.referenceAsset}...`);
    try {
      const mqlResult = await generateMql5(stratResult, 'omniroute:auto/best-coding', (prog) => {
        console.log(`  [Progreso MQL5] Fase: ${prog.phase} - Intento ${prog.attempt}/${prog.maxAttempts} ${prog.details || ''}`);
      });

      console.log(`\n[3/3] Resultado MQL5:`);
      console.log(`  Compilación status: ${mqlResult.compileStatus}`);
      console.log(`  Errores compilador: ${(mqlResult.compileErrors ?? []).length}`);
      console.log(`  Warnings: ${(mqlResult.compileWarnings ?? []).length}`);
      console.log(`  Supuestos a verificar (${mqlResult.assumptionsToVerify?.length ?? 0}):`, mqlResult.assumptionsToVerify?.slice(0, 3));
      if ((mqlResult.compileErrors ?? []).length > 0) {
        console.error(`  ERRORES:`, mqlResult.compileErrors);
      }
      return { ok: mqlResult.compileStatus === 'ok', run, mqlResult };
    } catch (mqlErr: any) {
      console.error(`\n[3/3] Error en generación MQL5:`, mqlErr.message);
      return { ok: false, run, mqlResult: null, mqlError: mqlErr.message };
    }
  } else {
    console.log(`\n[2/3] No se avanzó a MQL5 porque el veredicto no fue GO (o hubo fallos).`);
    return { ok: false, run, mqlResult: null };
  }
}

async function main() {
  const allPresets = cloneBaselinePresets();
  const simplePresets = allPresets.filter((p) => p.name?.includes('(Simple)'));

  console.log(`Encontradas ${simplePresets.length} configuraciones simples para calibrar:`);
  simplePresets.forEach((p) => console.log(`- ${p.name} (${p.id})`));

  const target = process.argv[2];
  const toRun = target
    ? simplePresets.filter((p) =>
        p.key.toLowerCase().includes(target.toLowerCase()) ||
        p.id.toLowerCase().includes(target.toLowerCase()) ||
        p.name.toLowerCase().includes(target.toLowerCase())
      )
    : simplePresets;

  for (const preset of toRun) {
    await testPreset(preset);
  }
}

main().catch((err) => {
  console.error('Error fatal en calibración:', err);
  process.exit(1);
});
