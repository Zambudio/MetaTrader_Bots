# Fibonacci en análisis técnico: retrocesos y extensiones

> Fuente sintetizada de StockCharts ChartSchool, Schwab, Britannica, BabyPips education. Conceptos estándar de análisis técnico con Fibonacci.

## Origen matemático

La secuencia de Fibonacci: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144...

Ratios clave derivados:
- **61.8% (Golden Ratio φ)**: cualquier número dividido por el siguiente → converge a 0.618.
- **38.2%**: cualquier número dividido por el número dos posiciones adelante.
- **23.6%**: cualquier número dividido por el número tres posiciones adelante.
- **78.6%**: raíz cuadrada de 0.618.
- **50%**: no es un ratio Fibonacci real, pero se usa ampliamente (coincide con la teoría de Dow sobre retrocesos normales).

## Retrocesos de Fibonacci (Fibonacci Retracements)

### Concepto
Herramienta para identificar zonas potenciales de soporte/resistencia durante una corrección dentro de una tendencia existente. Se dibuja entre un swing low significativo y un swing high significativo (o viceversa).

### Niveles estándar
- **23.6%**: retroceso superficial — tendencia muy fuerte.
- **38.2%**: retroceso moderado — tendencia fuerte.
- **50%**: retroceso "normal" según Dow Theory.
- **61.8%**: retroceso profundo — nivel clave, a menudo el último antes de que la tendencia se cuestione.
- **78.6%**: retroceso muy profundo — la tendencia original está en duda.

### Uso práctico
1. Identificar tendencia clara (alcista o bajista).
2. Dibujar Fibonacci del inicio al fin del impulso.
3. Esperar que el precio retroceda a uno de los niveles.
4. Buscar confirmación adicional (vela de rechazo, divergencia RSI, confluencia con media móvil o soporte/resistencia previo) antes de entrar.
5. NO son niveles exactos de giro — son **zonas de alerta** donde aumenta la probabilidad de una reacción.

### Confluencia
Los niveles Fibonacci son más fiables cuando coinciden con:
- Medias móviles (SMA 50, EMA 200)
- Niveles de soporte/resistencia horizontal previos
- Líneas de tendencia
- Niveles psicológicos (números redondos)

## Extensiones de Fibonacci (Fibonacci Extensions)

### Concepto
Proyectan niveles de precio objetivo más allá del swing previo — se usan para determinar dónde podría terminar un impulso y tomar beneficios.

### Niveles estándar de extensión
- **100%**: el impulso iguala al anterior en magnitud.
- **127.2%**: extensión moderada.
- **161.8%**: extensión "golden" — el objetivo más citado.
- **200%**: el doble del impulso anterior.
- **261.8%**: extensión agresiva.

### Uso práctico
1. Identificar tres puntos: inicio del impulso (A), fin del impulso (B), fin del retroceso (C).
2. Los niveles de extensión se proyectan desde C.
3. Se usan como objetivos de take profit o como zonas donde la tendencia podría agotar su impulso.

## Limitaciones y advertencias

- Los niveles Fibonacci no tienen base empírica sólida como "leyes del mercado" — son herramientas de consenso (muchos traders los usan, creando cierto efecto de profecía autocumplida).
- No deben usarse aisladamente — siempre buscar confluencia con otras herramientas técnicas.
- La elección del swing high/low es subjetiva — diferentes traders dibujarán Fibonacci desde puntos distintos y obtendrán niveles diferentes.
- En mercados sin tendencia clara, Fibonacci no aporta información útil.

## Implementación en un EA
- La mayoría de plataformas (incluyendo MT5) tienen Fibonacci como herramienta gráfica manual.
- Para un EA, los niveles se calculan programáticamente: `nivel = High - (High - Low) * ratio` para retrocesos alcistas.
- Un EA puede usar Fibonacci como filtro de entrada: solo operar pullbacks a niveles Fibonacci que confluyan con otros indicadores.
