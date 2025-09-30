# Repository Guidelines

## Project Structure & Module Organization
`index.html` bootstraps the single-page PWA and loads the bundled logic in `app.js`. The script keeps app state, view renderers, and event bindings inside an IIFE; group new helpers near the feature blocks they support and keep the `$`/`$$` selector pattern. Styling is layered: `styles.base.css` covers layout, `styles.theme.css` stores design tokens, and `styles.css` glues theme + base. Audio cues live in `assets/`; workout plans and exercise dictionaries stay under `data/`.

## Build, Test, and Development Commands
Serve the project through a static server so `fetch` can read JSON. Common options:
- `npx http-server . --port 5173 --cors` for an ad-hoc dev server.
- `npm install --global serve` then `serve .` when you prefer a globally installed tool.
Enable the PWA install prompt by visiting the served URL in Chrome or Edge.

## Coding Style & Naming Conventions
JavaScript uses 4-space indentation, modern `const`/`let`, and intentionally omits semicolons. Prefer camelCase for variables and functions, and prefix helper selectors with `$`. CSS sticks to 4-space indentation and custom properties; name new tokens with the `--sf-` prefix and keep component classes lowercase with hyphens. JSON keys remain snake_case to align with the shipped datasets.

## Exercise Media
Store exercise stills under `assets/exercises/` and reuse the exercise `id` for the filename, e.g. `WU_MARCH.webp`. Reference the main image with the `image` field in `data/exercises.json`, or list several variants in `images` to surface the gallery in-app. Keep files below ~200 KB, prefer 3:2 or square crops, and use WebP when possible so training views load quickly on mobile connections.

## Testing Guidelines
No automated suite exists yet. Before committing, run the dev server, walk through Home -> Training -> Stats -> Planner, and watch the console for warnings. When touching JSON, run `python -m json.tool data/plan.json` (and the exercises file you changed) to catch syntax errors. Attach UI screenshots to PRs that modify layouts or colors.

## Commit & Pull Request Guidelines
Commits should use short, imperative subjects such as `add rest timer toast`, with optional bodies explaining why. Keep diffs focused; stash unrelated experiments. Pull requests need a clear summary of user impact, manual test notes, any screenshots or recordings, and links to GitHub issues or Linear tickets. Flag localStorage key changes so reviewers can verify upgrade paths.
