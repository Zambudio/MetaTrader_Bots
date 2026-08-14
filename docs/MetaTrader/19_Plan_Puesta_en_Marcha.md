# Plan de puesta en marcha

> **Estado:** BORRADOR
> **Última revisión:** 2026-08-07
> **Documento crítico.** Este documento **no ejecuta nada** — convierte toda la investigación de la Fase 0 en instrucciones concretas para la Fase 1 (Laboratorio MetaTrader, ver `ROADMAP.md`). Ningún paso de este plan se ha realizado en esta fase.

## Paso 1 — Instalar versión verificada de MetaTrader 5

- **Prerrequisito:** re-verificar en `metatrader5.com/en/releasenotes` cuál es la build vigente en el momento real de instalar (no asumir que sigue siendo la 6090 — ver `PREGUNTAS_ABIERTAS.md` Q-001).
- Descargar el instalador oficial desde `metatrader5.com/es/download` (o el instalador ya presente en el repositorio, `mt5setup.exe`, verificando que corresponde a la build vigente antes de usarlo — si es más antiguo, descargar de nuevo).
- Verificación tras instalar: comprobar el número de build desde `Ayuda → Acerca de` (o menú equivalente) y registrarlo en `ESTADO_INVESTIGACION.md`.

## Paso 2 — Crear/usar cuenta demo en broker seleccionado

- Confirmar la elección final entre los candidatos de `13_Brokers_MetaTrader5_Espana.md` §6.
- **Antes de introducir cualquier dato personal:** verificar manualmente en `cnmv.es` el registro/passporting del broker elegido (resuelve `PREGUNTAS_ABIERTAS.md` Q-005).
- Crear cuenta **demo** exclusivamente — ninguna cuenta real en esta fase.
- Registrar: servidor, tipo de cuenta (netting/hedging), apalancamiento demo, divisa de cuenta.

## Paso 3 — Configurar MetaEditor y repositorio

- Abrir `File → Open Data Folder` desde MetaEditor/Terminal y confirmar la estructura descrita en `01_Arquitectura_y_Funcionamiento_MetaTrader5.md` §5.
- Definir el mecanismo de sincronización entre el repositorio Git (`docs/MetaTrader/`, y el futuro `src/`/`strategies/`) y `MQL5/Experts` — no desarrollar directamente dentro del Data Folder de una instalación real sin control de versiones paralelo.
- Opciones a evaluar en este paso (sin decidir de antemano en esta fase de investigación): symlink de una carpeta del repo hacia `MQL5/Experts/<proyecto>`, o script de sincronización/copiado.

## Paso 4 — Confirmar build y Data Folder

- Registrar en `ESTADO_INVESTIGACION.md`: build exacta instalada, ruta del Data Folder, servidor del broker demo.
- Confirmar que la estructura de carpetas coincide con lo documentado en `01_Arquitectura_y_Funcionamiento_MetaTrader5.md`; si hay diferencias (nuevas carpetas, cambios de ubicación en una build más reciente), actualizar ese documento.

## Paso 5 — Configurar Git y exclusión de secretos

- Revisar/ampliar `.gitignore` conforme a `15_Seguridad_Credenciales_y_Permisos.md` §2 antes de cualquier commit que toque configuración real de MT5.
- Confirmar que ningún archivo de `Config/` (accounts.dat, servers.dat) ni credenciales quedan versionados.
- Si se usa symlink hacia el Data Folder (Paso 3), verificar que Git no sigue el symlink hacia archivos sensibles fuera del repositorio.

## Paso 6 — Configurar MCP para Claude Code con trading de IA deshabilitado

- Resolver en la práctica `PREGUNTAS_ABIERTAS.md` Q-004: localizar en la UI real del Terminal/MetaEditor la configuración de proveedor de IA, permisos (AI-initiated trading, confirmación manual, red, línea de comandos) y el mecanismo de conexión de un cliente MCP externo.
- Configurar explícitamente:
  ```text
  AI-initiated trading = DESHABILITADO
  Confirmación manual = HABILITADA donde exista la opción
  Acceso a red del agente = DESHABILITADO por defecto
  Acceso a línea de comandos del agente = DESHABILITADO por defecto
  ```
- Conectar Claude Code como cliente MCP siguiendo la documentación oficial vigente en ese momento (puede haberse ampliado desde esta investigación — reverificar contra fuente oficial, no contra este documento como única referencia).
- **No usar ningún servidor MCP de terceros** (ver `10_MCP_IA_y_Agentes_MetaTrader5.md` §2.2) en este paso.
- Documentar el procedimiento real seguido, actualizando `10_MCP_IA_y_Agentes_MetaTrader5.md` con el detalle verificado (cerrando así la pregunta Q-004 con evidencia real en vez de inferencia).

## Paso 7 — Validar acceso read-only a datos/entorno

- Con la configuración del Paso 6, comprobar desde Claude Code (u otro cliente MCP conectado) que se puede: leer datos de mercado, consultar símbolos/propiedades, leer histórico — sin que exista ninguna vía para enviar una orden real.
- Confirmar explícitamente que un intento deliberado de pedir al agente que envíe una orden es rechazado o bloqueado por la configuración de permisos (prueba de seguridad activa, no solo confianza en la configuración).

## Paso 8 — Crear Hello World / EA de diagnóstico

- Un EA mínimo (sin lógica de trading) que solo registre en log eventos de ciclo de vida (`OnInit`, `OnTick`, `OnDeinit`) y propiedades básicas del símbolo — para validar el flujo completo de edición → compilación → carga en gráfico → logs, antes de escribir cualquier lógica real.

## Paso 9 — Compilar

- Compilar el EA de diagnóstico y, después, el primer esqueleto de la arquitectura común (`Common/*.mqh` de `03_Arquitectura_Expert_Advisors.md`) sin lógica de estrategia todavía.
- Cero warnings sin justificar (regla 4 de `17_Estandar_Desarrollo_EAs_con_IA.md`), aplicada desde este primer paso.

## Paso 10 — Ejecutar Strategy Tester

- Ejecutar el EA de diagnóstico en el Strategy Tester para confirmar que el entorno de test funciona de extremo a extremo.
- Comprobar disponibilidad real de "Every tick based on real ticks" para el símbolo elegido en el broker demo — resuelve empíricamente parte de los puntos `[PENDIENTE]` de `13_Brokers_MetaTrader5_Espana.md` §4.
- Registrar la "history quality" observada.

## Paso 11 — Crear EA 1 (Trend Following)

- Seguir la plantilla de prompt de `17_Estandar_Desarrollo_EAs_con_IA.md` §2 si se genera con ayuda de un agente.
- Implementar sobre la arquitectura común ya compilada en el Paso 9.

## Paso 12 — Aplicar el protocolo de validación

- Ejecutar el pipeline completo de `07_Backtesting_Optimizacion_y_Validacion_Quant.md` §6 sobre EA 1: test de lógica → backtest inicial → optimización limitada → análisis de estabilidad → OOS → forward → stress → (demo, si se decide continuar).
- Fijar los criterios de aceptación **antes** de ver resultados (regla no negociable, `07_...` §7).
- Generar el `StrategyValidationReport` correspondiente.

## Paso 13 — EA 2 y EA 3

- Repetir Pasos 11-12 para `18_Primeros_Bots_Laboratorio.md` EA 2 (Mean Reversion) y EA 3 (Breakout), en ese orden, reutilizando la arquitectura común ya validada con EA 1.

## Paso 14 — Diseñar automatización de tests

- Evaluar (sin implementar todavía en esta fase de investigación, pero sí como tarea temprana de la Fase 1) cómo automatizar la ejecución repetida del pipeline de validación: orquestación desde Python del Strategy Tester (vía línea de comandos del Terminal, si se usa esa vía) o vía scripts que consuman los reportes exportados.
- Definir cómo se integrará esto con la estructura de `16_Observabilidad_Auditoria_y_Reproducibilidad.md` §4.

## Paso 15 — Evaluar despliegue 24/7

- Solo tras tener al menos un EA en `DEMO` prolongada de forma seria (no antes): aplicar la recomendación de `14_Despliegue_24x7_VPS.md` §5 (probablemente Opción A, MQL5 Virtual Hosting, en esta etapa).
- Repetir la checklist de seguridad de `15_Seguridad_Credenciales_y_Permisos.md` §5.2 antes de migrar cualquier EA a un VPS.

## Verificaciones transversales a lo largo de todo el plan

- Ningún paso de este plan puede ejecutarse con `AI-initiated trading` habilitado.
- Ningún paso de este plan implica cuenta real ni depósito de fondos.
- Cualquier discrepancia encontrada entre lo documentado en la Fase 0 y la realidad observada durante estos pasos debe **actualizar el documento correspondiente** (no solo anotarse aparte), manteniendo la documentación como fuente viva.

## Fuentes consultadas

- Consolidación directa de todos los documentos previos (`00` a `18`); no requiere investigación externa adicional — es la traducción operativa de la investigación ya realizada, siguiendo el orden sugerido en la sección 29 del prompt maestro.
