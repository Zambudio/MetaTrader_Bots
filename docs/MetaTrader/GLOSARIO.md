# Glosario

> Términos técnicos usados de forma consistente en toda la documentación de esta fase. Ver el documento referenciado entre paréntesis para el desarrollo completo.

**MetaTrader 5 (MT5)** — Plataforma multimercado de MetaQuotes: terminal, ejecución, Strategy Tester y (desde build 6060) MCP/IA nativa. (`01`)

**MetaEditor** — IDE de edición/compilación de MQL5, integra AI Assistant desde build 6060. (`01`)

**MQL5** — Lenguaje de programación (sintaxis tipo C++) para Expert Advisors, indicadores, scripts, servicios y librerías en MT5. (`02`)

**Expert Advisor (EA)** — Programa MQL5 de trading algorítmico que puede enviar órdenes; pieza de ejecución determinista central del proyecto. (`02`, `03`)

**Indicator (indicador)** — Programa MQL5 que calcula/dibuja series derivadas de precio; no debe enviar órdenes. (`02`)

**Script** — Programa MQL5 de ejecución puntual bajo demanda. (`02`)

**Symbol (símbolo)** — Instrumento negociable; sus propiedades (tick size, tick value, stop level, etc.) son específicas de cada broker y deben consultarse en tiempo de ejecución. (`01`, `05`)

**Tick** — Actualización de precio bid/ask (y opcionalmente last/volumen) recibida del servidor del broker. (`01`)

**Bar (barra)** — Agregación OHLC de ticks en un periodo (timeframe). (`01`)

**Point** — Unidad mínima de variación de precio de un símbolo según sus `Digits`; no equivale automáticamente a un pip. (`17`)

**Pip** — Unidad de medida de movimiento de precio de uso común en Forex; su relación con `Point`/`Digits` depende del símbolo — no asumir equivalencia fija. (`17`)

**Tick Size** — Variación mínima de precio válida para un símbolo (`SYMBOL_TRADE_TICK_SIZE`). (`05`)

**Tick Value** — Valor monetario de un movimiento de un tick, usado para traducir riesgo en precio a riesgo en dinero. (`05`)

**Spread** — Diferencia entre precio de compra (ask) y venta (bid); coste implícito de cada operación. (`05`, `07`)

**Slippage (deviation)** — Diferencia entre el precio esperado y el precio real de ejecución. (`04`, `05`)

**Order (orden)** — Instrucción enviada al broker; distinta de Deal y Position. (`04`)

**Deal (operación/negociación)** — Ejecución concreta generada por el servidor; una orden puede producir uno o varios deals. (`04`)

**Position (posición)** — Exposición neta o individual resultante, según el modo de cuenta (netting/hedging). (`04`)

**Pending Order (orden pendiente)** — Orden que se activa solo si el precio alcanza un nivel especificado. (`04`)

**Filling Policy** — Política de ejecución de volumen de una orden: FOK, IOC, RETURN, BOC. (`04`)

**FOK (Fill or Kill)** — Se ejecuta el volumen completo o no se ejecuta nada. (`04`)

**IOC (Immediate or Cancel)** — Se ejecuta el volumen disponible hasta el límite pedido; el resto se cancela. (`04`)

**RETURN** — El volumen no cubierto queda como orden pendiente; no disponible en Market Execution. (`04`)

**BOC (Break or Cancel)** — Política asociada a ejecución tipo bolsa/exchange; comportamiento detallado `[PENDIENTE]` de verificación (`04`, `PREGUNTAS_ABIERTAS.md` Q-003).

**Netting** — Modo de cuenta con una única posición neta por símbolo. (`04`)

**Hedging** — Modo de cuenta que permite varias posiciones simultáneas (incluso opuestas) del mismo símbolo. (`04`)

**Magic Number** — Identificador entero que un EA asigna a sus propias órdenes/posiciones para distinguirlas de otras. (`03`)

**Stop Level** — Distancia mínima permitida entre SL/TP (o precio de una pendiente) y el precio actual (`SYMBOL_TRADE_STOPS_LEVEL`). (`04`, `05`)

**Freeze Level** — Distancia dentro de la cual no se permite modificar/cancelar una orden o posición (`SYMBOL_TRADE_FREEZE_LEVEL`). (`04`, `05`)

**Strategy Tester** — Simulador de estrategias de MT5: backtest, optimización, agentes locales/remotos/cloud. (`06`)

**Real Ticks** — Modo de modelado del tester que reproduce ticks reales descargados del broker; el más fiel a la realidad cuando está disponible. (`06`)

**Backtest** — Simulación de una estrategia sobre datos históricos. (`06`, `07`)

**In-Sample** — Periodo de datos usado para diseñar/ajustar una estrategia. (`07`)

**Out-of-Sample (OOS)** — Periodo reservado, no usado en el ajuste, para una primera validación independiente. (`07`)

**Forward Test** — Validación sobre un tramo posterior al periodo optimizado, dentro del propio Strategy Tester. (`07`)

**Walk Forward** — Repetición de optimización+validación desplazando la ventana temporal (expanding o rolling). (`07`)

**Optimization (optimización)** — Búsqueda de parámetros mediante exhaustive search o algoritmo genético, con un criterio de fitness (`OnTester()`/Custom max). (`07`)

**Overfitting (sobreajuste)** — Ajuste excesivo a las particularidades de una muestra concreta, no generalizable; riesgo central del proyecto dado el uso de IA generativa de estrategias. (`07`, `32.` del prompt maestro)

**Drawdown** — Caída de equity desde un máximo previo; se mide en absoluto y relativo. (`07`)

**Expectancy (Expected Payoff)** — Beneficio medio esperado por operación. (`07`)

**Profit Factor** — Beneficio bruto entre pérdida bruta. (`07`)

**Sharpe (ratio)** — Retorno ajustado a volatilidad. (`07`)

**Recovery Factor** — Beneficio neto entre máximo drawdown. (`07`)

**MCP (Model Context Protocol)** — Estándar abierto que permite a aplicaciones comunicarse con agentes de IA; soportado nativamente por MT5 desde build 6060. (`10`)

**VPS (Virtual Private Server)** — Servidor remoto para ejecución 24/7; en MT5 existe una modalidad integrada (MQL5 Virtual Hosting) además de opciones de VPS Windows genérico. (`14`)

**StrategyProposal** — Artefacto formal que especifica una estrategia candidata (reglas, riesgo, plan de validación) antes de cualquier desarrollo o backtest. (`11`)

**StrategyVersion** — Registro versionado e inmutable de una estrategia concreta (código, parámetros, resultados, fechas). (`08`)

**RiskPolicy** — Conjunto de límites de riesgo por operación, por cartera y hard limits no optimizables, comunes a todas las estrategias del proyecto. (`05`)

**AI-initiated trading** — Permiso específico de MT5 (build ≥6060) que autoriza o prohíbe que un agente de IA inicie operaciones de trading directamente; deshabilitado en todo el laboratorio de esta fase. (`10`, `15`)
