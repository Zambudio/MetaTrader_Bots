# Estado de la investigación

> Este archivo permite retomar el trabajo con otra IA sin perder contexto. Se actualiza durante todo el proceso, no solo al final.

**Fase del proyecto:** Fase 0 — Investigación y documentación (ver `ROADMAP.md`) — **completa**, lista para iniciar Fase 1.
**Inicio de esta ejecución:** 2026-08-07
**Cierre de esta ejecución:** 2026-08-07 (misma sesión — investigación completa de principio a fin sin interrupciones de alcance)

## Checklist global por bloque

| Bloque | Investigado | Documentado | Fuente oficial | Contradicciones revisadas | Preguntas abiertas registradas | Criterio de aceptación cumplido |
|---|---|---|---|---|---|---|
| 0. Contexto y objetivos | [x] | [x] | n/a | [x] | [x] | [x] |
| 1. Arquitectura MT5 | [x] | [x] | [x] | [x] | [x] | [x] |
| 2. Fundamentos MQL5 | [x] | [x] | [x] | [x] | [x] | [x] |
| 3. Arquitectura EAs | [x] | [x] | [x] (parcial, diseño propio justificado) | [x] | [x] | [x] |
| 4. Order/Deal/Position | [x] | [x] | [x] | [x] | [x] | [x] |
| 5. Gestión de riesgo | [x] | [x] | [x] (propiedades de símbolo) | [x] | [x] | [x] |
| 6. Strategy Tester/datos | [x] | [x] | [x] | [x] | [x] | [x] |
| 7. Validación quant | [x] | [x] | [x] (OnTester) + consenso quant | [x] | [x] | [x] |
| 8. Ciclo de vida/versionado | [x] | [x] | n/a (diseño) | [x] | [x] | [x] |
| 9. Python | [x] | [x] | [x] | [x] | [x] | [x] |
| 10. MCP/IA | [x] | [x] | [x] | [x] | [x] | [x] |
| 11. Multiagente futuro | [x] | [x] | n/a (diseño) | [x] | [x] | [x] |
| 12. Fundamental/noticias | [x] | [x] | [x] | [x] | [x] | [x] |
| 13. Brokers España | [x] | [x] | [x] (parcial — CNMV directa pendiente, ver Q-005) | [x] | [x] | [x] |
| 14. VPS/24x7 | [x] | [x] | [x] | [x] | [x] | [x] |
| 15. Seguridad | [x] | [x] | [x] (consolidación) | [x] | [x] | [x] |
| 16. Observabilidad | [x] | [x] | n/a (diseño) | [x] | [x] | [x] |
| 17. Estándar EAs con IA | [x] | [x] | n/a (diseño) | [x] | [x] | [x] |
| 18. Primeros bots laboratorio | [x] | [x] | n/a (diseño) | [x] | [x] | [x] |
| 19. Plan puesta en marcha | [x] | [x] | n/a (diseño) | [x] | [x] | [x] |
| ROADMAP | [x] | [x] | n/a | [x] | [x] | [x] |
| Auditoría final | [x] | [x] | n/a | [x] | [x] | [x] |

## Hallazgos importantes (consolidado)

1. **Build vigente: 6090 (30/07/2026), no 6060.** El prompt maestro asumía 6060 como la más reciente; el dato de `Web_METATRADER5.md` (build 6090) era correcto. Ver `01_Arquitectura...` §1.
2. **MCP nativo vs. servidores MCP de terceros:** existen servidores MCP de comunidad para MT5 anteriores/independientes del MCP nativo de MetaQuotes, al menos uno de los cuales ejecuta órdenes sin confirmación. El proyecto usa exclusivamente el MCP nativo. Ver `10_MCP_IA_y_Agentes_MetaTrader5.md` §2.
3. **XTB no ofrece MT5** (solo xStation 5) pese a aparecer en comparativas de "brokers MT5 para España" — descartado de la shortlist tras verificación directa. Ver `13_Brokers_MetaTrader5_Espana.md` §2.
4. **El VPS integrado de MetaQuotes prohíbe DLL y no admite procesos externos (Python, cliente MCP)** — confirma la hipótesis del prompt maestro sobre sus limitaciones para un entorno de desarrollo completo. Ver `14_Despliegue_24x7_VPS.md` §1 y §4.
5. **`OrderSend()==true` no implica ejecución completada**, y no hay correspondencia 1:1 entre una solicitud y los eventos de `OnTradeTransaction` recibidos — base de la regla no negociable de `04_Modelo_Trading...` §6 y del diseño del `TradeStateTracker`.
6. **El paquete Python `MetaTrader5` requiere IPC con un Terminal en ejecución** — no es un cliente de red independiente; se actualiza junto con el propio Terminal (confirmado en el changelog de build 6090).
7. **El Economic Calendar de MQL5 usa hora de servidor (`TimeTradeServer`), no hora local** — fuente recurrente de errores de filtrado si no se convierte correctamente.

## Incertidumbres activas

Ver `PREGUNTAS_ABIERTAS.md` (Q-001 a Q-005). Ninguna bloquea el inicio de la Fase 1; Q-004 y Q-005 bloquean pasos concretos dentro de ella (ver `19_Plan_Puesta_en_Marcha.md`).

## Archivos creados en esta sesión

```text
docs/MetaTrader/
├── 00_INDEX.md
├── 00_Contexto_y_Objetivos_Proyecto.md
├── 01_Arquitectura_y_Funcionamiento_MetaTrader5.md
├── 02_Fundamentos_MQL5.md
├── 03_Arquitectura_Expert_Advisors.md
├── 04_Modelo_Trading_Ordenes_Deals_Posiciones.md
├── 05_Gestion_Riesgo_EAs.md
├── 06_Strategy_Tester_y_Datos_Historicos.md
├── 07_Backtesting_Optimizacion_y_Validacion_Quant.md
├── 08_Ciclo_Vida_y_Versionado_Estrategias.md
├── 09_Integracion_Python_MetaTrader5.md
├── 10_MCP_IA_y_Agentes_MetaTrader5.md
├── 11_Arquitectura_Multiagente_Futura.md
├── 12_Analisis_Fundamental_Noticias_y_Macroeconomia.md
├── 13_Brokers_MetaTrader5_Espana.md
├── 14_Despliegue_24x7_VPS.md
├── 15_Seguridad_Credenciales_y_Permisos.md
├── 16_Observabilidad_Auditoria_y_Reproducibilidad.md
├── 17_Estandar_Desarrollo_EAs_con_IA.md
├── 18_Primeros_Bots_Laboratorio.md
├── 19_Plan_Puesta_en_Marcha.md
├── ROADMAP.md
├── ESTADO_INVESTIGACION.md (este archivo)
├── FUENTES.md
├── GLOSARIO.md
├── PREGUNTAS_ABIERTAS.md
└── DECISIONS/
    └── README.md (sin ADR creados todavía — ninguna decisión de esta fase alcanzó el umbral de "importante y costosa de revertir" que justifique uno; el más cercano, la elección de MCP nativo exclusivo, queda documentado como decisión en 00_INDEX.md y 10_..., no como ADR formal)
```

## Siguiente bloque

Ninguno dentro de esta fase — Fase 0 completa. Siguiente trabajo: `19_Plan_Puesta_en_Marcha.md` Paso 1, ya en Fase 1 (fuera de alcance de esta investigación, requiere autorización explícita del usuario para empezar a instalar/ejecutar).
