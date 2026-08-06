import { Image, StyleSheet } from 'react-native';
import { CharacterType } from '../../types';

interface CharacterAvatarProps {
  type: CharacterType;
  size?: number;
}

// Placeholder art per class — swapped out later for the final set.
const IMAGES: Record<CharacterType, any> = {
  powerlifter: require('../../assets/characters/powerlifter.jpg'),
  bodybuilder: require('../../assets/characters/bodybuilder.jpg'),
  crossfitter: require('../../assets/characters/crossfitter.jpg'),
  calisthenics: require('../../assets/characters/calisthenics.jpg'),
  fracasado: require('../../assets/characters/fracasado.jpg'),
};

export const CharacterAvatar = ({ type, size = 64 }: CharacterAvatarProps) => (
  <Image
    source={IMAGES[type]}
    style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
    resizeMode="cover"
  />
);

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#1c1c1f',
  },
});
