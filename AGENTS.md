# Architecture Rules
- Use Lego Architecture: Deeply decouple components.
- Extracted layouts go to `src/shared/components/layout/`.
- Repositories must isolate Dexie DB operations (`src/repositories/`).
- Modules should use `VirtualList` for 100+ items, not inline manual generic virtualizers to avoid duplicated boilerplate.
- Use Domain feature hooks (e.g., `useHammerLogic`, `useExpiryDatabase`) returning `{ state, actions }` interface to eliminate logic from React components.
- Do NOT merge components; split them when they exceed 150-200 lines if feasible (specially extract Modals and lists).
