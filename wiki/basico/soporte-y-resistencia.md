---
tags: [basico, soporte-resistencia, price-action, niveles, microestructura, order-clustering]
updated: 2026-08-16
fuentes: [raw/basico/stockcharts-soporte-resistencia.md, raw/basico/osler-support-resistance-orders.md]
---

# Soporte y resistencia

Junto con la [estructura de mercado](estructura-mercado.md) (máximos/mínimos crecientes o decrecientes, ver [tendencias y estructura](tendencias-y-estructura.md)), soporte y resistencia son el concepto más básico del análisis técnico de precio: identificar niveles donde la oferta y la demanda tienden a desequilibrarse de forma predecible.

## Qué son

- **Soporte**: el nivel de precio en el que se considera que la demanda es lo bastante fuerte como para frenar una caída. A medida que el precio baja hacia el soporte, los compradores se vuelven más dispuestos a comprar y los vendedores más reacios a vender a ese precio.
- **Resistencia**: el nivel de precio en el que se considera que la presión vendedora es lo bastante fuerte como para frenar una subida. A medida que el precio sube hacia la resistencia, los vendedores se vuelven más dispuestos a vender y los compradores más reacios a comprar a ese precio.

Ninguno de los dos es un nivel absoluto ni una barrera física: son zonas donde, históricamente, la oferta y la demanda se han desequilibrado a favor de un bando. El precio puede atravesarlos en cualquier momento si el flujo de órdenes cambia de forma decisiva — por eso "soporte" y "resistencia" describen una tendencia estadística, no una ley física.

## Fundamentación microeconómica: Por qué funcionan (Evidencia empírica de Osler)

Durante años descartado por la academia como heurística subjetiva, la investigación empírica con microdatos de libros de órdenes interbancarios de divisas (**Carol Osler, Federal Reserve Bank of New York / JIMF**) demostró la base microestructural real de estos niveles:

1. **Clustering de órdenes**: Las órdenes no se reparten de forma uniforme. Se concentran masivamente en **máximos/mínimos previos**, **niveles técnicos publicados** y **números redondos** (terminaciones en `00`, `50`, `20`, `80`).
2. **Órdenes Take-Profit como amortiguador (Rebotes)**: Las órdenes límite de toma de beneficios concentradas en soportes y resistencias actúan como una fuerza estabilizadora. Al llegar a resistencia, la ejecución de ventas take-profit provee liquidez en el ask, frenando la subida y generando el **rebote**.
3. **Órdenes Stop-Loss como acelerador (Breakouts y cascadas de precio)**: Los stop-loss se agrupan justo por detrás de los niveles técnicos. Cuando el precio rompe levemente un soporte o resistencia, activa una **cascada de órdenes a mercado** (buy stops en resistencia, sell stops en soporte) que barren la liquidez disponible, provocando el movimiento acelerado y violento característico de los [breakouts](../estrategias/ruptura-breakout.md).

## Rotura vs. rechazo

Cuando el precio llega a un nivel de soporte o resistencia, caben dos desenlaces:

- **Rechazo (Rebote)**: El colchón de órdenes límite (take-profit) absorbe la presión agresiva y el precio revierte. Confirma que el bando que defiende ese nivel sigue teniendo el control.
- **Rotura (Breakout)**: El flujo agresivo perfora el nivel y desencadena la cascada de órdenes stop-loss. Una rotura sin convicción (poco volumen, poco recorrido) es sospechosa de falso breakout, mientras que una rotura con vela de rango amplio y volumen elevado valida el desequilibrio — ver [volumen y ATR](../indicadores/volumen-y-atr.md) y [velas japonesas](velas-japonesas.md).

## Rotación de roles: soporte que pasa a resistencia (y viceversa)

Una vez que un nivel se rompe de forma decisiva, tiende a **cambiar de función**: una resistencia rota queda como soporte por debajo del precio, y un soporte roto queda como resistencia por encima del precio.

El mecanismo combina la memoria psicológica de los participantes con el reposicionamiento de liquidez:
- Los compradores que entraron antes de la rotura están en beneficio y añaden posición al retesteo (reforzándolo como nuevo soporte).
- Los participantes atrapados en el lado perdedor aprovechan el regreso al nivel de equilibrio para cerrar a breakeven, transformando el flujo de órdenes disponible.

## Zonas, no líneas exactas

En la operativa real, es indispensable trabajar con **zonas de soporte/resistencia** en lugar de precios exactos al tick. Los market makers y el ruido de microestructura generan fluctuaciones en torno a la liquidez latente.

## Confluencia con otras herramientas

- **[Medias móviles](../indicadores/medias-moviles.md)**: Actúan como soporte y resistencia dinámicos (SMA 50, EMA 200).
- **[Fibonacci](../indicadores/fibonacci.md)**: Los retrocesos (38.2%, 61.8%) proyectan zonas de equilibrio donde confluir con niveles horizontales.
- **[Volumen y Volume Profile](../indicadores/volumen-y-atr.md)**: Las zonas de alto volumen acumulado (High Volume Nodes) identifican el soporte/resistencia de mayor convicción institucional.
- **[Velas japonesas](velas-japonesas.md)**: Patrones de rechazo (martillo, estrella fugaz) confirman la defensa del nivel.

## Ver también

- [Tendencias y estructura de mercado](tendencias-y-estructura.md)
- [Microestructura de mercado](microestructura-mercado.md)
- [Velas japonesas](velas-japonesas.md)
- [Fibonacci: retrocesos y extensiones](../indicadores/fibonacci.md)
- [Ruptura / breakout](../estrategias/ruptura-breakout.md)
- [Medias móviles](../indicadores/medias-moviles.md)
- [Cómo combinar indicadores](../indicadores/como-combinar-indicadores.md)

## Fuentes

- [Support & Resistance (StockCharts ChartSchool)](../raw/basico/stockcharts-soporte-resistencia.md) — definiciones, dinámica de soporte/resistencia, rotura vs. rechazo, rotación de roles.
- [Carol Osler (2000, 2003, 2005) — Microestructura y clustering de órdenes en FX](../raw/basico/osler-support-resistance-orders.md) — investigación académica del Federal Reserve Bank of New York y JIMF demostrando el clustering de órdenes stop-loss/take-profit y la física de rebotes y cascadas de precios en soporte y resistencia.
