# Índice — Planes de ingeniería del dashboard

> Planes de implementación, specs de diseño e informes de prueba/auditoría de `trading-agents-dashboard/` (la consola web de agentes de IA, ver [`../../trading-agents-dashboard/README.md`](../../trading-agents-dashboard/README.md)). Los planes y specs se escriben con el flujo brainstorming → spec → plan → ejecución de la skill `superpowers:writing-plans` antes de implementarse; los informes (`informes/`) son al revés — registran hallazgos y correcciones de una implementación ya hecha, verificados en vivo. Distinto de [`../proyecto-mt5-bots/`](../proyecto-mt5-bots/00_INDEX.md), que es investigación de ingeniería sobre MetaTrader 5/MQL5, no sobre el dashboard.

## Informes (`informes/`)

- [`2026-08-20-prueba-e2e-agentes-mql5-backtest.md`](informes/2026-08-20-prueba-e2e-agentes-mql5-backtest.md) — prueba end-to-end real (sin mocks) del ciclo completo agentes → estrategia → MQL5 → backtest: 9 problemas reales encontrados y corregidos, tres críticos (detección de backtest rota por codificación UTF-8/UTF-16LE, Refutador/Razonador exigiendo datos imposibles de aportar, validación R:R sin reintento). Deja documentada una limitación de entorno conocida (símbolo BTCUSD inexistente en la cuenta demo conectada) y trabajo pendiente (Quality Gate aún no visto en verde con operaciones reales).

## Planes (`planes/`)

- [`2026-08-15-multi-parent-dependencies.md`](planes/2026-08-15-multi-parent-dependencies.md) — plan de implementación para que un agente pueda depender de varios agentes padre a la vez (`dependsOn: string[]`), con ordenamiento topológico de Kahn y detección de ciclos multi-rama. Spec: [`specs/2026-08-15-multi-parent-dependencies-design.md`](specs/2026-08-15-multi-parent-dependencies-design.md).
- [`2026-08-17-esquema-agentes-analisis.md`](planes/2026-08-17-esquema-agentes-analisis.md) — plan de implementación del esquema de 6 agentes de análisis (2 especialistas → Gestor de Riesgos → 2 validadores en paralelo → Razonador con veredicto), snapshot de mercado real inyectado en el contexto y bucle de reintento acotado a 3 intentos. Spec: [`trading-agents-dashboard/docs/ESQUEMA_AGENTES_ANALISIS.md`](../../trading-agents-dashboard/docs/ESQUEMA_AGENTES_ANALISIS.md).

## Specs (`specs/`)

- [`2026-08-15-multi-parent-dependencies-design.md`](specs/2026-08-15-multi-parent-dependencies-design.md) — diseño aprobado (aprobado 2026-08-15) previo al plan de arriba: por qué `dependsOn` pasa de `string | null` a `string[]`, y qué módulos del motor de orquestación y del frontend se ven afectados.
- [`2026-08-19-agent-config-presets-design.md`](specs/2026-08-19-agent-config-presets-design.md) — diseño aprobado (aprobado 2026-08-19) para el log de agentes colapsable y las configuraciones nombradas y guardables de la cadena de agentes (con activar/desactivar agentes por configuración). Pendiente de plan de implementación.

## Estado

Los dos planes de la sección anterior ya se ejecutaron (ver el commit de fusión `fc25134` para el esquema de agentes de análisis en `git log`); esos documentos quedan como registro histórico de diseño, no como trabajo pendiente. El spec de 2026-08-19 está aprobado pero aún sin plan de implementación ni ejecutar. El informe de 2026-08-20 verificó en producción, por primera vez con infraestructura real, el esquema de agentes y el pipeline de backtest ya implementados — corrigió 9 problemas reales encontrados en el proceso (ver detalle en el propio informe) y deja pendiente completar un ciclo con el Quality Gate en verde con operaciones reales. Si se detecta que el código diverge de lo aquí descrito, no se asume que el documento manda — se verifica contra el código real y, si el plan quedó obsoleto, se anota aquí en vez de borrarlo silenciosamente.
