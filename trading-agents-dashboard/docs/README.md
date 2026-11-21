# Documentación de Trading Agents Dashboard

Este es el índice canónico de la documentación de la aplicación web. Todo documento nuevo sobre su frontend, backend, operación, decisiones, auditorías o evolución debe guardarse en una de las categorías de esta carpeta y enlazarse desde aquí o desde el registro de desarrollo.

## Puntos de entrada

- [README de la aplicación](../README.md): propósito, funcionalidades, arranque y estructura del código.
- [README del backend](../server/README.md): API, orquestador, almacenamiento y pipeline MQL5.
- [Registro cronológico de desarrollo](REGISTRO_DESARROLLO.md): evolución del producto y evidencias por fecha.
- [Registro de decisiones](decisiones/README.md): decisiones vigentes y documento que conserva su razonamiento.
- [Índice histórico de la wiki](../../wiki-Traiding/proyecto-dashboard/00_INDEX.md): planes, especificaciones e informes extensos anteriores a esta organización.

## Arquitectura

- [Esquema de agentes de análisis](arquitectura/esquema-agentes-analisis.md): DAG de agentes, dependencias, validadores y bucle de reintento.

## Funcionalidades

- [Analizador de logs de backtest](funcionalidades/analizador-logs-backtest.md): carga de logs del Strategy Tester y métricas calculadas.
- [Ajustes de IA](funcionalidades/ajustes-ia.md): estado de los motores (Claude, Codex, OmniRoute), prueba real de cada modelo con nonce, errores normalizados y login guiado desde la web.

## Operaciones

- [Despliegue web 24/7](operaciones/despliegue-web-24-7.md): PM2, Cloudflare Tunnel, actualización, rollback y troubleshooting.

## Referencia técnica

- [Errores conocidos de generación MQL5](referencia/mql5-errores-conocidos.md): base autogenerada a partir de correcciones confirmadas por compilación.
- [Lecciones de lógica y backtest](referencia/mql5-lecciones-logica-y-backtest.md): fallos semánticos que no detecta el compilador.

## Planes y auditorías

- [Plan de remediación de la auditoría técnica — 2026-08-19](planes/2026-08-19-plan-remediacion-auditoria-tecnica.md).
- [Auditoría técnica final — 2026-09-12](auditorias/2026-09-12-auditoria-tecnica-final.md).
- [Cierre de auditoría y reparación de React — 2026-09-13](auditorias/2026-09-13-cierre-auditoria-y-reparacion-react.md).

## Historial de cambios

- [Botón para sobrescribir configuraciones — 2026-09-12](historial/2026-09-12-boton-guardar.md).

## Convenciones

1. Usar nombres en minúsculas y `kebab-case`; los registros fechados empiezan por `AAAA-MM-DD`.
2. Indicar fecha, estado y alcance cuando el documento sea un plan, auditoría o cambio.
3. Distinguir hechos verificados, decisiones, hipótesis y trabajo pendiente.
4. Mantener enlaces Markdown reales; no dejar documentos huérfanos ni referencias únicamente entre backticks.
5. No guardar documentación de la web en la raíz del monorepo ni suelta en la raíz de la aplicación.
6. El conocimiento cuantitativo general y la investigación específica de MetaTrader/MQL5 siguen perteneciendo a [la wiki](../../wiki-Traiding/index.md).

