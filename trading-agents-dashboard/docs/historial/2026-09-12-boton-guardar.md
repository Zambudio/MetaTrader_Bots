# Feature: Save Button para Sobrescribir Configuraciones

**Fecha**: 2026-09-12  
**Rama**: feature/save-button (merged to main)  
**Autor**: Claude Haiku 4.5

## Resumen

Agregué la capacidad de **guardar/sobrescribir configuraciones de estrategias** sin necesidad de usar "Guardar como...". El botón "💾 Guardar" ahora está disponible para TODAS las configuraciones (incluso plantillas base protegidas).

## Cambios Implementados

### Frontend (Client)
- **Archivo**: `src/components/AgentConfigBar.tsx`
  - Removido: Restricción `!isProtected` que ocultaba el botón para plantillas base
  - Agregado: Función `handleSaveClick()` que muestra confirmación especial para presets protegidos
  - Actualizado: Tooltip dinámico según tipo de preset
  - **Líneas**: 41-49 (nueva función), 113-132 (botón)

### Backend (Server)
- **Archivo**: `server/src/store/agentConfigsStore.ts`
  - Removido: Validación que rechazaba sobrescribir presets protegidos (líneas 87-89)
  - Efecto: Ahora permite sobrescribir cualquier configuración, incluso plantillas base
  - El cliente maneja la confirmación especial para presets protegidos

### Build & Deploy
- Downgradeado: Vite 8.2.0 → 5.4.0 (compatible con rutas UNC/NAS en Windows)
- Downgradeado: @vitejs/plugin-react 6.0.4 → 4.2.1 (compatible)
- Ejecutado: `npm run build` exitosamente desde Z:\ (mapeo de red local)
- Compilado: Cliente + servidor, dist/ actualizado

## Comportamiento

### Flujo Normal (presets no protegidos)
1. Carga estrategia guardada
2. Edita agentes/configuración en pantalla
3. Presiona "💾 Guardar"
4. ✅ Configuración sobrescrita inmediatamente

### Flujo Plantillas Base (presets protegidos)
1. Carga FOREX/STOCKS/CRYPTO (plantilla base)
2. Edita agentes/configuración
3. Presiona "💾 Guardar"
4. ⚠️ Confirmación: "¿Estás seguro? Es una plantilla base oficial..."
5. Confirma → ✅ Plantilla sobrescrita

## Problemas Resueltos

| Problema | Solución |
|---|---|
| UNC path falla con npm build | Mapear NAS como Z:\ en lugar de \\Zambu-nas\... |
| Vite 8.x no compatible con NAS | Downgrade a Vite 5.4.0 |
| Backend rechazaba sobrescribir protegidas | Remover validación isProtected |
| Cliente no mostraba botón | Remover restricción !isProtected del render |

## Testing

- ✅ Botón aparece al cargar cualquier estrategia
- ✅ Confirmación funciona para plantillas base
- ✅ Sobrescribe correctamente tanto presets personalizados como plantillas base
- ✅ Backend carga cambios sin reiniciar (TypeScript en vivo)
- ✅ Cloudflare Tunnel sirve versión actualizada

## Deploy

- Build ejecutado: `npm run build` desde Z:\
- Dist/ actualizado con cliente compilado nuevo
- PM2 reiniciado: `pm2 restart trading-dashboard`
- En producción en: https://trading.buenchollotech.com

## Archivos Clave

```
src/components/AgentConfigBar.tsx          [MODIFICADO] Botón + confirmación
src/lib/store.ts                           [SIN CAMBIOS] Store ya tenía función
server/src/store/agentConfigsStore.ts      [MODIFICADO] Permitir sobrescribir todas
server/src/routes/agentConfigs.ts          [SIN CAMBIOS] Endpoint ya existía
package.json                               [MODIFICADO] Vite downgrade
dist/                                      [REGENERADO] Build nuevo
```

## Próximos Pasos

- Configurar feature de Noticias (rama: feature/noticias)
- Integración de news scheduler con agentes
- UI para notificaciones de mercado
