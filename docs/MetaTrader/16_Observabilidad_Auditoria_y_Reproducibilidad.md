# Observabilidad, auditoría y reproducibilidad

> **Estado:** BORRADOR
> **Última revisión:** 2026-08-07
> Diseño propio del proyecto [INFERIDO], construido sobre los hallazgos verificados de `01_Arquitectura...`, `06_Strategy_Tester...` y `08_Ciclo_Vida...`.

## 1. Pregunta que este documento debe permitir responder

> ¿Por qué esta estrategia estaba activa (o se retiró) y con qué evidencia se aprobó (o se rechazó)?

Meses después de una decisión, debe ser posible reconstruirla sin depender de la memoria de quien la tomó.

## 2. Qué se debe poder recuperar

```text
código exacto           -> commit Git (hash) + archivo .mq5/.mqh
versión del EA           -> .ex5 compilado + versión declarada en strategy_version
.set de parámetros         -> MQL5/Presets, copiado al artefacto de la versión
símbolo                      -> registrado en strategy_version
broker/server                  -> registrado en strategy_version
periodo probado                  -> backtest/oos/forward/demo, cada uno con su rango
timeframe                          -> registrado en strategy_version
tick model                           -> real ticks / every tick / M1 OHLC / open prices (06_Strategy_Tester...)
build MT5                              -> registrada en el momento de cada test (puede cambiar entre tests)
costes                                   -> spread/comisión/swap/slippage usados en cada backtest
resultados                                 -> StrategyValidationReport completo
optimización                                 -> rango de parámetros, método, criterio, región de estabilidad
forward                                        -> resultados del tramo forward
demo                                             -> periodo y resultados de demo prolongada
logs                                               -> logs del EA/Terminal relevantes
decisiones de agentes                                -> qué agente propuso/revisó/aprobó cada paso
modelo/prompts                                         -> qué modelo de IA y qué versión de prompt intervino, si aplica
```

## 3. Qué genera MT5 de forma nativa vs qué debe exportar el proyecto [VERIFICADO] / [INFERIDO]

| Artefacto | Generado nativamente por MT5 | Acción del proyecto |
|---|---|---|
| Reporte de backtest/optimización (HTML/XML, lista de deals/orders) | Sí — exportable desde el Strategy Tester | Copiar/archivar junto a la versión de la estrategia, no dejarlo solo en `Tester/` local |
| `.set` de parámetros de arranque | Sí — `MQL5/Presets` | Versionar junto al código, no solo dejarlo en el Data Folder |
| Logs de EA/Terminal | Sí — `MQL5/Logs`, `Logs/` | Rotar/archivar los relevantes a cada pase de test o sesión de demo relevante |
| Historial de operaciones de una cuenta (demo) | Sí — consultable vía `HistorySelect`/exportable desde el Terminal | Exportar periódicamente (o vía Python, ver `09_Integracion_Python_MetaTrader5.md`) a un formato archivable |
| `StrategyProposal`, `StrategyValidationReport`, `HealthReview` | No — son artefactos del proyecto, no de MT5 | Generarlos y versionarlos explícitamente (ver `07_...` y `11_...`) |
| Registro de qué agente/prompt intervino | No | Responsabilidad exclusiva del proyecto — sin esto, la trazabilidad de la sección 2 se rompe en el eslabón de "qué propuso la IA y con qué versión" |
| Build de MT5 usada en cada test | Parcialmente (aparece en el log del tester) | Extraer y registrar explícitamente en el `StrategyValidationReport`, porque el comportamiento del tester puede variar entre builds |

## 4. Estructura de carpetas propuesta

```text
strategies/
  BTC_TrendFollowing_H1/
    v1.0.0/
      strategy.yaml           # strategy_version (08_Ciclo_Vida...)
      src/                    # .mq5/.mqh de esta versión exacta
      presets/                # .set usados
      backtests/
        2026-08-15_realticks/
          report.html
          deals.csv
          quality.txt         # history quality reportada
      optimization/
        2026-08-16_genetic/
          ranges.yaml
          results_top20.csv
          stability_notes.md
      forward/
        2026-08-20/
          report.html
      demo/
        2026-08-25_to_2026-09-25/
          summary.md
          equity_curve.csv
      reviews/
        2026-10-01_health_review.md
```

No se implementa esta estructura ahora (regla `26.`/`16.` del prompt maestro — "no la implementes hasta comprobar cómo encaja con el repositorio real"); queda documentada como propuesta para la Fase 1, cuando exista contenido real que organizar y se pueda validar contra el flujo de trabajo Git real del proyecto.

## 5. Relación con versionado de código (Git)

- El `code_hash` de cada `strategy_version` (`08_Ciclo_Vida...`) debe apuntar a un commit real, no a "la última versión en el momento" de forma ambigua.
- Un cambio de código que afecte a una estrategia ya en `DEMO`/`ACTIVE`/`WATCH` implica: nuevo commit → nueva versión de estrategia (mínimo `PARCHE`) → nuevo ciclo de validación acorde a la magnitud del cambio (ver `08_Ciclo_Vida...` §1).
- El repositorio Git **no vive dentro del Data Folder real** de una instalación de producción (ver `01_Arquitectura...` §5); la sincronización de `src/` hacia `MQL5/Experts` es un paso explícito del flujo de trabajo, no automático — se detalla en `19_Plan_Puesta_en_Marcha.md`.

## 6. Registro de decisiones de agentes

Cada artefacto generado o revisado por un agente de IA (`StrategyProposal`, `CodeReview`, `RiskReview`, `HealthReview`) debe registrar como mínimo:

```yaml
agent_provenance:
  agent_role:        # p.ej. StrategyDesignerAgent
  model:             # modelo de IA usado
  prompt_version:     # referencia a la versión del prompt/estándar usado (17_Estandar_Desarrollo_EAs_con_IA.md)
  timestamp:
  human_reviewer:      # si hubo revisión humana antes de avanzar de estado
```

Esto es lo que permite, meses después, distinguir "esta estrategia la diseñó un agente siguiendo el estándar v1.2 del proyecto y un humano la revisó el 2026-09-10" de una caja negra sin procedencia — requisito directo de la Sección 16 del prompt maestro y del principio de no confundir aprobación narrativa de un LLM con evidencia (`11_Arquitectura_Multiagente_Futura.md` §4).

## Fuentes consultadas

- Reutiliza hallazgos ya verificados de `01_Arquitectura_y_Funcionamiento_MetaTrader5.md` (Data Folder) y `06_Strategy_Tester_y_Datos_Historicos.md` (artefactos del tester); no se ha requerido investigación externa adicional para este documento, que es de diseño [INFERIDO] sobre hechos ya contrastados.
