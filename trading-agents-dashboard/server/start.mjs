// start.mjs — arranque de producción del servidor en UN SOLO proceso.
//
// Por qué existe: el CLI de `tsx` (`tsx src/index.ts`) re-lanza un proceso `node`
// hijo para hacer el transpile. Bajo pm2 (que spawnea con `detached: true`, sin
// consola heredada) ese hijo hacía que Windows 11 abriera una ventana visible de
// Windows Terminal. Aquí registramos el loader de tsx en el propio proceso y
// cargamos el servidor con un `import()` normal: cero procesos hijo, y el
// `windowsHide` de pm2 basta para que no aparezca ninguna ventana.
//
// Uso directo:  node --env-file-if-exists=.env start.mjs
// Vía pm2:      ver ../ecosystem.config.cjs
import { register } from 'tsx/esm/api';

register();

await import('./src/index.ts');
