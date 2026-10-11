# Combat Tracker

Combat Tracker is a local-first D&D 5e encounter manager for Dungeon Masters. It stores parties, creatures, and active encounters in IndexedDB so the app stays useful offline while still letting the DM import and reuse SRD content when online.

## Local app workflow

- Create and manage adventuring parties and player characters.
- Save, edit, and reuse custom creature stat blocks.
- Start and run encounters with initiative order and HP tracking.
- Import SRD creature data when connected and keep the cache for later offline use.

## SRD data and attribution

The app uses the public D&D 5e API as its SRD provider and normalizes the returned creature data into the app's local creature model.

- API endpoint: https://www.dnd5eapi.co/api/2014
- Active API repository: https://github.com/5e-bits/5e-srd-api
- Content is limited to the System Reference Document (SRD), to avoid bundling non-SRD content.
- Imported SRD creatures are stored locally and marked with the `source: 'srd'` value so they are distinguishable from custom creatures.

This work includes material taken from the [System Reference Document 5.1 (SRD 5.1)](https://dnd.wizards.com/resources/systems-reference-document) by Wizards of the Coast LLC. The SRD 5.1 is licensed under the [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/). Creature data is retrieved from the [D&D 5e API](https://www.dnd5eapi.co/).

## Development

### Branching and pull requests

- Start each issue on a new branch based on `main`.
- Name the branch with the issue number first, followed by a short kebab-case description, for example `8-srd-creature-import-ui`.
- Do not commit issue work directly to `main`; push the issue branch and open a pull request targeting `main`.

### Checks

```bash
npm install
npm test -- --run
npm run build
```
