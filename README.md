# Level Up

My personal life planner and coach: school, money, gym and the side hustle in one place.
Offline-first PWA, all data stored on the device (IndexedDB). Dark mode first, ₪, Sunday–Saturday weeks.

Live at **https://cohenariel533-hue.github.io/level-up/** (every push to `main` deploys).

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

1. Push with GitHub Desktop (**Push origin**). GitHub Actions tests, builds and deploys it.
2. Open the live link in Safari → Share → **Add to Home Screen**.
3. Now and then: Settings → **Export backup** → save to Files / iCloud Drive. The data lives only on the phone.

## Connect Study Planner (exams, study hours, Claude's weekly plan)

Study Planner runs on the Mac (`~/Documents/Study Planner`, branch `levelup-feed`) and serves Level Up a
locked, read-only feed plus "Plan my week" (Claude Code on your subscription, no API key).

1. On the Mac: Study Planner → Settings → **האפליקציה באייפון** → **חיבור ל-Level Up** → create a key.
   Tailscale's secure (https) address must be on (section 3 of that page): Level Up is an https site.
2. In Level Up: More → Settings → **Study Planner** → paste the address and key → **Save and connect**.
3. More → **Weekly plan** → **Plan my week with Claude**.

## What's inside

| Screen | What it does |
|---|---|
| **Today** | Focus line, **3 daily moves from the coach**, weekly rings (Study, Gym, Hustle, Money check), exam mode, today's blocks, study plan and exams from Study Planner, + to add an expense |
| **Week** | Editable Sunday–Saturday template, real classes as locked blocks, export to Apple Calendar (.ics) |
| **Money** | Allowance + hustle income, 60/25/15 split, two-tap expenses, buckets, savings goals (₪1,500 buffer first), 48-hour list, Saturday money check |
| **Hustle** | Your path from zero (25 steps), orders board, start/stop timer, stats, 90-day goal |
| **Gym** | Build-muscle program for your days and setup, automatic progression, logger with last numbers, streak, bests |
| **Weekly plan** | Claude's plan for the week; its tasks feed the daily moves |
| **Review** | Saturday review: minimums, wins, obstacles, one goal per pillar, history |
| **My rhythm** | Your real day vs your goals, patterns, one 1% shift a week |
| **About me** | What the coach knows about you |

## Where things are

```
src/
  app/            Shell (tab bar / sidebar) and the nav items
  components/ui/  Liquid Glass kit: GlassCard, Button, ProgressRing, ProgressBar, Sheet, StepCard…
  styles/         tokens.css (colors, radii, blur) · glass.css (component styles) · global.css
  db/             schema.ts (tables + upgrades) · settings · seed · backup · one file per area
  lib/            pure logic, all tested: money, targets, gym, program, hustle, hustlePath,
                  coach (daily moves), rhythm (1% shifts), brain (Claude plan), studyFeed, ics, dates
  i18n/en.ts      All UI text, ready for a Hebrew version later
  features/       One folder per screen
tests/            Vitest tests (one file per lib area)
```

## Build stages

1. ✅ Shell, navigation, design system, local storage, JSON backup
2. ✅ Money
3. ✅ Today + Week (.ics export)
4. ✅ Side hustle
5. ✅ Gym
6. ~~YouTube~~ (dropped)
7. ✅ Weekly review

**2.0:** A ✅ Study Planner link · B ✅ About me + daily moves · C ✅ hustle path · D ✅ gym program ·
E ✅ My rhythm · F ✅ Claude weekly plan
