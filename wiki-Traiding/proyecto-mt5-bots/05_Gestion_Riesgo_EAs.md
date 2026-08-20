# Gestión de riesgo determinista

> **Estado:** BORRADOR
> **Última revisión:** 2026-08-07
> **Documento crítico** — bloquea puesta en marcha si queda incompleto.

## 1. Regla no negociable

El agente de IA puede **proponer** parámetros de riesgo dentro de una `StrategyProposal` (ver `11_Arquitectura_Multiagente_Futura.md`), pero es el **EA** (concretamente su `RiskManager`, ver `03_Arquitectura_Expert_Advisors.md`) quien **valida límites máximos predefinidos de forma determinista, en código, sin depender de ninguna llamada a un LLM en tiempo real**. Ninguna estrategia puede "pedir" saltarse los límites del sistema: si una propuesta pide un riesgo por operación superior al hard limit, el `RiskManager` la recorta o la rechaza, no la ejecuta como se pidió.

## 2. Tipos de riesgo a distinguir

```text
riesgo de la estrategia    -> la hipótesis puede estar equivocada, incluso ejecutada perfectamente
riesgo de ejecución         -> slippage, requotes, rechazos, fills parciales, latencia
riesgo de mercado           -> volatilidad anormal, gaps, baja liquidez, cambios de régimen
riesgo de cartera            -> exposición agregada entre varias estrategias/EAs simultáneos
riesgo operacional            -> caída de conexión, reinicio del Terminal, datos obsoletos, fallo del VPS
```

El `RiskManager` de cada EA cubre principalmente riesgo de ejecución y de mercado a nivel de esa estrategia; el riesgo de cartera requiere una capa adicional (`PortfolioRiskAgent` / revisión periódica, ver `11_Arquitectura_Multiagente_Futura.md`) porque un único EA no ve necesariamente lo que hacen los demás.

## 3. Insumos que el `RiskManager`/`PositionSizer` deben consultar en tiempo real [VERIFICADO] / [DEPENDIENTE DEL BROKER]

Todos estos valores se consultan vía `SymbolInfoDouble`/`SymbolInfoInteger`/`AccountInfoDouble` en el momento de operar — **nunca se codifican como constantes fijas**, porque varían por símbolo, cuenta y broker:

| Propiedad | Función de consulta | Uso |
|---|---|---|
| Tick size (`SYMBOL_TRADE_TICK_SIZE`) | `SymbolInfoDouble` | mínimo movimiento de precio válido |
| Tick value (`SYMBOL_TRADE_TICK_VALUE`) | `SymbolInfoDouble` | valor monetario de un tick, para traducir riesgo en precio a riesgo en dinero |
| Contract size (`SYMBOL_TRADE_CONTRACT_SIZE`) | `SymbolInfoDouble` | tamaño de un lote |
| Volume step/min/max (`SYMBOL_VOLUME_STEP/MIN/MAX`) | `SymbolInfoDouble` | normalización obligatoria del volumen calculado |
| Stop level (`SYMBOL_TRADE_STOPS_LEVEL`) | `SymbolInfoInteger` | distancia mínima permitida entre SL/TP y precio actual; si es 0 no hay restricción explícita del broker, pero puede haberla implícita |
| Freeze level (`SYMBOL_TRADE_FREEZE_LEVEL`) | `SymbolInfoInteger` | distancia dentro de la cual no se permite modificar/cancelar una orden o posición |
| Margen requerido | `OrderCalcMargin` | validación previa de viabilidad de la operación |
| Leverage de cuenta | `AccountInfoInteger(ACCOUNT_LEVERAGE)` | contexto de margen disponible |
| Conversión de divisa | `SymbolInfoString(SYMBOL_CURRENCY_PROFIT)` + símbolo de conversión | cuando la divisa de beneficio del símbolo no coincide con la divisa de la cuenta |
| Spread actual | `SymbolInfoInteger(SYMBOL_SPREAD)` o `Ask-Bid` | filtro de entrada (`SpreadFilter`) y coste esperado |
| Deviation/slippage máximo admitido | parámetro de `MqlTradeRequest.deviation` | control de ejecución, no de riesgo de mercado |

## 4. Componentes del riesgo por operación

- **Riesgo por operación:** típicamente expresado como % de equity o cantidad fija en divisa de cuenta.
- **Position sizing según distancia al SL:** `volumen = riesgo_monetario / (distancia_SL_en_ticks * tick_value)`, normalizado después a `SYMBOL_VOLUME_STEP` y acotado a `[VOLUME_MIN, VOLUME_MAX]`.
- **Límite de posiciones abiertas simultáneas** (por EA y, en el futuro, por cartera).
- **Límite de exposición por activo** (para evitar que dos estrategias distintas sumen exposición no controlada al mismo símbolo).
- **Riesgo agregado / pérdida diaria máxima / drawdown máximo:** límites que, al alcanzarse, deben **detener nuevas entradas** del EA (kill switch local) de forma determinista, sin esperar intervención de un agente.
- **Trading sessions:** el `SessionFilter` bloquea operar fuera de las franjas horarias definidas para la estrategia (evita, por ejemplo, operar en horario de liquidez mínima).
- **Baja liquidez / datos obsoletos / volatilidad anormal / gaps:** deben tratarse como condiciones de **fallo seguro** (no operar, o cerrar/reducir exposición) más que como parámetros optimizables — ver `09.` del prompt maestro sobre "fallar de forma segura si faltan datos esenciales".
- **Eventos macro de alto impacto:** cuando corresponda, filtrado vía `NewsFilter` (ver `12_Analisis_Fundamental_Noticias_y_Macroeconomia.md`), nunca como una llamada en vivo a un LLM que decida en el momento.

## 5. `RiskPolicy` propuesta

```yaml
risk_policy:
  version: "0.1.0"
  scope: laboratorio_demo   # nunca live en esta fase

  per_trade:
    max_risk_percent_equity: <valor a fijar por estrategia, dentro de hard_limits>
    max_slippage_points: <valor>

  portfolio:
    max_concurrent_positions_per_ea: <valor>
    max_exposure_percent_per_symbol: <valor>
    max_daily_loss_percent: <valor>
    max_drawdown_percent_pause: <valor>   # al superarse, el EA deja de abrir nuevas posiciones

  execution_safety:
    max_spread_points: <valor>
    require_fresh_quote_seconds: <valor>   # rechaza operar si el último tick es más viejo que esto
    min_volume_liquidity_check: <bool>

  hard_limits:     # techos absolutos del proyecto; ninguna estrategia puede superarlos aunque los "pida"
    max_risk_percent_equity_absolute: <valor>
    max_leverage_effective: <valor>
    real_money_trading: false
    ai_initiated_trading: false
```

`hard_limits` no es optimizable ni configurable por la `StrategyProposal`; vive en el código del `RiskManager` común (`Common/RiskManager.mqh`), no en los `input` de cada EA — así se impide que una estrategia lo cambie simplemente pasando un parámetro distinto.

## 6. Qué queda fuera de esta fase

No se fijan aún valores numéricos definitivos para dinero real (fuera de alcance de la Fase 0, ver `00_Contexto_y_Objetivos_Proyecto.md`). Para el laboratorio, prioridad en **coherencia y verificabilidad**: valores conservadores, elegidos para poder auditar que el `RiskManager` efectivamente los respeta en backtest y demo (ver `07_Backtesting_Optimizacion_y_Validacion_Quant.md` para cómo se comprueba esto empíricamente y no solo por lectura de código).

## Fuentes consultadas

- F016 — "Symbol Properties" / `ENUM_SYMBOL_INFO_INTEGER`/`_DOUBLE`, incl. `SYMBOL_TRADE_STOPS_LEVEL`, `SYMBOL_TRADE_FREEZE_LEVEL`, `SYMBOL_VOLUME_STEP`, `SYMBOL_TRADE_TICK_VALUE`. https://www.mql5.com/en/docs/constants/environment_state/marketinfoconstants — MetaQuotes/MQL5 — OFICIAL — consultado 2026-08-07.
- Diseño de `RiskPolicy` [INFERIDO]: propuesta propia del proyecto siguiendo los requisitos de la sección 15 del prompt maestro; no corresponde a un esquema oficial de MetaQuotes.
