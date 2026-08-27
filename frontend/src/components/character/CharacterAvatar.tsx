import { useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { CharacterType } from '../../types';

interface CharacterAvatarProps {
  type: CharacterType;
  size?: number;
  /** Idle rotation animation — off for tiny badges where it'd be imperceptible/noisy. */
  animated?: boolean;
}

// One full clockwise turntable, viewer's perspective — this order is what
// makes the frame cycle read as a rotation instead of a random flicker.
const ROTATION_ORDER = [
  'south',
  'south-east',
  'east',
  'north-east',
  'north',
  'north-west',
  'west',
  'south-west',
] as const;

const FRAMES: Record<CharacterType, Record<(typeof ROTATION_ORDER)[number], any>> = {
  powerlifter: {
    south: require('../../../assets/characters/powerlifter/south.png'),
    'south-east': require('../../../assets/characters/powerlifter/south-east.png'),
    east: require('../../../assets/characters/powerlifter/east.png'),
    'north-east': require('../../../assets/characters/powerlifter/north-east.png'),
    north: require('../../../assets/characters/powerlifter/north.png'),
    'north-west': require('../../../assets/characters/powerlifter/north-west.png'),
    west: require('../../../assets/characters/powerlifter/west.png'),
    'south-west': require('../../../assets/characters/powerlifter/south-west.png'),
  },
  bodybuilder: {
    south: require('../../../assets/characters/bodybuilder/south.png'),
    'south-east': require('../../../assets/characters/bodybuilder/south-east.png'),
    east: require('../../../assets/characters/bodybuilder/east.png'),
    'north-east': require('../../../assets/characters/bodybuilder/north-east.png'),
    north: require('../../../assets/characters/bodybuilder/north.png'),
    'north-west': require('../../../assets/characters/bodybuilder/north-west.png'),
    west: require('../../../assets/characters/bodybuilder/west.png'),
    'south-west': require('../../../assets/characters/bodybuilder/south-west.png'),
  },
  crossfitter: {
    south: require('../../../assets/characters/crossfitter/south.png'),
    'south-east': require('../../../assets/characters/crossfitter/south-east.png'),
    east: require('../../../assets/characters/crossfitter/east.png'),
    'north-east': require('../../../assets/characters/crossfitter/north-east.png'),
    north: require('../../../assets/characters/crossfitter/north.png'),
    'north-west': require('../../../assets/characters/crossfitter/north-west.png'),
    west: require('../../../assets/characters/crossfitter/west.png'),
    'south-west': require('../../../assets/characters/crossfitter/south-west.png'),
  },
  calisthenics: {
    south: require('../../../assets/characters/calisthenics/south.png'),
    'south-east': require('../../../assets/characters/calisthenics/south-east.png'),
    east: require('../../../assets/characters/calisthenics/east.png'),
    'north-east': require('../../../assets/characters/calisthenics/north-east.png'),
    north: require('../../../assets/characters/calisthenics/north.png'),
    'north-west': require('../../../assets/characters/calisthenics/north-west.png'),
    west: require('../../../assets/characters/calisthenics/west.png'),
    'south-west': require('../../../assets/characters/calisthenics/south-west.png'),
  },
  fracasado: {
    south: require('../../../assets/characters/fracasado/south.png'),
    'south-east': require('../../../assets/characters/fracasado/south-east.png'),
    east: require('../../../assets/characters/fracasado/east.png'),
    'north-east': require('../../../assets/characters/fracasado/north-east.png'),
    north: require('../../../assets/characters/fracasado/north.png'),
    'north-west': require('../../../assets/characters/fracasado/north-west.png'),
    west: require('../../../assets/characters/fracasado/west.png'),
    'south-west': require('../../../assets/characters/fracasado/south-west.png'),
  },
};

const BG: Record<CharacterType, string> = {
  powerlifter: '#e5342b',
  bodybuilder: '#d98c3f',
  crossfitter: '#3fa758',
  calisthenics: '#4f6ef7',
  fracasado: '#6b7280',
};

const FRAME_MS = 450;

export const CharacterAvatar = ({ type, size = 64, animated = true }: CharacterAvatarProps) => {
  const [frameIndex, setFrameIndex] = useState(0);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!animated) return;
    const interval = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % ROTATION_ORDER.length;
      setFrameIndex(indexRef.current);
    }, FRAME_MS);
    return () => clearInterval(interval);
  }, [animated, type]);

  const direction = ROTATION_ORDER[animated ? frameIndex : 0];

  return (
    <View
      style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: BG[type] }]}
      accessible
      accessibilityLabel={`Personaje: ${type}`}
    >
      <Image
        source={FRAMES[type][direction]}
        style={{ width: size * 0.8, height: size * 0.8 }}
        resizeMode="contain"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
