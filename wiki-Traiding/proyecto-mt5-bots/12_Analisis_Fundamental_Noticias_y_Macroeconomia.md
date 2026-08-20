# Análisis fundamental, noticias y macroeconomía

> **Estado:** BORRADOR
> **Última revisión:** 2026-08-07
> Se estudia desde el principio aunque se implemente mucho más tarde (`NewsAndMacroAgent` en `11_Arquitectura_Multiagente_Futura.md`).

## 1. Capacidades nativas MT5 [VERIFICADO]

MQL5 incluye una API de **Economic Calendar** nativa:

| Función | Uso |
|---|---|
| `CalendarEventById` / `CalendarEventByCurrency` / `CalendarEventByCountry` | Obtener descripción de eventos del calendario (metadato del tipo de evento) |
| `CalendarValueHistory` / `CalendarValueHistoryByEvent` | Histórico de valores publicados de un evento (o de todos) en un rango de fechas |
| `CalendarValueById` / `CalendarValueLast` / `CalendarValueLastByEvent` | Último valor conocido / valor concreto por ID |

Puntos clave verificados:

- **Todas las funciones de calendario usan la hora del servidor de trading (`TimeTradeServer`)**, no la hora local del usuario — coherente con `01_Arquitectura_y_Funcionamiento_MetaTrader5.md` §4. Esto es crítico: comparar timestamps del calendario con la hora local sin conversión es una fuente directa de errores de filtrado ("¿falta 1 minuto o 61 minutos para el NFP?").
- La estructura `MqlCalendarValue` codifica algunos campos como enteros escalados (dividir por 1.000.000 para el valor real) y usa `LONG_MIN` como marcador de "sin valor" — detalle de implementación a tener en cuenta al parsear.
- Filtrado disponible por país (`country_code`, p. ej. `"US"`, `"EU"`) y por divisa.
- Importancia de los eventos: la estructura de evento incluye un nivel de importancia (clasificación del propio calendario de MetaQuotes) — su fuente y criterio de clasificación exacto es `[DEPENDIENTE DEL BROKER/PROVEEDOR DEL CALENDARIO]`, ya que el calendario lo distribuye MetaQuotes/el broker, no cada regulador directamente.
- **Noticias de la plataforma:** feed de noticias financieras del Terminal, cobertura y latencia `[DEPENDIENTE DEL BROKER]` (algunos brokers limitan o no incluyen ciertas fuentes).
- **Limitaciones de históricos y licencias:** la profundidad histórica del calendario y de las noticias para backtesting `[PENDIENTE]` de verificación exacta (no se ha encontrado un límite documentado explícito de "N años"); debe comprobarse empíricamente en la Fase 1 antes de diseñar cualquier filtro de noticias backtesteable.

## 2. Fuentes externas — qué no cubre MT5

MT5 no sustituye a un proveedor de noticias/datos fundamentales dedicado. Lo que **no cubre de forma nativa completa**, según necesidad futura:

- Noticias financieras de alta granularidad (titulares en tiempo real más allá del feed integrado del broker).
- Comunicados textuales completos de bancos centrales (el calendario da el dato, no el comunicado).
- Fuentes regulatorias oficiales (SEC/ESMA/CNMV — relevante si en el futuro se opera algo sujeto a esa supervisión directa).
- Earnings y corporate actions detallados (relevante solo si se opera acciones/CFDs de acciones individuales).
- Datos on-chain (fuera de alcance salvo que se estudie cripto en el futuro — no es el foco actual).
- Sentimiento de mercado (solo si se justifica con un caso de uso concreto — no añadir por moda).

**Regla del proyecto:** no se contrata ni selecciona ningún servicio de pago en esta fase. Se documentan opciones y su naturaleza (gratuita/pago, con o sin licencia clara para uso en backtesting reproducible), pero la decisión de contratar algo queda para cuando un `NewsAndMacroAgent` real lo necesite y se justifique con un caso de uso concreto — no antes.

## 3. Diseño conceptual: contexto, no órdenes

Un agente de noticias **no debe generar una orden como salida primaria**. Su salida es contexto estructurado que otros agentes consumen:

```yaml
news_context:
  event: "Decisión de tipos BCE"
  assets_affected: [EUR, DAX, "bancos europeos"]
  directional_bias: "incierto hasta la rueda de prensa"
  confidence: media
  time_horizon: "horas-días"
  expected_volatility: alta
  source: "Economic Calendar MT5 / comunicado oficial BCE"
  expiry: "T+2 días tras el evento"
  suggested_action:
    risk_filter: "NO_NEW_ENTRIES en ventana T-15min a T+30min"
    idea_generation: "evaluar breakout tras confirmación, no antes"
```

## 4. Dos usos distintos, no mezclados

### Uso A — generar ideas

```text
cambio de política monetaria → activos afectados → hipótesis → StrategyDesignerAgent
```

Alimenta la capa de investigación; produce, como mucho, una `MarketThesis` que un `StrategyDesignerAgent` puede convertir en `StrategyProposal` formal — nunca una orden directa.

### Uso B — filtro de riesgo

```text
NFP en 15 minutos → strategy policy → NO NEW ENTRIES
```

Alimenta el `NewsFilter` del EA (`03_Arquitectura_Expert_Advisors.md`) como una regla determinista y **backtesteable**: una ventana de tiempo alrededor de eventos de importancia ≥ X en la que el EA no abre nuevas posiciones. Esto sí puede (y debe) programarse dentro del EA de forma determinista, consultando el calendario con antelación — no requiere un LLM en el bucle de ejecución.

**No mezclar automáticamente ambos usos:** para algunas estrategias puede tener sentido operar durante eventos (buscando el movimiento), para otras evitarlos por completo. La decisión de qué uso aplica a cada EA es parte de su `StrategyProposal`, no una regla global implícita.

## 5. Riesgos a evitar explícitamente

- **Reaccionar a noticias antiguas:** comprobar siempre el timestamp real de publicación (`TimeTradeServer`) contra el momento de evaluación, no confiar en el orden de llegada a un feed.
- **Duplicar eventos:** el mismo dato puede aparecer revisado (preliminar → revisado → final); un filtro mal diseñado podría contarlo dos veces.
- **Usar titulares sin timestamp fiable:** cualquier fuente externa (fuera del Economic Calendar de MT5) debe tener timestamp verificable para ser usable en un filtro backtesteable.
- **Confundir hora local con hora del broker:** ver §1 — regla crítica y recurrente en todo el proyecto (`01_Arquitectura...`).
- **Look-ahead en backtesting de filtros fundamentales:** el filtro debe usar únicamente la información que habría estado disponible en el instante simulado (por ejemplo, la importancia y hora *programada* del evento, no el valor *publicado* después si el filtro decide antes de la publicación).
- **Usar fuentes cuyo histórico no pueda reproducirse:** si una fuente externa no permite reconstruir exactamente qué se sabía en cada instante pasado, no es apta para un filtro backtesteable — como mucho sirve para generación de ideas en tiempo real (Uso A), nunca para Uso B con pretensión de validación cuantitativa.

## 6. Qué necesitaría un futuro `NewsAndMacroAgent`

- Acceso de lectura al Economic Calendar de MT5 (vía MQL5 nativo o vía Python/`MetaTrader5` si se orquesta desde fuera del EA).
- Una fuente externa opcional para contexto cualitativo (Uso A), con timestamp fiable, evaluada solo cuando haya un caso de uso concreto.
- Un formato de salida estructurado (ver §3) consumible tanto por `StrategyDesignerAgent` (Uso A) como por la generación de reglas de `NewsFilter` dentro de una `StrategyProposal` (Uso B).
- **No formar parte del bucle de ejecución del EA:** su trabajo termina en producir contexto o en alimentar, en tiempo de diseño, una regla determinista que el EA ejecutará solo — coherente con el principio central del proyecto.

## Fuentes consultadas

- F024 — "Economic Calendar" (índice) y subpáginas `CalendarEventById`, `CalendarValueHistory`, estructura `MqlCalendarValue`. https://www.mql5.com/en/docs/calendar — MetaQuotes/MQL5 — OFICIAL — consultado 2026-08-07.
- Diseño de `news_context` y separación Uso A/Uso B: [INFERIDO], basado directamente en las secciones 22 y 33 del prompt maestro.
