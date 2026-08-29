/**
 * Configuración pm2 para el servicio siempre-activo del dashboard.
 *
 * Un solo proceso: el backend Express (arranca por server/start.mjs, que registra
 * el loader de tsx en el propio proceso — sin CLI de tsx ni proceso hijo, para que
 * no aparezca una ventana de consola en Windows) que además sirve el frontend
 * compilado de `dist/` en el mismo puerto (ver server/src/index.ts).
 *
 * Arranque:   pm2 start ecosystem.config.cjs && pm2 save
 * Ver logs:   pm2 logs trading-dashboard
 * Reiniciar:  pm2 restart trading-dashboard
 *
 * OJO Windows + NAS: las rutas son del disco mapeado Z: (\\Zambu-nas\nas-drive-pedro),
 * NO la forma UNC \\Zambu-nas\... — npm/cmd.exe rechazan un cwd UNC. El disco Z:
 * está disponible en la sesión del usuario tras el login (la tarea programada de
 * arranque lo verifica antes de `pm2 resurrect`).
 *
 * Detalle completo: docs/DESPLIEGUE_WEB_SIEMPRE_ACTIVA.md
 */
const path = require('node:path');

// __dirname = ...\trading-agents-dashboard  (tal como lo resuelva pm2 al cargar el archivo)
const ROOT = __dirname;
const SERVER_DIR = path.join(ROOT, 'server');

const CLOUDFLARED = 'C:\\Users\\fadwe\\cloudflared\\cloudflared.exe';
const CF_CONFIG = 'C:\\Users\\fadwe\\.cloudflared\\config.yml';

module.exports = {
  apps: [
    {
      name: 'trading-dashboard',
      // start.mjs registra el loader de tsx EN ESTE proceso y hace `import()` del
      // servidor: un solo proceso node. (El CLI `tsx` re-lanza un node hijo; bajo
      // pm2 —spawn detached, sin consola— ese hijo hacía que Windows 11 abriera una
      // ventana visible de Windows Terminal. Ver server/start.mjs.)
      script: path.join(SERVER_DIR, 'start.mjs'),
      cwd: SERVER_DIR,
      // Node carga server/.env (OMNIROUTE_API_KEY, TWELVEDATA_API_KEY, …) al arrancar.
      node_args: ['--env-file-if-exists=.env'],
      env: {
        NODE_ENV: 'production',
        PORT: '5175',
      },
      autorestart: true,
      max_restarts: 20,
      restart_delay: 4000,
      // El backtest headless de MT5 y las cadenas de agentes pueden tardar minutos:
      // no matar el proceso por "no responde" ni por uso de memoria.
      kill_timeout: 10000,
      windowsHide: true,
      merge_logs: true,
      time: true,
    },
    {
      // Cloudflare Tunnel → publica el dashboard en https://trading.buenchollotech.com
      // sin abrir puertos. Gestionado como proceso pm2 (no servicio Windows): no
      // necesita permisos de admin y solo tiene sentido con la sesión del usuario
      // abierta, igual que el propio dashboard.
      name: 'trading-tunnel',
      script: CLOUDFLARED,
      args: ['tunnel', '--config', CF_CONFIG, 'run'],
      autorestart: true,
      max_restarts: 50,
      restart_delay: 5000,
      windowsHide: true,
      merge_logs: true,
      time: true,
    },
  ],
};
