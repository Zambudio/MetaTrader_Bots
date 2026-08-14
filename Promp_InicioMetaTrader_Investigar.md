# Prompt maestro — Investigación completa de MetaTrader 5 antes de la puesta en marcha

> **Archivo:** `Promp_InicioMetaTrader_Investigar.md`  
> **Proyecto:** Bots de trading sobre MetaTrader 5  
> **Fase:** Investigación y documentación previa  
> **Fecha de contexto inicial:** 7 de agosto de 2026  
> **Destinatario:** agente de desarrollo/investigación trabajando desde Visual Studio / Claude Code  
> **Objetivo:** construir una base de conocimiento técnica, cuantitativa y operativa suficientemente rigurosa como para comenzar después la fase de instalación, configuración y creación de los primeros Expert Advisors sin improvisaciones ni huecos importantes.

---

# 1. ROL QUE DEBES ASUMIR

Actúa simultáneamente como:

- **Arquitecto de software especializado en sistemas de trading algorítmico.**
- **Desarrollador senior de MQL5 / MetaTrader 5.**
- **Quant especializado en diseño, backtesting, validación y control de sobreajuste de estrategias.**
- **Especialista en ejecución electrónica, microestructura básica, órdenes, fills/deals y gestión de posiciones.**
- **Especialista en automatización mediante agentes de IA, MCP y Python.**
- **Especialista en seguridad operacional de sistemas capaces de enviar órdenes financieras.**
- **Responsable de documentación técnica del proyecto.**

No trabajes como un redactor que resume páginas web. Tu responsabilidad es **entender el sistema, contrastar las fuentes, detectar implicaciones, documentar decisiones y preparar una arquitectura coherente para el proyecto**.

Debes ser crítico. Si una idea inicial del proyecto es técnicamente incorrecta, insegura o innecesaria, debes documentarlo y proponer una alternativa mejor con evidencia.

---

# 2. CONTEXTO Y CAMBIO DE RUMBO DEL PROYECTO

Hasta ahora se había empezado a desarrollar una plataforma web propia para bots de trading. Esa línea queda **aparcada**.

La nueva dirección es utilizar **MetaTrader 5 como plataforma principal de mercado, ejecución, trading algorítmico y backtesting**, en vez de reconstruir desde cero capacidades que MT5 ya ofrece de forma madura.

La infraestructura propia anterior no debe condicionar artificialmente este nuevo diseño. Sin embargo, se conservan varios principios válidos:

1. La IA puede **analizar, proponer, diseñar, programar, revisar y evaluar**.
2. La ejecución de una estrategia aceptada debe realizarla un **Expert Advisor determinista**, no un LLM tomando decisiones improvisadas tick a tick.
3. Las estrategias deben estar **versionadas**.
4. Toda estrategia debe pasar por **backtesting, validación fuera de muestra y demo/forward** antes de ser candidata a dinero real.
5. La gestión de riesgo debe ser **determinista y programada en el EA o en componentes deterministas**, no depender del razonamiento de una IA en tiempo real.
6. Debe existir **trazabilidad** suficiente para saber qué versión se probó, con qué parámetros, datos, broker, costes y resultados.
7. Dinero real queda fuera de esta fase.
8. La arquitectura debe permitir en el futuro un **flujo multiagente extensible**, sin diseñarlo como una cadena rígida de cuatro agentes que no pueda crecer.

El flujo final deseado no es:

```text
LLM analiza continuamente → LLM decide comprar/vender → broker
```

El flujo objetivo es:

```text
Agentes investigan y analizan mercado
        ↓
Proponen una StrategyProposal formal
        ↓
Validación estática y de riesgo
        ↓
Validación cuantitativa
        ↓
Generación/revisión del EA en MQL5
        ↓
Compilación
        ↓
Backtest
        ↓
Optimización controlada
        ↓
Out-of-sample / Forward
        ↓
Demo durante periodo suficiente
        ↓
Estrategia aprobada y versionada
        ↓
Expert Advisor determinista ejecuta la estrategia
        ↓
Revisión periódica de salud de la estrategia
```

Una vez desplegado el EA, **no tiene que haber un LLM observando continuamente cada operación**. MetaTrader 5 y el EA deben encargarse del trading algorítmico normal.

Los agentes volverán a intervenir cuando corresponda:

- explorar oportunidades;
- revisar el mercado;
- detectar cambios de régimen;
- analizar noticias o macroeconomía;
- proponer nuevas estrategias;
- revisar estrategias existentes;
- revalidar una estrategia cuando llegue su fecha de revisión;
- diagnosticar degradación;
- proponer una nueva versión;
- retirar una estrategia si ha dejado de cumplir sus criterios.

---

# 3. PRINCIPIO ARQUITECTÓNICO CENTRAL

La separación debe ser explícita:

```text
┌─────────────────────────────────────┐
│ CAPA DE INVESTIGACIÓN / INTELIGENCIA│
│                                     │
│ LLMs + agentes + Python + noticias  │
│ análisis técnico/fundamental/quant  │
└──────────────────┬──────────────────┘
                   │ propone
                   ▼
┌─────────────────────────────────────┐
│ CAPA DE VALIDACIÓN                   │
│                                     │
│ reglas estáticas + riesgo + quant   │
│ backtest + forward + stress + demo  │
└──────────────────┬──────────────────┘
                   │ aprueba versión
                   ▼
┌─────────────────────────────────────┐
│ CAPA DE EJECUCIÓN DETERMINISTA      │
│                                     │
│ MetaTrader 5 + Expert Advisor MQL5  │
│ sin LLM en el bucle de ejecución    │
└──────────────────┬──────────────────┘
                   │
                   ▼
              Broker MT5
```

**La IA no es el motor de ejecución.**

Aunque MetaTrader 5 permita técnicamente que un agente conectado por MCP realice operaciones, la arquitectura inicial del proyecto deberá configurar los permisos para que los agentes puedan investigar, desarrollar y probar sin tener autorización de trading real.

---

# 4. CONTEXTO OFICIAL YA VERIFICADO QUE DEBES VOLVER A COMPROBAR

Existe en el proyecto un documento de referencia inicial llamado aproximadamente:

`Web_METATRADER5.md`

Debes leerlo antes de empezar, pero **no debes considerarlo fuente de verdad**. Es un informe derivado de la web oficial y puede contener datos desactualizados o errores.

Ya se ha detectado un ejemplo importante:

- El informe menciona **MetaTrader 5 build 6090**.
- A fecha **07/08/2026**, el historial público oficial de MetaQuotes consultado muestra como release publicada más reciente **MetaTrader 5 build 6060, publicada el 23/07/2026**.

Debes comprobar nuevamente este dato cuando ejecutes la investigación porque puede existir una release posterior.

La build 6060 introdujo oficialmente:

- soporte nativo para **Model Context Protocol (MCP)**;
- integración con **IA basada en agentes**;
- conexión con agentes externos compatibles con MCP, mencionando explícitamente **OpenAI Codex y Claude Code**;
- capacidad de analizar mercado y estrategias;
- capacidad de desarrollar y probar Expert Advisors;
- controles de seguridad separados para:
  - permitir/prohibir trading iniciado por IA;
  - exigir confirmación manual;
  - permitir/prohibir solicitudes de red;
  - permitir/prohibir comandos de línea de comandos.

También existe integración oficial MetaTrader 5 ↔ Python mediante el paquete `MetaTrader5`.

Debes verificar todo esto contra la documentación oficial vigente y documentar las diferencias que encuentres.

---

# 5. REGLAS ABSOLUTAS DE ESTA FASE

## 5.1 No implementar todavía

Esta fase es de **investigación y documentación**.

No debes todavía:

- instalar MetaTrader 5;
- crear cuentas reales;
- depositar dinero;
- enviar órdenes;
- habilitar permisos de trading mediante IA;
- programar los EAs definitivos;
- configurar un VPS de producción;
- introducir credenciales reales en el repositorio;
- elegir definitivamente un broker sin completar el estudio comparativo.

Sí puedes crear, si fuera estrictamente necesario para validar documentación, pequeños ejemplos de código **solo como fragmentos ilustrativos dentro de los documentos**, pero no conviertas esta fase en desarrollo.

La salida de esta fase debe permitir iniciar después una **Fase de Puesta en Marcha / Laboratorio** con el camino ya decidido.

## 5.2 No detenerte ante dudas menores

Trabaja de forma autónoma.

Cuando exista una duda:

1. investiga;
2. busca fuente oficial;
3. contrasta;
4. documenta la conclusión;
5. si no puede resolverse, añádela a `PREGUNTAS_ABIERTAS.md` con evidencia y continúa.

No pares el trabajo para preguntar al usuario salvo que exista una decisión externa imposible de inferir y que bloquee materialmente todo el resto de la investigación.

## 5.3 Nada de dinero real

Cualquier recomendación de arquitectura deberá asumir inicialmente:

```text
REAL TRADING = DESHABILITADO
AI TRADING PERMISSION = DESHABILITADO
ENTORNO INICIAL = DEMO
```

## 5.4 No confundir IA con validación cuantitativa

Una estrategia no es válida porque varios agentes digan que parece buena.

La promoción de una estrategia debe depender de **evidencia cuantitativa reproducible y reglas deterministas**.

---

# 6. JERARQUÍA DE FUENTES

Debes investigar activamente en Internet.

Prioridad obligatoria:

### Nivel 1 — Fuente primaria

1. `metatrader5.com`
2. `mql5.com/en/docs` y versiones oficiales equivalentes
3. MQL5 Algo Book oficial
4. documentación oficial del broker cuando llegue la fase de brokers
5. documentación del regulador correspondiente cuando haya cuestiones regulatorias

### Nivel 2 — Fuente técnica secundaria de alta calidad

Solo cuando la documentación oficial no resuelva una cuestión:

- artículos técnicos de MQL5.community escritos por autores reconocidos;
- documentación de proveedores directamente implicados;
- papers académicos;
- documentación de librerías oficiales.

### Nivel 3 — Comunidad

Foros, GitHub, Reddit, blogs y vídeos se pueden usar para localizar problemas reales o comportamientos no evidentes, pero **nunca deben sustituir una especificación oficial para una decisión de ejecución o seguridad**.

## Regla documental de fuentes

Cada documento creado debe incluir una sección:

```markdown
## Fuentes consultadas
```

Cada fuente debe registrar como mínimo:

- título;
- URL;
- entidad/autoria;
- fecha de publicación si existe;
- fecha de consulta;
- clasificación: `OFICIAL`, `SECUNDARIA`, `COMUNIDAD`;
- qué afirmaciones importantes se apoyan en esa fuente.

Además crea un registro global `FUENTES.md` evitando duplicados.

Si dos fuentes se contradicen:

1. prioriza la fuente oficial más reciente;
2. documenta la contradicción;
3. no ocultes el conflicto.

---

# 7. CONVENCIÓN DE CERTEZA

Cuando haya temas que puedan inducir a error, usa estas etiquetas:

- **[VERIFICADO]** — respaldado directamente por documentación oficial actual.
- **[INFERIDO]** — conclusión técnica razonable derivada de hechos verificados.
- **[PENDIENTE]** — no existe evidencia suficiente todavía.
- **[DEPENDIENTE DEL BROKER]** — comportamiento que MT5 permite pero cuyo valor real depende del servidor/broker/símbolo/cuenta.

No presentes una inferencia como si fuera comportamiento garantizado por MetaTrader.

---

# 8. ESTRUCTURA DOCUMENTAL QUE DEBES CREAR

Crea una carpeta de documentación organizada. Si el repositorio ya tiene una convención clara para documentación, intégrate en ella sin romperla; de lo contrario utiliza:

```text
docs/MetaTrader/
│
├── 00_INDEX.md
├── 00_Contexto_y_Objetivos_Proyecto.md
├── 01_Arquitectura_y_Funcionamiento_MetaTrader5.md
├── 02_Fundamentos_MQL5.md
├── 03_Arquitectura_Expert_Advisors.md
├── 04_Modelo_Trading_Ordenes_Deals_Posiciones.md
├── 05_Gestion_Riesgo_EAs.md
├── 06_Strategy_Tester_y_Datos_Historicos.md
├── 07_Backtesting_Optimizacion_y_Validacion_Quant.md
├── 08_Ciclo_Vida_y_Versionado_Estrategias.md
├── 09_Integracion_Python_MetaTrader5.md
├── 10_MCP_IA_y_Agentes_MetaTrader5.md
├── 11_Arquitectura_Multiagente_Futura.md
├── 12_Analisis_Fundamental_Noticias_y_Macroeconomia.md
├── 13_Brokers_MetaTrader5_Espana.md
├── 14_Despliegue_24x7_VPS.md
├── 15_Seguridad_Credenciales_y_Permisos.md
├── 16_Observabilidad_Auditoria_y_Reproducibilidad.md
├── 17_Estandar_Desarrollo_EAs_con_IA.md
├── 18_Primeros_Bots_Laboratorio.md
├── 19_Plan_Puesta_en_Marcha.md
├── ROADMAP.md
├── ESTADO_INVESTIGACION.md
├── FUENTES.md
├── GLOSARIO.md
├── PREGUNTAS_ABIERTAS.md
└── DECISIONS/
    └── README.md
```

No crees ADR por llenar carpetas. Los ADR se crearán solo cuando una investigación produzca una decisión arquitectónica importante que merezca quedar congelada.

---

# 9. DOCUMENTO 00 — ÍNDICE MAESTRO

## Archivo

`00_INDEX.md`

Debe ser el punto de entrada de toda la documentación.

Incluye:

- objetivo del proyecto;
- arquitectura objetivo resumida;
- estado de cada documento;
- enlaces internos a todos los documentos;
- decisiones tomadas;
- decisiones pendientes;
- orden recomendado de lectura;
- fase actual;
- criterio necesario para pasar a configuración.

Usa una tabla como:

| Documento | Estado | Última revisión | Hallazgos críticos | Bloquea puesta en marcha |
|---|---|---|---|---|

Estados:

```text
NO INICIADO
EN INVESTIGACIÓN
BORRADOR
REVISADO
VERIFICADO
```

---

# 10. DOCUMENTO 00B — CONTEXTO Y OBJETIVOS

## Archivo

`00_Contexto_y_Objetivos_Proyecto.md`

Documenta de forma inequívoca:

### Qué estamos construyendo

Una plataforma personal de investigación y trading algorítmico donde:

- MetaTrader 5 proporciona datos de broker, terminal, Strategy Tester y ejecución de EAs;
- MQL5 implementa los EAs;
- Python puede utilizarse para análisis quant, estadística, automatización auxiliar y procesamiento de datos;
- MCP conecta MetaTrader con agentes de IA cuando aporte valor;
- agentes de IA analizan, investigan, diseñan, generan y revisan estrategias;
- los EAs ejecutan de forma determinista;
- las estrategias se revisan periódicamente.

### Qué no estamos construyendo ahora

- una plataforma SaaS;
- una web de trading propia;
- un exchange;
- un broker adapter propio si MT5 ya proporciona la capa;
- un LLM trader en tiempo real;
- trading de alta frecuencia;
- un sistema sin supervisión capaz de mover dinero desde el primer día.

### Objetivo inicial

Aprender y validar la plataforma mediante **cuentas demo y estrategias deliberadamente sencillas**, antes de intentar desarrollar estrategias sofisticadas.

---

# 11. FASE DE INVESTIGACIÓN 1 — ARQUITECTURA DE METATRADER 5

## Archivo

`01_Arquitectura_y_Funcionamiento_MetaTrader5.md`

Investiga en profundidad:

### Componentes

- terminal MetaTrader 5;
- MetaEditor;
- MQL5 IDE;
- Strategy Tester;
- agentes locales/remotos/cloud del tester;
- Market Watch;
- gráficos;
- servidor del broker;
- MQL5.community;
- CodeBase;
- Market;
- Signals;
- hosting virtual;
- integración Python;
- integración MCP/IA.

### Arquitectura cliente-servidor

Explica:

```text
EA
↓
Terminal MT5
↓
Servidor comercial del broker
↓
mercado / proveedor de liquidez / exchange
```

Documenta exactamente qué ocurre localmente y qué ocurre en el servidor del broker.

### Datos

Investiga:

- ticks;
- barras;
- timeframes;
- Market Depth;
- propiedades de símbolos;
- histórico disponible;
- fuente de datos;
- qué depende del broker;
- zona horaria del servidor;
- calendario económico;
- noticias de la plataforma.

### Carpetas y almacenamiento local

Investiga el **Data Folder** de MT5:

- `MQL5/Experts`;
- `MQL5/Indicators`;
- `MQL5/Scripts`;
- `MQL5/Include`;
- `MQL5/Libraries`;
- presets;
- logs;
- tester;
- archivos de configuración relevantes.

Debes terminar el documento con un diagrama Mermaid de arquitectura.

### Criterio de aceptación

Al acabar este documento debe ser posible explicar dónde vive y por dónde pasa cada uno de estos elementos:

```text
precio → terminal → EA → orden → broker → deal → posición → histórico
```

---

# 12. FASE 2 — FUNDAMENTOS DE MQL5

## Archivo

`02_Fundamentos_MQL5.md`

No conviertas el documento en un curso genérico de programación. Céntrate en lo necesario para escribir EAs mantenibles.

Investiga:

### Lenguaje

- sintaxis tipo C++;
- tipos;
- `input`;
- enums;
- estructuras;
- clases;
- herencia;
- interfaces/patrones relevantes;
- arrays y series temporales;
- manejo de errores;
- logging;
- includes;
- Standard Library.

### Tipos de programas MQL5

Diferencia claramente:

- Expert Advisors;
- indicadores;
- scripts;
- services, si aplica;
- librerías.

### Modelo de eventos

Estudia al menos:

- `OnInit`;
- `OnDeinit`;
- `OnTick`;
- `OnTimer`;
- `OnTrade`;
- `OnTradeTransaction`;
- `OnBookEvent`;
- `OnChartEvent`;
- `OnTester`;
- `OnTesterInit`;
- `OnTesterPass`;
- `OnTesterDeinit`.

Documenta el sistema de colas de eventos y sus implicaciones.

Debe quedar claro que `OnTick` no es “un hilo por tick” y que la aplicación procesa eventos secuencialmente según el modelo definido por MT5.

### Criterio de aceptación

Debe existir suficiente información para que un desarrollador competente pueda empezar un EA sin cometer errores conceptuales sobre el ciclo de vida del programa.

---

# 13. FASE 3 — ARQUITECTURA ESTÁNDAR DE NUESTROS EXPERT ADVISORS

## Archivo

`03_Arquitectura_Expert_Advisors.md`

Define una arquitectura de EA reutilizable para el proyecto.

No programes todavía la implementación completa, pero diseña módulos conceptuales como:

```text
ExpertAdvisor
│
├── StrategySignal
├── MarketState
├── IndicatorManager
├── RiskManager
├── PositionSizer
├── TradeExecutor
├── PositionManager
├── TradeStateTracker
├── SessionFilter
├── SpreadFilter
├── NewsFilter (si aplica)
├── Metrics
└── Logger
```

Investiga cuándo tiene sentido utilizar:

- funciones directas `OrderSend` / `OrderCheck`;
- clase `CTrade` de la Standard Library;
- wrappers propios sobre `CTrade`;
- Magic Number;
- comentarios de órdenes;
- estructuras para aislar estrategia de ejecución.

## Principio obligatorio

Las condiciones de entrada/salida de la estrategia no deben quedar entremezcladas con:

- gestión monetaria;
- ejecución;
- logging;
- tratamiento de errores;
- reconciliación de estado.

Esto permitirá reutilizar la infraestructura del EA entre estrategias.

### Criterio de aceptación

Termina con una propuesta de **plantilla estándar de EA** que será utilizada cuando empiece la fase de desarrollo.

---

# 14. FASE 4 — MODELO DE TRADING: ÓRDENES, DEALS Y POSICIONES

## Archivo

`04_Modelo_Trading_Ordenes_Deals_Posiciones.md`

Este documento es crítico.

Debes estudiar con gran detalle la semántica de MetaTrader 5.

## Conceptos obligatorios

Explica sin ambigüedad:

```text
ORDER ≠ DEAL ≠ POSITION
```

- **Order:** instrucción al broker.
- **Deal:** ejecución de una operación.
- **Position:** exposición resultante.

Documenta cómo una orden puede producir uno o varios deals.

## Estado de órdenes

Investiga los estados oficiales actuales, incluyendo:

- STARTED;
- PLACED;
- CANCELED;
- PARTIAL;
- FILLED;
- REJECTED;
- EXPIRED;
- estados de request/add/modify/cancel si siguen vigentes.

## Ejecución

Investiga:

- Request Execution;
- Instant Execution;
- Market Execution;
- Exchange Execution.

## Filling policies

Investiga:

- FOK;
- IOC;
- RETURN;
- BOC;
- compatibilidades según execution mode;
- comportamiento dependiente del símbolo/broker.

## Netting vs Hedging

Debes explicar implicaciones de:

- cuenta netting;
- cuenta exchange;
- cuenta hedging;
- múltiples operaciones sobre mismo símbolo;
- cierre parcial;
- identificación de posiciones.

## `OrderSend`

Documenta explícitamente que un `true` de `OrderSend()` **no equivale a una ejecución completada**.

Investiga:

- `OrderCheck`;
- `MqlTradeRequest`;
- `MqlTradeResult`;
- `retcode`;
- `retcode_external`;
- `OrderSendAsync`;
- `OnTradeTransaction`.

## `OnTradeTransaction`

Debes estudiar especialmente:

- tipos de transacción;
- múltiples eventos derivados de una misma solicitud;
- ausencia de correspondencia 1:1 entre request y evento;
- cambios concurrentes de estado mientras se procesa un handler;
- tamaño de cola de eventos y consecuencias de bloquear el handler;
- cómo reconstruir correctamente el estado.

## Criterio de aceptación

Incluye diagramas de secuencia para:

1. market order completamente ejecutada;
2. ejecución parcial;
3. rechazo;
4. pending order activada;
5. cancelación;
6. modificación de SL/TP;
7. cierre parcial.

Este documento será la referencia de seguridad del motor de ejecución de los EAs.

---

# 15. FASE 5 — GESTIÓN DE RIESGO DETERMINISTA

## Archivo

`05_Gestion_Riesgo_EAs.md`

Diseña el modelo conceptual de riesgo que deberá compartir toda estrategia.

Investiga y documenta:

- riesgo por operación;
- position sizing;
- tamaño según distancia al Stop Loss;
- tick size;
- tick value;
- contract size;
- lot step;
- minimum volume;
- maximum volume;
- stop level;
- freeze level;
- margen;
- leverage;
- currency conversion;
- spread;
- slippage/deviation;
- límite de posiciones abiertas;
- límite de exposición por activo;
- riesgo agregado;
- pérdidas diarias;
- drawdown;
- trading sessions;
- baja liquidez;
- datos obsoletos;
- volatilidad anormal;
- gaps;
- eventos macro de alto impacto cuando corresponda.

Distingue:

```text
riesgo de la estrategia
riesgo de ejecución
riesgo de mercado
riesgo de cartera
riesgo operacional
```

## Regla

El agente puede proponer parámetros de riesgo, pero **el EA deberá validar límites máximos predefinidos**.

Ninguna estrategia puede “pedir” saltarse los límites del sistema.

### Criterio de aceptación

Propón un `RiskPolicy` común del proyecto con parámetros configurables y hard limits.

No fijes aún los valores definitivos para dinero real. Para el laboratorio, prioriza coherencia y verificabilidad.

---

# 16. FASE 6 — STRATEGY TESTER Y CALIDAD DE DATOS

## Archivo

`06_Strategy_Tester_y_Datos_Historicos.md`

Estudia con precisión el Strategy Tester.

## Modos de ticks

Documenta:

- Real ticks;
- Every tick;
- 1 Minute OHLC;
- Open prices only.

Explica qué errores introduce cada simplificación.

Verifica el comportamiento de fallback cuando no hay ticks reales.

## Datos históricos

Investiga:

- procedencia;
- sincronización con broker;
- histórico de barras;
- histórico de ticks;
- gaps;
- diferencias broker a broker;
- calidad reportada;
- precarga adicional;
- símbolos adicionales usados en estrategias multicurrency;
- timezone;
- DST;
- sesiones;
- comisiones;
- swaps;
- spreads;
- margen;
- ejecución.

## Simulación de ejecución

Investiga capacidad para simular:

- latencia/delay;
- requotes;
- cambios de precio durante ejecución;
- comisiones;
- restricciones de cuenta.

## Agentes del tester

Diferencia:

- local agents;
- remote agents;
- MQL5 Cloud Network.

Evalúa ventajas, coste, privacidad y reproducibilidad.

### Criterio de aceptación

Define qué modo de test usar para:

- pruebas rápidas de lógica;
- optimización inicial;
- validación final;
- estrategias sensibles al intrabar;
- estrategias multicurrency.

---

# 17. FASE 7 — METODOLOGÍA QUANT DE VALIDACIÓN

## Archivo

`07_Backtesting_Optimizacion_y_Validacion_Quant.md`

Este documento debe ser uno de los más rigurosos.

La finalidad es impedir que una IA genere un EA, encuentre una curva bonita y lo declare válido.

## Investiga y explica

### Backtest

- periodo de entrenamiento/in-sample;
- periodo out-of-sample;
- forward testing;
- walk-forward analysis;
- expanding vs rolling windows;
- impacto del régimen de mercado;
- sesgo de supervivencia;
- look-ahead bias;
- data snooping;
- leakage;
- múltiples pruebas;
- optimización excesiva;
- parameter instability;
- selección de universos.

### Costes

El resultado debe incluir:

- spread;
- comisión;
- swap;
- slippage;
- latencia cuando sea relevante.

### Métricas

Como mínimo:

- Net Profit;
- Expected Payoff / Expectancy;
- Profit Factor;
- Sharpe;
- Sortino si se calcula externamente;
- Recovery Factor;
- Max Drawdown;
- Relative Drawdown;
- número de operaciones;
- win rate;
- payoff medio ganador/perdedor;
- MAE/MFE si se obtiene;
- estabilidad por periodo;
- exposición temporal;
- concentración del PnL.

No conviertas ninguna métrica individual en “la verdad”.

### Optimización

Estudia:

- exhaustive search;
- genetic optimization;
- parámetros optimizables;
- `OnTester()` y custom optimization criteria;
- forward optimization;
- riesgo de seleccionar el máximo absoluto;
- necesidad de buscar regiones estables de parámetros en lugar de picos aislados.

### Stress testing

Investiga qué podemos hacer nativamente y qué conviene hacer con Python:

- duplicar costes;
- aumentar slippage;
- variar parámetros;
- desplazar inicio/fin;
- diferentes brokers/datasets;
- Monte Carlo sobre secuencia de operaciones;
- bootstrap;
- perturbaciones de ejecución.

### Protocolo de validación

Diseña un pipeline reproducible tipo:

```text
Hipótesis
↓
Especificación formal
↓
Test de lógica
↓
Backtest inicial
↓
Optimización limitada
↓
Análisis de estabilidad
↓
Out-of-sample
↓
Forward
↓
Stress
↓
Demo
↓
Aprobación / rechazo
```

## Regla crítica

Los criterios de aprobación deben definirse **antes de mirar el resultado final** para reducir el sesgo de selección.

### Criterio de aceptación

Al final debes proponer una plantilla `StrategyValidationReport` que pueda rellenarse automáticamente más adelante.

---

# 18. FASE 8 — CICLO DE VIDA Y VERSIONADO DE ESTRATEGIAS

## Archivo

`08_Ciclo_Vida_y_Versionado_Estrategias.md`

Define una estrategia como una entidad versionada.

Ejemplo conceptual:

```text
BTC_TrendFollowing_H1
v1.0.0
```

Debe registrar:

- ID;
- nombre;
- versión;
- activo/universo;
- broker de prueba;
- timeframe;
- hipótesis;
- lógica de entrada;
- lógica de salida;
- filtros;
- riesgo;
- parámetros;
- fecha de creación;
- autor/agente;
- hash de código;
- versión del EA;
- versión de prompts si intervino IA;
- periodo de backtest;
- dataset/broker;
- resultados;
- periodo OOS;
- forward;
- demo;
- fecha próxima revisión.

## Estados propuestos a estudiar

```text
IDEA
CANDIDATE
BACKTESTING
REJECTED
VALIDATED
DEMO
LIVE_ELIGIBLE
ACTIVE
WATCH
PAUSED
REOPTIMIZE
RETIRED
```

No los aceptes sin analizarlos. Propón el modelo final y sus transiciones.

## Revisiones periódicas

Investiga cómo definir una cadencia según horizonte:

- intradía;
- swing;
- diario;
- medio plazo.

La revisión debe poder terminar en:

```text
HEALTHY
WATCH
REVALIDATE
PAUSE
RETIRE
```

Una modificación de parámetros significativa genera **nueva versión** y requiere nueva validación.

### Criterio de aceptación

Diseña el state machine de estrategias y la información mínima que debe quedar congelada por versión.

---

# 19. FASE 9 — PYTHON + METATRADER 5

## Archivo

`09_Integracion_Python_MetaTrader5.md`

Investiga la integración oficial `MetaTrader5` para Python.

Documenta las capacidades oficiales actuales, incluyendo como mínimo:

- initialize;
- login;
- terminal_info;
- account_info;
- symbols;
- ticks;
- bars;
- Market Depth;
- orders;
- deals;
- positions;
- history;
- order_check;
- order_send.

## Muy importante

El hecho de que Python pueda enviar órdenes **no significa que vayamos a usarlo como ruta principal de ejecución**.

Analiza qué responsabilidades tiene más sentido asignar a Python:

```text
análisis estadístico
research
ETL de resultados
comparativas
Monte Carlo
walk-forward avanzado
reporting
orquestación de experimentos
machine learning futuro
```

frente a:

```text
Ejecución determinista → MQL5 EA
```

Evalúa también:

- dependencia del terminal local;
- IPC;
- Windows;
- ejecución 24/7;
- limitaciones en VPS integrado;
- seguridad de credenciales;
- aislamiento de entornos.

### Criterio de aceptación

Termina con una matriz:

| Función | MQL5 | Python | MCP/Agentes | Decisión recomendada |
|---|---:|---:|---:|---|

---

# 20. FASE 10 — MCP, IA Y METATRADER 5

## Archivo

`10_MCP_IA_y_Agentes_MetaTrader5.md`

Este documento debe estudiar a fondo las capacidades introducidas en las builds actuales de MT5.

## Verifica oficialmente

- versión/build en la que apareció MCP;
- arquitectura del MCP ofrecido por MetaTrader;
- cómo se habilita;
- cómo se conecta Claude Code;
- cómo se conecta Codex;
- proveedores soportados;
- modelos configurables;
- capacidades expuestas al agente;
- acceso a datos de mercado;
- acceso a gráficos;
- desarrollo MQL5;
- compilación;
- testing;
- trading;
- comandos del sistema;
- red;
- confirmaciones;
- permisos.

## Seguridad

Debes averiguar exactamente cómo configurar un entorno inicial donde:

```text
Agente puede leer datos                 = SÍ
Agente puede analizar                   = SÍ
Agente puede trabajar con código MQL5   = SÍ
Agente puede compilar/testear            = SÍ
Agente puede usar red si es necesario   = SOLO SI SE JUSTIFICA
Agente puede ejecutar comandos          = CONTROLADO
Agente puede operar cuenta real         = NO
```

Documenta la diferencia entre:

- AI Assistant integrado;
- proveedor LLM configurado en MT5;
- cliente MCP externo;
- Claude Code conectado al MCP;
- automatización propia externa.

No asumas que todas estas opciones son equivalentes.

### Criterio de aceptación

Produce un diagrama exacto de conexión previsto para nuestro laboratorio con Claude Code.

---

# 21. FASE 11 — ARQUITECTURA MULTIAGENTE FUTURA

## Archivo

`11_Arquitectura_Multiagente_Futura.md`

No debemos implementar todavía este sistema, pero sí dejar la dirección técnica bien diseñada para no cerrar puertas.

## Principio

Diseña una arquitectura extensible por roles/capabilities, no una cadena fija.

Posibles agentes que debes analizar:

### `MarketScannerAgent`

Busca activos o configuraciones interesantes.

### `TechnicalAnalystAgent`

Analiza:

- tendencia;
- momentum;
- volatilidad;
- estructura;
- niveles;
- volumen cuando exista.

### `FundamentalAnalystAgent`

Evalúa macro, fundamentales y contexto económico.

### `NewsAndMacroAgent`

Vigila acontecimientos que puedan mover mercado:

- tipos de interés;
- inflación;
- empleo;
- bancos centrales;
- resultados empresariales;
- geopolítica;
- regulación;
- shocks específicos de activos;
- calendario económico.

No debe abrir operaciones directamente.

Su salida debe ser estructurada, por ejemplo:

```text
EVENT
ASSETS_AFFECTED
DIRECTIONAL_BIAS
CONFIDENCE
TIME_HORIZON
EXPECTED_VOLATILITY
SOURCE
EXPIRY
```

### `RegimeDetectionAgent`

Intenta clasificar régimen:

- trending;
- ranging;
- high volatility;
- low volatility;
- risk-on;
- risk-off;
- eventos excepcionales.

### `StrategyDesignerAgent`

Convierte una hipótesis en reglas explícitas.

No se acepta una estrategia descrita solo en lenguaje natural.

### `RiskReviewerAgent`

Critica supuestos de riesgo, pero no sustituye el `RiskManager` determinista.

### `QuantValidatorAgent`

Orquesta pruebas y analiza evidencia estadística.

### `MQLDeveloperAgent`

Implementa el EA.

### `CodeReviewerAgent`

Revisa:

- errores;
- look-ahead;
- estado;
- ejecución;
- gestión de órdenes;
- sizing;
- duplicación de entradas;
- Magic Number;
- manejo de errores.

### `TestOrchestratorAgent`

Ejecuta test matrix, recopila resultados y conserva artefactos.

### `PortfolioRiskAgent`

Evalúa correlación/concentración entre estrategias ya existentes.

### `StrategyHealthAgent`

No está mirando cada tick para decidir trading.

Su trabajo es **revisar periódicamente el rendimiento de las estrategias** y disparar procesos de revalidación cuando corresponda.

## Arquitectura objetivo

La salida de los agentes debe ser **artefactos estructurados**, no conversaciones efímeras.

Ejemplos:

```text
MarketThesis
StrategyProposal
RiskReview
BacktestPlan
ValidationReport
CodeReview
StrategyVersion
HealthReview
```

Investiga qué formato sería más conveniente (JSON Schema, YAML, clases Python, etc.) pero no implementes todavía.

## Gate determinista

Debe existir conceptual y técnicamente una frontera:

```text
AI output
   ↓
Schema validation
   ↓
Static validation
   ↓
Quant validation
   ↓
Risk gates
   ↓
HUMAN / POLICY GATE
   ↓
Deploy EA
```

La aprobación narrativa de otro LLM no es una puerta suficiente.

---

# 22. FASE 12 — ANÁLISIS FUNDAMENTAL, NOTICIAS Y MACRO

## Archivo

`12_Analisis_Fundamental_Noticias_y_Macroeconomia.md`

Esta pieza debe estudiarse desde el principio aunque se implemente mucho más tarde.

## Capacidades nativas MT5

Investiga:

- calendario económico integrado;
- funciones MQL5 del Economic Calendar;
- importancia de eventos;
- países;
- divisas;
- timestamps;
- uso de `TimeTradeServer`;
- noticias proporcionadas por broker/plataforma;
- limitaciones de históricos y licencias.

## Fuentes externas

Analiza qué información no cubre MT5 y podría requerir fuentes externas:

- noticias financieras;
- comunicados de bancos centrales;
- SEC/ESMA/organismos oficiales;
- earnings;
- corporate actions;
- datos on-chain si en el futuro se estudia cripto;
- sentimiento, solo si se justifica.

No selecciones servicios de pago sin necesidad. Documenta opciones, costes y licencias.

## Diseño conceptual

Un agente de noticias no debe generar una orden como salida primaria.

Debe producir contexto utilizable por los demás agentes.

Ejemplo:

```text
Evento: decisión BCE
Impacto esperado: EUR, DAX, bancos europeos
Horizonte: horas/días
Riesgo de volatilidad: alto
Acción: evitar estrategias mean-reversion durante ventana X
Oportunidad: evaluar breakout tras confirmación
```

Investiga cómo evitar:

- reaccionar a noticias antiguas;
- duplicar eventos;
- usar titulares sin timestamp;
- confundir hora local con hora del broker;
- look-ahead en backtesting de filtros fundamentales;
- utilizar fuentes cuyo histórico no pueda reproducirse.

### Criterio de aceptación

Deja definido qué datos necesitaría un futuro `NewsAndMacroAgent` y cómo se integraría sin formar parte del bucle de ejecución del EA.

---

# 23. FASE 13 — BROKERS MT5 PARA ESPAÑA

## Archivo

`13_Brokers_MetaTrader5_Espana.md`

Esta investigación debe hacerse con información **actualizada en el momento de ejecutarla**.

No elijas broker por publicidad o por “ser conocido”.

## Filtro regulatorio inicial

Investiga:

- entidad que presta el servicio a un residente en España;
- regulación aplicable;
- registro/licencia;
- protección de fondos;
- segregación;
- protección de saldo negativo si aplica;
- condiciones para cliente minorista;
- restricciones de productos.

## Filtro técnico

Para cada candidato serio documenta:

- MetaTrader 5 real;
- cuenta demo;
- instrumentos;
- Forex;
- índices;
- acciones/CFD según corresponda;
- commodities;
- cripto si existe;
- spreads;
- comisiones;
- swaps;
- tamaño mínimo;
- lote step;
- historical ticks;
- profundidad histórica;
- netting/hedging;
- execution mode;
- filling policies;
- server timezone;
- DST;
- stop level;
- freeze level;
- slippage;
- VPS;
- soporte;
- APIs adicionales si existen.

## Calidad para backtesting

Valora expresamente:

- disponibilidad de real ticks;
- profundidad histórica;
- continuidad;
- diferencias demo/real;
- costes reproducibles.

## Criterio de aceptación

Genera una shortlist razonada de **2-4 brokers** para el laboratorio demo.

No abras cuentas todavía.

Si el ranking depende del tipo de activo, crea rankings separados.

---

# 24. FASE 14 — DESPLIEGUE 24/7 Y VPS

## Archivo

`14_Despliegue_24x7_VPS.md`

Compara como mínimo:

### Opción A — VPS integrado de MetaTrader / MQL5 Virtual Hosting

Investiga oficialmente:

- cómo migra EAs;
- sincronización;
- logs;
- número de charts/EAs;
- actualizaciones;
- ausencia de acceso físico;
- prohibición de DLL;
- WebRequest;
- recursos;
- mantenimiento;
- relación con MCP/agentes;
- relación con Python externo.

### Opción B — VPS Windows completo

Evalúa:

```text
Windows VPS
├── MetaTrader 5
├── MetaEditor
├── Python
├── Git
├── Claude/Codex/MCP client
└── servicios auxiliares
```

### Opción C — arquitectura híbrida

Por ejemplo:

```text
VPS ejecuta EAs 24/7
PC/NAS ejecuta agentes/research periódicamente
```

Evalúa:

- disponibilidad;
- latencia;
- coste;
- seguridad;
- mantenimiento;
- backups;
- despliegue de nuevas versiones;
- observabilidad;
- recuperación tras reinicio;
- necesidad real de tener agentes 24/7.

## Hipótesis inicial a comprobar

Probablemente el **hosting integrado de MT5 sea excelente para EAs sencillos**, pero puede resultar demasiado limitado si queremos Python + agentes externos + MCP + herramientas de desarrollo dentro del mismo host.

No des esta hipótesis por cierta: investígala.

### Criterio de aceptación

Recomienda una arquitectura de laboratorio y otra de producción futura.

---

# 25. FASE 15 — SEGURIDAD

## Archivo

`15_Seguridad_Credenciales_y_Permisos.md`

Investiga y define:

- credenciales de broker;
- contraseñas investor/trader si aplica;
- passkeys disponibles;
- MQL5.community;
- API keys de IA;
- secretos Python;
- variables de entorno;
- exclusiones `.gitignore`;
- permisos MCP;
- permisos de red;
- permisos de command line;
- permisos de AI trading;
- logs y secretos;
- backup cifrado;
- principio de mínimo privilegio.

## Configuración inicial obligatoria

La recomendación para laboratorio debe ser:

```text
Cuenta DEMO
Trading manual del usuario: permitido si hace falta
Trading del EA: solo en demo
Trading iniciado directamente por IA: deshabilitado
Confirmación manual para cualquier capacidad sensible: habilitada cuando exista
Credenciales reales: ninguna
```

## Criterio de aceptación

Crear una checklist de seguridad previa a:

1. laboratorio demo;
2. VPS;
3. cualquier futura cuenta real.

---

# 26. FASE 16 — OBSERVABILIDAD Y REPRODUCIBILIDAD

## Archivo

`16_Observabilidad_Auditoria_y_Reproducibilidad.md`

Define cómo podremos responder meses después:

> ¿Por qué esta estrategia estaba activa y con qué evidencia se aprobó?

Debemos poder recuperar:

- código exacto;
- commit Git;
- versión del EA;
- `.set` de parámetros;
- símbolo;
- broker/server;
- periodo;
- timeframe;
- tick model;
- build MT5;
- costes;
- resultados;
- optimización;
- forward;
- demo;
- logs;
- decisiones de agentes;
- modelo/prompts cuando afecten al diseño.

Investiga qué artefactos genera MT5 y cuáles deberemos exportar nosotros.

Propón estructura para:

```text
strategies/
  BTC_TrendFollowing_H1/
    v1.0.0/
      strategy.yaml
      src/
      presets/
      backtests/
      optimization/
      forward/
      demo/
      reviews/
```

No la implementes hasta comprobar cómo encaja con el repositorio real.

---

# 27. FASE 17 — ESTÁNDAR PARA DESARROLLAR EAs CON IA

## Archivo

`17_Estandar_Desarrollo_EAs_con_IA.md`

Este documento será el futuro **contrato para cualquier agente que programe MQL5**.

Debe incluir reglas como:

- no inventar APIs de MQL5;
- consultar documentación oficial cuando haya duda;
- compilar siempre;
- cero warnings salvo justificación;
- no usar look-ahead;
- no mezclar lógica de señal y ejecución;
- no asumir pip/tick/point equivalentes;
- consultar propiedades reales del símbolo;
- normalizar volumen al `SYMBOL_VOLUME_STEP`;
- validar stops;
- usar Magic Number;
- tratar errores y retcodes;
- no asumir que `OrderSend=true` implica fill;
- observar `OnTradeTransaction` cuando corresponda;
- impedir duplicación de posiciones por ticks repetidos;
- distinguir nueva barra de nuevo tick cuando la estrategia sea bar-based;
- evitar operaciones múltiples por la misma señal;
- documentar inputs;
- separar parámetros optimizables de hard risk limits;
- logging suficiente;
- código versionado;
- backtest reproducible.

Define también un **prompt template estándar** que más adelante se utilizará para pedir a una IA un EA.

No programes todavía estrategias completas.

---

# 28. FASE 18 — PRIMEROS BOTS DEL LABORATORIO

## Archivo

`18_Primeros_Bots_Laboratorio.md`

Diseña tres EAs deliberadamente simples cuyo propósito inicial sea **aprender y validar el pipeline**, no demostrar rentabilidad.

## EA 1 — Trend Following simple

Ejemplo de familia:

```text
EMA rápida / EMA lenta
+ filtro opcional de tendencia
+ ATR para riesgo
```

Objetivos de aprendizaje:

- indicadores;
- detección de cruce;
- una operación por señal;
- SL/TP;
- sizing;
- backtest;
- parámetros.

## EA 2 — Mean Reversion

Ejemplo:

```text
RSI / Bollinger
+ filtro de régimen
```

Objetivos:

- entrada contraria;
- salida temporal/mean;
- condiciones laterales;
- riesgo de tendencia fuerte.

## EA 3 — Breakout / Volatility

Ejemplo:

```text
ruptura de rango
+ ATR
```

Objetivos:

- pending vs market orders;
- slippage;
- volatilidad;
- trailing stop si tiene sentido;
- sesiones.

## Importante

No fijes todavía los parámetros “ganadores”.

Define qué aprenderemos con cada bot y en qué orden se deben desarrollar.

---

# 29. FASE 19 — PLAN DE PUESTA EN MARCHA

## Archivo

`19_Plan_Puesta_en_Marcha.md`

Este documento NO debe ejecutar nada.

Debe convertir todo lo investigado en instrucciones concretas para la siguiente fase.

Debe incluir una secuencia similar a:

### Paso 1
Instalar versión verificada de MetaTrader 5.

### Paso 2
Crear/usar cuenta demo en broker seleccionado.

### Paso 3
Configurar MetaEditor y repositorio.

### Paso 4
Confirmar build y Data Folder.

### Paso 5
Configurar Git y exclusión de secretos.

### Paso 6
Configurar MCP para Claude Code con trading de IA deshabilitado.

### Paso 7
Validar acceso read-only a datos/entorno.

### Paso 8
Crear Hello World / EA de diagnóstico.

### Paso 9
Compilar.

### Paso 10
Ejecutar Strategy Tester.

### Paso 11
Crear EA 1.

### Paso 12
Aplicar el protocolo de validación.

### Paso 13
EA 2 y EA 3.

### Paso 14
Diseñar automatización de tests.

### Paso 15
Evaluar despliegue 24/7.

Debes detallar comandos, pantallas, prerequisitos y verificaciones que se necesitarán más adelante, pero **sin ejecutarlos todavía**.

---

# 30. ROADMAP DEL PROYECTO

## Archivo

`ROADMAP.md`

La hoja de ruta general debe reflejar como mínimo:

## Fase 0 — Investigación y documentación

**Esta fase.**

Salida: conocimiento suficiente para configurar sin improvisar.

## Fase 1 — Laboratorio MetaTrader

- instalación;
- demo;
- MetaEditor;
- MCP;
- Git;
- primer programa;
- Strategy Tester.

## Fase 2 — Primeros EAs

- 3 bots simples;
- estándar común;
- tests;
- errores y eventos de trading.

## Fase 3 — Metodología Quant

- pipeline automatizado;
- backtest;
- optimización;
- forward;
- stress;
- reporting.

## Fase 4 — Demo prolongada

- estabilidad operacional;
- métricas;
- revisiones;
- versionado.

## Fase 5 — Automatización mediante IA

- generación EA;
- revisión;
- compilación;
- test;
- análisis de resultados.

## Fase 6 — Multiagente

- market scanner;
- técnico;
- fundamental/news;
- regime;
- strategy designer;
- quant;
- MQL developer;
- reviewer;
- strategy health.

## Fase 7 — Preparación para real

Solo si alguna vez se decide avanzar:

- broker final;
- seguridad;
- VPS;
- límites;
- capital mínimo;
- protocolo de aprobación;
- rollback;
- kill switch;
- transición gradual.

**La Fase 7 no debe ejecutarse ahora.**

---

# 31. INVESTIGACIÓN ESPECÍFICA SOBRE BROKER DEPENDENCY

A lo largo de todos los documentos debes marcar claramente aquello que depende del broker.

Ejemplos:

```text
histórico de ticks
spreads
comisiones
swaps
instrumentos
symbols naming
digits
point
tick size
tick value
contract size
stop level
freeze level
filling modes
execution modes
trading sessions
margin rules
netting/hedging
server timezone
liquidity
```

Una regla que funcione en `EURUSD` de un broker no puede asumirse idéntica en otro.

Esto debe reflejarse en el futuro diseño de EAs: **consultar propiedades del símbolo, no codificar supuestos arbitrarios**.

---

# 32. INVESTIGACIÓN ESPECÍFICA SOBRE SOBREAJUSTE

Trata el overfitting como uno de los principales riesgos del proyecto.

El hecho de que usemos agentes capaces de generar rápidamente muchas estrategias aumenta el problema de **multiple testing / data snooping**.

Debes diseñar mecanismos para registrar:

- cuántas variantes se han probado;
- cuántos parámetros;
- qué datasets han visto;
- qué resultados fueron rechazados;
- quién propuso cada variante.

No conserves solo el “ganador”.

Una futura IA podría generar cientos de estrategias hasta encontrar por azar una curva excepcional. El pipeline debe impedir interpretar ese azar como edge.

Investiga técnicas apropiadas para mitigar esto y documenta qué puede hacerse dentro de MT5 y qué requiere Python/estadística externa.

---

# 33. INVESTIGACIÓN ESPECÍFICA SOBRE NEWS Y EVENTOS

El futuro sistema multiagente debe estar abierto a eventos no puramente técnicos.

Debes diseñar conceptualmente dos usos distintos:

## Uso A — generar ideas

Ejemplo:

```text
cambio de política monetaria
↓
activos afectados
↓
hipótesis
↓
StrategyDesigner
```

## Uso B — risk filter

Ejemplo:

```text
NFP en 15 minutos
↓
strategy policy
↓
NO NEW ENTRIES
```

No mezcles automáticamente ambos conceptos.

Para algunos EAs puede tener sentido operar eventos; para otros, evitarlos.

Cualquier regla de noticias que vaya a formar parte de una estrategia debe ser **backtesteable o, como mínimo, reproducible**.

---

# 34. MODELO DE SALIDA DE UNA STRATEGY PROPOSAL

Dentro de la documentación multiagente, define un esquema conceptual al menos equivalente a:

```yaml
strategy_id:
name:
version_candidate:
asset_universe:
timeframe:
market_regime:
hypothesis:

entry_rules: []
exit_rules: []
filters: []

risk:
  stop_loss:
  take_profit:
  risk_per_trade:
  max_positions:

parameters:
  optimizable: []
  fixed: []

expected_behavior:
  preferred_regime:
  failure_regime:
  expected_holding_time:

validation_plan:
  in_sample:
  out_of_sample:
  forward:
  stress_tests: []

review_interval:
expiry_conditions: []
```

No adoptes este YAML literalmente si encuentras una estructura mejor. Su propósito es evitar que una estrategia sea simplemente un párrafo ambiguo.

---

# 35. MODELO DE PROMOCIÓN DE ESTRATEGIAS

La arquitectura que documentes debe impedir este flujo:

```text
StrategyDesigner → Reviewer dice OK → LIVE
```

El flujo mínimo deberá parecerse a:

```text
StrategyProposal
      ↓
SchemaValidator
      ↓
StaticStrategyValidator
      ↓
Backtest
      ↓
QuantValidator
      ↓
Forward/OOS
      ↓
Stress tests
      ↓
Demo candidate
      ↓
Demo evaluation
      ↓
Policy/Human approval
      ↓
Deploy EA version
```

El LLM Reviewer es útil, pero **no sustituye evidencia**.

---

# 36. REGLAS PARA EL FUTURO EA EN PRODUCCIÓN

La documentación debe establecer como principios no negociables:

1. Sin dependencia obligatoria de LLM para seguir gestionando una posición abierta.
2. Si el servicio de IA cae, el EA debe seguir funcionando.
3. SL y mecanismos básicos de salida no pueden depender de una API externa de IA.
4. Debe poder reiniciarse MT5 sin perder el conocimiento esencial de las posiciones gestionadas.
5. El EA debe identificar sus operaciones mediante Magic Number y/o metadatos fiables.
6. Debe considerar operaciones manuales o de otros EAs sin apropiarse de ellas.
7. Debe manejar cambios de estado provenientes del broker.
8. Debe consultar propiedades reales del símbolo.
9. Debe fallar de forma segura si faltan datos esenciales.
10. Los límites duros de riesgo no son parámetros optimizables libremente.

---

# 37. GLOSARIO

## Archivo

`GLOSARIO.md`

Incluye como mínimo:

- MetaTrader 5;
- MetaEditor;
- MQL5;
- Expert Advisor;
- Indicator;
- Script;
- Symbol;
- Tick;
- Bar;
- Point;
- Pip;
- Tick Size;
- Tick Value;
- Spread;
- Slippage;
- Order;
- Deal;
- Position;
- Pending Order;
- Filling Policy;
- FOK;
- IOC;
- RETURN;
- BOC;
- Netting;
- Hedging;
- Magic Number;
- Stop Level;
- Freeze Level;
- Strategy Tester;
- Real Ticks;
- Backtest;
- In-Sample;
- Out-of-Sample;
- Forward Test;
- Walk Forward;
- Optimization;
- Overfitting;
- Drawdown;
- Expectancy;
- Profit Factor;
- Sharpe;
- Recovery Factor;
- MCP;
- VPS;
- StrategyProposal;
- StrategyVersion.

---

# 38. ESTADO DE INVESTIGACIÓN

## Archivo

`ESTADO_INVESTIGACION.md`

Debe actualizarse durante todo el proceso.

Usa una checklist con:

```text
[ ] investigado
[ ] documentado
[ ] fuente oficial
[ ] contradicciones revisadas
[ ] preguntas abiertas registradas
[ ] criterio de aceptación cumplido
```

Además registra:

- fecha;
- bloque actual;
- archivos creados/modificados;
- hallazgos importantes;
- incertidumbres;
- siguiente bloque.

Este archivo debe permitir retomar el trabajo con otra IA sin perder contexto.

---

# 39. PREGUNTAS ABIERTAS

## Archivo

`PREGUNTAS_ABIERTAS.md`

Una pregunta abierta debe tener formato:

```markdown
## Q-001 — ¿...?

**Impacto:** Alto / Medio / Bajo  
**Bloquea configuración:** Sí/No  
**Qué sabemos:**  
**Fuentes:**  
**Qué falta verificar:**  
**Decisión provisional:**  
```

No uses este documento como vertedero. Resuelve lo que puedas antes de incluirlo.

---

# 40. CALIDAD DOCUMENTAL

Todos los documentos deben:

- estar escritos en español técnico claro;
- conservar nombres de APIs MQL5 en su forma original;
- utilizar Markdown limpio;
- usar tablas cuando aporten claridad;
- incluir Mermaid para arquitecturas y state machines relevantes;
- incluir ejemplos cuando ayuden a entender conceptos;
- distinguir hechos de recomendaciones;
- citar fuentes;
- indicar fecha de verificación en datos cambiantes;
- no repetir secciones enteras de otros documentos;
- enlazar internamente al documento canónico cuando corresponda.

No copies grandes bloques de la documentación oficial. Resume, interpreta y enlaza.

---

# 41. FUENTES OFICIALES BASE QUE DEBES REVISAR

Estas URLs son **puntos de partida**, no una lista cerrada.

## MetaTrader / releases

- https://www.metatrader5.com/es/releasenotes
- https://www.metatrader5.com/en/releasenotes/terminal/2447
- https://www.metatrader5.com/es/terminal/help

## MQL5 Reference

- https://www.mql5.com/en/docs
- https://www.mql5.com/en/docs/event_handlers
- https://www.mql5.com/en/docs/event_handlers/oninit
- https://www.mql5.com/en/docs/event_handlers/ontick
- https://www.mql5.com/en/docs/event_handlers/ontradetransaction
- https://www.mql5.com/en/docs/trading
- https://www.mql5.com/en/docs/trading/ordersend
- https://www.mql5.com/en/docs/constants/tradingconstants/orderproperties
- https://www.mql5.com/en/docs/standardlibrary
- https://www.mql5.com/en/docs/standardlibrary/tradeclasses
- https://www.mql5.com/en/docs/standardlibrary/tradeclasses/ctrade
- https://www.mql5.com/en/docs/calendar

## Strategy Tester

- https://www.mql5.com/en/book/automation/tester
- https://www.mql5.com/en/book/automation/tester/tester_ticks
- https://www.metatrader5.com/es/terminal/help/algotrading/testing
- https://www.metatrader5.com/es/terminal/help/algotrading/strategy_optimization
- https://www.mql5.com/en/docs/event_handlers/ontester

## Python

- https://www.mql5.com/en/docs/python_metatrader5

## VPS

- https://www.mql5.com/en/vps/rules

Cuando encuentres páginas oficiales más específicas, añádelas a `FUENTES.md`.

---

# 42. HALLAZGOS OFICIALES QUE DEBEN SER CONFIRMADOS Y REFLEJADOS

A fecha de preparación de este prompt se han verificado oficialmente los siguientes puntos. Vuelve a comprobarlos por si han cambiado:

1. **MetaTrader 5 build 6060 — 23/07/2026** introdujo soporte nativo MCP e IA basada en agentes.
2. La documentación de MetaQuotes menciona conexión con sistemas MCP externos como **OpenAI Codex y Claude Code**.
3. Los permisos de IA incluyen controles separados para trading, confirmación manual, red y command line.
4. La API MQL5 distingue **Order, Deal y Position**.
5. Una orden puede producir varios deals.
6. `OrderSend()` devolviendo `true` no garantiza ejecución final.
7. `OnTradeTransaction()` puede ser llamado varias veces para una solicitud y debe usarse para rastrear resultados/transiciones relevantes.
8. El Strategy Tester soporta real ticks, every tick, M1 OHLC y open prices.
9. El tester puede emular retrasos de ejecución.
10. MT5 dispone de forward testing para contrastar resultados de optimización en un periodo no optimizado.
11. El Strategy Tester es multicurrency y multithreaded y admite agentes locales/remotos/cloud.
12. Existe integración oficial Python mediante paquete `MetaTrader5`.
13. MQL5 dispone de funciones del Economic Calendar directamente en la plataforma y usan `TimeTradeServer`.
14. El VPS integrado de MQL5 no ofrece acceso físico al terminal virtual, no permite DLL y la sincronización del entorno se hace bajo petición.

Si alguna afirmación ha cambiado, actualízala y registra la modificación.

---

# 43. ORDEN ESTRICTO DE EJECUCIÓN

Sigue este orden salvo que una dependencia técnica demostrable exija otra cosa:

```text
1. Leer documentación existente del repositorio
2. Crear 00_INDEX y ESTADO_INVESTIGACION
3. Revisar releases oficiales actuales
4. Arquitectura MT5
5. MQL5 y event model
6. EA architecture
7. Orders / Deals / Positions
8. Risk management
9. Strategy Tester / data
10. Quant validation
11. Strategy lifecycle/versioning
12. Python
13. MCP / agents
14. Multi-agent architecture
15. Fundamental/news
16. Brokers Spain
17. VPS / 24x7
18. Security
19. Observability/reproducibility
20. EA development standard for AI
21. First laboratory bots
22. Final launch/configuration plan
23. Consolidate ROADMAP
24. Final cross-document audit
```

No investigues diez temas superficialmente en paralelo. Completa bloques con suficiente profundidad.

---

# 44. AUDITORÍA FINAL OBLIGATORIA

Cuando todos los documentos estén creados, realiza una auditoría cruzada.

Busca al menos:

- contradicciones entre documentos;
- términos usados con distintos significados;
- enlaces rotos;
- datos sin fuente;
- afirmaciones dependientes del broker tratadas como universales;
- versiones/builds obsoletas;
- recomendaciones que permiten a IA operar directamente pese al principio arquitectónico;
- riesgos no cubiertos;
- documentación redundante;
- decisiones sin justificación;
- pasos de puesta en marcha que dependan de información todavía `[PENDIENTE]`.

Actualiza `00_INDEX.md`, `ESTADO_INVESTIGACION.md`, `ROADMAP.md` y `PREGUNTAS_ABIERTAS.md` después de esa auditoría.

---

# 45. DEFINITION OF DONE DE ESTA FASE

**NO des por terminada la investigación simplemente porque todos los archivos existan.**

La fase solo puede marcarse `COMPLETA` si se cumple todo:

- [ ] Arquitectura MT5 comprendida y documentada.
- [ ] Build/versiones actuales verificadas.
- [ ] MQL5 event model documentado.
- [ ] Arquitectura común de EAs definida.
- [ ] Order/Deal/Position comprendidos correctamente.
- [ ] Netting/Hedging estudiados.
- [ ] Filling policies estudiadas.
- [ ] Gestión de riesgo común diseñada.
- [ ] Strategy Tester estudiado.
- [ ] Real ticks y limitaciones de datos comprendidos.
- [ ] Forward testing estudiado.
- [ ] Metodología quant definida.
- [ ] Riesgo de overfitting/multiple testing tratado.
- [ ] Versionado y ciclo de vida de estrategias definido.
- [ ] Integración Python estudiada.
- [ ] MCP actual de MT5 estudiado.
- [ ] Claude Code ↔ MT5 investigado y documentado.
- [ ] Permisos de IA y seguridad estudiados.
- [ ] Arquitectura multiagente extensible definida.
- [ ] Agente de noticias/fundamental contemplado.
- [ ] Economic Calendar estudiado.
- [ ] Brokers MT5 para España comparados.
- [ ] Arquitectura VPS/24x7 evaluada.
- [ ] Observabilidad/reproducibilidad definida.
- [ ] Estándar de desarrollo de EAs con IA definido.
- [ ] Primeros 3 bots de laboratorio planificados.
- [ ] Plan de puesta en marcha secuencial listo.
- [ ] Todas las fuentes registradas.
- [ ] Preguntas importantes sin resolver identificadas.
- [ ] Auditoría cruzada realizada.
- [ ] Ningún paso de laboratorio crítico depende de una suposición no marcada.

---

# 46. RESULTADO FINAL QUE ESPERO DE TI

Cuando completes toda esta investigación, no quiero una explicación enorme en el chat.

Quiero que hayas **creado y actualizado los archivos del repositorio**.

Tu respuesta final debe limitarse a algo parecido a:

```text
Investigación MetaTrader 5 completada.

Documentos: XX
Fuentes oficiales revisadas: XX
Decisiones arquitectónicas cerradas: XX
Preguntas abiertas no bloqueantes: XX
Preguntas bloqueantes: XX

Estado: LISTO / NO LISTO para Fase 1 — Puesta en Marcha.

Siguiente paso recomendado: ...
```

Si el estado es `NO LISTO`, explica únicamente qué bloquea el avance y deja todo documentado.

---

# 47. DIRECTIVA FINAL

Empieza leyendo todos los archivos relevantes ya existentes en el proyecto, especialmente la documentación de MetaTrader 5 que ya se haya generado.

Después inicia la investigación en el orden indicado.

**No te limites al contenido de este prompt:** úsalo como especificación mínima. Si descubres una materia importante para la seguridad, reproducibilidad, validación cuantitativa, arquitectura de EAs, MCP, ejecución o futura automatización multiagente que aquí no esté contemplada, investígala, documenta por qué importa y añádela a la estructura de conocimiento.

Tu misión en esta fase no es producir cuanto antes un bot que compile.

Tu misión es conseguir que, cuando empecemos a configurar MetaTrader 5 y a crear los primeros EAs, sepamos:

- qué estamos haciendo;
- por qué lo hacemos así;
- qué depende de MT5;
- qué depende del broker;
- qué debe hacer MQL5;
- qué debe hacer Python;
- qué puede hacer la IA;
- qué no debe hacer la IA;
- cómo validar una estrategia;
- cómo versionarla;
- cómo desplegarla;
- cómo revisarla;
- cómo retirarla;
- y qué evidencias necesitamos antes de confiar en ella.

**No pases a instalación/configuración/desarrollo hasta completar y auditar toda la documentación de investigación.**
