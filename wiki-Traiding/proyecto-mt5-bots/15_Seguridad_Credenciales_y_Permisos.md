# Seguridad, credenciales y permisos

> **Estado:** BORRADOR
> **Última revisión:** 2026-08-07
> **Documento crítico** — bloquea puesta en marcha si queda incompleto.

## 1. Inventario de credenciales/secretos relevantes

| Tipo | Dónde vive normalmente | Riesgo si se filtra |
|---|---|---|
| Credenciales de cuenta de broker (login/password) | `Config/accounts.dat`/`servers.dat` del Terminal, o introducidas manualmente | Acceso a la cuenta de trading (aunque sea demo, puede exponer datos personales del registro) |
| Contraseña **investor** (solo lectura) vs **trader** (operativa) | Configuración de cuenta MT5 | La investor password permite ver la cuenta sin poder operar — útil para dar acceso de solo lectura a un colaborador o herramienta sin exponer capacidad de trading `[VERIFICADO — funcionalidad estándar de MT5, distinción investor/master password]` |
| Passkeys (build ≥6060) | Gestor de credenciales del sistema operativo/navegador | Compromiso de la autenticación de la cuenta MQL5.community/Terminal |
| Cuenta MQL5.community | Login del portal | Es también la identidad usada por defecto para el proveedor de IA nativo (`10_MCP_IA_y_Agentes_MetaTrader5.md`) — su compromiso afecta tanto al Market/Signals como al acceso de IA |
| API keys de proveedores de IA (Anthropic, OpenAI, etc., si se configuran propias) | Configuración del Terminal o variables de entorno del entorno de agentes | Uso no autorizado de cuota/facturación del proveedor de IA |
| Secretos de Python (si se usan APIs externas de datos/noticias en el futuro) | Variables de entorno, `.env` | Exposición de servicios de terceros contratados |
| Credenciales de VPS (si se usa Opción B/C de `14_Despliegue_24x7_VPS.md`) | Gestor de contraseñas, acceso RDP/SSH | Control total de la máquina que ejecuta el EA |

## 2. Reglas de manejo

- **Ninguna credencial real se introduce en el repositorio Git**, ni siquiera en archivos de ejemplo con valores de aspecto plausible que puedan confundirse con reales. Se documentan **nombres de variables**, no valores.
- **`.gitignore`** debe excluir explícitamente cualquier archivo de configuración con secretos que se genere localmente (`.env`, `*.dat` de configuración de cuenta si llegaran a copiarse al repo por error, credenciales de VPS, exports de `Config/`).
- **Variables de entorno** para API keys y credenciales usadas por scripts Python o por la configuración del cliente MCP, nunca hardcodeadas en código fuente.
- **Passwords investor vs trader:** para cualquier integración que solo necesite **leer** datos de cuenta (dashboards, research, un agente que solo analiza), usar la contraseña **investor** cuando sea posible, nunca la de trading — principio de mínimo privilegio aplicado directamente.
- **MQL5.community:** tratar como una identidad sensible porque, desde build ≥6060, está ligada al proveedor de IA por defecto del Terminal — no compartir ni reutilizar la contraseña de esta cuenta en otros servicios.
- **Backup cifrado:** cualquier backup que incluya `Config/` o credenciales debe cifrarse; no subir backups sin cifrar a almacenamiento en la nube genérico.
- **Logs y secretos:** revisar que los logs del EA/Terminal (`Logs/`, `MQL5/Logs/`) no acaben registrando credenciales o tokens en texto plano si en algún punto se integra una API externa que los requiera en la URL/cabecera — auditar antes de subir logs a cualquier sistema de observabilidad (`16_Observabilidad_Auditoria_y_Reproducibilidad.md`).

## 3. Permisos MCP/IA — configuración inicial obligatoria

Consolidado desde `10_MCP_IA_y_Agentes_MetaTrader5.md` §6, como checklist de seguridad operativa:

```text
Cuenta: DEMO
Trading manual del usuario: permitido si hace falta para pruebas puntuales
Trading del EA: solo en demo
Trading iniciado directamente por IA (AI-initiated trading, build >=6060): DESHABILITADO
Confirmación manual para cualquier capacidad de IA sensible: HABILITADA cuando exista la opción
Acceso de IA a red: solo si se justifica caso por caso, no por defecto
Acceso de IA a línea de comandos: controlado, evitar mientras no se audite el alcance exacto (ver Q-004 en [PREGUNTAS_ABIERTAS.md](PREGUNTAS_ABIERTAS.md))
Servidores MCP de terceros no auditados: NO AUTORIZADOS (ver 10_MCP_IA_y_Agentes_MetaTrader5.md §2.2)
Credenciales reales (cuenta real, no demo): NINGUNA en esta fase
```

## 4. Permisos de red y command line — principio de mínimo privilegio

- **Red:** un agente que solo necesita analizar datos ya disponibles en el Terminal (precios, histórico, calendario) no necesita permiso de red adicional — el propio Terminal ya trae esos datos. El permiso de red del agente solo se justifica para casos concretos (p. ej. consultar una fuente externa de noticias en el futuro `NewsAndMacroAgent`), y debe activarse de forma puntual, no como configuración permanente por defecto.
- **Command line:** capacidad especialmente sensible en una máquina que también tiene acceso a un Terminal de trading — debe permanecer deshabilitada o muy controlada hasta que se audite exactamente qué comandos puede ejecutar el agente y con qué aislamiento (pregunta abierta Q-004). Mientras no se resuelva esa pregunta, tratar este permiso como **"NO" por defecto**, no como "controlado" ambiguo.

## 5. Checklist de seguridad previa

### 5.1 Antes del laboratorio demo

- [ ] Cuenta demo creada (nunca real) en el broker elegido tras verificación de `13_Brokers_MetaTrader5_Espana.md`.
- [ ] `AI-initiated trading` deshabilitado explícitamente en el Terminal.
- [ ] Confirmación manual activada donde exista la opción para cualquier acción sensible de IA.
- [ ] Permiso de red de IA desactivado salvo justificación puntual y documentada.
- [ ] Permiso de línea de comandos de IA desactivado por defecto.
- [ ] Ningún servidor MCP de terceros conectado — solo el MCP nativo del Terminal.
- [ ] `.gitignore` del repositorio revisado y actualizado antes del primer commit que toque configuración real de MT5.
- [ ] Ninguna credencial real (broker, MQL5.community, API keys) en el repositorio.

### 5.2 Antes de un VPS

- [ ] Decisión de arquitectura tomada según `14_Despliegue_24x7_VPS.md` §5.
- [ ] Si es VPS Windows propio (Opción B/C): acceso remoto (RDP) protegido con contraseña fuerte y, si el proveedor lo permite, restricción de IP de origen.
- [ ] Revisión de que `AlgoTrading` permanece habilitado en el VPS integrado (Opción A) no reintroduce permisos de IA que se habían deshabilitado localmente — revisar explícitamente la configuración de IA dentro del propio VPS tras la migración.
- [ ] Backups de configuración cifrados.

### 5.3 Antes de cualquier futura cuenta real (fuera de alcance de esta fase, preparatorio)

- [ ] Todos los puntos de 5.1 y 5.2 siguen cumpliéndose.
- [ ] `AI-initiated trading` sigue deshabilitado salvo decisión explícita y documentada en un ADR ([`DECISIONS/`](DECISIONS/README.md)).
- [ ] Límites de `RiskPolicy` (`05_Gestion_Riesgo_EAs.md`) revisados específicamente para dinero real, no reutilizados sin más de los valores de laboratorio.
- [ ] Broker final verificado directamente contra el registro oficial de la CNMV (no solo fuentes secundarias) — ver [`PREGUNTAS_ABIERTAS.md`](PREGUNTAS_ABIERTAS.md) Q-005.
- [ ] Plan de rollback/kill switch definido (Fase 7 del `ROADMAP.md`, explícitamente fuera de alcance de ejecución en esta fase).

## Fuentes consultadas

- F002 (ver [`FUENTES.md`](FUENTES.md)) — permisos de IA nativos del Terminal.
- Distinción investor/trader password: `[VERIFICADO]` como funcionalidad estándar y ampliamente documentada de MetaTrader 5 (no se ha requerido una búsqueda adicional específica por ser un hecho consolidado de la plataforma desde versiones anteriores; se recomienda reconfirmar la nomenclatura exacta en la ayuda oficial del Terminal durante la Fase 1).
- El resto del documento es diseño de seguridad propio del proyecto [INFERIDO], aplicando principio de mínimo privilegio sobre los hallazgos ya verificados en `10_MCP_IA_y_Agentes_MetaTrader5.md` y `14_Despliegue_24x7_VPS.md`.
