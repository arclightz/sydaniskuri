# Viewport Results and Location Modal Design

## Goal

Keep the map crisp and bounded to the viewport, show at most five relevant locations in the left pane, and present selected-location details in a modal over the map.

## Behavior

- The map reports its geographic bounds after loading and after each completed move.
- Search and availability/type filters continue to determine the candidate summaries.
- The explorer retains only candidates whose coordinates fall inside the current map bounds, then orders them by distance from the map center and renders the first five in the left pane.
- The left pane has no expanded inline details. It remains a compact search/filter and viewport-results list.
- Selecting either a map marker or a left-pane result opens an accessible modal. The modal loads the selected location's detail shard on demand, preserves route access, and supports retry after a detail-load error.
- Closing the modal returns focus to the selecting control and does not change the map viewport or active filters.

## Implementation Boundaries

- `MapView` exposes a bounds callback derived from MapLibre `getBounds()`; it remains responsible only for map lifecycle and map events.
- `MapExplorer` owns bounds state, viewport filtering, the five-result cap, selected ID, and detail request state.
- A dedicated location-details modal renders selected summary/detail state rather than embedding expanded details in `LocationCard`.
- CSS constrains the desktop grid row and its children (`min-height: 0`; bounded map area) so the panel scrolls independently and the MapLibre canvas is not stretched past its backing-buffer limit.

## Verification

- Unit/component tests prove only five in-bounds summaries are rendered, out-of-bounds summaries are excluded after bounds changes, and selection opens/closes a modal with on-demand details.
- Browser coverage verifies the map canvas backing dimensions match its CSS dimensions at desktop viewport size and that the selected marker opens the details modal.
