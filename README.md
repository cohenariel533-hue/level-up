# Level Up

My personal life planner: school blocks, money, gym and the side hustle.
Offline-first PWA, all data stored on the device (IndexedDB). Dark mode first, ₪, Sunday–Saturday weeks.

## Run it

Node.js lives in `~/.local/node`. If `npm` isn't found, run this first in each Terminal window
(or add the line to `~/.zshrc` to make it permanent):

```bash
export PATH="$HOME/.local/node/bin:$PATH"
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server at http://localhost:5173 |
| `npm run dev:phone` | Same, reachable from an iPhone on the same Wi-Fi (no offline/install there: that needs HTTPS) |
| `npm test` | Run the tests |
| `npm run build` | Production build into `dist/` |
| `npm run icons` | Regenerate the app icons from `scripts/make-icons.mjs` |

## Put it on the iPhone

1. Push this repo to GitHub (public or private).
2. On GitHub: Settings → Pages → Source: **GitHub Actions**.
3. Every push to `main` deploys to `https://<username>.github.io/<repo-name>/`.
4. Open that link in Safari → Share → **Add to Home Screen**.

## Where things are

```
src/
  app/            Shell (tab bar / sidebar) and the nav items
  components/ui/  Liquid Glass kit: GlassCard, Button, ProgressRing, ProgressBar, Sheet, Toggle…
  styles/         tokens.css (colors, radii, blur) · glass.css (component styles) · global.css
  db/             schema.ts (tables) · settings.ts · seed.ts (first-run data) · backup.ts (JSON export/import)
  lib/            dates (Sun–Sat weeks) · format (₪) · saveFile (share sheet / download)
  i18n/en.ts      All UI text, ready for a Hebrew version later
  features/       One folder per screen
tests/            Vitest tests
```

## Build stages

1. ✅ Shell, navigation, design system, local storage, JSON backup
2. Money
3. Today + Week (.ics export)
4. Side hustle
5. Gym
6. ~~YouTube~~ (dropped)
7. Weekly review
