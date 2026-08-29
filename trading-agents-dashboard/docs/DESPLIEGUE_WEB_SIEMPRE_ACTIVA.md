# 🌐 Despliegue — web siempre activa en `trading.buenchollotech.com`

> **Estado: ✅ MONTADO Y VERIFICADO (2026-08-29).** La web responde en
> `https://trading.buenchollotech.com` y arranca sola al iniciar sesión en el PC.
> Este documento es a la vez el **plan** y el **runbook** de operación.

Última actualización: 2026-08-29

---

## 1. Objetivo y decisiones

**Problema:** había que levantar `npm run dev` a mano cada vez para usar el dashboard.

**Objetivo:** servicio siempre encendido, accesible por una URL propia, sin tener
que arrancar nada manualmente.

**Decisiones tomadas (con el usuario):**

| Decisión | Elección | Motivo |
|---|---|---|
| Dónde corre | **En el PC (`Torre_Fadwel`)**, arranque automático | Las ejecuciones reales (compilar/backtestear MQL5 con MetaTrader, modelos `claude`/`codex` por suscripción CLI) **solo funcionan en el PC**. Llevarlo a Docker en la NAS perdería esas funciones. |
| Exposición | **Pública, sin login** | Decisión explícita del usuario. Ver §9 para endurecer más adelante. |
| Subdominio | `trading.buenchollotech.com` | El dominio real es `buenchollotech.com` (gestionado en Cloudflare, mismo sitio que la web de BuenChollo). |
| Túnel | **Túnel nuevo `trading-pc`**, aparte del `buenchollo-nas` | El conector `cloudflared` corre donde está el origen; el de la NAS no llega a `localhost:5175` del PC. |
| Proceso | **pm2** (no servicio Windows) | `cloudflared service install` necesita admin; pm2 no. Además el túnel solo tiene sentido con la sesión del usuario abierta, igual que el dashboard. |

**Limitación asumida:** si el PC está apagado, la web no responde. El usuario solo
la necesita cuando está trabajando en el PC. El estado (agentes, runs, favoritos)
sigue en JSON local del repo — **un solo sitio, sin duplicar**.

---

## 2. Arquitectura

```
Navegador
   │  https://trading.buenchollotech.com
   ▼
Cloudflare edge  ── TLS "Full (strict)", HSTS, "Always HTTPS", Bot Fight Mode
   │               (heredado de la zona buenchollotech.com; ya configurado)
   ▼
Cloudflare Tunnel  "trading-pc"  (id 662ac3cf-c371-4247-b62e-e165803bcb6b)
   │  QUIC saliente, sin abrir puertos
   ▼
cloudflared.exe   ← proceso pm2 "trading-tunnel"  (C:\Users\fadwe\cloudflared\)
   │  http://localhost:5175
   ▼
Express (server/, vía start.mjs — 1 proceso node)  ← proceso pm2 "trading-dashboard"
   ├── /api/*   → backend (OmniRoute 192.168.1.3:20128, Twelve Data, MetaTrader,
   │              CLIs claude/codex, wiki-Traiding/…)
   └── resto    → sirve el frontend compilado dist/  (mismo origen, sin CORS)
        ▲
        │  pm2 resurrect
   Tarea programada "TradingDashboard-Autostart"  (Al iniciar sesión de fadwe, +30 s)
        → wscript.exe pm2-boot-hidden.vbs  (sin ventana)
        → powershell -WindowStyle Hidden pm2-boot.ps1  →  node <pm2-cli> resurrect
```

**Puerto único: 5175.** El mismo proceso Express sirve la API *y* el `dist/`. En
`npm run dev` el frontend lo sigue sirviendo Vite en `:5173` como siempre.

---

## 3. Qué se instaló / cambió

### 3.1 Cambios en el repo (rama `feat/despliegue-web-siempre-activa`)

| Fichero | Cambio |
|---|---|
| `server/src/index.ts` | Sirve `dist/` (estáticos + fallback SPA) si existe. Si no, sigue en modo API-only. ~15 líneas. |
| `server/start.mjs` | **Nuevo.** Arranque de producción: registra el loader de `tsx` en el propio proceso e `import()`ea `src/index.ts`. **Un solo proceso node** (el CLI `tsx` re-lanza un hijo → ventana de consola en Windows). |
| `server/package.json` | Script `start` = `node --env-file-if-exists=.env start.mjs` (producción, sin `watch`). |
| `package.json` (raíz) | Script `start` = `npm run start --prefix server`. |
| `ecosystem.config.cjs` | **Nuevo.** Define las 2 apps pm2 (`trading-dashboard` → `start.mjs`, `trading-tunnel` → `cloudflared`). |
| `scripts/pm2-boot.ps1` | **Nuevo.** Arranque en el login: espera a `Z:`, `pm2 resurrect`, red de seguridad. Llama `node <pm2-cli>` directo (no `pm2.cmd`) para no abrir `cmd.exe`. |
| `scripts/install-autostart.ps1` | **Nuevo.** Registra/actualiza la tarea. Idempotente. Genera `pm2-boot-hidden.vbs` y apunta la tarea a `wscript.exe` (arranque sin ninguna ventana). |
| `scripts/update.ps1` | **Nuevo.** `git pull` + build + `pm2 restart <ecosystem>` + verificación. |
| `docs/DESPLIEGUE_WEB_SIEMPRE_ACTIVA.md` | **Nuevo.** Este documento. |

> ⚠️ **Rutas de red y `cmd.exe`.** `npm`/`cmd.exe` **rechazan un `cwd` UNC**
> (`\\Zambu-nas\...` → "No se permiten rutas UNC", cae a `C:\Windows`). Todo va
> por el disco **mapeado `Z:`** (`\\Zambu-nas\nas-drive-pedro`). `node`/`tsx` sí
> aceptan UNC; por eso pm2 lanza `node start.mjs` directamente, no `npm run`.
>
> ⚠️ **Nada de ventanas en Windows.** Tres capas:
> 1. **App:** el CLI `tsx` re-lanza un `node` hijo → Windows 11 le abre una ventana
>    de Windows Terminal. Por eso el arranque va por `server/start.mjs` (registra el
>    loader de tsx en el proceso, sin hijos); 1 proceso y `windowsHide: true` basta.
> 2. **Boot script:** `pm2-boot.ps1` invoca `node <pm2-cli>` directamente, no
>    `pm2.cmd` (el `.cmd` abre un `cmd.exe` que parpadea en el login).
> 3. **Tarea:** la lanza `wscript.exe pm2-boot-hidden.vbs` (subsistema GUI, sin
>    consola) → PowerShell arranca 100 % oculto, sin parpadeo ni barra de tareas.

### 3.2 Instalado en el PC (fuera del repo)

| Qué | Dónde | Admin |
|---|---|---|
| `pm2` (global npm) | `C:\Users\fadwe\AppData\Roaming\npm\` | no |
| `cloudflared.exe` 2026.8.2 | `C:\Users\fadwe\cloudflared\cloudflared.exe` | no |
| Credenciales del túnel | `C:\Users\fadwe\.cloudflared\cert.pem` + `662ac3cf-…json` | no |
| Config del túnel | `C:\Users\fadwe\.cloudflared\config.yml` | no |
| Copia local del boot script | `C:\ProgramData\TradingDashboard\pm2-boot.ps1` (+ `pm2-boot-hidden.vbs`) | no |
| Tarea programada | `TradingDashboard-Autostart` → `wscript.exe pm2-boot-hidden.vbs` (usuario `fadwe`, RunLevel Limited) | no |
| pm2 dump | `C:\Users\fadwe\.pm2\dump.pm2` (`pm2 save`) | no |

### 3.3 En Cloudflare (cuenta `pjzambudio@gmail.com`, zona `buenchollotech.com`)

- Túnel **`trading-pc`** creado (Zero Trust → Networks → Tunnels). Gestionado
  *localmente* (config en el PC), no por dashboard.
- Registro DNS **CNAME `trading`** → `662ac3cf-…cfargotunnel.com` (creado por
  `cloudflared tunnel route dns`).
- **Nada** de TLS/WAF/HSTS que tocar: se hereda de la zona (ver
  `WEB-Buenchollo/BuenCholloTech/docs/guides/Cloudflare.md`). Las reglas WAF de
  BuenChollo están acotadas a `api.buenchollotech.com`, no afectan aquí.

---

## 4. Operación diaria

Todos los comandos desde PowerShell. `pm2` está en el PATH del usuario.

```powershell
pm2 list                          # estado de las 2 apps
pm2 logs trading-dashboard        # logs del backend en vivo (Ctrl+C para salir)
pm2 logs trading-tunnel           # logs del túnel
pm2 restart trading-dashboard     # reiniciar solo el backend
pm2 restart all                   # reiniciar todo
pm2 stop all                      # parar (la web deja de responder)
pm2 start ecosystem.config.cjs    # volver a arrancar   (desde Z:\...\trading-agents-dashboard)
```

**Aplicar cambios de código:**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File Z:\IA\02_Proyectos\MetaTrader_Bots\trading-agents-dashboard\scripts\update.ps1
```

**Tras cualquier cambio en la lista de apps pm2:** `pm2 save` (si no, `pm2
resurrect` del arranque restaurará la lista antigua).

**Logs del arranque automático:** `C:\Users\fadwe\.pm2\logs\autostart-boot.log`.

---

## 5. Verificación (checklist go-live) — resultado 2026-08-29

```powershell
# Local
curl http://localhost:5175/api/health          # {"ok":true}                     ✅
curl http://localhost:5175/                     # HTML del dashboard              ✅

# Público (por el edge de Cloudflare)
curl https://trading.buenchollotech.com/api/health   # {"ok":true}                ✅
curl -I https://trading.buenchollotech.com/          # 200, Server: cloudflare    ✅
curl -I http://trading.buenchollotech.com/           # 301 → https                ✅
```

- [x] `pm2 list` → `trading-dashboard` y `trading-tunnel` **online**, `restarts 0`.
- [x] Túnel **HEALTHY** (4 conexiones QUIC: mad01/mad05/mad06).
- [x] `https://trading.buenchollotech.com` carga el dashboard, gráfico EUR/USD con
      indicadores, cadena de agentes — **sin errores de consola**.
- [x] `/api/models` devuelve las fuentes y modelos de OmniRoute → el backend
      alcanza el gateway del NAS y `server/.env` se carga bien.
- [x] Simulacro de reinicio (`pm2 kill` + lanzar la tarea programada) → ambas apps
      vuelven solas, la URL pública responde. Probado 3 veces.
- [x] HTTP→HTTPS y HSTS heredados de la zona.
- [x] **Reinicio real del PC (2026-08-30)** — arrancó solo. Corregido: salía una
      ventana de consola visible (el CLI `tsx` re-lanzaba un `node` hijo). Ahora
      el arranque va por `server/start.mjs` → **1 proceso, sin ventana**.
- [x] Simulacro de arranque post-fix (tarea → `wscript` → vbs → PS oculto):
      **0 ventanas visibles** durante todo el arranque, health OK desde t+3 s.

**Pendiente de probar por el usuario:** una ejecución completa de análisis +
generación MQL5 desde la URL pública.

---

## 6. Rollback / desmontar

```powershell
# 1. Parar y quitar las apps pm2
pm2 delete trading-dashboard trading-tunnel
pm2 save

# 2. Quitar el arranque automático
Unregister-ScheduledTask -TaskName 'TradingDashboard-Autostart' -Confirm:$false
Remove-Item -Recurse -Force C:\ProgramData\TradingDashboard

# 3. (opcional) Borrar el túnel y su DNS
C:\Users\fadwe\cloudflared\cloudflared.exe tunnel delete trading-pc
#   + borrar el CNAME "trading" en el panel DNS de Cloudflare

# 4. (opcional) Revertir el código
git checkout main -- server/src/index.ts server/start.mjs server/package.json package.json
```

Nada de esto toca la NAS, `buenchollo-*` ni el túnel `buenchollo-nas`.

Volver al flujo antiguo: `pm2 stop all` y `npm run dev` como siempre (Vite en
`:5173`, backend en `:5175`).

---

## 7. Troubleshooting

| Síntoma | Causa probable / arreglo |
|---|---|
| `https://trading…` da **502** | El backend (`trading-dashboard`) está caído. `pm2 logs trading-dashboard --err`. El túnel sigue arriba y devuelve 502 hasta que vuelva. |
| `https://trading…` da **error DNS / 1033** | El túnel (`trading-tunnel`) está caído. `pm2 restart trading-tunnel`; `pm2 logs trading-tunnel`. |
| Tras reiniciar el PC la web no responde | ¿Iniciaste sesión en Windows? La tarea es *Al iniciar sesión*. Mira `C:\Users\fadwe\.pm2\logs\autostart-boot.log`. Si dice "Z: no accesible", el disco de red tardó — la tarea reintenta 3× cada 2 min. |
| `pm2-boot` no encuentra `Z:` | Los discos mapeados reconectan de forma perezosa. El script hace `net use Z:` y espera hasta 120 s. Si persiste, revisa las credenciales del recurso `\\Zambu-nas\nas-drive-pedro`. |
| El backtest headless de MT5 falla bajo pm2 | pm2 corre en la sesión interactiva del usuario (LogonType Interactive), así que MetaTrader se comporta igual que con `npm run dev`. Si aun así falla, `pm2 logs` y comparar con un arranque manual. |
| Aparece una **ventana de consola** (`node` / Windows Terminal) tras el arranque | El arranque debe ir por `server/start.mjs`, no por el CLI `tsx` (que crea un proceso hijo con ventana). Comprueba `ecosystem.config.cjs` → `script` acaba en `start.mjs`; luego `pm2 delete trading-dashboard && pm2 start ecosystem.config.cjs --only trading-dashboard && pm2 save`. Verifica: `Get-Process node \| ? MainWindowHandle -ne 0` no devuelve nada. |
| `npm run build` → "No se permiten rutas UNC" | Estás en `\\Zambu-nas\...`. `cd Z:\IA\02_Proyectos\MetaTrader_Bots\trading-agents-dashboard` primero. |
| Cambié `pm2-boot.ps1` y el arranque usa la versión vieja | La tarea ejecuta la **copia** en `C:\ProgramData\TradingDashboard\`. Re-ejecuta `scripts\install-autostart.ps1`. |
| Rotar/recrear credenciales del túnel | `cloudflared tunnel delete trading-pc` + repetir §8. O `cloudflared tunnel token trading-pc` para un token nuevo. |

---

## 8. Cómo se montó el túnel (para reproducir / recrear)

```powershell
# 1. Descargar cloudflared (sin admin)
mkdir C:\Users\fadwe\cloudflared
iwr https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe -OutFile C:\Users\fadwe\cloudflared\cloudflared.exe

# 2. Autorizar (abre el navegador → elegir zona buenchollotech.com → "Authorize")
C:\Users\fadwe\cloudflared\cloudflared.exe tunnel login

# 3. Crear el túnel + ruta DNS
C:\Users\fadwe\cloudflared\cloudflared.exe tunnel create trading-pc
C:\Users\fadwe\cloudflared\cloudflared.exe tunnel route dns trading-pc trading.buenchollotech.com

# 4. config.yml  →  C:\Users\fadwe\.cloudflared\config.yml   (ver el fichero real)
#    tunnel: <id>;  credentials-file: <id>.json
#    ingress: trading.buenchollotech.com → http://localhost:5175 ; luego http_status:404

# 5. Registrar en pm2 (ya está en ecosystem.config.cjs)
pm2 start ecosystem.config.cjs && pm2 save
```

---

## 9. Apéndice — endurecimiento futuro (NO implementado)

La web está **abierta**: cualquiera con la URL puede lanzar análisis y gastar
crédito de OmniRoute, y ver las estrategias. Si algún día se quiere cerrar:

1. **Cloudflare Access (Zero Trust)** — gate de login Google, gratis hasta 50
   usuarios, sin tocar código. Zero Trust → Access → Applications → self-hosted →
   `trading.buenchollotech.com`, policy `emails: pjzambudio@gmail.com`.
2. **`DASHBOARD_API_KEY`** en `server/.env` — exige clave en POST/PUT/DELETE
   (los GET siguen abiertos). Ya soportado por `server/src/middleware/auth.ts`.
3. **Rate limiting** en Cloudflare sobre `trading.buenchollotech.com` (Free: 1
   regla; ya se usa la de `api.buenchollotech.com` — habría que valorar).

---

## 10. Bitácora

- **2026-08-29** — Montaje completo en una sesión:
  - Código: `server/src/index.ts` sirve `dist/`; scripts `start`; `ecosystem.config.cjs`.
  - `npm run build` OK (desde `Z:`; desde UNC falla por `cmd.exe`).
  - pm2 instalado; app `trading-dashboard` (tsx, `:5175`, `--env-file-if-exists=.env`).
    Verificado auto-restart matando el proceso.
  - Tarea programada `TradingDashboard-Autostart` (Al iniciar sesión, +30 s,
    RunLevel Limited → no necesita admin). `pm2-boot.ps1` copiado a `C:\ProgramData`.
    Simulacro de reinicio OK ×3 (restarts 0 tras afinar el chequeo — `pm2 jlist` +
    `ConvertFrom-Json` revienta en PS 5.1 por claves `username`/`USERNAME`
    duplicadas; se cambió a `pm2 pid <name>`).
  - `cloudflared` descargado (no admin). `tunnel login` autorizado en el navegador
    (Brave, zona `buenchollotech.com`). Túnel `trading-pc`
    (`662ac3cf-c371-4247-b62e-e165803bcb6b`), CNAME `trading` creado por CLI,
    `config.yml` → `localhost:5175`.
  - `cloudflared` añadido como 2ª app pm2 (`trading-tunnel`) — **no** servicio
    Windows (evita admin). `pm2 save`.
  - Verificación externa: `https://trading.buenchollotech.com/api/health` →
    `{"ok":true}`; dashboard carga con gráfico y agentes, sin errores de consola;
    HTTP→HTTPS 301; HSTS presente.
  - Rama `feat/despliegue-web-siempre-activa`.

- **2026-08-30** — Primer reinicio real del PC: la web arrancó sola, pero quedaba
  una **ventana de consola visible** (`node` en Windows Terminal). Causa: el CLI
  `tsx` re-lanza un proceso `node` hijo para el transpile; pm2 spawnea con
  `detached: true` (sin consola heredada), así que Windows 11 le asigna una
  consola nueva → ventana de Windows Terminal. `windowsHide: true` de pm2 solo
  cubre el proceso que lanza pm2, no el nieto de tsx. Arreglo: `server/start.mjs`
  registra el loader de tsx en el propio proceso (`tsx/esm/api` → `register()`) e
  `import()`ea `src/index.ts` — **cero procesos hijo**. `ecosystem.config.cjs`
  ahora apunta a `start.mjs`. Verificado: `trading-dashboard` = 1 proceso node,
  `MainWindowHandle = 0`, health local + externa `{"ok":true}`. `pm2 save`.
  - De paso, dos parpadeos menores del login eliminados: `pm2-boot.ps1` llama
    `node <pm2-cli>` en vez de `pm2.cmd` (el `.cmd` abre `cmd.exe`), y la tarea
    pasó a `wscript.exe pm2-boot-hidden.vbs` (GUI, sin consola) en vez de
    `powershell.exe -WindowStyle Hidden`. Simulacro de arranque completo por la
    tarea real: **0 ventanas** en todo el proceso. `scripts/update.ps1` ahora
    reinicia pasando el `ecosystem.config.cjs` (re-lee la config).
