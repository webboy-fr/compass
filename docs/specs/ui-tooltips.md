# UI tooltips

## Goal

Dynamic action tooltips must stay readable without stacking duplicated Bootstrap tooltip DOM nodes.

## Rules

- Use Bootstrap tooltips with `data-bs-toggle="tooltip"` and `data-bs-html="true"`.
- Before replacing dynamic panel HTML, dispose existing tooltip instances in that panel.
- After dispose, remove generated `.tooltip` nodes from the document.
- Hide tooltips on `mouseleave`, `blur`, and `click`.
- Use HTML content for action statistics and short explanations.

## Affected dynamic zones

- Fort action panel.
- Movement action panel.
- Selected fort information panel.
