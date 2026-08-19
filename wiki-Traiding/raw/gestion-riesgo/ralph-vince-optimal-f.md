# Gestión monetaria y Optimal f (Ralph Vince, 1990, 1992)

> Síntesis de las obras clásicas de Ralph Vince: *"Portfolio Management Formulas"* (1990) y *"The Mathematics of Money Management: Risk Analysis Techniques for Traders"* (John Wiley & Sons, 1992).

## El límite del Criterio de Kelly en trading real

El criterio clásico de Kelly (1956) asume escenarios con dos únicos resultados posibles (ganar $B$ con probabilidad $p$, o perder $1$ con probabilidad $q$). En el trading algorítmico real:
- Las operaciones no tienen un resultado binario fijo, sino una **distribución continua y asimétrica de pérdidas y ganancias** (distribución de R-múltiplos con colas pesadas).
- La pérdida máxima posible por operación puede ser mayor de lo planeado debido a slippage o gaps.

Ralph Vince resolvió esta limitación generalizando el principio de maximización de la tasa geométrica de crecimiento para distribuciones empíricas de trading a través del concepto de **Optimal $f$** (fracción óptima de capital a arriesgar por unidad del peor trade histórico).

## Formulación matemática de Optimal $f$

Dado un historial de $N$ operaciones con resultados individuales $R_i$ ($i = 1, \dots, N$) y siendo $WorstLoss$ la mayor pérdida histórica registrada en términos absolutos ($WorstLoss < 0$):

1. **Holding Period Return (HPR)**: El retorno de cada operación en función de una fracción $f \in (0, 1)$:

$$HPR_i(f) = 1 + f \times \left( \frac{-R_i}{WorstLoss} \right)$$

2. **Terminal Wealth Relative (TWR)**: El producto acumulado de los retornos geométricos a lo largo de las $N$ operaciones:

$$TWR(f) = \prod_{i=1}^{N} HPR_i(f) = \prod_{i=1}^{N} \left[ 1 + f \left( \frac{-R_i}{WorstLoss} \right) \right]$$

3. **La Fracción Óptima ($Optimal\ f$)**: El valor exacto $f^* \in (0, 1)$ que maximiza la media geométrica (el logaritmo del TWR):

$$f^* = \arg\max_{f} \sum_{i=1}^{N} \ln \left[ 1 + f \left( \frac{-R_i}{WorstLoss} \right) \right]$$

El número de contratos o lotes a operar viene dado por:

$$\text{Contratos} = \frac{\text{Capital de la cuenta} \times f^*}{|WorstLoss|}$$

## Propiedades fundamentales y peligros del pico de Kelly/Vince

1. **Curva en forma de campana asimétrica**:
   - Para $f < f^*$: El crecimiento geométrico aumenta conforme sube $f$.
   - Para $f = f^*$: Se alcanza el máximo teórico absoluto de crecimiento del capital.
   - Para $f > f^*$: El crecimiento se degrada rápidamente; superado el umbral crítico, la expectativa geométrica se vuelve negativa y el riesgo de ruina matemática es del 100% (**sobre-apalancamiento catastrófico**).
2. **Volatilidad destructiva**: Operar al 100% de $Optimal\ f$ genera curvas de capital con drawdowns devastadores (típicamente del 70% al 90%).
3. **Dependencia del peor trade**: $Optimal\ f$ asume que la mayor pérdida futura no superará a la histórica. Si el mercado produce un nuevo "peor trade" histórico mayor, la fracción calculada habrá estado sobreestimada.

## La solución profesional: Fractional $f$ (Fracción de Vince)

Al igual que con el criterio de Kelly, los gestores cuantitativos aplican un multiplicador conservador:

$$\text{Fracción operativa} = \lambda \times f^* \quad (\text{donde } \lambda \in [0.20, 0.50])$$

- Operar con un tercio o la mitad de $Optimal\ f$ ($\lambda = 0.33$ o $0.50$) captura entre el 75% y el 90% de la tasa de crecimiento óptima, reduciendo la varianza y los drawdowns a niveles tolerables (20%-35%).

## Relevancia para el diseño de un EA

- Permite calibrar el sizing basándose en la **distribución empírica completa de trades**, no solo en el ratio winrate / promedio simplificado.
- Obliga a incorporar un margen de seguridad frente al $WorstLoss$ (multiplicando el peor trade histórico por un factor de estrés de 1.5x a 2.0x).
- Debe combinarse con simulación Monte Carlo para verificar que la distribución de drawdowns resultante sea compatible con la supervivencia de la cuenta.

## Referencias primarias

- Vince, R. (1990). *Portfolio Management Formulas: Mathematical Trading Methods for the Futures, Options, and Stock Markets*. John Wiley & Sons.
- Vince, R. (1992). *The Mathematics of Money Management: Risk Analysis Techniques for Traders*. John Wiley & Sons.
- Vince, R. (1995). *The New Money Management: A Framework for Asset Allocation*. John Wiley & Sons.
