# Estándar para desarrollar EAs con IA

> **Estado:** BORRADOR
> **Última revisión:** 2026-08-07
> **Documento crítico.** Este será el **contrato** para cualquier agente (incluido Claude Code) que programe MQL5 en este proyecto a partir de la Fase 1. Consolida reglas ya justificadas en documentos anteriores; aquí se listan como checklist operativa.

## 1. Reglas obligatorias

1. **No inventar APIs de MQL5.** Si una función/constante no se recuerda con certeza, se consulta la documentación oficial (`mql5.com/en/docs`) antes de usarla — nunca se asume su firma o comportamiento por analogía con otro lenguaje.
2. **Consultar documentación oficial ante cualquier duda**, priorizando la jerarquía de fuentes de `FUENTES.md` (Nivel 1 > Nivel 2 > Nivel 3).
3. **Compilar siempre** antes de considerar un cambio terminado — un EA que "parece correcto" pero no se ha compilado no es una entrega válida.
4. **Cero warnings salvo justificación explícita** por escrito en el propio código o en el commit — un warning silenciado sin razón documentada es deuda técnica invisible.
5. **No usar look-ahead** — ninguna decisión de la barra actual puede depender de datos que en la realidad no estarían disponibles todavía en ese instante (ver `07_Backtesting...` §1).
6. **No mezclar lógica de señal y ejecución** — cumplir la separación de `03_Arquitectura_Expert_Advisors.md` §1-2 sin excepciones "solo por esta vez".
7. **No asumir equivalencia entre pip/tick/point** — son conceptos distintos y su relación depende del símbolo (`Digits`, `Point`) y del broker; todo cálculo de distancia de precio debe usar las propiedades reales del símbolo, nunca una conversión fija memorizada.
8. **Consultar propiedades reales del símbolo** en tiempo de ejecución (`SymbolInfoDouble`/`SymbolInfoInteger`) — nunca codificar `tick_value`, `contract_size`, `stop_level`, etc. como constantes (ver `05_Gestion_Riesgo_EAs.md` §3).
9. **Normalizar volumen a `SYMBOL_VOLUME_STEP`** (y acotar a `VOLUME_MIN`/`VOLUME_MAX`) antes de enviar cualquier orden — un volumen no normalizado puede ser rechazado por el broker de forma silenciosamente distinta según el símbolo.
10. **Validar stops** contra `SYMBOL_TRADE_STOPS_LEVEL` y `SYMBOL_TRADE_FREEZE_LEVEL` antes de enviarlos, no confiar en que el broker simplemente los ajuste.
11. **Usar Magic Number** en toda operación del EA, siguiendo la convención de `03_Arquitectura_Expert_Advisors.md` §4.
12. **Tratar errores y retcodes explícitamente** — comprobar `MqlTradeResult.retcode`, no solo el booleano de retorno de `OrderSend` (`04_Modelo_Trading...` §6).
13. **No asumir que `OrderSend() == true` implica fill** — regla ya establecida como no negociable en `04_Modelo_Trading...` §6.
14. **Observar `OnTradeTransaction()` cuando corresponda** para reconstruir el estado real, en vez de fiarse de suposiciones locales (`02_Fundamentos_MQL5.md` §4, `04_Modelo_Trading...` §7).
15. **Impedir duplicación de posiciones por ticks repetidos** — el `TradeStateTracker` debe ser la fuente de verdad de "¿ya hay una posición/orden abierta para esta señal?", no una variable local que pueda desincronizarse tras un reinicio del Terminal.
16. **Distinguir nueva barra de nuevo tick** cuando la estrategia sea bar-based — comparar el timestamp de la última barra procesada, no solo contar ticks, para evitar evaluar la señal varias veces dentro de la misma barra.
17. **Evitar operaciones múltiples por la misma señal** — una señal de entrada debe traducirse en, como máximo, la operación que la política de riesgo permite, no en una nueva orden cada vez que se reevalúa la misma condición mientras sigue siendo verdadera.
18. **Documentar los `input`** (comentario breve de qué representa cada parámetro y su unidad) — un parámetro sin unidad clara (¿puntos? ¿pips? ¿por ciento?) es una fuente de error de configuración.
19. **Separar parámetros optimizables de hard risk limits** — los límites duros del proyecto no son `input` del EA, viven en `Common/RiskManager.mqh` (`05_Gestion_Riesgo_EAs.md` §5).
20. **Logging suficiente** — toda decisión relevante (señal generada, señal filtrada y por qué, orden enviada, resultado recibido) debe quedar registrada de forma que un `StrategyHealthAgent` futuro (o una persona) pueda reconstruir qué pasó sin releer el código.
21. **Código versionado** — ningún EA que vaya a probarse en backtest serio, y mucho menos en demo, existe fuera de un commit identificable (`16_Observabilidad...` §5).
22. **Backtest reproducible** — mismo código + mismo `.set` + mismo dataset/broker + mismo tick model debe producir el mismo resultado; cualquier fuente de no-determinismo (p. ej. uso de `MathRand()` sin semilla fija en la lógica de la estrategia) debe evitarse o documentarse explícitamente.

## 2. Plantilla de prompt estándar para pedir un EA a una IA

Este es el prompt de referencia que se usará **a partir de la Fase 1** cuando se pida a un agente (Claude Code u otro) generar o modificar un EA. No se ejecuta en esta fase — es la especificación del prompt, no su uso.

```text
Rol: desarrollador senior de MQL5 siguiendo el estándar del proyecto
  (docs/MetaTrader/17_Estandar_Desarrollo_EAs_con_IA.md).

Contexto obligatorio a proporcionar:
- StrategyProposal completa (docs/MetaTrader/11_Arquitectura_Multiagente_Futura.md §5)
- RiskPolicy vigente (docs/MetaTrader/05_Gestion_Riesgo_EAs.md §5)
- Plantilla de arquitectura de EA (docs/MetaTrader/03_Arquitectura_Expert_Advisors.md §6)
- Símbolo(s)/broker de prueba y sus propiedades conocidas (o instrucción de
  consultarlas en tiempo de ejecución, nunca asumirlas)

Instrucciones:
1. Implementar ÚNICAMENTE la lógica descrita en la StrategyProposal, en el
   módulo StrategySignal correspondiente.
2. Reutilizar los módulos comunes existentes (RiskManager, PositionSizer,
   TradeExecutor, TradeStateTracker, Logger) — no reimplementarlos.
3. Cumplir TODAS las reglas de la sección 1 de este documento sin excepción.
4. Si una API de MQL5 necesaria no se conoce con certeza, indicarlo
   explícitamente en vez de inventar la firma.
5. Entregar también: lista de warnings de compilación (si los hay, con
   justificación), y una lista de supuestos que deban verificarse
   manualmente contra las propiedades reales del símbolo/broker.

Salida esperada: código MQL5 + explicación de decisiones de diseño no
triviales + lista de verificaciones pendientes antes de backtest.
```

## 3. Relación con el `CodeReviewerAgent`

El cumplimiento de la sección 1 no se da por supuesto porque el prompt lo pida: se **verifica** con una revisión posterior (`CodeReviewerAgent`, `11_Arquitectura_Multiagente_Futura.md`) que comprueba explícitamente cada punto de la checklist antes de que el código pase a `BACKTESTING` en el ciclo de vida de la estrategia (`08_Ciclo_Vida_y_Versionado_Estrategias.md`). Un EA generado por IA que "parece" seguir el estándar no se promueve sin esa revisión — es el mismo principio de "la aprobación narrativa de un LLM no es una puerta suficiente" aplicado al código, no solo a la validación cuantitativa.

## Fuentes consultadas

- Consolidación de hallazgos ya verificados en `02_Fundamentos_MQL5.md`, `03_Arquitectura_Expert_Advisors.md`, `04_Modelo_Trading_Ordenes_Deals_Posiciones.md` y `05_Gestion_Riesgo_EAs.md`; no se ha requerido investigación externa adicional específica para este documento, que es de diseño de proceso [INFERIDO] derivado directamente de la sección 27 del prompt maestro.
