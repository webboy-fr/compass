-- V18 simplified political action model.
-- Actions are now: influence, power_up, power_down.
-- Influence remains cumulative by ideology.
-- Power is stored in the shared state JSON as positivePower and negativePower.
-- The total visible power is positivePower - negativePower.
-- Special actions/classes are disabled for this gameplay version.

UPDATE pcw_player_classes SET enabled = 0;
