-- Adds the "Fracasado" joke class to the allowed character_type values.
ALTER TABLE characters DROP CONSTRAINT characters_character_type_check;
ALTER TABLE characters ADD CONSTRAINT characters_character_type_check
  CHECK (character_type IN ('powerlifter', 'bodybuilder', 'crossfitter', 'calisthenics', 'fracasado'));
