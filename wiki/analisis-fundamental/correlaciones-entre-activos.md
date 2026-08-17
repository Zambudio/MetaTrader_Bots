---
tags: [analisis-fundamental, correlaciones, dxy, oro, petroleo, risk-on-risk-off, forex]
updated: 2026-08-16
fuentes: [raw/analisis-fundamental/ice-us-dollar-index-faq.pdf, raw/analisis-fundamental/chicagofed-what-drives-gold-prices.pdf, raw/analisis-fundamental/bankofcanada-understanding-exchange-rates.md, raw/analisis-fundamental/oanda-risk-on-risk-off.md, raw/analisis-fundamental/forexcom-currency-correlation.md]
---

# Correlaciones entre activos

## Por qué importa

Ningún mercado se mueve aislado. El dólar, el oro, el petróleo, las divisas y los índices bursátiles están conectados por mecanismos estructurales (composición de un índice, dependencia de exportaciones de un país, coste de oportunidad de mantener un activo) y por el sentimiento colectivo del mercado (apetito o aversión al riesgo). Entender estas relaciones sirve para dos cosas muy prácticas en trading: **anticipar** cómo puede reaccionar un activo ante un movimiento en otro relacionado, y **evitar falsa diversificación** — abrir varias posiciones que en realidad son la misma apuesta disfrazada.

Estas relaciones no son leyes físicas: son tendencias estadísticas que se cumplen la mayor parte del tiempo pero pueden debilitarse, invertirse temporalmente, o "romperse" en episodios de estrés extremo (ver la sección de risk-on/risk-off más abajo). Conviene tratarlas como contexto probabilístico, no como certeza.

## El índice dólar (DXY) y su relación con EUR/USD

El US Dollar Index (DXY, a veces llamado "Dixie") mide la fortaleza del dólar frente a una cesta de seis divisas. Se calcula como una media geométrica ponderada:

**DXY = 50.14348112 × EURUSD⁻⁰·⁵⁷⁶ × USDJPY⁰·¹³⁶ × GBPUSD⁻⁰·¹¹⁹ × USDCAD⁰·⁰⁹¹ × USDSEK⁰·⁰⁴² × USDCHF⁰·⁰³⁶**

Pesos de cada divisa en la cesta:

| Divisa | Peso |
|---|---|
| Euro (EUR) | 57.6% |
| Yen japonés (JPY) | 13.6% |
| Libra esterlina (GBP) | 11.9% |
| Dólar canadiense (CAD) | 9.1% |
| Corona sueca (SEK) | 4.2% |
| Franco suizo (CHF) | 3.6% |

El origen de la cesta es histórico: el índice lo creó la Reserva Federal en 1973 con las divisas de los principales socios comerciales de EE. UU. de la época (antes del euro incluía marco alemán, franco francés, lira, florín holandés y franco belga, sustituidos por el euro en 1999). Hoy lo calcula y mantiene ICE Futures U.S. en tiempo real, cada ~15 segundos, a partir del punto medio bid/offer de las seis divisas componentes.

**Consecuencia práctica para forex**: como el EUR pesa el 57.6% del índice — y encima con signo negativo en la fórmula (EUR/USD sube ⇒ el USD vale menos frente al euro ⇒ el DXY baja) —, **el DXY y el EUR/USD están casi mecánicamente correlacionados de forma inversa**. Un DXY al alza casi siempre implica un EUR/USD a la baja, y viceversa, simplemente por la aritmética del índice, no solo por macro. Esto explica por qué en la práctica muchos traders usan el DXY como "proxy" rápido del sesgo direccional del EUR/USD, aunque conviene recordar que el resto de la cesta (JPY, GBP, CAD, SEK, CHF) también mueve el índice de forma independiente al euro.

## Oro: refugio, tipos reales y dólar

El oro no paga cupón ni dividendo — mantenerlo tiene un coste de oportunidad frente a activos que sí rentan. Esa propiedad estructura sus tres motores de precio principales, documentados con series desde 1971 por un estudio de la Reserva Federal de Chicago (Barsky, Epstein, Lafont-Mueller y Yoo, 2021):

1. **Cobertura de inflación**: una subida de la inflación esperada aumenta el interés por comprar oro y sube su precio; una desinflación hace lo contrario. En el estudio, un punto porcentual adicional de inflación esperada a 10 años se asocia con un ~37% más de precio real del oro (manteniendo constante el tipo real).
2. **Sensibilidad al tipo de interés real esperado a largo plazo**: al ser un activo duradero sin rendimiento propio, el oro tiene una relación inversa fuerte con el tipo real (tipo nominal menos inflación esperada). Un punto porcentual de subida en el tipo real a 10 años se asocia con una caída del precio real del oro de en torno al 13%. Esta relación se hizo mucho más visible a partir de 2001: entre 2001 y 2012 el tipo real cayó ~400 puntos básicos mientras el precio real del oro se multiplicaba por más de cinco.
3. **Protección frente a "malos tiempos" económicos**: el oro sube quando aumenta el pesimismo macro (medido en el estudio con la encuesta de expectativas de consumidores de la Universidad de Michigan), de forma independiente a inflación y tipos — es decir, actúa como activo refugio ante incertidumbre general, no solo ante inflación.

**Relación con el dólar**: el oro se cotiza globalmente en dólares, así que un dólar más fuerte lo abarata para compradores en otras divisas (y viceversa) — de ahí la correlación negativa "de manual" entre USD y oro. Pero esta relación **no es estable**: en 2023-2024, oro y dólar subieron a la vez, porque en episodios de incertidumbre geopolítica ambos pueden actuar como refugio simultáneamente, y la compra estructural de oro por parte de bancos centrales (diversificando reservas fuera del dólar) añade una demanda que no depende del nivel del USD. Conclusión práctica: el tipo real de interés es el motor más consistente a medio plazo; el dólar y el "modo refugio" son motores que pueden reforzar o contrarrestar al anterior según el contexto.

Ver también [bancos-centrales.md](bancos-centrales.md) para cómo las decisiones de tipos de la Fed mueven el tipo real (y por tanto el oro) a través del canal de tipos de interés.

## Petróleo y divisas de países exportadores (petrodivisas)

Una "petrodivisa" es la moneda de un país cuyas exportaciones dependen en gran medida del petróleo (a menudo definida cuando el crudo supera el 50% de las exportaciones totales). Los casos más citados son el dólar canadiense (CAD), la corona noruega (NOK) y el rublo ruso (RUB).

**El mecanismo**, explicado por el Banco de Canadá en su serie de explicadores oficiales: cuando sube el precio del petróleo, el país exportador ingresa más dólares por cada barril vendido; los compradores extranjeros necesitan convertir su divisa a la del exportador para pagarlo, lo que aumenta la demanda de esa divisa y la aprecia. El Banco de Canadá describe explícitamente el tipo de cambio como un **"amortiguador de shocks"** (shock absorber): cuando los precios de las materias primas caen, el dólar canadiense tiende a debilitarse, lo que abarata otras exportaciones manufactureras canadienses (coches, piezas de avión, medicinas) para compensar; cuando suben, la divisa se aprecia, encareciendo esas mismas exportaciones. Es un mecanismo de compensación automática de la economía, no solo un efecto de mercado de divisas.

En la práctica de trading, esto se traduce en una **correlación negativa fuerte entre USD/CAD (y USD/NOK) y el precio del petróleo**: petróleo al alza → CAD y NOK se fortalecen → USD/CAD y USD/NOK bajan (dado que el USD está en el numerador de esos pares). El caso de Noruega es aún más directo: el crudo Brent representó en torno al 18% del PIB noruego en 2018.

**Matiz importante**: esta relación se ha debilitado en la última década. Con EE. UU. convertido en exportador neto de energía, una subida del petróleo puede fortalecer también al propio dólar estadounidense, neutralizando parcialmente el efecto esperado sobre USD/CAD — conviene comprobar si el USD está actuando "como una petrodivisa más" antes de asumir la relación de manual.

## Risk-on / risk-off

"Risk-on" y "risk-off" describen los dos modos dominantes de comportamiento inversor que mueven los flujos de capital globales:

- **Risk-on**: el mercado tiene apetito por el riesgo. Suele surgir de datos económicos positivos, políticas de bancos centrales acomodaticias (dovish), estabilidad geopolítica o resultados corporativos fuertes.
- **Risk-off**: el mercado huye del riesgo hacia la seguridad. Se construye durante turbulencia geopolítica, series de datos económicos que empeoran, o eventos de "cisne negro" (ataques, quiebras bancarias, crisis súbitas).

### Qué activos se mueven juntos en cada régimen

| Régimen | Activos que suben / ganan demanda |
|---|---|
| Risk-on | Índices bursátiles, criptomonedas, divisas de exportadores de materias primas (CAD, AUD, NZD), petróleo, cobre, plata |
| Risk-off | Oro, bonos gubernamentales (US Treasuries en particular), yen japonés (JPY), franco suizo (CHF), dólar estadounidense (USD) |

En risk-off también se deshacen los *carry trades* (posiciones que piden prestado en divisas de tipo bajo para invertir en divisas de tipo alto), lo que reduce de golpe la demanda de divisas cíclicas/de alto rendimiento. El fenómeno de fondo se conoce en la literatura de bancos centrales como **"flight to quality" o "flight to safety"**: durante episodios de incertidumbre, el capital se desplaza sistemáticamente hacia activos de bajo riesgo de impago (deuda soberana de máxima calidad) y hacia divisas o metales sin riesgo de contraparte.

### El aviso importante: las correlaciones "normales" pueden romperse

Fuera de episodios extremos, oro, JPY, CHF y bonos suelen comportarse como refugio de forma contraria a la renta variable y las divisas cíclicas — lo que los hace valiosos como diversificadores de cartera. Pero en periodos de estrés de mercado muy severo, activos que normalmente se comportan de forma distinta pueden caer todos a la vez: las correlaciones "saltan" hacia 1.0 y anulan temporalmente la diversificación, hasta que las condiciones se estabilizan. Esto es coherente con lo que señala el catálogo de fuentes de esta wiki: los datos de correlación de cualquier tabla (incluida la de la sección siguiente) son una foto de un periodo concreto, no una constante.

## Correlación entre pares de forex que comparten divisa

Cuando dos pares comparten la misma divisa de contrapartida (contra-divisa), un movimiento en esa divisa común se refleja simultáneamente en ambos pares — lo que genera correlación mecánica, no solo fundamental. Ejemplo con datos de un periodo concreto (junio 2020 a junio 2021, correlación de EUR/USD frente a otros pares mayores):

| Periodo | GBP/USD | USD/CHF | USD/JPY |
|---|---|---|---|
| 1 mes | 0.89 | -0.96 | -0.96 |
| 3 meses | 0.85 | -0.97 | -0.30 |
| 6 meses | -0.07 | -0.91 | -0.61 |
| 1 año | 0.83 | -0.91 | -0.61 |

(Los valores concretos son una foto de ese periodo — hay que recalcular la correlación sobre la ventana temporal relevante para cada momento, no memorizar estas cifras como permanentes.)

EUR/USD y GBP/USD muestran correlación positiva fuerte: comparten el USD como contra-divisa (si el dólar se fortalece, ambos pares bajan; si se debilita, ambos suben) y además el euro y la libra tienen vínculos económicos propios por la proximidad geográfica entre eurozona y Reino Unido. USD/CHF y USD/JPY, en cambio, muestran correlación negativa frente a EUR/USD — coherente con su papel de divisas "risk-off" frente al euro.

**Escala orientativa para leer un coeficiente de correlación:**

| Coeficiente | Interpretación |
|---|---|
| -100% a -60% | Fuertemente correlacionados negativamente |
| -60% a -20% | Ligeramente correlacionados negativamente |
| -20% a 20% | Esencialmente sin correlación |
| 20% a 60% | Ligeramente correlacionados |
| 60% a 100% | Fuertemente correlacionados |

## Implicaciones prácticas para trading

1. **Cuidado con la falsa diversificación**: abrir posiciones en dos pares con correlación positiva fuerte (p. ej. cortos en EUR/USD y GBP/USD a la vez) no diversifica el riesgo — es apostar dos veces por lo mismo (la dirección del dólar). Si el mercado se mueve en contra, ambas posiciones pierden a la vez y el riesgo total de la cartera es mayor de lo que parece a simple vista. Ver [riesgo-de-cartera.md](../gestion-riesgo/riesgo-de-cartera.md) para la formalización cuantitativa de este efecto (exposición neta por divisa, fórmula w·S·w′).
2. **Usar correlaciones inversas para cobertura (hedging) táctica**: operar EUR/USD junto con USD/CHF puede no tener sentido a largo plazo (se anulan), pero puede usarse tácticamente para proteger una posición ante un movimiento adverso a corto plazo.
3. **Recalcular, no memorizar**: las correlaciones cambian con el tiempo y con el régimen de mercado (ver risk-on/risk-off arriba) — conviene mirar ventanas tanto cortas como largas antes de asumir que una relación "de manual" se sigue cumpliendo hoy.
4. **Usar el DXY como atajo, no como sustituto del análisis**: por su alto peso en euro, el DXY es un proxy rápido y razonable del sesgo del EUR/USD, pero mueve también con JPY, GBP, CAD, SEK y CHF — no ignora la necesidad de mirar el par concreto.
5. **Cruzar con el calendario y con bancos centrales**: los regímenes risk-on/risk-off y las correlaciones dólar-oro-petróleo se mueven con frecuencia alrededor de publicaciones de datos y decisiones de tipos — ver [calendario-economico.md](calendario-economico.md) y [bancos-centrales.md](bancos-centrales.md) para el contexto de qué eventos pueden disparar un cambio de régimen.

## Fuentes

- [ICE — FAQ del U.S. Dollar Index](../raw/analisis-fundamental/ice-us-dollar-index-faq.pdf) — FAQ oficial de ICE Futures U.S. con la fórmula y los pesos de la cesta de divisas del DXY.
- [Chicago Fed — qué mueve el precio del oro](../raw/analisis-fundamental/chicagofed-what-drives-gold-prices.pdf) — Chicago Fed Letter de 2021 (Barsky, Epstein, Lafont-Mueller y Yoo) sobre los determinantes empíricos del precio del oro desde 1971.
- [Bank of Canada — entendiendo los tipos de cambio](../raw/analisis-fundamental/bankofcanada-understanding-exchange-rates.md) — explicador oficial sobre tipos de cambio y su relación con materias primas (petrodivisas).
- [OANDA — risk-on/risk-off](../raw/analisis-fundamental/oanda-risk-on-risk-off.md) — contenido educativo sobre los dos regímenes de apetito por el riesgo y qué activos se mueven en cada uno.
- [FOREX.com — correlación de divisas](../raw/analisis-fundamental/forexcom-currency-correlation.md) — contenido educativo sobre correlación entre pares de divisas (incluye ejemplos de USD/oro, AUD/USD-cobre y USD/NOK-petróleo Brent).

Los valores numéricos concretos citados (pesos históricos de índices, coeficientes de correlación de un periodo dado, cifras de PIB) son fotos de un momento o periodo concreto — para cifras actualizadas, consultar la fuente en vivo o recalcular sobre datos recientes.
