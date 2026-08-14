# Trading Agents Dashboard

Consola de investigación/estrategia para trading — **no es una plataforma de ejecución**. Permite configurar agentes de análisis (prompt propio, relación de dependencia con otros agentes, tipo de salida), elegir un par/timeframe con su gráfico e indicadores, y lanzar una cadena de análisis que termina en una propuesta de estrategia (indicadores clave, punto de entrada, stop loss, take profit). El resultado se usa manualmente para configurar Expert Advisors en MetaTrader; esta herramienta nunca ejecuta operaciones ni se conecta a ningún broker.

## Funcionalidades

- **Agentes configurables**: prompt propio, relación de dependencia secuencial con otro agente (espera su respuesta antes de ejecutarse), modelo de IA por agente, tipo de salida (texto libre o estrategia estructurada). Se pueden añadir/eliminar libremente.
- **Motor de ejecución real o simulado**: los agentes llaman a OmniRoute (gateway de IA self-hosted en el NAS, `192.168.1.3:20128`) si `server/.env` tiene `OMNIROUTE_API_KEY` configurada; si no, devuelven salidas simuladas (marcadas `[SIMULADO]`) para poder probar el flujo sin gastar.
- **Gráfico de precio con indicadores**: velas + hasta 11 indicadores técnicos seleccionables (SMA 20/50/200, EMA 20/50, Bollinger, Volumen, RSI, MACD, Estocástico, ATR) renderizados con `lightweight-charts` (multi-panel nativo). Histórico al máximo que permite cada proveedor de datos (ver `server/README.md`).
- **Búsqueda de símbolos estilo TradingView**: modal con pestañas (Favoritos primero, luego Todos / Acciones / Fondos / Forex / Índices / Cripto) para buscar cualquier activo soportado por Twelve Data. Seleccionar un resultado carga su gráfico al momento; el botón de favorito junto al par lo añade a la pestaña de Favoritos.
- **Datos de mercado**: cripto (BTC/USD, ETH/USD) vía Kraken (sin API key); todo lo demás (forex, acciones, materias primas) vía Twelve Data (`TWELVEDATA_API_KEY`).

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

## Estructura

- `src/` — frontend React + TypeScript + Tailwind v4, estado con Zustand (`src/lib/store.ts`), llamadas al backend en `src/lib/api.ts`.
  - `components/PriceChart.tsx` — gráfico e indicadores.
  - `components/PairSelector.tsx` + `components/SymbolSearchModal.tsx` — selector de par y buscador de símbolos con pestañas/favoritos.
  - `components/AgentCard.tsx`, `AgentConfigModal.tsx`, `StrategyResultCard.tsx` — cadena de agentes y resultado final.
- `server/` — backend Express local. Guarda la configuración de agentes, los pares favoritos y el historial de runs en JSON (`server/src/data/`, no versionado). Ver `server/README.md`.
