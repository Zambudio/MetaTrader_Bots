# Registro de desarrollo

Cronología navegable de las decisiones y desarrollos principales de Trading Agents Dashboard. Los documentos enlazados conservan el detalle y la evidencia; este archivo evita reconstruir la historia a partir de archivos sueltos o commits aislados.

## 2026-08

- **15 de agosto — dependencias multipadre.** Se diseñó y planificó el DAG con `dependsOn: string[]`, orden topológico y detección de ciclos. [Diseño](../../wiki-Traiding/proyecto-dashboard/specs/2026-08-15-multi-parent-dependencies-design.md) · [Plan](../../wiki-Traiding/proyecto-dashboard/planes/2026-08-15-multi-parent-dependencies.md).
- **17 de agosto — esquema de seis agentes.** Se fijaron especialistas, gestor de riesgo, validadores paralelos y razonador final, con snapshot de mercado y reintentos acotados. [Arquitectura](arquitectura/esquema-agentes-analisis.md) · [Plan de implementación](../../wiki-Traiding/proyecto-dashboard/planes/2026-08-17-esquema-agentes-analisis.md).
- **19 de agosto — auditoría y plan de remediación.** Se documentó la brecha entre el estándar MQL5 del proyecto y la implementación. [Plan](planes/2026-08-19-plan-remediacion-auditoria-tecnica.md).
- **20 de agosto — prueba E2E real y cierre del bucle.** Se validó el recorrido agentes → estrategia → MQL5 → MetaEditor → backtest y se diagnosticó la diferencia entre veredicto narrativo y rendimiento histórico. [Prueba E2E](../../wiki-Traiding/proyecto-dashboard/informes/2026-08-20-prueba-e2e-agentes-mql5-backtest.md) · [Diagnóstico](../../wiki-Traiding/proyecto-dashboard/informes/2026-08-20-diagnostico-veredicto-vs-backtest-real.md).
- **29 de agosto — selector de modelos, Quality Gate y despliegue.** Se incorporaron fuentes CLI, selección de modelo/esfuerzo, iteración hasta Quality Gate y despliegue mediante PM2 y Cloudflare Tunnel. [Selector](../../wiki-Traiding/proyecto-dashboard/informes/2026-08-29-selector-fuente-modelo-cli.md) · [Quality Gate](../../wiki-Traiding/proyecto-dashboard/informes/2026-08-29-loop-quality-gate-verde-eurusd.md) · [Operación 24/7](operaciones/despliegue-web-24-7.md).
- **30 de agosto — resiliencia operativa.** Los jobs MQL5 pasaron a persistirse y el sistema empezó a detectar MetaTrader abierto antes del backtest headless. [Informe](../../wiki-Traiding/proyecto-dashboard/informes/2026-08-30-resiliencia-generacion-mql5-y-backtest-mt5-abierto.md).

## 2026-09

- **5 de septiembre — reintento con modelo vivo.** Se corrigió el flujo para reintentar una generación fallida usando la selección actual. [Informe](../../wiki-Traiding/proyecto-dashboard/informes/2026-09-05-fix-reintentar-modelo-vivo-openai.md).
- **6 de septiembre — simplificación, noticias y OmniRoute.** Se añadieron presets simples, gestión de noticias, migración de modelos y controles de timeout/detención. [Implementación](../../wiki-Traiding/proyecto-dashboard/informes/2026-09-06-implementacion-boton-y-noticias.md) · [Migración](../../wiki-Traiding/proyecto-dashboard/informes/2026-09-06-migracion-a-omniroute.md) · [Timeout y detención](../../wiki-Traiding/proyecto-dashboard/informes/2026-09-06-timeout-agotado-y-boton-detener-analisis.md).
- **12 de septiembre — guardado y auditoría técnica.** Se habilitó sobrescribir configuraciones con confirmación para plantillas protegidas y se ejecutó la auditoría de seguridad, arquitectura e infraestructura. [Cambio del botón Guardar](historial/2026-09-12-boton-guardar.md) · [Auditoría](auditorias/2026-09-12-auditoria-tecnica-final.md).
- **13 de septiembre — reparación del frontend React.** Se identificó `Maximum update depth exceeded` en un selector compuesto de Zustand, se sustituyó por selectores escalares y el buscador de símbolos pasó a un portal para evitar que el gráfico interceptase clics. Build y flujo `AAPL` verificados sin errores de consola. [Cierre verificado](auditorias/2026-09-13-cierre-auditoria-y-reparacion-react.md).
- **13 de septiembre — organización documental.** Se centralizó la documentación operativa de la web en `docs/`, se creó este registro y se mantuvo la wiki como archivo histórico enlazado.

- **19 de septiembre — Ajustes de IA y errores de CLI visibles.** La generación MQL5 con `claude:sonnet` fallaba con `stderr: (vacío)` porque el adaptador ignoraba el error JSON de stdout. Se corrigieron los adaptadores de Claude y Codex y se añadió la ventana «Ajustes IA»: estado L1 de cada motor, prueba L2 con nonce por modelo, errores normalizados y login guiado, accesible solo desde el propio PC. Se integró y eliminó la guía genérica de motores de IA. [Funcionalidad](funcionalidades/ajustes-ia.md).

## Cómo mantener este registro

Cada desarrollo relevante debe añadir una entrada fechada con un enlace a su plan, decisión, auditoría o informe. Los cambios menores que ya se expliquen suficientemente en el código y el historial Git no necesitan un documento independiente.

