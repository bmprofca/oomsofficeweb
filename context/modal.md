Modal Pattern Context

Goal
- Keep modal fully visible inside the viewport.
- Keep header and footer fixed within the modal.
- Allow only the body/content area to scroll.
- Hide scrollbar indicator while preserving scroll behavior.

Viewport-safe wrapper
- Root: `fixed inset-0 flex items-start justify-center p-3 sm:p-4 z-50 overflow-hidden overscroll-none` — **`overflow-hidden` on this layer** prevents the viewport layer from scrolling, so centered dialogs do not drift when wheel/touch scrolling is aggressive.
- Use `pointer-events-none` on the root and **`pointer-events-auto`** on (1) a full **`absolute inset-0`** backdrop and (2) the dialog panel with **`relative z-[1]`**, so backdrop still receives outside clicks.
- Align modal near top for small screens: `items-start` (bank forms); centered dialogs may use `items-center`.
- Avoid `min-h-screen` / inner scroll wrappers that move the dialog (can cause subtle vertical shift).
- Prefer fade-only modal transition (avoid `scale` / `y` translate for stable position).

Example root + backdrop + panel:
- Root: `fixed inset-0 z-50 flex items-start justify-center overflow-hidden overscroll-none p-3 sm:p-4 pointer-events-none`
- Backdrop: `absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto` (click to close)
- Panel: `relative z-[1] pointer-events-auto ... max-h-[min(calc(100vh-…),100dvh)] overflow-hidden flex flex-col`

Modal container
- Use flex column layout: `flex flex-col`
- Clip internal overflow: `overflow-hidden`
- Constrain height by viewport minus margins:
  - `max-h-[calc(100vh-1.5rem)]`
  - `sm:max-h-[calc(100vh-2rem)]`
- Add vertical margin so edges never touch screen:
  - `my-2 sm:my-4`

Example container:
`className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-2 sm:my-4 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"`

Compact header and footer
- Header: reduce padding (`px-5 py-3.5`) and keep non-shrinking (`shrink-0`)
- Footer: reduce padding (`px-5 py-3`) and keep non-shrinking (`shrink-0`)

Scrollable body only
- Body must be flex-grow region: `flex-1 min-h-0 overflow-y-auto overscroll-y-contain` — **`min-h-0`** lets flex children shrink so inner scroll works; **`overscroll-y-contain`** reduces scroll chaining that can jiggle the page behind the modal.
- Keep internal spacing compact: `px-5 py-4`
- Hide scroll indicators:
  - Tailwind arbitrary utilities:
    - `[scrollbar-width:none]`
    - `[-ms-overflow-style:none]`
    - `[&::-webkit-scrollbar]:hidden`
  - Inline fallback:
    - `style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}`

Example body:
`className="px-5 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"`

Implementation checklist
- Root overlay uses `overflow-hidden` (not `overflow-y-auto`) unless you intentionally scroll the full-screen layer.
- Avoid setting `document.body.style.overflow` from every modal unless centralized: multiple modals + sidebar each toggling `overflow` often leaves the page stuck (`hidden` or conflicting `auto`). Prefer a fixed `overflow-hidden` overlay and inner scroll only; if you must lock the body, use a single shared lock (ref counter) or always restore with `removeProperty('overflow')` in one place.
- Modal has viewport-based `max-h` and `overflow-hidden`.
- Header/footer are `shrink-0`.
- Body is `flex-1 overflow-y-auto`.
- Scrollbar indicator is hidden on all major engines.
