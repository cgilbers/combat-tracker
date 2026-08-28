# Combat Tracker Implementation Plan

This plan builds the application through small, independently testable increments. The MVP delivers one complete local workflow: a DM creates a party, assembles an encounter, and runs combat. Persistence and reusable content follow immediately; SRD integration, advanced combat, generators, OCR, and sync are added only after the core loop is stable.

## Phase 1: MVP

1. Replace the Vite starter in `src/App.tsx` with a single-screen combat workflow.
2. Define minimal domain types for parties, characters, creatures, combatants, initiative groups, and encounters.
3. Keep PCs limited to identity, and notes. PCs do not have app-tracked HP, AC or stats.
4. Allow the DM to create a party and add PCs with names only. Do not store PC initiative modifiers.
5. Allow creation or selection of minimal custom creatures with name, AC, HP, and optional Dexterity modifier.
6. Build an encounter from the selected party and creatures.
7. Add manual initiative entry, encounter start, turn progression, round tracking, creature HP controls with amount-based Damage and Heal actions, creature AC display, and basic creature details.
8. Keep state in React while the workflow is being proven. Keep combat behavior in pure TypeScript functions.

## Phase 2: Tests and Persistence

9. Add a test runner and unit tests for initiative ordering, turn progression, round rollover, creature HP bounds, and encounter creation.
10. Verify that PC combatants never expose or mutate HP or AC.
11. Add Dexie and IndexedDB repositories for parties, custom creatures, and encounters.
12. Hydrate the app on startup, handle empty and persistence-error states, and define versioned schema migrations.
13. Add JSON export/import as a local backup mechanism before implementing cloud sync.
14. Test the complete flow after reload: create party, add initiative-only PC, create creature, start encounter, edit creature HP and turns, and restore state.

## Phase 3: Product Structure and Reusable Content

15. Split the UI into real workflows: Dashboard, Parties, Creatures, Creature Editor, Encounter Builder, and Encounter Run.
16. Add React Router when multiple real workflows exist; do not create empty navigation shells.
17. Add shared state infrastructure only when persistence or cross-page coordination makes it necessary.
18. Expand creature editing incrementally with ability scores, speed, senses, languages, challenge rating, XP, traits, actions, reactions, tags, and boss-resource definitions.
19. Add validation and source metadata: `custom`, `srd`, and `ocr`.
20. Keep PC editing limited to identity and notes. Do not add PC initiative modifiers, HP, or AC fields.
21. Replace the starter styling in `src/index.css` with responsive, accessible, DM-focused layouts and controls.

## Phase 4: SRD Content and Boss Combat

22. Define a pluggable SRD provider interface and a D&D 5e API adapter.
23. Normalize API payloads into the domain `Creature` type and cache fetched SRD creatures locally.
24. Add loading, retry, API-error, and offline-cache states.
25. Document SRD/API attribution and licensing before distributing or bundling external data. Do not silently bundle non-SRD content.
26. Add boss resource state for spell slots, legendary actions, legendary resistances, and lair actions.
27. Initialize combat resource state from creature definitions and test consumption and round-reset behavior.

## Phase 5: Advanced Combat Slices

28. Add grouped creature initiative and automatic `d20 + Dexterity modifier` rolls with injectable deterministic randomness. Keep PC initiative manual.
29. Define and test tie-breaking, defeated combatants, initiative edits, and active-turn behavior.
30. Add mid-encounter creature insertion with creature selection, quantity, automatic/manual initiative, stat-block access, and boss-resource initialization.
31. Test insertion before, at, and after the active turn, including round transitions.
32. Add delay/resume initiative in the combat engine: delayed state, no action before original initiative, one re-entry per round, selected re-entry position, updated initiative, and reset at round end.
33. Add focused edge-case tests before adding the delay/resume UI.

## Phase 6: Encounter and Environment Generators

34. Add character level data and define a ruleset abstraction supporting selectable 2014 and 2024 calculations.
35. Implement and test one encounter-calculation ruleset end to end, then add the second ruleset.
36. Add official difficulty thresholds and XP multipliers, followed by source filters, creature type and CR filters, maximum creature types, and editable suggestions.
37. Add reskin metadata for name, HP, AC, damage, speed, cosmetic tags, variant abilities, elite templates, and minion templates.
38. Add deterministic environment packages with map templates, terrain zones, obstacles, hazards, interactive elements, dynamic events, narrative hooks, and creature synergy notes.
39. Allow generated environments to attach to new and existing encounters.

## Phase 7: OCR Import

40. Define an OCR adapter interface so browser and future cloud implementations share the same contract.
41. Add a Tesseract.js import wizard with image input, progress, cancellation, and error states.
42. Parse OCR output into an untrusted creature draft and map recognized fields into the editor.
43. Require user review and editing before saving. Never save OCR output directly.
44. Unit-test parsing against representative stat-block variations and malformed input.

## Phase 8: Offline and Operational Polish

45. Add PWA support and service-worker caching after asset and SRD-cache behavior is defined.
46. Verify offline startup, local data access, cache updates, and graceful network recovery.
47. Add Playwright smoke tests for stable desktop and narrow mobile workflows.
48. Check keyboard navigation, focus handling, accessible labels, responsive sizing, and performance.
49. Replace template documentation in `README.md` with setup instructions, MVP scope, offline behavior, attribution, and verification commands.

## Deferred Work

50. Defer the optional Node/Express backend, cloud OCR, Dropbox sync, OneDrive sync, hosting, accounts, and multi-user features until the local application is reliable.
51. Introduce adapter interfaces early where they protect the local-first design, but do not implement remote services in the MVP.

## Project Organization

- `src/domain/` — shared TypeScript types and validation.
- `src/combat/` — pure combat-engine functions and tests.
- `src/data/` — Dexie repositories, import/export, and SRD adapters.
- `src/features/` — party, creature, encounter, generator, OCR, and run-view UI.
- `src/App.tsx` — initial vertical slice, later reduced to the application shell.
- `src/index.css` — responsive visual system.
- `docs/specification.md` — requirements and target domain model.
- `docs/plan.md` — this implementation roadmap.

## Verification Strategy

1. Run `npm run lint` and `npm run build` after each foundation slice.
2. Unit-test pure combat transitions before implementing advanced combat rules.
3. Test HP bounds only for creatures; PC entries must remain initiative-only.
4. Test persistence reload, empty states, failures, malformed imports, deterministic dice, and offline SRD cache behavior.
5. Add browser coverage after routes and persistence are stable, including desktop and narrow viewport smoke tests.
6. Manually verify keyboard use, mobile layouts, offline startup, and mandatory OCR review.

## Product Decisions

- MVP is one complete manually assembled local encounter workflow.
- React state comes first; routing and a shared state library are introduced only when justified.
- PCs keep their own HP, AC, and initiative modifiers; the app stores and displays none of them on the party record.
- Creature HP is tracked and bounded by the creature's defined maximum.
- Encounter generation supports both 2014 and 2024 rulesets.
- IndexedDB is the durable local source of truth; JSON import/export comes before cloud sync.
- No third-party or non-SRD creature content is bundled.