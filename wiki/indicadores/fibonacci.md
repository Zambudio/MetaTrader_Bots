---
tags: [indicadores, fibonacci, retrocesos, extensiones, soporte-resistencia, price-action]
updated: 2026-08-16
fuentes: [raw/indicadores/fibonacci-retracements-extensions-synthesis.md]
---

# Fibonacci: retrocesos y extensiones

## Origen matemático

La secuencia de Fibonacci (0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144...) genera ratios que se usan como niveles de referencia en análisis técnico:

| Ratio | Cómo se obtiene | Uso |
|---|---|---|
| **61.8%** (φ, Golden Ratio) | Cualquier número / siguiente | Retroceso profundo clave |
| **38.2%** | Cualquier número / dos posiciones adelante | Retroceso moderado |
| **23.6%** | Cualquier número / tres posiciones adelante | Retroceso superficial |
| **78.6%** | √0.618 | Retroceso muy profundo |
| **50%** | No es Fibonacci, pero coincide con Dow Theory | Retroceso "normal" |
| **127.2%** | √1.618 | Extensión moderada |
| **161.8%** | 1/0.618 | Extensión "golden" |
| **261.8%** | Derivado de φ | Extensión agresiva |

## Retrocesos de Fibonacci

### Concepto

Herramienta para identificar **zonas potenciales de soporte/resistencia** durante una corrección dentro de una tendencia existente. Se dibujan entre un swing significativo (low→high para tendencia alcista, high→low para bajista).

### Niveles y su lectura

- **23.6%**: retroceso superficial. Tendencia muy fuerte — el mercado apenas corrige.
- **38.2%**: retroceso moderado. Tendencia fuerte — zona habitual de rebote.
- **50%**: retroceso "normal" según la [Dow Theory](../basico/tendencias-y-estructura.md).
- **61.8%**: retroceso profundo. Nivel clave — a menudo el último antes de que la tendencia se cuestione.
- **78.6%**: retroceso muy profundo. La tendencia original está comprometida.

### Uso práctico

1. Identificar tendencia clara (alcista o bajista) — verificar con [ADX](adx-dmi.md) o estructura de [tendencias](../basico/tendencias-y-estructura.md).
2. Dibujar Fibonacci del inicio al fin del impulso.
3. Esperar que el precio retroceda a uno de los niveles.
4. **No operar el nivel solo** — buscar confluencia:
   - Coincidencia con [medias móviles](medias-moviles.md) (SMA 50, EMA 200).
   - Nivel de [soporte/resistencia](../basico/soporte-y-resistencia.md) horizontal previo.
   - Señal de vela de rechazo (ver [velas-japonesas.md](../basico/velas-japonesas.md): martillo, estrella fugaz).
   - Divergencia en [RSI](osciladores.md) o [MACD](macd.md).
5. Los niveles son **zonas de alerta**, no puntos exactos de giro.

## Extensiones de Fibonacci

### Concepto

Proyectan niveles de precio objetivo **más allá** del swing previo — se usan para determinar dónde podría terminar un impulso (take profit).

### Cálculo

Se necesitan tres puntos: inicio del impulso (A), fin del impulso (B), fin del retroceso (C). Las extensiones se proyectan desde C.

### Niveles comunes de take profit

- **100%**: el nuevo impulso iguala al anterior en magnitud.
- **127.2%**: extensión moderada.
- **161.8%**: el objetivo más citado — "golden extension".
- **261.8%**: extensión agresiva, para tendencias muy fuertes.

## Confluencia: la clave de fiabilidad

Este es el mismo principio documentado en [como-combinar-indicadores.md](como-combinar-indicadores.md): un nivel Fibonacci aislado no es una señal. La fiabilidad aumenta cuando el nivel coincide con:
- Una [media móvil](medias-moviles.md) relevante (SMA 200, EMA 50).
- Un nivel de [soporte/resistencia](../basico/soporte-y-resistencia.md) previo.
- Una [Banda de Bollinger](bollinger.md) (especialmente la banda central).
- Un nivel psicológico (número redondo).
- Un pico de [volumen](volumen-y-atr.md) previo.

## Limitaciones y advertencias

- Los niveles Fibonacci **no tienen base empírica sólida como leyes del mercado**. Funcionan en parte como profecía autocumplida: muchos traders los usan, lo que concentra órdenes en esos niveles.
- La elección del swing high/low es subjetiva — diferentes traders dibujan desde puntos distintos.
- En mercados sin tendencia clara (rango), Fibonacci no aporta información útil.
- No usar como señal de entrada aislada — siempre buscar confirmación.

## Implementación en un EA

En MT5, los niveles se calculan programáticamente:
```
// Para retrocesos alcistas (pullback en uptrend):
nivel = High - (High - Low) * ratio;
// Ejemplo: 61.8% de retroceso
nivel_618 = High - (High - Low) * 0.618;
```

Un EA puede usar Fibonacci como **filtro de entrada**: solo abrir posiciones cuando el pullback alcanza un nivel Fibonacci que confluye con otro indicador. Esto convierte Fibonacci de herramienta visual subjetiva a regla programable y testeable.

## Relación con otras páginas

Fibonacci complementa a [soporte-y-resistencia.md](../basico/soporte-y-resistencia.md) (niveles horizontales estáticos vs. niveles dinámicos basados en el impulso previo) y a la confluencia documentada en [como-combinar-indicadores.md](como-combinar-indicadores.md). Los retrocesos son especialmente relevantes para las estrategias de [swing-trading.md](../estrategias/swing-trading.md) y [seguimiento-tendencia.md](../estrategias/seguimiento-tendencia.md), donde las entradas se buscan en pullbacks.

## Fuentes

- [Fibonacci en análisis técnico — síntesis](../raw/indicadores/fibonacci-retracements-extensions-synthesis.md) — retrocesos, extensiones, niveles estándar, confluencia y limitaciones, sintetizado de StockCharts, Schwab y BabyPips.
