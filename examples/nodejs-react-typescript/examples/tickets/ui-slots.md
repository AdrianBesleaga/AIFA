# Frontend Extension: Task Board Slots

## Goal

Allow the React UI to expose named extension points that independent contributions can render into.

## Slot Contract

Each contribution has:

- `slot`: string - The target UI slot.
- `name`: string - Unique contribution name within the slot.
- `order`: number - Sort order.
- `render`: function - Receives `{ model, contribution }` and returns React UI.

## Slots

- `APP_HEADER_ACTIONS` - Header actions.
- `TASK_SUMMARY_CARDS` - Dashboard cards.
- `TASK_ACTIONS` - Per-task row actions.
- `EMPTY_STATE_ACTIONS` - Empty state actions.

## Rules

- Contributions are sorted by `order`.
- Contributions with the same name replace the previous contribution.
- Slot models provide only the data/actions needed by that slot.

## Why This Matters

The application owns stable extension points, while add-ons contribute UI independently.

In AIFA terms, it makes frontend customization atomic too.

