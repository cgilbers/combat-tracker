# Combat Tracker Web App – Software Design & Architecture

## 1. Project Overview

A browser-based, offline-capable combat tracker for **D&D 5e**, focused on **Dungeon Masters**:

- **Frontend:** React  
- **Backend:** Node.js  
- **Storage:** Local-first with sync to Dropbox/OneDrive, future deploy to server
- **Scope:** No user accounts, personal use, open source  
- **Key domains:** Parties, creatures, encounters, initiative, HP/AC, rounds, boss resources, SRD integration, OCR import, encounter generation, environment/map suggestions, dynamic initiative, mid‑encounter creature addition

---

## 2. Functional Requirements

### 2.1 Core Entities

#### Adventuring Party
- Create/edit/delete parties  
- Add/remove player characters (PCs) with:
  - Name  
  - Initiative modifier  
  - Max HP (optional)  
  - Notes (class, level, etc.)

#### Creatures
- Create/edit/delete custom creatures  
- Fields aligned with SRD stat blocks:
  - Name, type, size, alignment  
  - AC, HP (formula + average), speed  
  - Ability scores  
  - Saving throws, skills  
  - Senses, languages  
  - Challenge rating, XP  
  - Traits, actions, reactions, legendary actions  
  - Lair actions  
  - Spellcasting (including spell slots)  
- Tagging/grouping (e.g., goblin, boss, undead)

---

### 2.2 SRD Integration

#### Requirements
- Import SRD creatures so users don’t need to create base monsters manually.

#### Recommendation
Use **D&D 5e API** (`https://www.dnd5eapi.co/api`) as the primary SRD source.

#### Approach
- On first run or on demand:
  - Fetch SRD monsters
  - Cache locally as JSON
- Future:
  - Pluggable SRD providers (local JSON, other APIs)

#### Licensing
- Include SRD/OGL/CC-BY attribution in the repo  
- Avoid bundling non-SRD content

---

### 2.3 OCR Import (Photo of Stat Block)

#### Workflow
1. User uploads/takes photo  
2. Advanced OCR extracts text  
3. Parsing layer maps text to creature fields  
4. User reviews and edits before saving

#### Implementation Options
- **Offline:** Tesseract.js (browser)  
- **Cloud:** Azure Cognitive Services / Google Vision (via Node backend)

#### Recommendation
Start with **Tesseract.js** for offline capability.  
Design an OCR adapter so cloud OCR can be added later without frontend changes.

---

### 2.4 Combat Encounters

#### Create Encounter
- Select party  
- Add creatures (with quantity)  
- Predefine initiative groups  
- Save encounter

#### Initiative Handling
- PCs: manual entry  
- Creatures: auto-roll (`d20 + Dex mod`)  
- Group initiative:
  - Roll once per group  
  - Editable before rolling  

#### During Combat
- Track initiative  
- Track HP  
- Show AC  
- Track rounds  
- View stat blocks  
- Boss resources:
  - Spell slots  
  - Legendary actions  
  - Legendary resistances  
  - Lair actions  

---

### 2.5 Encounter Difficulty Generator

A system that automatically generates combat encounters of a chosen difficulty (Easy, Medium, Hard, Deadly) based on the selected party.

#### Inputs
- Party  
- Difficulty  
- Creature source options:
  - Local only  
  - SRD only  
  - Both  
  - Include homebrew/reskins  
- Optional filters:
  - Creature type  
  - Environment  
  - CR range  
  - Max creature types  

#### Outputs
- One or more encounter suggestions  
- Total XP + adjusted XP  
- Difficulty classification  
- Editable before saving  

#### Difficulty Logic
Uses official 5e XP thresholds and multipliers.

#### Reskin Support
- Name overrides  
- HP/AC/damage/speed modifiers  
- Cosmetic tags  
- Variant abilities  
- Elite/minion templates  

---

### 2.6 Encounter Environment & Map Layout Generator

A system that generates **map layout suggestions**, **terrain features**, **hazards**, **interactive elements**, and **dynamic events** to enrich encounters.

Works for:

- Newly generated encounters  
- Existing encounters  

#### Inputs
- Party  
- Creatures  
- Optional:
  - Environment type  
  - Encounter theme  
  - Map size  
  - Complexity  

#### Outputs
A structured **Encounter Environment Package**:

- Map layout template  
- Terrain zones  
- Obstacles  
- Hazards  
- Interactive elements  
- Dynamic events  
- Narrative hook  
- Creature synergy notes  

#### Map Templates
- Arena  
- Gauntlet  
- Lair  
- Multi-level  
- Ambush site  
- Ritual space  

#### Terrain Features
- Difficult terrain  
- Elevation  
- Water/mud/ice/sand  
- Cover  
- LOS blockers  

#### Hazards
- Falling rocks  
- Collapsing floors  
- Arcane surges  
- Fire vents  
- Slippery ice  

#### Interactive Elements
- Levers  
- Crystals  
- Altars  
- Ritual circles  
- Breakable bridges  

#### Dynamic Events
- Reinforcements  
- Terrain shifts  
- Magical pulses  
- Hazard activation  

---

### 2.7 Dynamic Initiative (Delay/Resume)

Supports homebrew rule similar to Pathfinder’s **delay initiative**.

#### Requirements
Combatants can:

- **Delay their turn**
  - Removed from active initiative order  
  - Marked as “delayed”  

- **Resume their turn**
  - Choose a combatant to act after  
  - Inserted into initiative order  
  - Initiative value updated to match new position  

Rules:
- Cannot act before original initiative  
- Can only re-enter once per round  
- Reset delay state at round end  

---

### 2.8 Mid‑Encounter Creature Addition

DM can add creatures during combat for:

- Summoning spells  
- Reinforcements  
- Lair actions  
- Environmental events  

#### Requirements
- Select creature (local/SRD/homebrew)  
- Choose quantity  
- Auto-roll initiative or manual entry  
- Optionally add to existing group  
- Insert into initiative order  
- Full stat block access  
- Boss resource initialization  

---

### 2.9 Data Persistence & Sync

#### Local Storage (default)
Use **IndexedDB** via **Dexie.js** for:
- Parties  
- Creatures  
- Encounters  
- Generated environments  
- Settings  

#### Sync (future)
- Sync adapter interface  
- Implementations:
  - Dropbox  
  - OneDrive  
- Strategy:
  - Export/import JSON  
  - Optional cloud backup

---

### 2.10 Non-Functional Requirements

- Offline-capable PWA  
- Fast and responsive  
- Polished UI (dark mode, thematic, mobile-friendly)  
- Open source (MIT or Apache-2.0 + SRD license)  
- Extensible architecture  

---

## 3. High-Level Architecture

### 3.1 Structure

#### Client (React)
- SPA with routing  
- State management (Redux Toolkit, Zustand, or React Query)  
- PWA support  
- IndexedDB repositories

#### Server (Node.js)
- Optional for local use  
- Useful for:
  - OCR cloud calls  
  - SRD proxy  
  - Sync endpoints

---

### 3.2 Layers

#### Domain Layer
Shared TypeScript interfaces:
- Party  
- Character  
- Creature  
- Encounter  
- Combatant  
- BossResources  
- GeneratedEncounter  
- EncounterEnvironment  

#### Data Access Layer
- IndexedDB repositories  
- SRD service with pluggable providers  

#### OCR Adapter
- `OcrService` interface  
- Implementations:
  - `TesseractOcrService`  
  - `CloudOcrService`  

#### Encounter Generator
- Party strength calculator  
- Creature pool builder  
- XP calculator  
- Reskin engine  
- Combination engine  

#### Environment Generator
- Template engine  
- Terrain/obstacle/hazard libraries  
- Synergy logic  
- Dynamic event generator  

#### Combat Engine
Pure functions for:
- Initiative  
- Delay/resume initiative  
- Round progression  
- Turn order  
- HP updates  
- Boss resource tracking  
- Mid‑encounter creature addition  

---

## 4. Data Model

### 4.1 Party & Characters

```ts
type Character = {
  id: string;
  name: string;
  initiativeModifier: number;
  maxHp?: number;
  notes?: string;
};

type Party = {
  id: string;
  name: string;
  members: Character[];
  createdAt: string;
  updatedAt: string;
};
```

### 4.2 Creatures

```ts
type AbilityScores = {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
};

type CreatureAction = {
  name: string;
  description: string;
};

type BossResources = {
  spellSlots?: Record<number, { max: number; used: number }>;
  legendaryActions?: { max: number; used: number };
  legendaryResistances?: { max: number; used: number };
  hasLairActions?: boolean;
};

type Creature = {
  id: string;
  source: 'custom' | 'srd' | 'ocr';
  name: string;
  type?: string;
  size?: string;
  alignment?: string;
  ac: number;
  hpAverage: number;
  hpFormula?: string;
  speed: string;
  abilities: AbilityScores;
  savingThrows?: Record<string, number>;
  skills?: Record<string, number>;
  senses?: string;
  languages?: string;
  challengeRating?: number;
  traits?: CreatureAction[];
  actions?: CreatureAction[];
  reactions?: CreatureAction[];
  legendaryActions?: CreatureAction[];
  bossResources?: BossResources;
  tags?: string[];
  rawText?: string;
};
```

### 4.3 Encounter & Combatants

```ts
type CombatantType = 'pc' | 'creature';

type InitiativeGroup = {
  id: string;
  name: string;
  combatantIds: string[];
};

type CombatantState = {
  id: string;
  type: CombatantType;
  refId: string;
  name: string;
  initiative: number;
  originalInitiative?: number;
  isDelayed?: boolean;
  currentHp: number;
  maxHp?: number;
  ac?: number;
  bossResourcesState?: BossResources;
};

type Encounter = {
  id: string;
  name: string;
  partyId?: string;
  combatants: CombatantState[];
  initiativeGroups: InitiativeGroup[];
  delayedCombatants?: string[];
  round: number;
  currentTurnIndex: number;
  environment?: EncounterEnvironment;
  createdAt: string;
  updatedAt: string;
};
```

### 4.4 Encounter Generator

```ts
type ReskinMetadata = {
  nameOverride?: string;
  hpModifier?: number;
  acModifier?: number;
  damageModifier?: number;
  speedModifier?: number;
  tags?: string[];
};

type GeneratedEncounter = {
  id: string;
  baseEncounter: Encounter;
  reskins?: Record<string, ReskinMetadata>;
};
```

### 4.5 Environment Generator

```ts
type TerrainZone = {
  type: string;
  description: string;
};

type Obstacle = {
  type: string;
  position?: string;
  description: string;
};

type Hazard = {
  type: string;
  trigger: string;
  effect: string;
};

type InteractiveElement = {
  type: string;
  usage: string;
  effect: string;
};

type DynamicEvent = {
  round: number;
  description: string;
};

type MapLayout = {
  template: string;
  zones: TerrainZone[];
  obstacles: Obstacle[];
  hazards: Hazard[];
  interactives: InteractiveElement[];
  dynamicEvents?: DynamicEvent[];
  narrativeHook?: string;
};

type EncounterEnvironment = {
  id: string;
  encounterId: string;
  mapLayout: MapLayout;
  createdAt: string;
};
```

---

## 5. Component Architecture (Frontend)

### 5.1 Pages
- Dashboard  
- Parties  
- Creatures  
- Creature detail/editor  
- OCR import wizard  
- Encounter builder  
- Encounter generator  
- Environment generator  
- Encounter run view  

### 5.2 Components
- InitiativeTracker  
- RoundCounter  
- HpTracker  
- BossResourcePanel  
- StatBlockModal  
- CreatureSelector  
- PartySelector  
- EncounterGeneratorPanel  
- EnvironmentGeneratorPanel  
- DelayInitiativeModal  
- AddCreatureModal  

---

## 6. API Design (Optional Node Backend)

### Suggested Endpoints
- `GET /api/srd/monsters`  
- `GET /api/srd/monsters/:id`  
- `POST /api/ocr/statblock`  
- `GET /api/version`  

---

## 7. Initiative & Combat Logic

### 7.1 Initiative Rolling
- PCs: manual  
- Creatures: auto-roll  
- Groups: one roll per group  

### 7.2 Delayed Initiative
- Remove combatant from active order  
- Mark as delayed  
- Resume after chosen combatant  
- Update initiative value  
- Reset at round end  

### 7.3 Mid‑Encounter Creature Addition
- Add creature(s)  
- Roll initiative  
- Insert into order  
- Initialize boss resources  

### 7.4 Turn Order & Rounds
- Sort by initiative  
- Track current turn index  
- Increment round when wrapping  

### 7.5 Boss Resources
- Copy creature resources into combat state  
- Reset legendary actions each round  
- Track spell slots, resistances, lair actions  

---

## 8. Build & Deployment Plan

### 8.1 Tech Stack
- React + TypeScript  
- React Router  
- Redux Toolkit or Zustand  
- Dexie.js  
- Node.js + Express (optional)

### 8.2 Development Phases
1. Core local app  
2. Boss features  
3. OCR import  
4. Encounter generator  
5. Environment generator  
6. Dynamic initiative & mid‑encounter additions  
7. Sync & hosting  
8. Polish & open source  

---

## 9. Testing Strategy

- Unit tests:
  - Combat engine  
  - OCR parsing  
  - Encounter generator  
  - Environment generator  
  - Delay/resume initiative  
  - Mid‑encounter creature addition  
- Integration tests:
  - SRD import  
  - Encounter creation  
  - Environment attachment  
  - Dynamic combat updates  
- UI tests (Cypress/Playwright)  
- Manual DM testing  