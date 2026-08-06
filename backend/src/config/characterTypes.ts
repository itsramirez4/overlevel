export type CharacterType = 'powerlifter' | 'bodybuilder' | 'crossfitter' | 'calisthenics' | 'fracasado';

export interface CharacterTypeDef {
  id: CharacterType;
  name: string;
  tagline: string;
  description: string;
}

/**
 * Predefined — no customization yet (name/look is fixed per type). Stats are
 * purely data-driven regardless of type; the type is currently flavor/
 * roleplay, not a mechanical modifier, since there's no design input yet on
 * how each archetype should bias the numbers.
 */
export const CHARACTER_TYPES: CharacterTypeDef[] = [
  {
    id: 'powerlifter',
    name: 'Powerlifter',
    tagline: 'Fuerza bruta',
    description: 'Vive por los números grandes en la barra. Sentadilla, banca y peso muerto son su religión.',
  },
  {
    id: 'bodybuilder',
    name: 'Bodybuilder',
    tagline: 'Volumen y forma',
    description: 'Persigue el físico perfecto: simetría, volumen y detalle en cada grupo muscular.',
  },
  {
    id: 'crossfitter',
    name: 'Híbrido',
    tagline: 'Todoterreno',
    description: 'Fuerza, resistencia y variedad a partes iguales. Ningún estímulo le resulta extraño.',
  },
  {
    id: 'calisthenics',
    name: 'Calistenia',
    tagline: 'Control del propio cuerpo',
    description: 'Domina su propio peso corporal: agilidad, control y fuerza relativa por encima de todo.',
  },
  {
    id: 'fracasado',
    name: 'Fracasado',
    tagline: 'Leyenda del gimnasio (a su manera)',
    description: 'Entre series a medias y excusas legendarias, se ha ganado el título a pulso. Broma privada con su entrenador.',
  },
];

export const isCharacterType = (value: string): value is CharacterType =>
  CHARACTER_TYPES.some((t) => t.id === value);
