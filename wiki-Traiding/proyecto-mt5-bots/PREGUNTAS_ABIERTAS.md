# Preguntas abiertas

> Registro de cuestiones que no han podido resolverse por completo durante la investigación, o que dependen de decisiones externas (broker elegido, cuenta real, presupuesto). No es un vertedero: solo se añade aquí lo que ya se ha intentado resolver y sigue sin evidencia suficiente.

## Q-001 — ¿La build de MT5 seguirá siendo la 6090 cuando arranque la Fase 1 (Puesta en Marcha)?

**Impacto:** Medio
**Bloquea configuración:** No
**Qué sabemos:** A fecha de consulta (07/08/2026) la build vigente es 6090 (30/07/2026), verificada en F003. MetaQuotes publica actualizaciones con cadencia de días/semanas.
**Fuentes:** F001, F003
**Qué falta verificar:** Re-comprobar el build exacto en el momento de instalar (Paso 1 del Plan de Puesta en Marcha).
**Decisión provisional:** El Plan de Puesta en Marcha (`19_Plan_Puesta_en_Marcha.md`) incluye como primer paso re-verificar la build oficial antes de instalar, en vez de fijar un número de build en la documentación.

## Q-002 — ¿Qué proveedor de IA se usará dentro de MT5 (MQL5.community por defecto vs API propia de Anthropic)?

**Impacto:** Medio
**Bloquea configuración:** No
**Qué sabemos:** Tras actualizar a build ≥6060, MQL5.community queda seleccionado por defecto como proveedor de IA con una API key gratuita de plan "MQL5 Lite" (F002). También se permite configurar API keys propias (OpenAI, Anthropic, Gemini, DeepSeek, Ollama).
**Fuentes:** F002
**Qué falta verificar:** Límites exactos del plan MQL5 Lite (cuota, modelos disponibles) y si conviene usar API key propia de Anthropic en vez del proveedor por defecto.
**Decisión provisional:** Para el laboratorio, empezar con MQL5.community por defecto (coste cero) y documentar el cambio a API propia como paso opcional en `19_Plan_Puesta_en_Marcha.md` si las cuotas resultan insuficientes.

## Q-003 — ¿Cómo se comporta exactamente la filling policy BOC (Break Or Cancel)?

**Impacto:** Bajo
**Bloquea configuración:** No
**Qué sabemos:** `ORDER_FILLING_BOC` existe en `ENUM_ORDER_TYPE_FILLING`, asociada a órdenes tipo book/bolsa (Exchange Execution).
**Fuentes:** F014
**Qué falta verificar:** Comportamiento exacto y disponibilidad real por símbolo/broker; no se ha encontrado documentación oficial tan detallada como para FOK/IOC/RETURN.
**Decisión provisional:** No usar BOC en los primeros EAs de laboratorio (que operarán previsiblemente en Forex/CFD, no en exchange puro); revisar si en el futuro se opera algún instrumento de tipo bolsa.

## Q-004 — ¿Cuál es exactamente la ruta de menú y el mecanismo de transporte (stdio/HTTP/SSE) para conectar Claude Code al MCP nativo del Terminal MT5?

**Impacto:** Alto (afecta directamente al Paso 6 del Plan de Puesta en Marcha)
**Bloquea configuración:** No bloquea la investigación, pero **debe resolverse antes de ejecutar** el Paso 6 de `19_Plan_Puesta_en_Marcha.md`.
**Qué sabemos:** MetaQuotes confirma oficialmente que el Terminal (build ≥6060) puede conectarse con Claude Code y OpenAI Codex como clientes MCP externos, y que existen permisos de seguridad configurables (F002). No se ha encontrado documentación oficial con el detalle de la ruta de menú exacta ni del transporte MCP usado por el servidor nativo.
**Fuentes:** F002, F003. Los artículos con detalle de configuración concreta encontrados (F023) describen puentes de terceros, no el MCP nativo — ver `10_MCP_IA_y_Agentes_MetaTrader5.md` §2 y §4.
**Qué falta verificar:** Instalar la build vigente y revisar directamente la configuración de Terminal/MetaEditor relativa a IA/MCP; consultar la ayuda oficial actualizada en el momento de la instalación (puede haberse publicado documentación más detallada entre esta investigación y la Fase 1).
**Decisión provisional:** `19_Plan_Puesta_en_Marcha.md` incluye un paso explícito de descubrimiento/documentación de esta configuración como parte del propio Paso 6, en vez de asumir de antemano una ruta de menú concreta.

## Q-005 — ¿Qué entidad exacta del grupo ActivTrades (y de los demás candidatos) cubre a un residente en España, y con qué número de registro CNMV?

**Impacto:** Alto (condición para elegir broker final)
**Bloquea configuración:** Sí, para el paso de apertura de cuenta demo real (no bloquea el resto de la investigación)
**Qué sabemos:** ActivTrades tiene entidades reguladas por FCA, SCB, CMVM, FSC y BACEN/CVM, pero no por CySEC; fuentes secundarias mencionan registro en CNMV sin precisar el mecanismo exacto. Capex, FP Markets y Capital.com tienen números de registro CNMV citados en comparativas de terceros, sin verificación directa contra el buscador oficial en esta sesión (bloqueado con 403).
**Fuentes:** F025, F026, F027, F029
**Qué falta verificar:** Consulta manual directa en `cnmv.es` (buscador de ESI/entidades en libre prestación de servicios) para cada candidato de la shortlist antes de abrir cualquier cuenta demo.
**Decisión provisional:** `19_Plan_Puesta_en_Marcha.md` incluye la verificación manual en CNMV como parte del Paso 2 (apertura de cuenta demo), antes de introducir ningún dato personal en el broker elegido.

---

_(esta lista se amplía durante toda la investigación; cada fase añade sus propias preguntas si corresponde)_
