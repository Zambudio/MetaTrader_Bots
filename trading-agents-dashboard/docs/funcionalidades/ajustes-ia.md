# Ajustes de IA: estado, pruebas y login de los motores

Estado: implementado y verificado el 2026-09-19. Ventana modal «⚙️ Ajustes IA» (botón en la cabecera del dashboard y en el error de generación MQL5) para comprobar si los motores de IA están operativos, probar cada modelo y iniciar sesión en los CLI de suscripción.

## Por qué existe

Un motor de IA puede fallar en silencio: sesión caducada, cupo agotado, binario ausente, servicio local caído o un modelo que ya no existe. Antes no había forma de saberlo salvo lanzando un análisis y esperando el error. Un caso real motivó la pantalla: la generación de MQL5 con `claude:sonnet` fallaba con `claude salió con código 1. stderr: (vacío)` y no había dónde ver ni arreglar la causa.

## Qué hace

- **Tarjetas de proveedor** (Claude, OpenAI/Codex, OmniRoute) con insignia de estado, cuenta y plan, versión y hora de la última comprobación.
- **Comprobar conexión (L1)**: instalación, sesión y conexión. No consume tokens.
- **Probar modelo (L2)**: una inferencia mínima con nonce por cada modelo, individual o por lotes, con tiempo transcurrido y botón de cancelar. El resultado se guarda y persiste entre reinicios.
- **Iniciar sesión** en Claude y Codex desde la web (ver [Login guiado](#login-guiado)).
- **Errores normalizados** con título y acción recomendada; el detalle técnico queda en un desplegable.

## Modelo de comprobación en dos niveles

| Nivel | Qué valida | Coste | Cuándo |
|---|---|---|---|
| **L1** pasivo | Claude: `claude --version` y `claude auth status`. Codex: `codex --version` y `codex login status`. OmniRoute: `GET /v1/models` con la clave. | 0 tokens, milisegundos | Al abrir el modal (caché 5 min) y con «Comprobar conexión». |
| **L2** smoke test | Que el modelo concreto responde, tiene cupo y respeta el formato. | Una llamada mínima | Solo bajo demanda, con «Probar modelo». |

**Nonce.** El servidor genera 6 bytes aleatorios en hexadecimal y pide al modelo devolver únicamente `{"status":"ready","nonce":"<NONCE>","message":"preparado"}`. Se exige `status === "ready"` y el nonce idéntico. Así se descarta una respuesta cacheada, texto libre o un modelo que no sigue instrucciones. Se tolera un bloque ` ```json ` o texto alrededor.

**Sin fallback.** La prueba llama al modelo una sola vez. En OmniRoute se usa `chatCompletionOnce` (sin cadena de modelos de reserva, sin reintentos y sin tocar el circuit breaker global); con fallback, un modelo roto aparecería como operativo gracias a otro. En codex el esfuerzo de razonamiento es `low`.

**Caducidad.** Una prueba correcta pasa a `expired` a las 24 h. Una prueba cancelada por el usuario no se guarda.

### Insignias

| Color | Proveedor | Modelo |
|---|---|---|
| Verde | Con sesión y al menos un modelo operativo | Operativo (L2 < 24 h) |
| Amarillo | Con sesión, sin prueba válida | Sin probar o prueba caducada |
| Rojo | Sin sesión/clave, sin conexión o todos los modelos fallan | Fallo con código |
| Gris | Binario no instalado | — |

## Taxonomía de errores

Cada error de proveedor se clasifica por texto en `server/src/engine/aiHealth/errorTaxonomy.ts` (el primer patrón que coincide gana; si ninguno, `INVALID_RESPONSE`).

| Código | Significado | Acción mostrada |
|---|---|---|
| `ENGINE_UNAVAILABLE` | Binario o servicio inexistente | Instalar el CLI o arrancar el servicio |
| `AUTH_REQUIRED` | Sin sesión, sesión caducada o 401 | Pulsar «Iniciar sesión» |
| `MODEL_NOT_FOUND` | El modelo no existe (404) | Elegir otro modelo |
| `MODEL_ACCESS_DENIED` | El plan no incluye el modelo (403) | Revisar la suscripción |
| `BILLING_REQUIRED` | Requiere saldo (402) | Recargar créditos |
| `QUOTA_EXCEEDED` | Límite de uso de la suscripción | Esperar a que se renueve el cupo |
| `RATE_LIMITED` | Demasiadas peticiones (429/503) | Reintentar en segundos |
| `NETWORK_ERROR` | Conexión rechazada, DNS o breaker abierto | Revisar red o servicio local |
| `DEADLINE_EXCEEDED` | Timeout | Usar un modelo más rápido |
| `INVALID_RESPONSE` | Respondió sin el nonce exacto | El modelo no respeta el JSON |
| `CANCELLED` | Cancelada por el usuario | — |

Timeouts por defecto de la prueba: Claude y Codex 90 s, OmniRoute 60 s (su cola por límite de tasa puede tardar decenas de segundos).

## Login guiado

El servidor lanza el login del CLI en el PC donde corre y la interfaz muestra lo necesario. Comportamiento verificado sin terminal en Windows:

| Proveedor | Comando | Qué imprime | Qué hace la interfaz |
|---|---|---|---|
| Claude | `claude auth login --claudeai` | Abre el navegador; «visit: URL» y «Paste code here if prompted >» (lee stdin) | Enlace + campo para pegar el código, que se reenvía al stdin del CLI |
| Codex | `codex login --device-auth` | URL de verificación y código de un solo uso `XXXX-XXXXX` | Enlace + código a la vista; se completa solo al autorizar |

Una única sesión por proveedor (iniciar otra cancela la anterior), caducidad de 15 min, y cerrar el panel a medias cancela el proceso. Al terminar bien se invalida la caché y se recomprueba el estado.

> **Aviso: `codex login` cierra la sesión existente nada más arrancar.** Si se cancela a medias, Codex queda sin sesión. La interfaz pide confirmación antes de empezar si ya hay una sesión activa. Esto se descubrió el 2026-09-19 al sondear el comando durante el desarrollo, que dejó la sesión de Codex cerrada. `claude auth login`, en cambio, conservó la sesión.

OmniRoute no usa login: su clave va en `OMNIROUTE_BASE_URL` y `OMNIROUTE_API_KEY` de `server/.env`.

## Seguridad: solo desde el propio PC

La web es pública a través de Cloudflare Tunnel y no tiene login, así que todos los endpoints `/api/ai/*` pasan por `middleware/localOnly.ts` y se rechazan con `403 LOCAL_ONLY` salvo que la petición sea del propio PC. Hay dos vías:

1. **Directa**: `http://localhost:5175`. Conexión loopback, sin cabeceras de proxy y con `Origin` local (si lo trae).
2. **Por el enlace público** (`https://trading.buenchollotech.com`), pero solo si quien navega es este PC. `cloudflared` conecta siempre desde localhost, así que la IP de la conexión no distingue al visitante. En su lugar se usa `cf-connecting-ip`, que Cloudflare rellena con la IP real del visitante, y se compara con las direcciones del PC (`middleware/ownAddresses.ts`):
   - las de sus interfaces de red (incluidas IPv6 globales y temporales), útil si el navegador sale por IPv6;
   - su IP pública de salida, IPv4 e IPv6, consultada a `https://1.1.1.1/cdn-cgi/trace` y cacheada 5 min. Si la consulta falla se conserva el último valor.

En ambas vías se rechaza un `Origin` ajeno (en el túnel se acepta además `trading.buenchollotech.com`, configurable con `AI_SETTINGS_TUNNEL_HOSTNAMES`): `cors()` está abierto a todos los orígenes y una web maliciosa abierta en tu navegador podría llamar a estos endpoints. Con cabeceras `cf-*` o `x-forwarded-*` sin `cf-connecting-ip` se rechaza por proxy desconocido, y si la conexión no es loopback también.

**Falsificación.** Un cliente que envíe su propia cabecera `CF-Connecting-IP` por el dominio público es cortado por Cloudflare antes de llegar al servidor (403, `error code: 1000`; verificado el 2026-09-19).

**Límite conocido.** Con IPv4 se identifica a la *conexión a Internet*, no al equipo: cualquier dispositivo detrás del mismo router (el móvil en tu wifi, por ejemplo) comparte la IP pública y también pasa. Si tu operadora usa CGNAT y compartes IP pública con otros clientes, esto se debilita. Para desactivar la vía del túnel y volver a «solo localhost», define `AI_SETTINGS_ALLOW_TUNNEL=0` en `server/.env` y reinicia.

Si el visitante no es el PC, la pantalla muestra un aviso en vez de fallar. Decisión registrada como WEB-009 en el [registro de decisiones](../decisiones/README.md).

## API

Todas bajo `/api/ai`, solo desde el PC (ver [Seguridad](#seguridad-solo-desde-el-propio-pc)).

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/status[?forceRefresh=true]` | Estado L1 de los tres proveedores, últimas pruebas L2 (`checks`, indexadas por el string de modelo de la app) y `errorInfo` |
| `POST` | `/models/check` | `{ source, model }` → smoke test L2. Cancelable cerrando la conexión: el servidor mata el proceso |
| `POST` | `/login/:provider` | `claude` o `openai`; arranca el login y devuelve la sesión |
| `GET` | `/login/:id` | Estado de la sesión (URL, código, salida) |
| `POST` | `/login/:id/code` | `{ code }` → lo reenvía al CLI (solo Claude) |
| `DELETE` | `/login/:id` | Cancela el login |

## Dónde está el código

- Servidor: `server/src/engine/aiHealth/` (`errorTaxonomy`, `smokeTest`, `smokeTestRunner`, `providers`, `statusCache`, `modelCheckStore`, `loginSessions`), `server/src/routes/ai.ts`, `server/src/middleware/localOnly.ts`. Las pruebas están en `server/test/aiHealth.test.ts` y `server/test/localOnly.test.ts`.
- Persistencia: `server/data/modelChecks.json` (fuera de git).
- Interfaz: `src/components/AiSettingsModal.tsx`, `src/components/AiLoginPanel.tsx`, `src/lib/aiStatus.ts` (insignias), `src/types/ai.ts`; el estado de apertura vive en el store (`aiSettingsOpen`).

## Cambios en adaptadores que salieron de esta tarea

- **`claudeCli.ts`**: con `--output-format json`, los errores de sesión, cupo o modelo llegan por **stdout** como sobre JSON (`is_error`, `result`) y el CLI sale con código 1. Antes solo se mostraba stderr, de ahí `stderr: (vacío)`. `describeClaudeFailure` ahora incluye el `result` del sobre y stderr.
- **`codexCli.ts`**: el error se tomaba de los **primeros** 500 caracteres de stderr, que son el banner y el prompt repetido; la causa real (p. ej. `401 Unauthorized`) va al final. Ahora se usan los últimos 500.
- **`omniClient.ts`**: `chatCompletionOnce` se exporta y admite `bypassCircuitBreaker`.

## Decisiones de diseño y límites

- Solo Claude, OpenAI/Codex y OmniRoute, que son las fuentes reales del router. `opencode` está declarado pero no implementado (`llmRouter.ts`) y no aparece.
- No hay endpoint de «motor activo»: el modelo de cada agente y el motor MQL5 ya se eligen en sus propios selectores.
- No hay bloqueo previo tipo `assertModelOperational()`: un análisis sigue lanzándose aunque el modelo no esté probado. Añadirlo es viable con los datos de `modelChecks.json`, pero frenaría análisis cuyo modelo nunca se ha probado.
- «Probar todos» en OmniRoute se limita a los modelos `auto/*` (los que usa la app); el catálogo real tiene unos 195 y se prueban uno a uno.
- La prueba L2 de OmniRoute no cuenta en el circuit breaker global: un modelo roto no debe frenar los análisis reales.

## Hechos verificados el 2026-09-19

- `claude auth status`: sesión activa (plan Pro). La llamada de la generación MQL5 fallaba a los 3–7 s con código 1 en el log de errores de PM2 (`trading-dashboard-error.log`); la causa concreta seguía oculta hasta el arreglo de `claudeCli.ts`.
- Con un `--system-prompt` de 65 000 caracteres, Windows rechaza el lanzamiento con `ENAMETOOLONG` (límite de la línea de comandos, unos 32 K). Es una causa distinta del código 1 observado, pero un prompt MQL5 con secciones aprendidas de la wiki podría alcanzarlo.
- L2 real: `claude:haiku` operativo (7,7 s); `auto/best-coding` operativo (1,4 s); `auto/best-fast` operativo en 24,7 s con cola; `openai:gpt-5.4-mini` → `AUTH_REQUIRED` (401) por la sesión de Codex cerrada.
- Acceso: `200` desde localhost y por el dominio público desde este mismo PC; `403` con `cf-connecting-ip` de otra IP; `403` con `Origin` ajeno; la cabecera `CF-Connecting-IP` falsificada la corta Cloudflare.
- Descartado como causa del fallo de MQL5: el entorno heredado de PM2 (variables `CLAUDECODE`, `CLAUDE_CODE_CHILD_SESSION`, socket e IDs de una sesión antigua de Claude Code). Reproducida la llamada con ese entorno exacto, `claude -p` termina con código 0.
- Login de Codex por la API: URL y código extraídos, cancelación y `404` de sesión inexistente correctos. El login de Claude no se ejecutó por la API para no abrir el navegador; su salida se verificó con el CLI directamente.
- No verificado: el aspecto visual del modal en un navegador (compila, pasa el lint y está en `dist/`), y el login de Claude de extremo a extremo con la interfaz.

## Puesta en producción

El servidor de PM2 carga el código al arrancar. Tras compilar (`npm run build`), reinícialo para que exponga `/api/ai`. Al arrancar, el servidor marca como error los runs y jobs MQL5 que estuvieran en curso; conviene reiniciar cuando no haya ninguno. Ver [Despliegue web 24/7](../operaciones/despliegue-web-24-7.md).
