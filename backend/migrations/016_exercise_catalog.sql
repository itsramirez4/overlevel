-- Seeds a broad catalog of common gym exercises for every existing user.
-- Not exhaustive (no finite list of "every exercise" exists), but covers
-- the standard compound/isolation/cardio movements per muscle group.
-- Safe to re-run: existing rows (matched by the user_id+name unique
-- constraint) are left untouched.

INSERT INTO exercises (user_id, name, category, muscle_groups, equipment, is_custom)
SELECT u.id, t.name, t.category, t.muscle_groups, t.equipment, false
FROM users u
CROSS JOIN (VALUES
  -- Pecho
  ('Press banca', 'compound', ARRAY['Pecho'], ARRAY['Barra']),
  ('Press banca inclinado', 'compound', ARRAY['Pecho'], ARRAY['Barra']),
  ('Press banca declinado', 'compound', ARRAY['Pecho'], ARRAY['Barra']),
  ('Press banca con mancuernas', 'compound', ARRAY['Pecho'], ARRAY['Mancuerna']),
  ('Press inclinado con mancuernas', 'compound', ARRAY['Pecho'], ARRAY['Mancuerna']),
  ('Press declinado con mancuernas', 'compound', ARRAY['Pecho'], ARRAY['Mancuerna']),
  ('Aperturas con mancuernas', 'isolation', ARRAY['Pecho'], ARRAY['Mancuerna']),
  ('Aperturas en cable', 'isolation', ARRAY['Pecho'], ARRAY['Cable']),
  ('Fondos en paralelas', 'compound', ARRAY['Pecho', 'Tríceps'], ARRAY['Peso corporal']),
  ('Press en máquina', 'compound', ARRAY['Pecho'], ARRAY['Máquina']),
  ('Pec deck (contractora)', 'isolation', ARRAY['Pecho'], ARRAY['Máquina']),
  ('Flexiones', 'compound', ARRAY['Pecho', 'Tríceps'], ARRAY['Peso corporal']),
  ('Cruce de poleas', 'isolation', ARRAY['Pecho'], ARRAY['Cable']),
  ('Press banca con agarre cerrado', 'compound', ARRAY['Pecho', 'Tríceps'], ARRAY['Barra']),

  -- Espalda
  ('Dominadas', 'compound', ARRAY['Espalda', 'Bíceps'], ARRAY['Peso corporal']),
  ('Dominadas asistidas', 'compound', ARRAY['Espalda', 'Bíceps'], ARRAY['Máquina']),
  ('Dominadas supinas', 'compound', ARRAY['Espalda', 'Bíceps'], ARRAY['Peso corporal']),
  ('Remo con barra', 'compound', ARRAY['Espalda'], ARRAY['Barra']),
  ('Remo con mancuerna a una mano', 'compound', ARRAY['Espalda'], ARRAY['Mancuerna']),
  ('Remo en máquina sentado', 'compound', ARRAY['Espalda'], ARRAY['Máquina']),
  ('Remo en cable sentado', 'compound', ARRAY['Espalda'], ARRAY['Cable']),
  ('Remo en T', 'compound', ARRAY['Espalda'], ARRAY['Barra']),
  ('Jalón al pecho', 'compound', ARRAY['Espalda', 'Bíceps'], ARRAY['Cable']),
  ('Jalón tras nuca', 'compound', ARRAY['Espalda'], ARRAY['Cable']),
  ('Peso muerto', 'compound', ARRAY['Espalda', 'Piernas', 'Glúteos'], ARRAY['Barra']),
  ('Peso muerto rumano', 'compound', ARRAY['Espalda', 'Piernas', 'Glúteos'], ARRAY['Barra']),
  ('Peso muerto sumo', 'compound', ARRAY['Espalda', 'Piernas', 'Glúteos'], ARRAY['Barra']),
  ('Peso muerto con mancuernas', 'compound', ARRAY['Espalda', 'Piernas', 'Glúteos'], ARRAY['Mancuerna']),
  ('Face pull', 'isolation', ARRAY['Espalda', 'Hombros'], ARRAY['Cable']),
  ('Pull-over con mancuerna', 'isolation', ARRAY['Espalda', 'Pecho'], ARRAY['Mancuerna']),
  ('Hiperextensiones', 'isolation', ARRAY['Espalda', 'Glúteos'], ARRAY['Peso corporal']),
  ('Buenos días', 'compound', ARRAY['Espalda', 'Piernas'], ARRAY['Barra']),

  -- Piernas
  ('Sentadilla', 'compound', ARRAY['Piernas', 'Glúteos'], ARRAY['Barra']),
  ('Sentadilla frontal', 'compound', ARRAY['Piernas'], ARRAY['Barra']),
  ('Sentadilla búlgara', 'compound', ARRAY['Piernas', 'Glúteos'], ARRAY['Mancuerna']),
  ('Sentadilla goblet', 'compound', ARRAY['Piernas', 'Glúteos'], ARRAY['Mancuerna']),
  ('Sentadilla hack', 'compound', ARRAY['Piernas'], ARRAY['Máquina']),
  ('Prensa de piernas', 'compound', ARRAY['Piernas', 'Glúteos'], ARRAY['Máquina']),
  ('Zancadas', 'compound', ARRAY['Piernas', 'Glúteos'], ARRAY['Mancuerna']),
  ('Zancadas caminando', 'compound', ARRAY['Piernas', 'Glúteos'], ARRAY['Mancuerna']),
  ('Extensión de cuádriceps', 'isolation', ARRAY['Piernas'], ARRAY['Máquina']),
  ('Curl femoral tumbado', 'isolation', ARRAY['Piernas'], ARRAY['Máquina']),
  ('Curl femoral sentado', 'isolation', ARRAY['Piernas'], ARRAY['Máquina']),
  ('Peso muerto a piernas rígidas', 'compound', ARRAY['Piernas', 'Glúteos'], ARRAY['Barra']),
  ('Step-up', 'compound', ARRAY['Piernas', 'Glúteos'], ARRAY['Mancuerna']),
  ('Abducción de cadera en máquina', 'isolation', ARRAY['Glúteos'], ARRAY['Máquina']),
  ('Aducción de cadera en máquina', 'isolation', ARRAY['Piernas'], ARRAY['Máquina']),
  ('Sentadilla pistol', 'compound', ARRAY['Piernas', 'Glúteos'], ARRAY['Peso corporal']),

  -- Glúteos
  ('Hip thrust', 'compound', ARRAY['Glúteos'], ARRAY['Barra']),
  ('Puente de glúteo', 'isolation', ARRAY['Glúteos'], ARRAY['Peso corporal']),
  ('Patada de glúteo en cable', 'isolation', ARRAY['Glúteos'], ARRAY['Cable']),
  ('Patada de glúteo en máquina', 'isolation', ARRAY['Glúteos'], ARRAY['Máquina']),

  -- Hombros
  ('Press militar', 'compound', ARRAY['Hombros'], ARRAY['Barra']),
  ('Press militar con mancuernas', 'compound', ARRAY['Hombros'], ARRAY['Mancuerna']),
  ('Press Arnold', 'compound', ARRAY['Hombros'], ARRAY['Mancuerna']),
  ('Press tras nuca', 'compound', ARRAY['Hombros'], ARRAY['Barra']),
  ('Press de hombros en máquina', 'compound', ARRAY['Hombros'], ARRAY['Máquina']),
  ('Elevaciones laterales', 'isolation', ARRAY['Hombros'], ARRAY['Mancuerna']),
  ('Elevaciones laterales en cable', 'isolation', ARRAY['Hombros'], ARRAY['Cable']),
  ('Elevaciones frontales', 'isolation', ARRAY['Hombros'], ARRAY['Mancuerna']),
  ('Pájaros (elevaciones posteriores)', 'isolation', ARRAY['Hombros'], ARRAY['Mancuerna']),
  ('Pájaros en máquina', 'isolation', ARRAY['Hombros'], ARRAY['Máquina']),
  ('Remo al mentón', 'compound', ARRAY['Hombros'], ARRAY['Barra']),
  ('Encogimientos de hombros', 'isolation', ARRAY['Hombros'], ARRAY['Mancuerna']),

  -- Bíceps
  ('Curl con barra', 'isolation', ARRAY['Bíceps'], ARRAY['Barra']),
  ('Curl con barra Z', 'isolation', ARRAY['Bíceps'], ARRAY['Barra']),
  ('Curl con mancuernas', 'isolation', ARRAY['Bíceps'], ARRAY['Mancuerna']),
  ('Curl martillo', 'isolation', ARRAY['Bíceps', 'Antebrazos'], ARRAY['Mancuerna']),
  ('Curl concentrado', 'isolation', ARRAY['Bíceps'], ARRAY['Mancuerna']),
  ('Curl en banco Scott', 'isolation', ARRAY['Bíceps'], ARRAY['Barra']),
  ('Curl en polea', 'isolation', ARRAY['Bíceps'], ARRAY['Cable']),
  ('Curl inclinado con mancuernas', 'isolation', ARRAY['Bíceps'], ARRAY['Mancuerna']),

  -- Tríceps
  ('Press francés', 'isolation', ARRAY['Tríceps'], ARRAY['Barra']),
  ('Extensión de tríceps en polea', 'isolation', ARRAY['Tríceps'], ARRAY['Cable']),
  ('Extensión de tríceps con cuerda', 'isolation', ARRAY['Tríceps'], ARRAY['Cable']),
  ('Fondos entre bancos', 'compound', ARRAY['Tríceps'], ARRAY['Peso corporal']),
  ('Patada de tríceps', 'isolation', ARRAY['Tríceps'], ARRAY['Mancuerna']),
  ('Extensión de tríceps sobre la cabeza', 'isolation', ARRAY['Tríceps'], ARRAY['Mancuerna']),
  ('Press cerrado en banca', 'compound', ARRAY['Tríceps', 'Pecho'], ARRAY['Barra']),

  -- Core
  ('Plancha', 'isolation', ARRAY['Core'], ARRAY['Peso corporal']),
  ('Plancha lateral', 'isolation', ARRAY['Core'], ARRAY['Peso corporal']),
  ('Abdominales (crunch)', 'isolation', ARRAY['Core'], ARRAY['Peso corporal']),
  ('Abdominales en polea', 'isolation', ARRAY['Core'], ARRAY['Cable']),
  ('Elevación de piernas colgado', 'isolation', ARRAY['Core'], ARRAY['Peso corporal']),
  ('Elevación de rodillas colgado', 'isolation', ARRAY['Core'], ARRAY['Peso corporal']),
  ('Rueda abdominal', 'isolation', ARRAY['Core'], ARRAY['Peso corporal']),
  ('Russian twist', 'isolation', ARRAY['Core'], ARRAY['Peso corporal']),
  ('Abdominales en máquina', 'isolation', ARRAY['Core'], ARRAY['Máquina']),
  ('Escaladores (mountain climbers)', 'isolation', ARRAY['Core'], ARRAY['Peso corporal']),

  -- Pantorrillas
  ('Elevación de talones de pie', 'isolation', ARRAY['Pantorrillas'], ARRAY['Máquina']),
  ('Elevación de talones sentado', 'isolation', ARRAY['Pantorrillas'], ARRAY['Máquina']),
  ('Elevación de talones en prensa', 'isolation', ARRAY['Pantorrillas'], ARRAY['Máquina']),

  -- Antebrazos
  ('Curl de muñeca', 'isolation', ARRAY['Antebrazos'], ARRAY['Barra']),
  ('Curl de muñeca inverso', 'isolation', ARRAY['Antebrazos'], ARRAY['Barra']),
  ('Farmer''s walk', 'compound', ARRAY['Antebrazos', 'Core'], ARRAY['Mancuerna']),

  -- Cardio
  ('Cinta de correr', 'cardio', ARRAY['Piernas'], ARRAY['Máquina']),
  ('Bicicleta estática', 'cardio', ARRAY['Piernas'], ARRAY['Máquina']),
  ('Elíptica', 'cardio', ARRAY['Piernas'], ARRAY['Máquina']),
  ('Máquina de remo', 'cardio', ARRAY['Espalda', 'Piernas'], ARRAY['Máquina']),
  ('Escalador (stair climber)', 'cardio', ARRAY['Piernas', 'Glúteos'], ARRAY['Máquina']),
  ('Comba (cuerda de saltar)', 'cardio', ARRAY['Piernas', 'Pantorrillas'], ARRAY['Peso corporal']),
  ('Natación', 'cardio', ARRAY['Espalda', 'Hombros', 'Piernas'], ARRAY['Peso corporal']),
  ('Carrera al aire libre', 'cardio', ARRAY['Piernas'], ARRAY['Peso corporal']),
  ('Bicicleta al aire libre', 'cardio', ARRAY['Piernas'], ARRAY['Peso corporal']),
  ('Burpees', 'cardio', ARRAY['Piernas', 'Pecho', 'Core'], ARRAY['Peso corporal'])
) AS t(name, category, muscle_groups, equipment)
ON CONFLICT (user_id, name) DO NOTHING;
