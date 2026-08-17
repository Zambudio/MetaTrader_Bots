# VIX y volatilidad implícita como herramienta de análisis de mercado

> Fuente sintetizada de Cboe VIX whitepaper oficial, Macroption.com, Trading212, y documentación institucional. Metodología y uso práctico del índice VIX.

## Volatilidad implícita vs. volatilidad histórica

- **Volatilidad histórica (realizada)**: mide cuánto se ha movido un activo en el pasado. Se calcula como la desviación estándar de los retornos observados durante un período.
- **Volatilidad implícita (IV)**: mide cuánto espera el mercado que se mueva un activo en el futuro. Se extrae de los precios de las opciones — es el nivel de volatilidad que, introducido en un modelo de valoración, reproduce el precio de mercado observado.

La diferencia clave: la histórica mira hacia atrás; la implícita mira hacia adelante.

## El índice VIX

### Qué es
El VIX (Cboe Volatility Index) mide la expectativa del mercado de volatilidad del S&P 500 a 30 días vista. Conocido como el "índice del miedo" (fear gauge).

### Cómo se calcula (metodología post-2003)
- **No** usa el modelo Black-Scholes.
- Usa una fórmula no paramétrica basada en los precios de una cartera de opciones out-of-the-money (OTM) del S&P 500 (tanto puts como calls).
- Proceso:
  1. Seleccionar opciones near-term y next-term (con al menos 1 semana hasta expiración).
  2. Filtrar opciones con bid = 0.
  3. Calcular la contribución de cada opción a la varianza total, ponderando más las at-the-money.
  4. Interpolar las varianzas de los dos vencimientos para obtener una varianza constante a 30 días.
  5. Tomar la raíz cuadrada y multiplicar por 100 para expresar como porcentaje anualizado.

### Interpretación de niveles
- **VIX < 15**: baja volatilidad esperada, mercado complaciente. Típico de mercados alcistas estables.
- **VIX 15-25**: volatilidad normal/moderada.
- **VIX 25-35**: volatilidad elevada, incertidumbre significativa.
- **VIX > 35**: pánico / estrés extremo del mercado (crisis financieras, pandemias, eventos geopolíticos graves).
- **VIX > 80**: solo se ha visto en 2008 (crisis financiera global) y 2020 (COVID-19).

### Propiedades clave
1. **Mean-reverting**: el VIX tiende a revertir a su media histórica (~18-20). Los picos extremos son transitorios.
2. **Correlación inversa con el S&P 500**: cuando el mercado cae, el VIX sube (y viceversa). Correlación histórica alrededor de -0.7 a -0.8.
3. **Sesgo de puts (skew)**: los inversores institucionales compran puts de protección, lo que infla la IV de las puts relativa a las calls. Esto se refleja en el VIX.
4. **Efecto "contango"**: los futuros del VIX suelen cotizar por encima del VIX spot (el mercado "espera" que la volatilidad suba), lo que genera un coste de carry para los productos que replican el VIX.

## Uso práctico para trading (aunque no operes opciones)

### Como indicador de sentimiento
- VIX bajo + subiendo → alerta temprana: el mercado está complaciente y la volatilidad empieza a despertar.
- VIX alto + bajando → el pánico se disipa, posible oportunidad de compra (contrarian).
- Picos extremos de VIX históricamente coinciden con suelos de mercado (no con techos).

### Como filtro de régimen para un EA
- En régimen de baja volatilidad (VIX < 15): estrategias de rango/reversión a la media funcionan mejor.
- En régimen de alta volatilidad (VIX > 25): estrategias de tendencia/breakout funcionan mejor, pero el riesgo de ruina también es mayor.
- Ajustar position sizing en función del VIX: reducir exposición cuando VIX está elevado.

### Estructura temporal del VIX
- **Contango** (normal): VIX futuros > VIX spot. Mercado tranquilo.
- **Backwardation**: VIX futuros < VIX spot. Mercado estresado. Señal de pánico institucional.
- La transición de contango a backwardation es una señal potente de cambio de régimen.

## Otros índices de volatilidad
- **VXN**: volatilidad del Nasdaq 100.
- **VDAX**: volatilidad del DAX (Alemania).
- **VSTOXX**: volatilidad del Euro Stoxx 50.
- **OVX**: volatilidad del petróleo (WTI).
- **GVZ**: volatilidad del oro.

## Limitaciones
- El VIX mide volatilidad esperada, no dirección — no dice si el mercado subirá o bajará.
- No es directamente operable (se opera vía futuros, opciones sobre VIX o ETPs como VXX/UVXY).
- La correlación inversa con el mercado puede romperse temporalmente.
- El cálculo depende de la liquidez de las opciones del S&P 500 — en condiciones extremas, los precios de opciones pueden distorsionarse.
