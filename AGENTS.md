# AGENTS.md — MetaTrader_Bots

Configuración multiagente para estrategias y bots en MetaTrader 5. Dos partes principales:

- [`wiki-Traiding/`](wiki-Traiding/index.md) — base de conocimiento cuantitativo y de ingeniería MetaTrader/MQL5, mantenida siguiendo el patrón [LLM Wiki de Karpathy](wiki-Traiding/METHODOLOGY.md). Sus convenciones están en [`wiki-Traiding/CLAUDE.md`](wiki-Traiding/CLAUDE.md).
- [`trading-agents-dashboard/`](trading-agents-dashboard/README.md) — consola web de agentes de IA. Su documentación técnica y operativa se indexa en [`trading-agents-dashboard/docs/`](trading-agents-dashboard/docs/README.md); el backend se documenta en [`server/README.md`](trading-agents-dashboard/server/README.md).

## Regla permanente: documentación por ámbito, siempre indexada

- Documentación del producto web — arquitectura, funcionalidades, operación, decisiones, planes, auditorías y cambios — → [`trading-agents-dashboard/docs/`](trading-agents-dashboard/docs/README.md), usando sus categorías y actualizando [`REGISTRO_DESARROLLO.md`](trading-agents-dashboard/docs/REGISTRO_DESARROLLO.md) cuando corresponda.
- Conocimiento de trading de propósito general → categoría correspondiente de [`wiki-Traiding/`](wiki-Traiding/index.md).
- Investigación y decisiones específicas de MetaTrader 5, MQL5 o EAs → [`wiki-Traiding/proyecto-mt5-bots/`](wiki-Traiding/proyecto-mt5-bots/00_INDEX.md).
- Los planes e informes históricos que ya viven en [`wiki-Traiding/proyecto-dashboard/`](wiki-Traiding/proyecto-dashboard/00_INDEX.md) se conservan allí y se enlazan desde el índice de la web; no se duplican.

No se crean documentos sueltos en la raíz del monorepo ni de la aplicación. `README.md` y este `AGENTS.md` son excepciones convencionales como puntos de entrada. Ningún documento se considera terminado sin un enlace Markdown real desde su índice o desde un documento relacionado.

---

## 🧠 Base de Conocimiento Global (OBSIDIAN VAULT)

Además de la `wiki-Traiding/` local especializada en trading cuantitativo, este repositorio forma parte del ecosistema global de proyectos integrado en nuestra base de conocimiento general:
📁 **`z:\IA\02_Proyectos\OBSIDIAN VAULT`**

### Directrices Obligatorias para Cualquier Agente de IA:
1. **Consulta Previa Obligatoria**:
   - Siempre que estemos desarrollando, buscando arquitecturas, integrando modelos de IA o configurando servidores, **busca información primero en `OBSIDIAN VAULT`** (`OBSIDIAN VAULT/index.md`).
   - `wiki-Traiding/`: Conocimiento de dominio financiero interno, backtests específicos y catálogo local.
   - `OBSIDIAN VAULT`: Infraestructura global (Synology NAS, Docker), pasarela de IA compartida (OmniRoute), estándares transversales (`Concepts/Estandar-Desarrollo-EAs-MQL5-IA.md`, `Concepts/Inyeccion-Automatica-Contexto-Wiki-Agentes.md`) y la ficha `Entities/Proyecto-MetaTrader-Bots.md`.
2. **Referencias Cruzadas**: Si el usuario indica *"Hazlo como en el proyecto X"*, consulta las entidades y conceptos en `OBSIDIAN VAULT`.
3. **Documentar y Relacionar Obligatoriamente Nuevos Desarrollos e Implementaciones**:
   - Cualquier nueva implementación relevante, avance técnico transversal, integración con pasarelas o patrón arquitectónico **DEBE documentarse e interrelacionarse en `OBSIDIAN VAULT`**.
   - Seguir estrictamente la metodología Wiki-Base (`OBSIDIAN VAULT/SCHEMA.md`):
     - Frontmatter YAML (`tags`, `updated: YYYY-MM-DD`, `fuentes`).
     - Sección `## Cross-references` con Wikilinks nativos `[[...]]`, enlazando a las notas pertinentes y SIEMPRE a `[[index]]`, `[[SCHEMA]]` y `[[log]]`.
     - Sección `## Fuentes`.
     - Regla del Vault Cerrado (0 enlaces Markdown salientes; rutas locales en texto plano en backticks).
     - Actualización obligatoria de `OBSIDIAN VAULT/index.md` y registro cronológico en `OBSIDIAN VAULT/log.md`.
