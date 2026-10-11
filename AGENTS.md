## Agent skills

### Issue tracker

GitHub Issues are used for this repo. See `docs/agents/issue-tracker.md`.

### Branching and pull requests

- Start work for each issue on a new branch based on `main`.
- Name the branch with the issue number first, followed by a short kebab-case description, for example `8-srd-creature-import-ui`.
- Do not commit issue work directly to `main`; push the issue branch and open a pull request targeting `main`.
- Commit feature work on its issue branch as part of delivering the feature. For documentation, agent-instruction, or maintenance-only requests, leave changes uncommitted unless the user explicitly asks for a commit.
- After a pull request is merged, delete its issue branch locally and from the remote.

### Triage labels

The default triage vocabulary is used: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: a root `GLOSSARY.md` and `docs/adr/` directory are used. See `docs/agents/domain.md`.

### UI implementation

- Use Tailwind CSS utilities for UI styling instead of adding component-specific CSS classes or rules.
- When UI elements such as buttons or containers are repeated, build reusable components in `src/components` and use them consistently.
