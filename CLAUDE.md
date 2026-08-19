# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Corta — a small internal URL shortener (Spanish variable/comment names throughout). Express server backed by a JSON file instead of a database.

## Commands

- Run the server: `npm start` (runs `node server.js`, listens on port 3000)
- No lint or test-runner config exists. `test.js` is a manual smoke-test script, not a test suite: start the server first, then run `node test.js` separately — it POSTs a link and GETs the redirect, printing results to the console rather than asserting.

## Architecture

- **Storage**: `links.json` at the repo root is the entire database. `server.js` reads the whole file synchronously (`fs.readFileSync`/`writeFileSync`) on every request — there is no locking, so concurrent writes can race and overwrite each other.
- **Routes** (in `server.js`): `POST /api/links` creates a short link (`{ codigo, url, clicks, creado }`, code from `utils.js`); `GET /:codigo` looks up the code, increments `clicks`, and responds with the raw destination URL (it does not issue an HTTP redirect — the client is expected to navigate itself).
- **Code generation**: `utils.js` produces 3-character codes from `[a-z0-9]` with no collision check against existing entries in `links.json`.
- **Duplicate/legacy entry points** — only `server.js` is wired up via `package.json`'s `main`/`start`; the other two are not used by any script but remain in the repo:
  - `index_v2_FINAL.js` — near-duplicate of `server.js` missing the `creado` timestamp and the "missing url" validation.
  - `server_OLD.js` — explicitly commented "VERSION VIEJA - no usar"; different route shape (`POST /acortar`) and no input/not-found handling.
  When changing shortener behavior, confirm which file is actually meant to change — `server.js` is canonical unless told otherwise.
- **Frontend**: static files served from `public/` via `express.static`. `stats.html` is markup-only with no backing endpoint yet — there is no `GET /api/links/:codigo/stats` route in `server.js`.
- **Repo hygiene**: there is no `.gitignore`; `node_modules/` and `notas.txt` are committed. `notas.txt` currently contains a plaintext database credential — treat it as sensitive and avoid propagating it further (e.g. don't echo it into new files/commits).

## Team automation

- Remotes: `origin` is the individual repo (`KLeichen/Corta_Test`); `grupal` is the shared team repo (`lucasmonteverdi1/corta`). Team work happens on branch `Corta_Kevin`, tracking `grupal/Corta_Kevin` — `main` stays pointed at `origin`.
- Skill `reporte-cambios` (`.claude/skills/reporte-cambios/SKILL.md`): updates the local repo from its remote and writes a report of new commits (author, files touched) to `reportes/` (gitignored, not committed). Built to run unattended from a scheduled cron job — if there are uncommitted changes or the branch has diverged, it stops and reports instead of forcing anything (no stash/reset/merge).
