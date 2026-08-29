/**
 * Configuración pm2 para el servicio siempre-activo del dashboard.
 *
 * Un solo proceso: el backend Express (vía tsx, sin `watch`) que además sirve el
 * frontend compilado de `dist/` en el mismo puerto (ver server/src/index.ts).
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
      // tsx CLI directo (igual que `npm run dev`, pero sin `watch`): evita el wrapper
      // cmd.exe de los npm scripts, que se rompe con rutas de red.
      script: path.join(SERVER_DIR, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
      args: ['src/index.ts'],
      cwd: SERVER_DIR,
      // Node carga server/.env (OMNIROUTE_API_KEY, TWELVEDATA_API_KEY, …) antes de tsx.
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
