Modal Pattern Context

Goal
- Keep modal fully visible inside the viewport.
- Keep header and footer fixed within the modal.
- Allow only the body/content area to scroll.
- Hide scrollbar indicator while preserving scroll behavior.

Viewport-safe wrapper
- Overlay: `fixed inset-0 ... overflow-y-auto`
- Align modal near top for small screens: `items-start`
- Add outer spacing: `p-3 sm:p-4`

Example overlay:
`className="fixed inset-0 bg-black/50 flex items-start justify-center p-3 sm:p-4 z-50 backdrop-blur-sm overflow-y-auto"`

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
- Body must be flex-grow region: `flex-1 overflow-y-auto`
- Keep internal spacing compact: `px-5 py-4`
- Hide scroll indicators:
  - Tailwind arbitrary utilities:
    - `[scrollbar-width:none]`
    - `[-ms-overflow-style:none]`
    - `[&::-webkit-scrollbar]:hidden`
  - Inline fallback:
    - `style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}`

Example body:
`className="px-5 py-4 overflow-y-auto flex-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"`

Implementation checklist
- Overlay has `overflow-y-auto`.
- Modal has viewport-based `max-h` and `overflow-hidden`.
- Header/footer are `shrink-0`.
- Body is `flex-1 overflow-y-auto`.
- Scrollbar indicator is hidden on all major engines.
