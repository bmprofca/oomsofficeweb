# AI assistant UI

> **Purpose:** Read this when changing the Ask AI header button, the assistant drawer, the `/ai-assistant` page or the chat block renderers. Server details are in [`SERVER/context/ai-assistant.md`](../../SERVER/context/ai-assistant.md).

## Entry points

| Where | File |
|-------|------|
| Branch admin setup: assistant switch, **AI connections** (several keys, same or mixed providers, max 10), drag or arrow priority (failover order), per-connection on/off, test, edit, delete, health badges, usage limits | [`pages/settings/ai-assistant-setting.jsx`](../src/pages/settings/ai-assistant-setting.jsx) at `/settings/ai-assistant`. Parts in [`components/ai/settings/`](../src/components/ai/settings/): `AiConnectionList` (dnd-kit), `AiConnectionDialog` (add/edit), `AiSettingsModal` (modal shell per `modal.md`), `aiProviderMeta` (badges, status wording, Primary/Backup roles). Card in `pages/settings.jsx` (`adminOnly`) |
| Claude connector (MCP): create secret connector URLs (shown once, copy + Claude setup steps), member whose access it uses, on/off, regenerate, delete; warns when the server isn't publicly reachable | [`components/ai/settings/AiMcpConnectorsCard.jsx`](../src/components/ai/settings/AiMcpConnectorsCard.jsx), on the AI Assistant settings page |
| Read-write mode: **Assistant access** (Read-only by default / Read & write) on the settings page, with confirmation dialog [`AiWriteModeDialog`](../src/components/ai/settings/AiWriteModeDialog.jsx) (also used per connector). Chat confirmation card [`blocks/AiActionBlock.jsx`](../src/components/ai/blocks/AiActionBlock.jsx): Confirm & send / Cancel, then shows Sent / Partly sent / Not sent / Cancelled / Expired | `pages/settings/ai-assistant-setting.jsx`, `components/ai/settings/AiMcpConnectorsCard.jsx` |
| Header **Ask AI** button (every page; hidden on `/ai-assistant`) | [`components/ai/AiHeaderButton.jsx`](../src/components/ai/AiHeaderButton.jsx), mounted in `components/header.js` before `HeaderNotifications` |
| Right drawer (portal, Esc / backdrop closes, "open full page") | [`components/ai/AiAssistantDrawer.jsx`](../src/components/ai/AiAssistantDrawer.jsx) |
| Full page with history list, delete and `?c=<conversation_id>` | [`pages/ai-assistant.jsx`](../src/pages/ai-assistant.jsx) (route in `src/index.js`, lazy import in `app/lazyRoutes.js`) |
| Shared chat UI (messages, suggestions, input, retry, stop) | [`components/ai/AiChatPanel.jsx`](../src/components/ai/AiChatPanel.jsx) |
| State and streaming | [`components/ai/useAiChat.js`](../src/components/ai/useAiChat.js), [`utils/ai-api.js`](../src/utils/ai-api.js) |

**Availability is per branch, with no env flag.** [`useAiStatus`](../src/components/ai/useAiStatus.js) calls `GET /ai/status`, cached for 60 s per user and branch. It refreshes on the `ooms:ai-settings-updated` window event, which `saveAiSettings()` fires. The header button only renders when `enabled` is true. The `/ai-assistant` page shows a "Set up AI Assistant" link to admins (`can_manage`) and a note to everyone else.

## Behaviour

- **Streaming:** `POST /ai/chat` uses `fetch` and reads the SSE stream (`meta → status* → block* → text → done`). 401 and subscription 403 responses still go through the global fetch wrapper in `src/index.js`.
- **Active conversation:** kept in `sessionStorage` under `ooms_ai_active:<user>:<branch>`, so a branch switch never resumes another branch's chat. The drawer re-syncs every time it opens, because each page mounts its own Header.
- **Duplicate sends:** blocked while an answer is in progress. The **Stop** button aborts the request.
- **Errors:** show inline with **Retry** when the error is retryable. Admin-fixable codes and `AI_SAFETY_PAUSED` have no Retry (`NOT_RETRYABLE` in `ai-api.js`).
- **Safety:** questions the server's safety guard blocks come back as a normal reply with status `refusal`.
- **Suggested prompts:** filtered with `useUserPermissions().check`. This is cosmetic only; the server enforces permissions.

## Block contract (from server `ai/blocks.js`)

```js
{ type: "table", title, columns: [{ key, label, type, href? }], rows, total, truncated, note? }
{ type: "kpi", title?, items: [{ label, value, format }] }
{ type: "chart", title, kind: "bar" | "line" | "pie", xKey, series: [{ key, label }], data }
{ type: "clarification", question, options: [string] }
{ type: "action", action_id, action_type, title, fields: [{ label, value }], body?, items?, expires_minutes, state? }   // read-write mode; state added when a conversation is reopened
// type / format: "text" | "number" | "money" | "date" | "status"
```

- [`BlockRenderer.jsx`](../src/components/ai/blocks/BlockRenderer.jsx) validates each block's shape. Unknown block types render nothing.
- `href` is a relative template such as `/task/{task_id}` or `/client/profile/{username}`. [`format.js`](../src/components/ai/blocks/format.js) `buildHref` only accepts paths starting with `/`, not `//`, and URL-encodes the values.
- **Tables** page on the client (10 rows by default, using `TablePagination`) and offer a **CSV** download. Cells starting with `= + - @` get a leading `'` so spreadsheets don't run them as formulas.
- **Charts** use recharts with brand colours.
- **Model text** goes through [`AiMarkdown.jsx`](../src/components/ai/blocks/AiMarkdown.jsx), a small renderer that builds React elements. It never uses `dangerouslySetInnerHTML`, so HTML in replies shows as text, and links must be http(s).

## Tests

`CI=true npx react-scripts test --watchAll=false src/components/ai src/pages/settings`

The `package.json` `jest.moduleNameMapper` entries map `react-router`, `react-router-dom` and `react-router/dom` to their CJS builds, because CRA's Jest 27 can't read react-router v7's `exports`. `src/setupTests.js` polyfills `TextEncoder`.
