# OpenStreetMap mode

The game map uses Leaflet with OpenStreetMap raster tiles. Leaflet is the only layer responsible for tile projection, zoom and pan.

## Coordinates

Game entities use geographic coordinates:

- `x` = longitude
- `y` = latitude

Markers are rendered as fixed-size HTML overlays above the Leaflet map. Their screen position is recomputed with `latLngToContainerPoint()` after every `move`, `zoom`, `resize`, `moveend`, `zoomend`, `viewreset` and tile load event.

## Stability rules

- Do not apply CSS transforms to the Leaflet container.
- Do not scale the game entities layer with CSS.
- Do not manually position OpenStreetMap tiles.
- Keep the critical Leaflet CSS fallback in `css/game.css`; it prevents broken square tile layouts if the CDN stylesheet is blocked or loaded late.
- Use `invalidateSize()` after layout changes because the central game layout is fixed and can be measured before the browser has completed the final layout pass.

## Bounds

The default view fits mainland France with Corsica included:

- south-west: `41.0, -5.8`
- north-east: `51.6, 10.2`

The user can pan slightly around France, but the max bounds keep the map from drifting into unrelated world copies.

## Attribution

OpenStreetMap attribution must remain visible on the map.
