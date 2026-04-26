# FartMaths

FartMaths is an iPad-first React + TypeScript + Vite PWA for two children sharing one device: Ély and Ira.

It is designed around strand-based K-2 progression instead of grade buckets, with offline-friendly local persistence, browser text-to-speech read-aloud, placement by strand, and strict mastery rules that ignore hinted, second-try, and suspiciously fast answers for promotion.

## What is included

- Two built-in profiles: `Ély` and `Ira`
- Accent-insensitive quick entry (`Ely`, `Ély`, `IRA`, `ira`)
- Five preset silly cartoon avatars
- Strand-based curriculum ladder across 13 math strands
- Placement flow by strand
- Daily practice flow with `5`, `8`, and `10` minute plans
- Example, Practice, and Mastery/Checkpoint modes
- Rewards screen and progress screen
- Parent dashboard with resets, session length, TTS toggle, and audio speed control
- Local offline persistence with a service worker and manifest

## Folder structure

```text
FartMaths/
├── index.html
├── package.json
├── public/
│   ├── apple-touch-icon.png
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── manifest.webmanifest
│   └── sw.js
├── src/
│   ├── app/
│   │   └── App.tsx
│   ├── data/
│   │   ├── catalog.ts
│   │   └── rules.ts
│   ├── engine/
│   │   ├── progression.ts
│   │   └── questions.ts
│   ├── hooks/
│   │   └── useSpeech.ts
│   ├── lib/
│   │   └── storage.ts
│   ├── main.tsx
│   ├── styles.css
│   └── types.ts
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## Architecture summary

### 1. App shell and navigation

The app uses a simple single-app-shell React flow instead of a complex router so it stays robust in iPad Safari standalone mode. Screens switch between:

- Home
- Child dashboard
- Placement
- Daily practice
- Rewards
- Progress
- Parent dashboard

### 2. Curriculum and progression

The curriculum is encoded as a reusable strand model in `src/data/catalog.ts`.

- 13 strands
- 10 cross-grade levels per strand
- one reusable skill definition per strand level
- one reusable question engine that generates fresh prompts per strand and mode

Progression rules live in `src/engine/progression.ts`.

- guided practice before scored items
- last-20 scored window for mastery
- 19/20 first-try correct threshold
- max 2 suspiciously fast answers in the window
- 5-question checkpoint with 4/5 pass rule
- rescue mode for fast guessing
- review mix after level-up

### 3. Local persistence

All data is stored locally in `localStorage`.

- profile settings
- avatar choice
- strand progress
- micro-skill progress
- recent sessions
- reward unlocks

No backend and no login system are required.

### 4. Offline/PWA

- `manifest.webmanifest` enables installability
- `public/sw.js` caches the shell and runtime assets
- core app data lives locally, so progress survives refreshes and relaunches

### 5. TTS

`src/hooks/useSpeech.ts` wraps `speechSynthesis` / `SpeechSynthesisUtterance` and tries to pick a pleasant local voice when available.

## Run locally

Use the bundled Node toolchain in this workspace or your normal Node install.

### normal Node on your machine

```bash
npm install
npm run dev
```

Then open the local Vite URL in Safari on the iPad or desktop browser.

## Build for production

```bash
npm run build
```

Production files are written to `dist/`.

To preview the production build:

```bash
npm run preview
```

## Deploy

This app is a static site.

You can deploy `dist/` to any static host that serves HTTPS, for example:

- Netlify
- Vercel
- Cloudflare Pages
- GitHub Pages
- any static file server on a LAN

Important deployment notes:

- serve over HTTPS for the best PWA behavior
- keep `/manifest.webmanifest` and `/sw.js` at the site root
- open the site in Safari on iPad and use `Share -> Add to Home Screen`

## Notes for v1

- TTS is included
- speech recognition is intentionally not included
- local storage is used instead of IndexedDB to keep restore behavior simple and robust on iPad
