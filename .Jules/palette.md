# Palette's Journal

This journal documents critical UX and accessibility learnings for this project.

## 2024-05-22 - [Keyboard Accessibility for Drag Zones]
**Learning:** Large drag-and-drop zones implemented as `div`s are often overlooked for keyboard accessibility.
**Action:** Always add `role="button"`, `tabIndex={0}`, and `onKeyDown` handlers for Enter/Space keys to these interactive regions. Ensure visual focus indicators (`focus-visible`) are present.
