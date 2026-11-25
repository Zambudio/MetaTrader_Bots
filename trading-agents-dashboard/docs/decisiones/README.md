# Registro de decisiones

Este índice recoge las decisiones vigentes de la aplicación y enlaza el documento que conserva su contexto. No duplica el razonamiento detallado. Una decisión nueva solo necesita un ADR independiente cuando sea costosa de revertir, resulte sorprendente sin contexto y proceda de una alternativa real.

| ID | Fecha | Decisión | Estado | Evidencia y razonamiento |
|---|---|---|---|---|
| WEB-001 | 2026-08 | El dashboard investiga y propone estrategias; no ejecuta operaciones ni se conecta a brokers. | Vigente | [README de la aplicación](../../README.md) |
| WEB-002 | 2026-08-15 | Las dependencias de agentes forman un DAG multipadre y se rechazan ciclos. | Vigente | [Diseño](../../../wiki-Traiding/proyecto-dashboard/specs/2026-08-15-multi-parent-dependencies-design.md) |
| WEB-003 | 2026-08-17 | El análisis recomendado separa especialistas, síntesis, validación adversarial y veredicto. | Vigente | [Esquema de agentes](../arquitectura/esquema-agentes-analisis.md) |
| WEB-004 | 2026-08-29 | Producción corre en el PC con PM2 y se publica mediante Cloudflare Tunnel porque MetaTrader y los CLI de suscripción son locales. | Vigente | [Despliegue web 24/7](../operaciones/despliegue-web-24-7.md) |
| WEB-005 | 2026-08-30 | La generación MQL5 usa jobs persistentes; el backtest headless se serializa y exige MetaTrader cerrado. | Vigente | [Informe de resiliencia](../../../wiki-Traiding/proyecto-dashboard/informes/2026-08-30-resiliencia-generacion-mql5-y-backtest-mt5-abierto.md) |
| WEB-006 | 2026-09-12 | Los agentes vivos son la fuente de verdad del siguiente run y las entradas HTTP se validan antes de mutar estado. | Vigente | [Auditoría técnica](../auditorias/2026-09-12-auditoria-tecnica-final.md) |
| WEB-007 | 2026-09-13 | Los selectores de Zustand deben devolver valores estables; los overlays globales se montan fuera de contextos de apilamiento locales. | Vigente | [Reparación React y buscador](../auditorias/2026-09-13-cierre-auditoria-y-reparacion-react.md) |
| WEB-008 | 2026-09-13 | La documentación propia de la web vive en `trading-agents-dashboard/docs`; la wiki conserva conocimiento cuantitativo e informes históricos ya integrados. | Vigente | [Índice documental](../README.md) |
| WEB-009 | 2026-09-19 | Los endpoints de Ajustes de IA (`/api/ai/*`: login de CLIs y pruebas de modelos) solo responden desde el propio PC: por `localhost`, o por el enlace público si `cf-connecting-ip` es una dirección del PC. Se rechaza al resto de Internet, a la LAN y a los orígenes ajenos. La web pública sigue sin login. | Vigente | [Ajustes de IA](../funcionalidades/ajustes-ia.md#seguridad-solo-desde-el-propio-pc) |

