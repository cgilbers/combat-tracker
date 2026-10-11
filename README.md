# Combat Tracker

Combat Tracker is a local-first D&D 5e encounter manager for Dungeon Masters. It stores parties, creatures, and active encounters in IndexedDB so the app stays useful offline while still letting the DM import and reuse SRD content when online.

## Local app workflow

- Create and manage adventuring parties and player characters.
- Save, edit, and reuse custom creature stat blocks.
- Start and run encounters with initiative order and HP tracking.
- Import SRD creature data when connected and keep the cache for later offline use.

## SRD data and attribution

The app uses the public D&D 5e API as its SRD provider and normalizes the returned creature data into the app's local creature model.

- Source: https://www.dnd5eapi.co/api
- Content is limited to the System Reference Document (SRD), to avoid bundling non-SRD content.
- Imported SRD creatures are stored locally and marked with the `source: 'srd'` value so they are distinguishable from custom creatures.
- The project maintains the required SRD/Open Gaming License attribution in this repository and does not ship or bundle copyrighted non-SRD creature content.

## Development

```bash
npm install
npm test -- --run
npm run build
```
