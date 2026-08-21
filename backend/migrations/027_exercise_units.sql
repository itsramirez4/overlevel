-- Per-exercise unit override — NULL means "fall back to the user's global
-- weight_unit/distance_unit preference" (see users table). Lets someone log
-- e.g. curls in lbs while squats stay in kg, changeable any time via
-- PUT /exercises/:id.
ALTER TABLE exercises
  ADD COLUMN weight_unit TEXT CHECK (weight_unit IN ('kg', 'lbs')),
  ADD COLUMN distance_unit TEXT CHECK (distance_unit IN ('km', 'mi'));
