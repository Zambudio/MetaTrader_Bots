# Brokers MetaTrader 5 para España

> **Estado:** BORRADOR
> **Última revisión:** 2026-08-07
> **Documento crítico** — bloquea puesta en marcha si queda incompleto. Investigación con información de agosto de 2026; debe reverificarse en el momento de abrir la cuenta demo real (ver `19_Plan_Puesta_en_Marcha.md`), ya que regulación y condiciones cambian.
> **No se elige broker por publicidad ni por "ser conocido"** — cada candidato se contrasta contra fuentes regulatorias antes de incluirlo.

## 1. Marco regulatorio para un residente en España [VERIFICADO]

- El regulador de mercados de valores en España es la **CNMV** (Comisión Nacional del Mercado de Valores), bajo el marco de la **ESMA**/MiFID II a nivel de la UE.
- Un bróker puede operar legalmente con un residente en España de dos formas: (a) autorizado directamente por la CNMV, o (b) autorizado por el regulador de otro Estado miembro de la UE/EEE (p. ej. **CySEC** en Chipre) y operando en España mediante el mecanismo de **pasaporte europeo (passporting)** bajo MiFID II, habitualmente con registro/sucursal visible en el registro de la CNMV.
- **Protección de saldo negativo:** exigida por ESMA para clientes minoristas — el broker debe absorber cualquier saldo negativo, no el cliente.
- **Límites de apalancamiento ESMA (clientes minoristas):** 30:1 en pares de divisas mayores, 20:1 en menores/oro, 10:1 en materias primas/índices no mayores, 5:1 en acciones individuales, 2:1 en criptoactivos. Un broker que ofrezca apalancamiento mayor a un cliente minorista residente en España está, o bien clasificando al cliente como profesional (con pérdida de protecciones), o bien operando fuera del marco ESMA para ese cliente — señal de alerta a verificar.
- **Regla de margin close-out:** cierre obligatorio de posiciones cuando el margen cae a un umbral (ESMA fija 50% como referencia).
- **FOGAIN:** fondo de garantía de inversiones español, cobertura de hasta 100.000 € por cliente en firmas autorizadas por la CNMV (aplica a firmas españolas o con presencia registrada en España, no necesariamente a toda entidad europea que opere por passporting puro sin sucursal).
- **Verificación oficial:** la CNMV mantiene un registro público de Empresas de Servicios de Inversión (ESI) y de entidades en libre prestación de servicios, consultable en `cnmv.es` (el acceso directo al buscador dinámico no ha podido automatizarse en esta investigación — devolvió error 403 al intento de consulta automatizada; **la verificación del número de registro de cada candidato debe hacerse manualmente en `cnmv.es` antes de depositar ningún fondo**, incluso en demo si se introducen datos personales).

## 2. Corrección de un dato encontrado durante la investigación [VERIFICADO]

Una búsqueda inicial incluyó **XTB** como candidato "regulado por CNMV con MT5". Al verificar directamente, se ha confirmado que **XTB no ofrece MetaTrader 5 en absoluto** — su única plataforma propia es **xStation 5**. XTB queda **descartado** de este listado por incumplir el requisito técnico obligatorio (soporte de MT5), independientemente de su regulación. Se documenta este caso como ejemplo concreto de por qué este proyecto exige contrastar cada afirmación contra una fuente primaria antes de incluirla (regla `31.`/`6.` del prompt maestro) en vez de copiar listados de comparativas de terceros sin verificar.

## 3. Candidatos investigados y contrastados

| Broker (entidad operativa) | Regulador principal | Presencia/registro en España | Ofrece MT5 | Cuenta demo |
|---|---|---|---|---|
| **Capex** (Key Way Investments Ltd) | CySEC (Chipre), licencia 292/16 | Sucursal en España, registrada en CNMV como ESI en libre prestación de servicios | Sí (junto a su WebTrader propio) | Sí |
| **FP Markets** | ASIC (Australia) + entidad europea | Registrada en CNMV como ESI en libre prestación de servicios (nº 5025, según fuente secundaria — a reverificar en el registro oficial) | Sí (MT4/MT5) | Sí |
| **Capital.com** | Múltiples (incl. entidad europea con pasaporte) | Registrada en CNMV como ESI en libre prestación de servicios (nº 4411, según fuente secundaria — a reverificar) | Sí | Sí |
| **ActivTrades** | FCA (Reino Unido) y otras entidades del grupo (SCB, CMVM, FSC, BACEN/CVM) — **no CySEC** | Mencionada como registrada en CNMV en fuentes secundarias, pero **no se ha podido confirmar con precisión qué entidad concreta del grupo opera bajo qué mecanismo de passporting hacia España** | Sí (MT4/MT5) | Sí |

`[PENDIENTE]` explícito: los números de registro CNMV citados arriba proceden de comparativas de terceros (`SECUNDARIA`), no de una consulta directa verificada al buscador oficial de la CNMV en esta sesión (bloqueado por 403 al acceso automatizado). **No usar estos números como definitivos sin reconfirmarlos manualmente en `cnmv.es` antes de cualquier paso real con el broker elegido.**

## 4. Filtro técnico (lo verificable sin abrir cuenta)

| Aspecto | Capex | FP Markets | Capital.com | ActivTrades |
|---|---|---|---|---|
| Instrumentos | Amplio: forex, acciones, índices, materias primas, ETFs (+7.000 activos según el propio broker) | Amplio, +10.000 instrumentos según el propio broker; spreads publicitados desde 0.0 pips en cuentas Raw/ECN | Amplio, multiactivo | Forex, índices, materias primas, acciones — spreads competitivos en EURUSD, algo peor que la media en materias primas según reseñas de terceros |
| Netting/Hedging | `[PENDIENTE]` verificar en demo real | `[PENDIENTE]` verificar en demo real | `[PENDIENTE]` verificar en demo real | Confirmado hedging tipo "First In First Out" según reseñas de terceros — a confirmar en demo propia |
| Ejecución | `[PENDIENTE]` | `[PENDIENTE]` | `[PENDIENTE]` | Ejecución reportada muy rápida (~4 ms) según reseñas de terceros — cifra de marketing, verificar en uso real |
| VPS propio del broker | `[PENDIENTE]` | `[PENDIENTE]` | `[PENDIENTE]` | `[PENDIENTE]` |
| Real ticks / profundidad histórica para backtest | `[PENDIENTE]` — requiere abrir demo y comprobar en el Strategy Tester directamente | `[PENDIENTE]` | `[PENDIENTE]` | `[PENDIENTE]` |

Todo lo marcado `[PENDIENTE]` en esta tabla **no puede verificarse de forma fiable sin abrir una cuenta demo real** en cada candidato y comprobarlo dentro del propio Terminal (Market Watch → propiedades de símbolo; Strategy Tester → calidad del histórico) — es exactamente el tipo de dato `[DEPENDIENTE DEL BROKER]` que este proyecto exige consultar en tiempo real y no asumir (ver `31.` del prompt maestro). Esta verificación práctica es tarea de la Fase 1 (`19_Plan_Puesta_en_Marcha.md`), no de esta fase de investigación documental.

## 5. Calidad para backtesting — qué falta comprobar

- Disponibilidad real de modo "Every tick based on real ticks" con buena "history quality" (ver `06_Strategy_Tester_y_Datos_Historicos.md`) — solo se comprueba abriendo demo y ejecutando un backtest de prueba.
- Profundidad histórica real disponible (cuántos años de M1/ticks se pueden descargar).
- Continuidad de los datos (gaps, gaps de fin de semana gestionados de forma coherente).
- Diferencias entre entorno demo y real del mismo broker (spreads, ejecución) — habitualmente el demo es optimista respecto al real; debe tenerse en cuenta al interpretar resultados de demo prolongada (`08_Ciclo_Vida_y_Versionado_Estrategias.md` §4).
- Reproducibilidad de costes (comisión/swap consistentes entre pases de test).

## 6. Shortlist razonada para el laboratorio demo

**Shortlist (orden no vinculante, sin abrir cuentas todavía):**

1. **Capex** — regulación CySEC + presencia y registro directo en España (sucursal), lo cual simplifica la verificación de passporting frente a otros candidatos con estructura de grupo más compleja.
2. **Capital.com** — regulación múltiple con registro CNMV citado en fuentes secundarias, amplia base de usuarios, MT5 disponible.
3. **FP Markets** — condiciones de ejecución (spreads Raw/ECN) atractivas para pruebas de sensibilidad a costes; registro CNMV citado en fuentes secundarias.
4. **ActivTrades** — candidato con reputación establecida en Europa, pero con la reserva explícita sobre qué entidad exacta del grupo cubre a España; solo se mantiene en la shortlist si la Fase 1 confirma satisfactoriamente ese punto en el registro oficial de la CNMV.

**No se distinguen rankings separados por tipo de activo** en esta fase porque los primeros bots de laboratorio (`18_Primeros_Bots_Laboratorio.md`) se centran en un único símbolo líquido de Forex — si en el futuro se amplía a acciones/índices, este documento debe revisarse con un filtro específico para esos instrumentos.

**No se abren cuentas en esta fase.** El primer paso real con cualquiera de estos candidatos es abrir una cuenta **demo** y validar en la práctica los puntos `[PENDIENTE]` de la sección 4, como parte de `19_Plan_Puesta_en_Marcha.md` Paso 2.

## Fuentes consultadas

- F025 — CNMV, marco regulatorio general (ESI, passporting, FOGAIN) — consultado vía búsqueda agregada, sin acceso directo verificado al buscador oficial (403). https://www.cnmv.es — CNMV — OFICIAL (fuente primaria referenciada, verificación directa pendiente) — consultado 2026-08-07.
- F026 — "10 Best CNMV & ESMA Regulated Forex Brokers in Spain" y comparativas equivalentes de terceros. Varias URLs (ver búsquedas) — autores de comparativas independientes — SECUNDARIA/COMUNIDAD — consultado 2026-08-07 — punto de partida, no fuente de verdad para números de registro.
- F027 — Capex.com, regulación CySEC 292/16 y sucursal/registro en España (CNMV) y Rumanía (ASF), plataforma MT5. Consultado vía búsqueda agregada de fuentes de comparación de brókeres — SECUNDARIA — consultado 2026-08-07.
- F028 — Confirmación de que XTB no ofrece MT5 (solo xStation 5) — consultado vía búsqueda agregada, incl. xtb.com/help-center — MIXTA (oficial XTB + comparativas) — consultado 2026-08-07 — corrección de un hallazgo inicial erróneo.
- F029 — ActivTrades, entidades del grupo (FCA, SCB, CMVM, FSC, BACEN/CVM), modo de netting FIFO — consultado vía búsqueda agregada de reseñas y comparativas — SECUNDARIA — consultado 2026-08-07 — passporting exacto a España no confirmado, ver [`PREGUNTAS_ABIERTAS.md`](PREGUNTAS_ABIERTAS.md) Q-005.
- Nivel 3 (COMUNIDAD): reseñas de usuarios sobre velocidad de ejecución y spreads — usadas únicamente como contexto, no como base de ninguna decisión de seguridad o ejecución.
