# CLAUDE.md

Guide for AI assistants working on **invoicing-app** — a client-side multi-company invoicing and document generator.

## Project overview

- **Stack:** React 18, Vite 6, Lucide icons. No router, no state library, no CSS framework.
- **Architecture:** Almost everything lives in one file: `src/App.jsx` (~4,200 lines). Entry point is `src/main.jsx`.
- **Backend:** None. No HTTP API, no server. All data is persisted in the browser.
- **Deploy:** GitHub Pages at base path `/invoicing-app/` (see `vite.config.js`).

## Commands

```bash
npm install
npm run dev       # local dev server
npm run build     # production build → dist/
npm run preview   # preview production build
npm run deploy    # build + gh-pages deploy
```

Always run `npm run build` before finishing a change to confirm the app compiles.

## Repository layout

```
index.html          # shell page
vite.config.js      # base: /invoicing-app/
src/
  main.jsx          # React mount
  App.jsx           # entire app (logic, UI, CSS)
```

Do not add new dependencies unless the user explicitly asks. Prefer extending existing patterns in `App.jsx`.

## App.jsx map

The file is organized top-to-bottom:

| Section | Approx. lines | Contents |
|---------|---------------|----------|
| Constants | 18–91 | `STORE_KEY`, doc types, statuses, themes, presets |
| Helpers | 93–237 | `uid`, `money`, `dateFmt`, `renderTemplate`, sequencing |
| Document HTML | 309–1575 | `buildDocumentHTML`, built-in templates, seed logos |
| Seed data | 1578–1816 | `seedStore()` demo companies/clients/docs |
| Storage | 1818–2011 | `Store`, `FileStore`, normalize/backup/security helpers |
| UI primitives | 2013–2214 | `Field`, `Btn`, `Modal`, `Badge`, etc. |
| Views | 2216–3868 | `Dashboard`, `DocumentsList`, `DocumentEditor`, etc. |
| App shell | 3870–end | `App()` state, `persist()`, CRUD, navigation |
| Styles | ~3179 | `APP_CSS` inline string |

**Navigation** is view-state based (not URL routing). Views are keyed by Italian ids in `NAV`:

- `dashboard`, `documenti`, `aziende`, `clienti`, `listino`, `ricevute`, `impostazioni`

Document types use Italian internal keys (`fattura`, `ddt`, `nota_credito`, …) with English UI labels in `DOC_TYPES`.

## Data model

Root store shape (persisted under `STORE_KEY = 'fg_store_v7'`):

```js
{
  companies: [],   // issuer profiles + per-company theme
  clients: [],       // customers; attachments reference FileStore keys
  products: [],      // catalog / price list
  documents: [],     // invoices, DDTs, quotes, etc.
  incoming: [],      // inbox receipts (purchase docs)
  settings: { currency, defaultTemplate, defaultCompanyId, ... }
}
```

Binary attachments (PDFs, images) are **not** embedded in the main JSON blob. They are stored separately via `FileStore` under keys like `fg_file_<id>` (localStorage prefix `_f_`).

## Persistence rules

All mutations must go through `persist()` in `App()`:

1. Read current state from `storeRef.current` (not stale closure).
2. Apply updater function → `normalizeStore()`.
3. Update `storeRef.current` and React state.
4. `await Store.set(STORE_KEY, next)` and surface failures via `notify()`.

`Store.set` / `FileStore.set` return a boolean indicating whether disk persistence succeeded.

**Multi-tab sync:** a `storage` event listener reloads remote changes and shows a warning banner.

**On load:** missing or corrupt data falls back to `seedStore()`.

## Data integrity

When touching documents or deletes, respect existing guards:

- `findDuplicateDocNumber()` — block duplicate numbers per company.
- `applyAutoStatuses()` — invoices in `emessa`/`inviata` auto-move to `scaduta` when past `dueDate`.
- `companyDocCount()` / `clientDocCount()` — block delete when documents reference the entity.
- `purgeOrphanFiles()` — clean unreferenced FileStore keys after import/restore.
- Client/incoming delete must also `FileStore.del()` attachment keys.

## Backup format

- **Version:** `BACKUP_VERSION = 2`
- **Export:** `buildBackupBlob(store)` → JSON with `{ version, exportedAt, store, files }`
- **Import:** `restoreBackupPayload(data)` — supports v2 (store + files) and legacy v1 (flat store object)
- Settings UI triggers export/import in `SettingsView`

## Security

User-controlled HTML and uploads are attack surfaces. Always use:

- `sanitizeHTML()` — before rendering custom templates, `srcDoc`, or imported HTML
- `safeImageSrc()` — for logos and `<img src>` (allow `data:image/*` and `https?://` only)
- `validateUploadFile()` — size (`MAX_UPLOAD_BYTES`, 8 MB) and MIME allowlist

Never bypass these for convenience. Never inject raw user HTML into the DOM without sanitization.

## Document generation

- Built-in themes: `classico`, `moderno`, `minimale`, `elegante`
- Custom theme uses `renderTemplate()` (mustache-like tokens: `{{key}}`, `{{{raw}}}`, sections)
- `buildDocumentHTML(doc, company, client, settings)` produces print/PDF-ready HTML
- Print flow: `printHTML()` opens a window and calls `window.print()`

## UI conventions

- Inline CSS only (`APP_CSS` string). No separate stylesheet files.
- Reuse primitives: `Field`, `TextInput`, `Btn`, `Modal`, `EmptyState`, `Badge`
- Icons from `lucide-react`
- Locale: English UI labels; dates formatted `dd/mm/yyyy` via `dateFmt()`; currency via `Intl` (`en-GB`)
- Feedback: `notify(text, type)` → `AppNotice` banner (`warn` | `error`)

## Making changes

1. **Minimal scope** — match surrounding style. Do not split `App.jsx` into modules unless asked.
2. **Functional updaters** — always pass `(s) => ({ ...s, ... })` to `persist`, never mutate store in place.
3. **Async writes** — await `persist()` and `FileStore` operations in handlers that depend on save success.
4. **New fields** — extend `normalizeStore()` so imports and older backups stay safe.
5. **New file uploads** — store in `FileStore`, keep a `fileKey` reference in the store object, include key in `collectFileKeys()`.
6. **Dashboard metrics** — overdue (`scaduta`) documents must not double-count in "To collect" totals.

## Testing checklist

Manual checks worth running after substantive changes:

- [ ] `npm run build` passes
- [ ] Create/edit/save a document; reload page — data persists
- [ ] Duplicate document number blocked for same company
- [ ] Delete company/client with linked documents blocked
- [ ] Export backup → import in fresh session — store + attachments restore
- [ ] Custom HTML template renders; script tags stripped
- [ ] Two browser tabs: edit in one tab, other tab shows sync notice
- [ ] Company switch navigates to Documents with active company filter

## Git workflow

Feature branches use the pattern `cursor/<descriptive-name>-c5bd`. Commit, push with `git push -u origin <branch>`, and open/update a PR against `main`.
