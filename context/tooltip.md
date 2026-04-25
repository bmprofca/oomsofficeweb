Tooltip / popover behavior requirements:

1. The tooltip must always stay fully visible inside the current viewport.
2. Its position should be calculated automatically based on available screen space.
3. Preferred order of placement:
   - top
   - bottom
   - right
   - left
   Use whichever side has enough visible space.
4. If the preferred side does not have enough space, automatically flip to another side.
5. If no side has full space, shift the tooltip within the viewport so that it remains as visible as possible.
6. Prevent overflow on all screen edges:
   - top edge
   - bottom edge
   - left edge
   - right edge
7. Tooltip should work properly inside:
   - tables
   - cards
   - dropdown action menus
   - scrollable containers
   - modals
8. Tooltip must appear above all UI elements. Use a very high z-index so it is never hidden behind:
   - table body
   - sticky header
   - modal content
   - sidebar
   - dropdown menus
9. Recommended z-index:
   - tooltip: 99999
   - arrow should stay with same stacking context
10. Render tooltip using portal / fixed layer if needed so parent overflow:hidden does not cut it.
11. On small screens, tooltip should still remain readable and not go outside screen width.
12. Add small spacing between target element and tooltip.
13. Show tooltip with smooth fade/scale animation.
14. Hide tooltip on:
   - mouse leave
   - outside click (for popover style)
   - scroll if needed
   - escape key
15. Recalculate position on:
   - window resize
   - scroll
   - container scroll
   - content size change
16. Tooltip arrow should also change direction based on final placement.
17. Placement logic must use actual visible area, not only default direction.
18. Do not let tooltip block important clickable UI unless intended.
19. Keep the implementation reusable for all action icons/buttons.
20. Final result should feel professional, smart, and adaptive.