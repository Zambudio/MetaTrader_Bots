---
fuente: https://fred.stlouisfed.org/
tipo: web (dashboard) — captura parcial vía búsqueda, no WebFetch directo
capturado: 2026-08-16
---

# FRED (Federal Reserve Economic Data) — visión general

> **Nota de captura importante:** WebFetch devolvió **HTTP 403 Forbidden** al intentar acceder directamente a `https://fred.stlouisfed.org/` (bloqueo anti-bot conocido en este dominio). El contenido de este documento se reconstruyó mediante **búsqueda web** (WebSearch), no es una copia literal de la página. Es, por tanto, una aproximación fiable pero parcial — para explorar series concretas o el diseño real del sitio, visitar directamente https://fred.stlouisfed.org/

## Qué es FRED

FRED es una base de datos en línea mantenida por el Departamento de Investigación del Banco de la Reserva Federal de St. Louis, que reúne cientos de miles de series temporales de datos económicos procedentes de decenas de fuentes nacionales, internacionales, públicas y privadas. Combina los datos con herramientas para entenderlos, interactuar con ellos, visualizarlos y difundirlos (gráficos embebibles, descarga en CSV/Excel, API).

## Cobertura de datos

Más de 800.000 series temporales procedentes de 118 fuentes distintas, cubriendo PIB, empleo, inflación, tipos de interés, comercio exterior y mucho más.

## Categorías de series (ejemplos)

- **Financial Indicators** (indicadores financieros) — miles de series de tipos, spreads, mercados.
- **Monetary Data** (datos monetarios) — agregados monetarios, balance de la Fed, etc.
- Conjuntos de datos históricos y especializados: estadísticas bancarias y monetarias, probabilidades de recesión, datos regionales organizados por estados, regiones censales, regiones BEA/BLS y distritos de la Reserva Federal.

## Uso de esta fuente

FRED es, en la práctica, la fuente de referencia por defecto para obtener el dato histórico "oficial" y descargable de cualquier serie macro de EE. UU. (PIB, IPC, tasa de desempleo, tipos de la Fed, etc.), y para construir gráficos o backtests con series largas y consistentes. No es un calendario de próximos eventos (para eso, ver Trading Economics o el calendario FOMC de la Fed) sino un archivo histórico de datos ya publicados.

## Fuentes consultadas (WebSearch)

- re3data.org — ficha de repositorio de "Federal Reserve Economic Data".
- fred.stlouisfed.org/categories — categorías de datos.
- fred.stlouisfed.org/categories/46 (Financial Indicators), /24 (Monetary Data).
