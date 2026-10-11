# Combat Tracker Implementation Plan

## Product Goal

Deliver an offline-capable, single-user tool that lets a Dungeon Master prepare and run a complete combat encounter. The first release includes party and creature management, encounter building, initiative and turn flow, creature HP/AC, boss resources, SRD creature import, and durable local storage.

The app is DM-first and local-first. It does not require accounts, a backend, cloud sync, OCR, or multiplayer. Encounter and environment generators are later work, not release gates.

## Agreed Product Decisions

- PCs have names and notes in the party; the app tracks their encounter initiative, but not their HP or AC. Those remain at the table.
- Creatures have app-managed combat statistics and HP. Creature initiative can be rolled automatically, with group initiative supported; the DM can edit results before combat starts.
- The combat rules engine is pure TypeScript, independent of React and persistence.
- IndexedDB is the durable local source of truth. The app remains useful offline; SRD data fetched while online is cached locally.
- SRD import is part of the first release. Only SRD content may be bundled, and attribution/licensing must be documented.
- OCR, encounter generation, environment/map generation, remote sync, server hosting, accounts, and multiplayer are deferred.
- The first release is complete when a DM can use the app offline to prepare and run combat, reopen locally saved data, and rely on tests for combat transitions and persistence.

## Current Codebase Baseline

The repository already contains a working single-screen vertical slice rather than an untouched Vite starter.

| Area | Present now | Gap to the agreed release |
| --- | --- | --- |
| Party | One party can be named and PCs added by name. | Multiple-party workflow, editing/removal, and notes are not implemented. |
| Creatures | Minimal custom creatures can be created with name, AC, HP, and Dexterity modifier. | Editing/removal and the fuller SRD-aligned stat block are missing. |
| Encounter setup | One selected creature can be added at a bounded quantity alongside party members. | Encounter listing/management, groups, and SRD selection are missing. |
| Combat | Manual initiative, descending sort, turn advance, round rollover, creature damage/healing, and defeated state exist. | Creature auto-roll/group initiative, boss resources, delay/resume, mid-combat additions, and broader edge-case rules are missing. |
| Persistence | Dexie stores parties, creatures, and encounters; version-1 JSON backup import/export exists. | The UI currently loads the first party/encounter and replaces saved creature/encounter tables on save; multiple saved records need a safe workflow. Migration and reload coverage are limited. |
| Tests | Vitest covers basic combat order/turn/HP behavior and database backup operations. | Broader domain, persistence-reload, import, error, and UI workflows need coverage. |
| Offline UX | App data is stored locally and the UI is styled for combat use. | No PWA/service-worker support or verified offline app-shell startup is present. |
| Architecture | Types, combat logic, and database code are separated. | `App.tsx` currently owns setup, combat, persistence orchestration, and import/export UI; split by workflow as features grow. |

The existing implementation aligns with the agreed local-first core and demonstrates a useful combat loop. The old plan did not fully align: it postponed SRD import and advanced combat beyond the agreed first release, and treated PC initiative-only behavior as an unconfirmed assumption. The PC policy is now resolved as stated above.

## Implementation Roadmap

Work in independently verifiable slices. Preserve the existing working flow while broadening it; do not replace it with empty route shells or introduce a backend/shared-state library without a concrete need.

### Phase 1: Complete local party, creature, and encounter workflows

1. Expand party and PC management to support the agreed name-and-notes data, with create, edit, and delete behavior.
2. Expand creature management from the current minimal form to editable, deletable creature records; progressively add the agreed stat-block fields and stat-block viewing.
3. Support multiple saved parties, creatures, and encounters without autosave replacing unrelated records.
4. Add encounter list/detail management and build encounters from a selected party and saved creatures.
5. Keep party PC HP/AC out of the model and UI; cover this boundary in tests.

**Exit check:** a DM can create and manage reusable local content, build an encounter from it, and reload without losing or overwriting unrelated records.

### Phase 2: Finish initiative and the normal combat loop

1. Keep PC initiative manual. Add creature `d20 + Dexterity modifier` rolls and one roll per initiative group, editable before combat begins.
2. Define deterministic behavior for tied initiatives and validate initiative input.
3. Complete combatant ordering, active-turn behavior, round rollover, defeated-combatant handling, and creature HP bounds in the pure combat engine.
4. Keep creature AC visible during combat, provide stat-block access, and keep PC HP/AC clearly marked as table-tracked.
5. Add focused tests for the transition rules and the complete prepare/start/run/reopen flow.

**Exit check:** a DM can start and run a conventional encounter with the correct initiative behavior and without editing PC HP/AC in the app.

### Phase 3: Track boss resources

1. Model creature resource definitions separately from per-encounter resource state.
2. Initialize encounter resource state from creature definitions.
3. Track spell slots, legendary actions, legendary resistances, and lair actions where defined.
4. Reset round-scoped resources at the correct round boundary and test spending, bounds, and reset behavior.

**Exit check:** boss resources remain encounter-specific, can be spent during combat, and reset only according to their defined timing.

### Phase 4: Support dynamic combat

1. Add creatures during an active encounter with quantity, initiative entry or roll, group assignment where applicable, stat-block access, and boss-resource initialization.
2. Preserve the active combatant and correct turn progression when insertion occurs before, at, or after the active position.
3. Add delay/resume initiative as a pure engine transition: retain original initiative, prevent acting before it, allow one re-entry per round after a selected combatant, and reset the delay state at round end.
4. Cover insertion, delay, resume, and round-boundary cases with engine tests before connecting UI controls.

**Exit check:** reinforcements and delayed combatants can be handled without corrupting the current turn or round.

### Phase 5: Import and cache SRD creatures

1. Define a provider boundary and implement the D&D 5e API adapter.
2. Normalize provider data into the app's creature vocabulary without losing supported stat-block information.
3. Cache imported SRD creatures locally and make cached content available offline.
4. Provide explicit loading, retry, network-error, and cache states; a failed fetch must not look like a successful import.
5. Add and verify required SRD/API attribution and licensing documentation; do not bundle non-SRD content.

**Exit check:** the DM can discover/import SRD creatures while online, reuse cached content offline, and distinguish network failures from successful imports.

### Phase 6: Release readiness and offline verification

1. Add PWA/app-shell caching so the application can start offline after it has been installed or visited online.
2. Verify local data access and cached SRD behavior across reloads and network loss/recovery.
3. Improve loading, empty, validation, and persistence-error states; keep errors visible rather than silently continuing as if changes were saved.
4. Test keyboard operation, accessible names/focus, and narrow mobile layouts; add browser smoke coverage for the core workflow.
5. Replace template README content with project setup, first-release scope, offline behavior, attribution, and verification commands.

**Release check:** offline startup and a complete prepare/run/reopen session work; core combat and persistence tests pass; SRD licensing/attribution is present.

### Deferred: generators, OCR, and remote services

- Encounter difficulty generation, including ruleset-specific thresholds, reskins, and suggestions.
- Encounter environment/map generation and attachment.
- OCR import and cloud OCR adapters.
- Dropbox/OneDrive or other remote sync, optional server endpoints, hosting, accounts, and multiplayer.

Revisit these after the local first release. Add adapter seams when they protect an agreed local-first boundary, but do not implement speculative remote services now.

## Project Organization

- `src/domain/` — shared domain types and validation.
- `src/combat/` — pure combat-engine transitions and tests.
- `src/data/` — Dexie persistence, import/export, and SRD provider/cache.
- Feature-oriented UI modules — party, creature, encounter, and combat-run workflows as the UI grows.
- `src/App.tsx` — application shell and composition, not the permanent home for every workflow.
- `GLOSSARY.md` — canonical domain vocabulary.
- `docs/specification.md` — broader requirements, including explicitly deferred capabilities.
- `docs/plan.md` — agreed first-release implementation sequence and deferred roadmap.

## Verification Strategy

1. Run the focused tests for each changed domain/data slice, then `npm test`, `npm run lint`, and `npm run build` at release milestones.
2. Test observable combat behavior through the pure engine: initiative, ties, turn progression, defeated combatants, HP bounds, boss-resource transitions, delay/resume, and dynamic insertion.
3. Test persistence behavior through IndexedDB: multiple records, reload, schema upgrades, backup round trips, invalid backups, and visible storage failures.
4. Test SRD normalization, cache reuse offline, and surfaced network failures without requiring live API calls in unit tests.
5. Add browser-level coverage for the complete prepare/start/run/reopen journey and offline app-shell behavior.
