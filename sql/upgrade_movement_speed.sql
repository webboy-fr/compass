ALTER TABLE pcw_ideologies
ADD COLUMN move_speed DECIMAL(8,2) NOT NULL DEFAULT 10 AFTER regen;

UPDATE pcw_ideologies
SET move_speed = CASE id
    WHEN 'liberal' THEN 12
    WHEN 'libertarian' THEN 15
    WHEN 'socialdem' THEN 7
    WHEN 'ecologist' THEN 8
    WHEN 'conservative' THEN 6
    WHEN 'sovereignist' THEN 5
    ELSE 10
END;
