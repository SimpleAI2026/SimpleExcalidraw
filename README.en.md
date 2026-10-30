![中文文档](./README.md)  
![English Document](./README.en.md)

SimpleExcalidraw is a customized fork of [Excalidraw](https://github.com/excalidraw/excalidraw): Chinese handwriting fonts, multi-canvas, AI generation, Mermaid conversion, and draw replay animation.

## Features

- [x] Chinese handwriting (Zhushiti fallback stack)
- [x] Multi-canvas (in-app switch without full reload; delete/rename guards)
- [x] Field adapter scripts for multi-templates
- [x] More color choices
- [ ] Extra border styles
- [ ] Font picker UI (fonts/fallbacks are wired; picker not built)
- [x] Mobile UX polish (full-width AI modal, toolbar overflow, etc.)
- [x] AI generation (replace / insert / new canvas; cancellable; PDF/md/txt/csv into prompt)
- [x] Right-side SimpleChat panel (vendored; tool calls for canvas R/W)
- [x] Mermaid → Excalidraw (input sanitization, unique render id)
- [x] Drag segment midpoints on a selected polyline to keep bending
- [x] Draw replay animation (pause / cancel)
- [x] Readable custom modals in dark theme

See [`plan/`](./plan/README.md) for bugs and roadmap detail.

## Screenshots

![](./dev-docs/images/ScreenShot1.png)  
![](./dev-docs/images/ScreenShot2.png)

## AI assistant

### SimpleChat sidebar (preferred)

- Click the toolbar **AI** button (or the right-edge **Chat** tab) to open the panel; **Shift+click AI** still opens the legacy AI Modal.
- Configure `apiBaseUrl` / `apiKey` / `model` in the panel **⚙** (localStorage; per-canvas key `simpleexcalidraw-chat-<name>`).
- The host only injects **systemPrompt** (canvas name, selection summary, tool rules); Key/Model stay in Chat ⚙.
- Tools: `get_selection`, `get_scene_summary`, `insert_elements` (append-only; never silent full replace).
- On first open, migrates legacy `simpleexcalidraw_ai_settings` + session secret into Chat settings once.

### SimpleChat vendor (no npm portal)

- Build from sibling [SimpleChat](https://github.com/SimpleAI2026/SimpleChat): `yarn build:min` (copies to this vendor dir when sibling repos are present).
- Wrapper: `src/components/SimpleChatSidebar.tsx`; tools: `src/ai/simpleChatTools.ts`.

### Legacy AI Modal

1. **Shift+click** toolbar AI and set **API URL** and **model**; paste the **secret** in the panel (stored in tab `sessionStorage` only; cleared when the tab closes).
2. Results can **replace / insert into / create a new canvas**; empty results never wipe the scene.
3. You may upload `.md` / `.txt` / `.csv` / `.pdf` (≤ 2MB; prompt capped ~9000 chars with a truncation warning).
4. For production, prefer your own BFF—never bake secrets into frontend env. See [`api/README.md`](./api/README.md).

## Environment variables (optional defaults)

```bash
# Optional defaults only (bundled into the client — never put secrets here)
REACT_APP_AI_API=https://api.openai.com/v1/chat/completions
REACT_APP_AI_MODEL=gpt-4o-mini
```

> **Do not** set `REACT_APP_AI_SECRET`: CRA inlines it into browser JS. Enter the key in the AI panel, or inject it via a backend proxy.

## Live demo

https://excalidraw-phi-woad.vercel.app/

## Local installation

### Requirements

- [Node.js](https://nodejs.org/en/) (`.nvmrc` says 14; for day-to-day work Node ≥ 18 is fine)
- [Yarn Classic v1](https://yarnpkg.com/getting-started/install) (**not** Yarn Berry / 2+; this repo uses a v1 lockfile — see `.yarnrc`)
- [Git](https://git-scm.com/downloads)

If `yarn -v` shows 2.x+:

```bash
npm i -g yarn@1.22.22
# or: npx yarn@1.22.22
```

### Clone and start

```bash
git clone https://github.com/linkxzhou/SimpleExcalidraw.git
cd SimpleExcalidraw
yarn
yarn start   # same as yarn dev; http://localhost:3000
```

### Collaboration

For live collab, deploy a collab server: https://github.com/excalidraw/excalidraw-room

### Commands

| Command               | Purpose                   |
| --------------------- | ------------------------- |
| `yarn` / `yarn start` | Install / local dev       |
| `yarn build`          | Production build          |
| `yarn fix`            | Prettier + ESLint autofix |
| `yarn test`           | Run tests                 |
| `yarn test:update`    | Update snapshots          |
| `yarn test:code`      | ESLint only               |

### Docker Compose

```sh
docker-compose up --build -d
```

## Animation (brief)

Code lives under `src/animate/`: export the scene to SVG, allocate duration by path length, replay with WAAPI (`stroke-dashoffset`, etc.). Supports play / pause / cancel / loop. Entry: `AnimateApp.tsx` (Modal); core: `animate.ts`.

## Project sources

1. https://github.com/korbinzhao/excalidraw-cn
2. https://github.com/excalidraw/excalidraw
3. https://github.com/dai-shi/excalidraw-animate
4. https://github.com/sindrel/excalidraw-converter
