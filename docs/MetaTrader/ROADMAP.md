# Roadmap del proyecto

> Hoja de ruta general. Ver `00_INDEX.md` para el estado documental detallado de la fase actual.

## Fase 0 — Investigación y documentación (esta fase)

**Salida:** conocimiento suficiente para configurar sin improvisar. Ver Definition of Done en `ESTADO_INVESTIGACION.md`.
**Estado:** en cierre — ver auditoría final en `ESTADO_INVESTIGACION.md` y resumen en este mismo archivo tras completarla.

## Fase 1 — Laboratorio MetaTrader

- Instalación de la build vigente verificada.
- Cuenta demo en broker seleccionado (tras verificación CNMV).
- MetaEditor y repositorio sincronizados.
- MCP configurado para Claude Code con trading de IA deshabilitado.
- Primer programa (Hello World / EA de diagnóstico) compilado y probado.
- Strategy Tester validado de extremo a extremo.

Ejecución detallada: `19_Plan_Puesta_en_Marcha.md` Pasos 1-10.

## Fase 2 — Primeros EAs

- Los 3 bots simples de `18_Primeros_Bots_Laboratorio.md` (Trend Following, Mean Reversion, Breakout).
- Arquitectura estándar común (`03_Arquitectura_Expert_Advisors.md`) validada en la práctica sobre los tres.
- Manejo de errores y eventos de trading (`04_Modelo_Trading_Ordenes_Deals_Posiciones.md`) probado con operaciones reales en demo.

Ejecución detallada: `19_Plan_Puesta_en_Marcha.md` Pasos 11-13.

## Fase 3 — Metodología quant

- Pipeline de validación (`07_Backtesting_Optimizacion_y_Validacion_Quant.md`) ejecutado de forma repetible.
- Automatización de tests (orquestación desde Python, `19_Plan_Puesta_en_Marcha.md` Paso 14).
- Backtest, optimización, forward, stress y reporting funcionando como flujo, no como pasos manuales aislados.

## Fase 4 — Demo prolongada

- Estabilidad operacional de al menos un EA corriendo en demo de forma continua.
- Métricas y revisiones periódicas (`08_Ciclo_Vida_y_Versionado_Estrategias.md` §4) aplicadas con datos reales, no solo diseñadas en teoría.
- Versionado de estrategias probado con al menos una iteración real (v1.0.0 → v1.1.0 tras un cambio justificado).
- Evaluación de despliegue 24/7 (`19_Plan_Puesta_en_Marcha.md` Paso 15) si la demo lo justifica.

## Fase 5 — Automatización mediante IA

- Generación de EA asistida por IA siguiendo `17_Estandar_Desarrollo_EAs_con_IA.md`.
- Revisión de código automatizada (`CodeReviewerAgent`, aunque sea en versión simple al principio).
- Compilación, test y análisis de resultados con intervención humana reducida pero no eliminada (el `HUMAN / POLICY GATE` de `11_Arquitectura_Multiagente_Futura.md` §4 sigue vigente).

## Fase 6 — Multiagente

- Implementación real de los roles descritos en `11_Arquitectura_Multiagente_Futura.md`: `MarketScannerAgent`, `TechnicalAnalystAgent`, `FundamentalAnalystAgent`/`NewsAndMacroAgent`, `RegimeDetectionAgent`, `StrategyDesignerAgent`, `QuantValidatorAgent`, `MQLDeveloperAgent`, `CodeReviewerAgent`, `PortfolioRiskAgent`, `StrategyHealthAgent`.
- Solo se aborda cuando existan (a) un pipeline determinista de validación funcionando con datos reales, y (b) al menos un EA con telemetría real en demo — condición explicada en `11_Arquitectura_Multiagente_Futura.md` §6.

## Fase 7 — Preparación para real

**Explícitamente fuera de alcance de todo lo anterior.** Solo si en el futuro se decide avanzar:

- Selección final de broker para cuenta real (repitiendo y profundizando la verificación de `13_Brokers_MetaTrader5_Espana.md`, esta vez sin atajos).
- Revisión de seguridad completa (`15_Seguridad_Credenciales_y_Permisos.md` §5.3).
- Decisión explícita y documentada en un ADR (`DECISIONS/`) sobre si se habilita `AI-initiated trading` en algún grado, con qué justificación y límites.
- VPS de producción definitivo.
- Límites de riesgo recalculados específicamente para capital real (no reutilizar sin más los valores de laboratorio de `05_Gestion_Riesgo_EAs.md`).
- Capital mínimo, protocolo de aprobación humana, rollback y kill switch definidos con detalle operativo.
- Transición gradual (p. ej. capital simbólico antes de capital significativo).

**La Fase 7 no se ejecuta ahora ni se planifica en detalle en esta investigación** — se deja marcada como destino posible, no como trabajo pendiente inmediato.

## Fuentes consultadas

- Consolidación directa de la sección 30 del prompt maestro y de los documentos 00-19 de esta investigación. No requiere fuentes externas adicionales.
