import { View, StyleSheet } from 'react-native';
import { User as UserIcon } from 'lucide-react-native';
import { CharacterAvatar } from './CharacterAvatar';
import { CharacterType } from '../../types';
import { colors } from '../../utils/theme';

interface UserAvatarProps {
  characterType?: CharacterType | null;
  size?: number;
}

/** A user's profile picture is simply their chosen character's sprite —
 * falls back to a generic icon for users who haven't created one yet. */
export const UserAvatar = ({ characterType, size = 36 }: UserAvatarProps) => {
  if (characterType) {
    return <CharacterAvatar type={characterType} size={size} animated={false} />;
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <UserIcon size={size * 0.5} color={colors.accent.fire} strokeWidth={2} />
    </View>
  );
};

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
