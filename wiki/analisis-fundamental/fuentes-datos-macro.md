---
tags: [analisis-fundamental, fuentes, datos-macro, referencia-rapida]
updated: 2026-08-16
fuentes: [raw/analisis-fundamental/fred-overview.md, raw/analisis-fundamental/bis-overview.md, raw/analisis-fundamental/trading-economics-calendario.md, raw/analisis-fundamental/bis-wp1290-speed-premium.pdf]
---

# Fuentes de datos macro — catálogo de referencia rápida

Catálogo de dónde consultar datos macroeconómicos fiables, pensado para cuando haga falta un dato concreto (serie histórica, próximo evento, contexto regulatorio) sin tener que recordar qué sitio ofrece qué. Todas estas fuentes son dashboards/sitios vivos — lo que sigue describe **qué ofrece cada una y para qué sirve**, no valores concretos (esos cambian constantemente; consultar siempre la fuente en vivo enlazada).

## FRED (Federal Reserve Economic Data)

**URL**: https://fred.stlouisfed.org/

**Qué es**: base de datos del Banco de la Reserva Federal de St. Louis con más de 800.000 series temporales de datos económicos, procedentes de 118 fuentes distintas (PIB, empleo, inflación, tipos de interés, comercio exterior, agregados monetarios, etc.).

**Para qué sirve**: es la referencia por defecto para obtener el **dato histórico oficial y descargable** de cualquier serie macro de EE. UU. — series largas y consistentes, exportables a CSV/Excel, con gráficos embebibles y API. Ideal para construir backtests o comparar la evolución de un indicador a lo largo de años/décadas.

**No es**: un calendario de próximos eventos (para eso, ver Trading Economics más abajo) — FRED es un archivo de datos ya publicados, no un calendario de publicaciones futuras.

**Nota de captura**: el acceso directo vía WebFetch devolvió HTTP 403 (bloqueo anti-bot conocido en este dominio). La descripción de arriba se reconstruyó vía búsqueda web — ver [`raw/analisis-fundamental/fred-overview.md`](../raw/analisis-fundamental/fred-overview.md) para el detalle y las fuentes secundarias usadas.

## BIS (Bank for International Settlements)

**URL**: https://www.bis.org/

**Qué es**: organización internacional de cooperación entre bancos centrales, con datos y estadísticas de escala global (deuda transfronteriza, crédito, mercados de derivados) vía su BIS Data Portal, además de investigación propia (working papers) y el marco regulatorio bancario (Comité de Basilea).

**Para qué sirve**: contexto estructural y de riesgo sistémico más que trading táctico del día a día — estadísticas agregadas globales que no suelen estar en FRED o Trading Economics, y papers académicos rigurosos sobre microestructura de mercado, regulación y estabilidad financiera.

**Ejemplo de investigación disponible**: BIS Working Paper 1290, *"The speed premium: high-frequency trading and the cost of capital"* (Aquilina, Ibikunle, Rzayev y Wang, septiembre 2025) — estudia cómo el trading de alta frecuencia afecta al coste de capital de las empresas, usando actualizaciones tecnológicas de NASDAQ como experimento natural. Conclusión principal: en promedio el HFT eleva el coste de capital, pero el efecto varía por tipo de acción (lo eleva en acciones de baja beta al amplificar el riesgo sistemático; lo reduce en acciones muy líquidas al bajar la prima de liquidez). PDF completo guardado en [`raw/analisis-fundamental/bis-wp1290-speed-premium.pdf`](../raw/analisis-fundamental/bis-wp1290-speed-premium.pdf). Es un ejemplo del tipo de investigación académica que publica el BIS — relevante para entender microestructura de mercado, no para el trading discrecional del día a día.

Ver también [bancos-centrales.md](bancos-centrales.md) para el rol regulatorio del BIS (Comité de Basilea).

## Trading Economics — calendario económico

**URL**: https://tradingeconomics.com/calendar

**Qué es**: calendario económico que cubre 150+ países y regiones, con las próximas publicaciones de datos y eventos de política monetaria, incluyendo valor actual, previo, consenso/previsión y una calificación de impacto por evento.

**Para qué sirve**: la herramienta de referencia rápida del día a día para saber **qué eventos hay programados hoy/esta semana** y su impacto esperado — el complemento natural de FRED (que da el histórico) y del BIS (que da contexto estructural). Ver [calendario-economico.md](calendario-economico.md) para cómo usarlo en la práctica.

## Fed — calendario FOMC (fuente oficial de EE. UU.)

**URL**: https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm

**Qué es**: el calendario oficial y autoritativo de las reuniones del FOMC (decisión de tipos de EE. UU.), con fechas de reuniones, publicación de actas y materiales de proyecciones económicas.

**Para qué sirve**: fuente primaria para la fecha exacta de la próxima decisión de tipos de la Fed — evento de mayor impacto en USD e índices bursátiles estadounidenses. Ver detalle en [`raw/analisis-fundamental/fed-calendario-fomc.md`](../raw/analisis-fundamental/fed-calendario-fomc.md).

## BCE — Economic Bulletin (fuente oficial de la eurozona)

**URL**: https://www.ecb.europa.eu/press/economic-bulletin/html/index.en.html

**Qué es**: la publicación periódica (8 veces/año) donde el BCE expone el análisis económico y monetario que sustenta sus decisiones de política.

**Para qué sirve**: fuente primaria para entender el razonamiento del BCE detrás de sus decisiones de tipos — útil para anticipar giros de política antes de que se reflejen en el precio del EUR o los índices europeos. Ver detalle en [`raw/analisis-fundamental/ecb-economic-bulletin.md`](../raw/analisis-fundamental/ecb-economic-bulletin.md).

## Resumen: qué fuente usar según la necesidad

| Necesito... | Fuente |
|---|---|
| El histórico de una serie macro de EE. UU. (PIB, IPC, tipos...) | FRED |
| Saber qué eventos macro hay esta semana y su impacto | Trading Economics |
| La fecha exacta de la próxima decisión de la Fed | Calendario FOMC (Fed) |
| El razonamiento detrás de la última decisión del BCE | ECB Economic Bulletin |
| Contexto regulatorio bancario o investigación macro-financiera rigurosa | BIS |

## Ver también

Esta página cataloga *dónde* consultar cada dato. Para *qué significa* cada indicador y cómo mueve los mercados, ver [indicadores-macro-clave.md](indicadores-macro-clave.md); para cómo se relacionan entre sí distintas clases de activos, ver [correlaciones-entre-activos.md](correlaciones-entre-activos.md).

## Fuentes

- [FRED — overview](../raw/analisis-fundamental/fred-overview.md) — descripción de la base de datos de series temporales de la Fed de St. Louis (reconstruida vía búsqueda web tras bloqueo HTTP 403 del sitio).
- [BIS — overview](../raw/analisis-fundamental/bis-overview.md) — página principal del Bank for International Settlements: BIS Data Portal, investigación propia y marco regulatorio (Comité de Basilea).
- [Trading Economics — calendario económico](../raw/analisis-fundamental/trading-economics-calendario.md) — captura del calendario económico que cubre 150+ países y regiones.
- [BIS Working Paper 1290 — The speed premium](../raw/analisis-fundamental/bis-wp1290-speed-premium.pdf) — estudio sobre cómo el trading de alta frecuencia afecta al coste de capital de las empresas.

Todas son dashboards o publicaciones vivas — esta página describe su naturaleza y uso, no valores concretos, que quedan desactualizados rápidamente.
