# Trading Agents Dashboard

Consola de investigación/estrategia para trading — **no es una plataforma de ejecución**. Permite configurar agentes de análisis (prompt propio, relación de dependencia con otros agentes, tipo de salida), elegir un par/timeframe con su gráfico e indicadores, y lanzar una cadena de análisis que termina en una propuesta de estrategia (indicadores clave, punto de entrada, stop loss, take profit). El resultado se usa manualmente para configurar Expert Advisors en MetaTrader; esta herramienta nunca ejecuta operaciones ni se conecta a ningún broker.

## Funcionalidades

- **Agentes configurables**: prompt propio, dependencias con varios agentes a la vez (espera la respuesta de todos antes de ejecutarse; se fijan desde el modal con una lista de casillas, o arrastrando una tarjeta sobre otra), modelo de IA por agente, tipo de salida (texto libre o estrategia estructurada). Se pueden añadir/eliminar libremente. El esquema de agentes recomendado para un buen análisis (roster, dependencias, validadores, snapshot de mercado real, bucle de reintento) está diseñado en `docs/ESQUEMA_AGENTES_ANALISIS.md`.
- **Cadena de agentes visual**: cada dependencia se dibuja como una flecha individual entre las tarjetas correspondientes — cuando varios agentes comparten padre o hijo, sus flechas comparten tronco pero cada una conserva su propia punta, así que la relación real nunca es ambigua. Arrastrar una tarjeta sobre otra añade esa dependencia sin tocar las que ya tenía; soltarla en un espacio vacío las limpia todas. El sistema bloquea cualquier arrastre o guardado que crearía un ciclo.
- **Motor de ejecución real o simulado**: los agentes llaman a OmniRoute (gateway de IA self-hosted en el NAS, `192.168.1.3:20128`) si `server/.env` tiene `OMNIROUTE_API_KEY` configurada; si no, devuelven salidas simuladas (marcadas `[SIMULADO]`) para poder probar el flujo sin gastar.
- **Conocimiento de apoyo de la wiki**: cada agente (y el generador de MQL5) recibe automáticamente, como contexto adicional, las páginas de `wiki-Traiding/` más relevantes para su rol/estrategia — selección por palabras clave, sin configuración manual. Detalle técnico en `server/README.md`.
- **Gráfico de precio con indicadores**: velas + hasta 11 indicadores técnicos seleccionables (SMA 20/50/200, EMA 20/50, Bollinger, Volumen, RSI, MACD, Estocástico, ATR) renderizados con `lightweight-charts` (multi-panel nativo). Histórico al máximo que permite cada proveedor de datos (ver `server/README.md`).
- **Búsqueda de símbolos estilo TradingView**: modal con pestañas (Favoritos primero, luego Todos / Acciones / Fondos / Forex / Índices / Cripto) para buscar cualquier activo soportado por Twelve Data. Seleccionar un resultado carga su gráfico al momento; el botón de favorito junto al par lo añade a la pestaña de Favoritos.
- **Datos de mercado**: cripto (BTC/USD, ETH/USD) vía Kraken (sin API key); todo lo demás (forex, acciones, materias primas) vía Twelve Data (`TWELVEDATA_API_KEY`).
- **Generación de código MQL5**: desde una propuesta de estrategia, botón "Generar código MQL5" que hace que un LLM escriba un Expert Advisor `.mq5`, lo compile de verdad contra MetaEditor y corrija automáticamente los errores reales que reporte el compilador (hasta 3 intentos), documentando cada corrección confirmada para que las siguientes generaciones no repitan el mismo error. Detalle técnico en `server/README.md`.
- **Validar con backtest**: bajo el código generado, un apartado para arrastrar (o elegir desde el explorador de Windows) el `.log` del Strategy Tester de MetaTrader — calcula win rate, R:R medio, esperanza matemática y resultado neto automáticamente, para no tener que leer el log a mano. Que un EA compile y opere no implica que la estrategia sea rentable; ver `docs/MQL5_LECCIONES_LOGICA_Y_BACKTEST.md` y `docs/BACKTEST_LOG_ANALYZER.md`.

## Arrancar en local

```bash
npm install       # instala dependencias del cliente Y del backend (server/) automáticamente
npm run dev        # levanta cliente (Vite, http://localhost:5173) y backend (Express, http://localhost:5175) a la vez
```

Si prefieres arrancarlos por separado (dos terminales):

```bash
npm run dev:server   # backend
npm run dev:client   # frontend
```

## Siempre activa — `trading.buenchollotech.com`

El dashboard corre 24/7 en el PC (arranque automático al iniciar sesión, vía pm2)
y se publica en `https://trading.buenchollotech.com` con un Cloudflare Tunnel. En
producción un único proceso Express (`npm run start`, puerto 5175) sirve la API y
el frontend compilado (`dist/`). Montaje, operación (`pm2 logs`, `scripts/update.ps1`),
rollback y troubleshooting: **`docs/DESPLIEGUE_WEB_SIEMPRE_ACTIVA.md`**.

## Estructura

- `src/` — frontend React + TypeScript + Tailwind v4, estado con Zustand (`src/lib/store.ts`), llamadas al backend en `src/lib/api.ts`.
  - `components/Dashboard.tsx` — pantalla principal: cabecera, gráfico, cadena de agentes (niveles de ejecución, arrastrar/soltar) y propuesta de estrategia final.
  - `components/PriceChart.tsx` — gráfico e indicadores.
  - `components/PairSelector.tsx` + `components/SymbolSearchModal.tsx` — selector de par y buscador de símbolos con pestañas/favoritos.
  - `components/AgentCard.tsx`, `AgentConfigModal.tsx`, `AgentConnections.tsx`, `StrategyResultCard.tsx` — tarjeta de agente, modal de configuración, flechas de relación entre agentes y resultado final.
  - `components/Mql5CodeBlock.tsx` — resultado de la generación de código MQL5 (código contraíble, estado de compilación, copiar/descargar), lanzada desde `StrategyResultCard.tsx`.
  - `components/BacktestLogAnalyzer.tsx` — drop/selector de archivo para el log del Strategy Tester y tarjeta de métricas (win rate, R:R, resultado neto), lanzada desde `StrategyResultCard.tsx`. Ver `docs/BACKTEST_LOG_ANALYZER.md`.
  - `lib/agentGraph.ts` — cálculo de niveles de ejecución y detección de ciclos en el grafo de dependencias (compartido entre la cadena visual y el modal).
- `server/` — backend Express local. Guarda la configuración de agentes, los pares favoritos y el historial de runs en JSON (`server/src/data/`, no versionado). Ver `server/README.md`.
