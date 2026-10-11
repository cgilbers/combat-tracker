# D&D 5e SRD API

The [`5e-bits/5e-database` repository](https://github.com/5e-bits/5e-database) is archived. Its README directs API development to the active [`5e-bits/5e-srd-api` monorepo](https://github.com/5e-bits/5e-srd-api), which identifies `dnd5eapi.co` as the API's production host.

This app targets the 2014 ruleset (SRD 5.1), so its provider uses `https://www.dnd5eapi.co/api/2014`. The upstream [API README](https://github.com/5e-bits/5e-srd-api/blob/main/apps/api/README.md) documents the versioned `/api/2014` root and `/monsters` collection. Creature summaries are retrieved from `/monsters`; the full stat block is retrieved from `/monsters/{index}`. The endpoint was verified against the live [2014 monster catalog](https://www.dnd5eapi.co/api/2014/monsters) and [Goblin stat block](https://www.dnd5eapi.co/api/2014/monsters/goblin).

Use the versioned endpoint rather than relying on the unversioned `/api` redirect. Upstream currently supports the 2014 and 2024 SRD versions; keep this app pinned to 2014 until its ruleset scope changes.
