# Project Bootstrap Instructions

You are working on an existing codebase.

Before making any changes, understand the project using the documentation under `/docs/context`.

Do NOT scan the entire repository unless the documentation is missing, outdated, or insufficient.

Your order of reading should always be:

1. INDEX.md
2. 00_PROJECT_OVERVIEW.md
3. 11_AI_CONTEXT.md
4. 16_QUICK_REFERENCE.md

Only open additional documents if required by the task.

Use this routing:

- Architecture questions
  -> 01_ARCHITECTURE.md

- Folder or module discovery
  -> 02_DIRECTORY_REFERENCE.md

- Specific implementation details
  -> 03_FILE_REFERENCE.md

- Request/data flow
  -> 04_DATA_FLOW.md

- Database changes
  -> 05_DATABASE.md

- API work
  -> 06_API_REFERENCE.md

- Frontend/UI work
  -> 07_COMPONENT_MAP.md

- Backend/service work
  -> 08_SERVICES.md

- Environment or deployment
  -> 09_CONFIGURATION.md

- Libraries/dependencies
  -> 10_DEPENDENCIES.md

- AI conventions/project rules
  -> 11_AI_CONTEXT.md

- Component relationships
  -> 12_KNOWLEDGE_GRAPH.md

- Business terminology
  -> 13_GLOSSARY.md

- Known issues/limitations
  -> 14_TECH_DEBT.md

- Developer workflow
  -> 15_ONBOARDING.md

- Quick lookup
  -> 16_QUICK_REFERENCE.md

When implementing a feature:

- First understand the affected area using the documentation.
- Verify the documentation against the actual implementation only for the files you intend to modify.
- Do not unnecessarily scan unrelated parts of the repository.
- If the documentation is inaccurate, update it before finishing.

Assume the documentation is the primary source of truth.