# Contexto y objetivos del proyecto

> **Estado:** VERIFICADO
> **Última revisión:** 2026-08-07

## 1. Cambio de rumbo

El proyecto abandona la construcción de una plataforma web propia de trading (línea aparcada, no eliminada del historial) y adopta **MetaTrader 5 (MT5)** como plataforma principal de mercado, ejecución, trading algorítmico y backtesting. La razón es evitar reconstruir desde cero capacidades que MT5 ya ofrece de forma madura: terminal, conectividad de broker, lenguaje de programación (MQL5), Strategy Tester, y ahora también integración nativa con agentes de IA vía MCP (build ≥6060, ver `10_MCP_IA_y_Agentes_MetaTrader5.md`).

## 2. Qué estamos construyendo

Una plataforma personal de investigación y trading algorítmico donde:

- **MetaTrader 5** proporciona datos de broker, terminal, Strategy Tester y ejecución de EAs.
- **MQL5** implementa los Expert Advisors (EAs) que ejecutan las estrategias de forma determinista.
- **Python** se usa para análisis quant, estadística, automatización auxiliar y procesamiento de datos — nunca como ruta principal de ejecución de órdenes.
- **MCP** conecta MetaTrader con agentes de IA (Claude Code entre ellos) cuando aporta valor real, no como intermediario obligatorio.
- **Agentes de IA** analizan, investigan, diseñan, generan y revisan estrategias — pero no deciden operaciones en tiempo real.
- Los **EAs ejecutan de forma determinista**, sin depender de una llamada a un LLM en el bucle de trading.
- Las **estrategias se versionan y se revisan periódicamente**, con evidencia cuantitativa reproducible como condición de promoción.

## 3. Qué NO estamos construyendo ahora

- Una plataforma SaaS.
- Una web de trading propia (la línea anterior queda aparcada, no rescatada en esta fase).
- Un exchange.
- Un broker adapter propio — MT5 ya proporciona esa capa.
- Un "LLM trader" observando cada tick y decidiendo en tiempo real.
- Trading de alta frecuencia.
- Un sistema sin supervisión capaz de mover dinero real desde el primer día.

## 4. Principio arquitectónico central

```text
┌─────────────────────────────────────┐
│ CAPA DE INVESTIGACIÓN / INTELIGENCIA │
│ LLMs + agentes + Python + noticias   │
│ análisis técnico/fundamental/quant   │
└──────────────────┬────────────────────┘
                   │ propone
                   ▼
┌─────────────────────────────────────┐
│ CAPA DE VALIDACIÓN                    │
│ reglas estáticas + riesgo + quant    │
│ backtest + forward + stress + demo   │
└──────────────────┬────────────────────┘
                   │ aprueba versión
                   ▼
┌─────────────────────────────────────┐
│ CAPA DE EJECUCIÓN DETERMINISTA        │
│ MetaTrader 5 + Expert Advisor MQL5   │
│ sin LLM en el bucle de ejecución     │
└──────────────────┬────────────────────┘
                   ▼
              Broker MT5
```

**La IA no es el motor de ejecución.** Aunque MT5 permite técnicamente que un agente conectado por MCP realice operaciones (ver `10_MCP_IA_y_Agentes_MetaTrader5.md`), la configuración inicial del laboratorio deshabilita el permiso de "AI-initiated trading" para que los agentes puedan investigar, desarrollar y probar sin autorización de trading real.

## 5. Objetivo inicial

Aprender y validar la plataforma mediante **cuentas demo y estrategias deliberadamente sencillas** (ver `18_Primeros_Bots_Laboratorio.md`), antes de intentar desarrollar estrategias sofisticadas. El criterio de éxito de esta fase no es "tener un bot rentable", sino tener un **pipeline reproducible** que sepa distinguir una estrategia con evidencia real de una que solo parece buena en una curva de backtest.

## 6. Principios heredados de la fase anterior que siguen vigentes

1. La IA puede analizar, proponer, diseñar, programar, revisar y evaluar.
2. La ejecución de una estrategia aceptada la realiza un **EA determinista**, no un LLM improvisando tick a tick.
3. Las estrategias están **versionadas**.
4. Toda estrategia pasa por **backtesting, validación fuera de muestra y demo/forward** antes de ser candidata a dinero real.
5. La gestión de riesgo es **determinista y programada** en el EA o en componentes deterministas, no delegada al razonamiento de una IA en tiempo real.
6. Existe **trazabilidad** suficiente para saber qué versión se probó, con qué parámetros, datos, broker, costes y resultados.
7. **Dinero real queda fuera de esta fase** (y de toda la Fase 0-6 del `ROADMAP.md`; ver Fase 7).
8. La arquitectura permite en el futuro un **flujo multiagente extensible**, sin diseñarse como una cadena rígida que no pueda crecer (ver `11_Arquitectura_Multiagente_Futura.md`).

## 7. Relación con la documentación previa

Existe un documento `Web_METATRADER5.md` en la raíz del repositorio, elaborado el 06/08/2026 a partir del sitio web oficial. Se ha usado como punto de partida pero **no como fuente de verdad**: durante esta investigación se ha verificado directamente contra `metatrader5.com/en/releasenotes` y se ha corregido al menos un dato relevante (ver hallazgo sobre la build vigente en `ESTADO_INVESTIGACION.md` y en `01_Arquitectura_y_Funcionamiento_MetaTrader5.md`).

## 8. Alcance de esta fase (Fase 0)

Esta fase es de **investigación y documentación**. No incluye instalar MT5, crear cuentas reales, depositar dinero, enviar órdenes, habilitar permisos de trading por IA, programar los EAs definitivos, configurar un VPS de producción, ni elegir definitivamente un broker. El resultado de esta fase debe permitir iniciar después una Fase 1 (Laboratorio) con el camino ya decidido — ver `19_Plan_Puesta_en_Marcha.md` y `ROADMAP.md`.

## Fuentes consultadas

- F004 — Sitio oficial MetaTrader 5 (es). Ver `FUENTES.md`.
- `Promp_InicioMetaTrader_Investigar.md` (especificación de esta fase, documento interno del proyecto).
- `Web_METATRADER5.md` (documento interno previo, tratado como fuente secundaria a contrastar, no como verdad).
