# Despliegue 24/7 y VPS

> **Estado:** BORRADOR
> **Última revisión:** 2026-08-07

## 1. Opción A — VPS integrado de MetaTrader / MQL5 Virtual Hosting [VERIFICADO]

Reglas oficiales confirmadas (`mql5.com/en/vps/rules`):

- **Migración:** EAs, indicadores y configuración de gráficos migran automáticamente al sincronizar el Terminal local con el VPS alquilado — la sincronización se realiza **a petición del usuario**, no de forma continua automática.
- **Scripts no migran**, aunque estén en bucle; los gráficos sin EA o con timeframes no estándar quedan excluidos de la migración.
- **Límite de gráficos con EA:** 32 en el hosting de pago, 16 en el gratuito (las primeras 24h son gratuitas para pruebas, según [`Web_METATRADER5.md`](raw/Web_METATRADER5.md) §5.3, coherente con esta cifra). Exceder el límite genera avisos en el journal y los gráficos sobrantes no se transfieren.
- **Sin acceso físico:** el usuario no tiene acceso al servidor como tal; el seguimiento se hace vía logs de EA/Terminal y datos de monitorización de carga desde el propio Terminal cliente.
- **Prohibición total de DLL:** "No DLLs are allowed on a Virtual terminal" — cualquier EA que dependa de una DLL externa **no puede desplegarse** en este VPS.
- **WebRequest:** los permisos y la whitelist de URLs configurados se transfieren en la migración.
- **AlgoTrading permanece habilitado** en el VPS independientemente de la configuración local del Terminal de origen — implicación de seguridad relevante: hay que revisar explícitamente los permisos de IA/trading dentro del propio VPS, no asumir que hereda un estado "deshabilitado" del Terminal local de forma segura (ver `15_Seguridad_Credenciales_y_Permisos.md`).
- **Facturación:** reserva mensual por adelantado, alquiler mínimo de un mes, cancelable en cualquier momento sin reembolso.
- **Mantenimiento:** ventanas de hasta 4h en fin de semana y 15 min en días laborables (hora EET) a cargo del proveedor de hosting.
- **Responsabilidad:** MetaQuotes se declara exclusivamente proveedor de tecnología; no asume responsabilidad por pérdidas o indisponibilidad, y puede cerrar cuentas que incumplan condiciones sin previo aviso.
- **Relación con MCP/agentes:** al no permitir DLL ni procesos arbitrarios (es un entorno cerrado para el propio Terminal), **no es apto para alojar un cliente MCP externo tipo Claude Code**, ni un proceso Python propio — solo aloja el Terminal y sus EAs/indicadores nativos.
- **Relación con Python externo:** no soportado — el paquete `MetaTrader5` requiere ejecutarse junto al Terminal en la misma máquina vía IPC (`09_Integracion_Python_MetaTrader5.md`), y este VPS no permite procesos adicionales.

## 2. Opción B — VPS Windows completo [INFERIDO / DEPENDIENTE DEL PROVEEDOR]

```text
Windows VPS
├── MetaTrader 5
├── MetaEditor
├── Python (paquete MetaTrader5)
├── Git
├── Claude Code / Codex / cliente MCP
└── servicios auxiliares (backup, monitorización propia)
```

- **Ventaja principal:** control total — permite ejecutar el Terminal **junto con** Python, Git y un cliente MCP externo (Claude Code) en la misma máquina, algo que la Opción A prohíbe estructuralmente.
- **Coste:** variable según proveedor (Azure, AWS, proveedores especializados en VPS para trading); no se ha investigado un precio concreto en esta fase — `[PENDIENTE]`, a decidir junto con el broker final y solo cuando haya una estrategia candidata a ejecución continua real.
- **Mantenimiento:** a cargo del proyecto — actualizaciones de Windows, del Terminal, parcheo de seguridad, backups, gestión de credenciales de acceso remoto (RDP), todo ello responsabilidad propia (ver `15_Seguridad_Credenciales_y_Permisos.md`).
- **Latencia:** depende de la región del datacenter elegido respecto al servidor del broker — un VPS mal ubicado puede introducir más latencia que el propio hosting integrado de MetaQuotes, que suele estar co-ubicado o muy cerca de los servidores de los brokers principales.

## 3. Opción C — arquitectura híbrida [INFERIDO]

```text
VPS (Opción A o B, dedicado a EAs) ejecuta EAs 24/7
PC/NAS del proyecto ejecuta agentes/research periódicamente (no 24/7)
```

- **Disponibilidad:** el EA en el VPS sigue operando aunque el PC/NAS local esté apagado — coherente con la regla "el EA debe seguir funcionando si el servicio de IA cae" (`36.` del prompt maestro).
- **Coste:** menor que un VPS Windows completo funcionando 24/7 solo para tareas de research que no necesitan estar siempre encendidas.
- **Seguridad:** superficie de ataque más pequeña en el VPS (solo lo estrictamente necesario para ejecutar EAs), separada del entorno de desarrollo/agentes.
- **Mantenimiento:** dos entornos que sincronizar (código, versiones de EA desplegadas) — requiere disciplina de despliegue (ver `16_Observabilidad_Auditoria_y_Reproducibilidad.md` para cómo versionar qué se desplegó dónde).
- **Necesidad real de agentes 24/7:** en línea con el principio arquitectónico central del proyecto, **no hace falta** que los agentes de IA estén activos de forma continua — solo el EA determinista necesita disponibilidad 24/7 (o durante el horario de mercado relevante); los agentes se activan periódicamente (revisión de salud, propuesta de nuevas estrategias) según la cadencia de `08_Ciclo_Vida_y_Versionado_Estrategias.md` §4.

## 4. Comprobación de la hipótesis inicial [VERIFICADO]

**Hipótesis del prompt maestro:** "el hosting integrado de MT5 es probablemente excelente para EAs sencillos, pero puede resultar demasiado limitado si se quieren Python + agentes externos + MCP + herramientas de desarrollo en el mismo host."

**Confirmado.** La investigación de la sección 1 confirma explícitamente la limitación: el VPS integrado de MetaQuotes **prohíbe DLL** y está diseñado únicamente para alojar el propio Terminal con sus EAs/indicadores — no hay ningún mecanismo documentado para ejecutar procesos externos (Python, cliente MCP) dentro de él. La hipótesis queda **verificada, no asumida**.

## 5. Recomendación

| Escenario | Arquitectura recomendada |
|---|---|
| Laboratorio (Fase 0-4 del `ROADMAP.md`), EAs 1-3 en demo, sin necesidad de disponibilidad 24/7 estricta | **Ninguna VPS todavía** — Terminal local, encendido cuando se trabaja/prueba. La disponibilidad 24/7 no aporta valor mientras no hay una estrategia validada corriendo en demo prolongada de forma seria |
| Cuando una estrategia entra en `DEMO` prolongada (`08_Ciclo_Vida...`) y se quiere continuidad real sin depender del PC personal | **Opción A (MQL5 Virtual Hosting)** — más simple, más barata, sin mantenimiento de SO; suficiente porque en esa etapa solo se necesita que el EA corra, no que Python/MCP corran junto a él |
| Producción futura (Fase 7, fuera de alcance ahora) si se necesitara Python/agentes cerca del EA de forma continua | **Opción C (híbrida)**, evaluando Opción B solo si la razón concreta lo justifica (p. ej. research que deba correr con el mismo símbolo/tick en tiempo real) |

No se recomienda la Opción B como punto de partida: añade superficie de mantenimiento y seguridad (SO completo, RDP, parches) sin que exista todavía ninguna estrategia que lo justifique.

## Fuentes consultadas

- F030 — "MQL5 Virtual Hosting — Rules". https://www.mql5.com/en/vps/rules — MetaQuotes/MQL5 — OFICIAL — consultado 2026-08-07 — reglas completas del VPS integrado.
- Opciones B y C: [INFERIDO], diseño propio sin fuente oficial única — decisión de arquitectura del proyecto justificada a partir de las restricciones verificadas de la Opción A.
