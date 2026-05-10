# Player movement

## Goal

The player moves by clicking a point on the map and confirming the movement. The movement updates the same `x/y` coordinates that were previously modified by the compass sliders.

## Animation

- Movement is animated from the current coordinates to the target coordinates.
- Duration is based on the player's ideology movement speed.
- The interpolation uses cubic ease-in-out for a smoother, non-linear movement.
- Final coordinates are persisted through the existing state API when movement finishes.

## Persistence

The persisted player coordinates remain:

- `x`
- `y`

The temporary animation state is client-side only.


## V13.3 movement tuning

Movement duration is based on a fast max cruise speed derived from the ideology `move_speed`. Acceleration and braking are intentionally short; most of the trajectory is linear cruise so crossing the map remains quick while still feeling animated.
