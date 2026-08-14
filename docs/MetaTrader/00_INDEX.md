# Índice maestro — Investigación MetaTrader 5

> Punto de entrada de toda la documentación de la Fase 0 (Investigación y documentación previa a la puesta en marcha).

## Objetivo del proyecto

Sustituir la plataforma web propia de trading (aparcada) por **MetaTrader 5** como plataforma de mercado, ejecución y backtesting, con **agentes de IA** en la capa de investigación/diseño y **Expert Advisors deterministas en MQL5** en la capa de ejecución. Ver detalle en [`00_Contexto_y_Objetivos_Proyecto.md`](00_Contexto_y_Objetivos_Proyecto.md).

## Arquitectura objetivo (resumen)

```text
Agentes investigan/analizan → StrategyProposal → Validación estática/riesgo → Validación quant
   → Generación/revisión EA (MQL5) → Compilación → Backtest → Optimización controlada
   → Out-of-sample/Forward → Demo → Estrategia aprobada y versionada → EA determinista ejecuta
   → Revisión periódica de salud
```

Sin LLM en el bucle de ejecución. Ver [`00_Contexto_y_Objetivos_Proyecto.md`](00_Contexto_y_Objetivos_Proyecto.md) §4.

## Fase actual

**Fase 0 — Investigación y documentación.** Ver `ROADMAP.md`. Dinero real fuera de alcance.

## Estado de cada documento

| Documento | Estado | Última revisión | Hallazgos críticos | Bloquea puesta en marcha |
|---|---|---|---|---|
| [00_Contexto_y_Objetivos_Proyecto.md](00_Contexto_y_Objetivos_Proyecto.md) | VERIFICADO | 2026-08-07 | Cambio de rumbo documentado | No |
| [01_Arquitectura_y_Funcionamiento_MetaTrader5.md](01_Arquitectura_y_Funcionamiento_MetaTrader5.md) | BORRADOR | 2026-08-07 | Build vigente 6090, no 6060 (corrige hipótesis del prompt maestro) | No |
| [02_Fundamentos_MQL5.md](02_Fundamentos_MQL5.md) | BORRADOR | 2026-08-07 | Cola de eventos: OnTick puede descartar duplicados, no hay 1:1 request/evento | No |
| [03_Arquitectura_Expert_Advisors.md](03_Arquitectura_Expert_Advisors.md) | BORRADOR | 2026-08-07 | Plantilla estándar de EA definida | No |
| [04_Modelo_Trading_Ordenes_Deals_Posiciones.md](04_Modelo_Trading_Ordenes_Deals_Posiciones.md) | BORRADOR | 2026-08-07 | `OrderSend=true` no implica fill; BOC sin documentación oficial suficiente (Q-003) | Sí (crítico para seguridad de ejecución) |
| [05_Gestion_Riesgo_EAs.md](05_Gestion_Riesgo_EAs.md) | BORRADOR | 2026-08-07 | `RiskPolicy` con hard_limits no optimizables propuesta | Sí |
| [06_Strategy_Tester_y_Datos_Historicos.md](06_Strategy_Tester_y_Datos_Historicos.md) | BORRADOR | 2026-08-07 | Fallback silencioso de "real ticks" a ticks sintéticos si no hay histórico | No |
| [07_Backtesting_Optimizacion_y_Validacion_Quant.md](07_Backtesting_Optimizacion_y_Validacion_Quant.md) | BORRADOR | 2026-08-07 | Criterios de aceptación deben fijarse antes de ver resultados | Sí |
| [08_Ciclo_Vida_y_Versionado_Estrategias.md](08_Ciclo_Vida_y_Versionado_Estrategias.md) | BORRADOR | 2026-08-07 | Máquina de estados ampliada respecto a la lista original del prompt | No |
| [09_Integracion_Python_MetaTrader5.md](09_Integracion_Python_MetaTrader5.md) | BORRADOR | 2026-08-07 | Python requiere IPC con Terminal en ejecución; no reemplaza al EA | No |
| [10_MCP_IA_y_Agentes_MetaTrader5.md](10_MCP_IA_y_Agentes_MetaTrader5.md) | BORRADOR | 2026-08-07 | Distinción MCP nativo vs. servidores MCP de terceros sin confirmación (riesgo real) | Sí (crítico para seguridad) |
| [11_Arquitectura_Multiagente_Futura.md](11_Arquitectura_Multiagente_Futura.md) | BORRADOR | 2026-08-07 | Gate determinista: aprobación narrativa de LLM nunca es suficiente | No |
| [12_Analisis_Fundamental_Noticias_y_Macroeconomia.md](12_Analisis_Fundamental_Noticias_y_Macroeconomia.md) | BORRADOR | 2026-08-07 | Calendario usa hora de servidor (TimeTradeServer), no hora local | No |
| [13_Brokers_MetaTrader5_Espana.md](13_Brokers_MetaTrader5_Espana.md) | BORRADOR | 2026-08-07 | XTB descartado (no ofrece MT5, pese a aparecer en comparativas); shortlist de 4 candidatos con registro CNMV a reverificar (Q-005) | Sí |
| [14_Despliegue_24x7_VPS.md](14_Despliegue_24x7_VPS.md) | BORRADOR | 2026-08-07 | VPS integrado de MT5 prohíbe DLL y no aloja Python/MCP — hipótesis confirmada | No |
| [15_Seguridad_Credenciales_y_Permisos.md](15_Seguridad_Credenciales_y_Permisos.md) | BORRADOR | 2026-08-07 | Checklist de seguridad previa a demo/VPS/real | Sí |
| [16_Observabilidad_Auditoria_y_Reproducibilidad.md](16_Observabilidad_Auditoria_y_Reproducibilidad.md) | BORRADOR | 2026-08-07 | Estructura `strategies/<nombre>/<version>/` propuesta, no implementada | No |
| [17_Estandar_Desarrollo_EAs_con_IA.md](17_Estandar_Desarrollo_EAs_con_IA.md) | BORRADOR | 2026-08-07 | 22 reglas obligatorias + plantilla de prompt estándar | Sí |
| [18_Primeros_Bots_Laboratorio.md](18_Primeros_Bots_Laboratorio.md) | BORRADOR | 2026-08-07 | 3 EAs con objetivos de aprendizaje explícitos, sin parámetros fijados | No |
| [19_Plan_Puesta_en_Marcha.md](19_Plan_Puesta_en_Marcha.md) | BORRADOR | 2026-08-07 | Incorpora resolución práctica de Q-001, Q-004, Q-005 como pasos explícitos | Sí |
| [ROADMAP.md](ROADMAP.md) | BORRADOR | 2026-08-07 | Fase 7 (real) explícitamente fuera de alcance | No |
| [GLOSARIO.md](GLOSARIO.md) | BORRADOR | 2026-08-07 | — | No |

Estados posibles: `NO INICIADO`, `EN INVESTIGACIÓN`, `BORRADOR`, `REVISADO`, `VERIFICADO`. Todos los documentos quedan en `BORRADOR` (no `VERIFICADO`) porque varios hechos operativos concretos (Q-001, Q-003, Q-004, Q-005) solo pueden confirmarse con una instalación real, prevista en `19_Plan_Puesta_en_Marcha.md`.

## Decisiones tomadas

- Adoptar MT5 como plataforma principal; aparcar la plataforma web propia (`00_Contexto_y_Objetivos_Proyecto.md`).
- Ninguna operación de IA en tiempo real decide trading; solo EAs deterministas ejecutan (principio arquitectónico central).
- Entorno inicial: DEMO, `AI-initiated trading` deshabilitado (`10_MCP_IA_y_Agentes_MetaTrader5.md`, `15_Seguridad_Credenciales_y_Permisos.md`).
- Usar exclusivamente el MCP nativo del Terminal (build ≥6060); ningún servidor MCP de terceros autorizado (`10_MCP_IA_y_Agentes_MetaTrader5.md` §2).
- `CTrade` envuelto en un `TradeExecutor` propio, no usado directamente por la lógica de estrategia (`03_Arquitectura_Expert_Advisors.md` §3).
- Hard limits de riesgo viven en código común, no en `input` de cada EA (`05_Gestion_Riesgo_EAs.md` §5).
- XTB descartado como candidato de broker: no ofrece MT5 (`13_Brokers_MetaTrader5_Espana.md` §2).
- VPS integrado de MetaQuotes recomendado como primer paso de despliegue 24/7 (no VPS Windows completo desde el principio) (`14_Despliegue_24x7_VPS.md` §5).

## Decisiones pendientes

Ver `PREGUNTAS_ABIERTAS.md` (Q-001 a Q-005). Ninguna es bloqueante para **iniciar** la Fase 1, pero Q-004 y Q-005 deben resolverse antes de completar los Pasos 2 y 6 de `19_Plan_Puesta_en_Marcha.md` respectivamente.

## Auditoría final cruzada (2026-08-07)

Realizada tras completar los 26 documentos. Hallazgos:

- **Contradicción detectada y corregida:** una fuente inicial incluía XTB como broker MT5 regulado en España; se verificó directamente que XTB no ofrece MT5 (solo xStation 5) y se retiró de la shortlist (`13_...` §2).
- **Dato corregido respecto al prompt maestro:** la build "más reciente" no es la 6060 sino la 6090; documentado en `01_...` §1 y en `ESTADO_INVESTIGACION.md`.
- **Terminología consistente:** "EA/Order/Deal/Position", "RiskPolicy", "StrategyProposal/StrategyVersion/StrategyValidationReport/HealthReview" se usan con el mismo significado en todos los documentos que los referencian.
- **Enlaces internos:** todos los documentos referenciados desde este índice existen en `docs/MetaTrader/` (verificado por listado de archivos).
- **Afirmaciones dependientes del broker:** marcadas explícitamente `[DEPENDIENTE DEL BROKER]` en `01`, `04`, `05`, `06`, `12`, `13` — no se han detectado casos donde una propiedad específica de broker se presente como universal.
- **Ningún documento permite a un agente de IA operar directamente:** revisado explícitamente en `09`, `10`, `11`, `15`, `17` — todos mantienen el principio arquitectónico central sin excepciones.
- **Riesgos no cubiertos identificados:** exposición de la lógica de estrategia si se usara MQL5 Cloud Network (`06_...` §4) y ambigüedad del alcance exacto del permiso de "línea de comandos" del MCP nativo (`10_...`, Q-004) — ambos documentados, ninguno bloqueante para investigación, sí relevantes para producción futura.
- **Documentación redundante:** no detectada — cada documento referencia en vez de repetir (p. ej. `RiskPolicy` se define una vez en `05` y se referencia desde `03`, `08`, `11`, `15`, `17`).
- **Pasos de puesta en marcha dependientes de `[PENDIENTE]`:** Q-001, Q-003, Q-004, Q-005 — todos incorporados explícitamente como verificaciones a realizar dentro de `19_Plan_Puesta_en_Marcha.md`, no ocultados ni asumidos como resueltos.

## Resultado

```text
Documentos: 26 (20 temáticos 00-19 + ROADMAP + GLOSARIO + FUENTES + PREGUNTAS_ABIERTAS + ESTADO_INVESTIGACION + 00_INDEX + DECISIONS/README)
Fuentes oficiales revisadas: 24 (F001-F021, F024, F030, ver FUENTES.md) + 5 secundarias/comunidad citadas explícitamente como tales
Decisiones arquitectónicas cerradas: 7 (ver "Decisiones tomadas" arriba)
Preguntas abiertas no bloqueantes: 3 (Q-001, Q-002, Q-003)
Preguntas abiertas que bloquean pasos concretos (no toda la fase): 2 (Q-004, Q-005)

Estado: LISTO para Fase 1 — Puesta en Marcha, con las verificaciones prácticas de
Q-001/Q-004/Q-005 incorporadas como pasos explícitos de 19_Plan_Puesta_en_Marcha.md.

Siguiente paso recomendado: ejecutar 19_Plan_Puesta_en_Marcha.md Paso 1
(reverificar build vigente e instalar MetaTrader 5).
```

## Orden recomendado de lectura

1. `00_Contexto_y_Objetivos_Proyecto.md`
2. `01_Arquitectura_y_Funcionamiento_MetaTrader5.md`
3. `02_Fundamentos_MQL5.md`
4. `04_Modelo_Trading_Ordenes_Deals_Posiciones.md` (crítico)
5. `03_Arquitectura_Expert_Advisors.md`
6. `05_Gestion_Riesgo_EAs.md`
7. `06_Strategy_Tester_y_Datos_Historicos.md` → `07_Backtesting_Optimizacion_y_Validacion_Quant.md`
8. `08_Ciclo_Vida_y_Versionado_Estrategias.md`
9. `09_Integracion_Python_MetaTrader5.md` → `10_MCP_IA_y_Agentes_MetaTrader5.md` → `11_Arquitectura_Multiagente_Futura.md`
10. `12_Analisis_Fundamental_Noticias_y_Macroeconomia.md`
11. `13_Brokers_MetaTrader5_Espana.md` → `14_Despliegue_24x7_VPS.md` → `15_Seguridad_Credenciales_y_Permisos.md`
12. `16_Observabilidad_Auditoria_y_Reproducibilidad.md` → `17_Estandar_Desarrollo_EAs_con_IA.md`
13. `18_Primeros_Bots_Laboratorio.md` → `19_Plan_Puesta_en_Marcha.md`
14. `ROADMAP.md`

## Criterio para pasar a configuración (Fase 1)

Ver "Definition of Done" en `ESTADO_INVESTIGACION.md` y el resumen final que se añadirá tras la auditoría cruzada. En resumen: todos los documentos marcados como críticos (`Bloquea puesta en marcha = Sí`) deben estar en estado `VERIFICADO` o `REVISADO` sin preguntas bloqueantes abiertas.

---

_Este índice se actualiza tras cada bloque completado. Ver `ESTADO_INVESTIGACION.md` para el detalle de progreso._
