-- V18 universal UTC timing.
-- No schema change is required: PHP forces the MySQL connection timezone to +00:00
-- and all gameplay writes now use UTC_TIMESTAMP(). Existing DATETIME columns are kept.
SELECT 1;
