# Universal UTC time

The game no longer treats `state.time` as an isolated counter that starts at zero.

All time-sensitive data is based on universal UTC time:

- PHP sets the runtime timezone to UTC.
- The MySQL session is forced to `+00:00`.
- Database writes use `UTC_TIMESTAMP()`.
- Shared state carries:
  - `time`: current UTC Unix timestamp in seconds, kept for backward compatibility;
  - `utcTimeMs`: current UTC Unix timestamp in milliseconds;
  - `utcIso`: current UTC ISO string.
- The UI displays the shared clock as `HH:MM:SS UTC`.

The display still updates once per second, but the reference is the standard UTC clock rather than a browser-local game counter.
