import { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, ImageSourcePropType } from 'react-native';
import { Skull } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../utils/theme';
import { ExerciseBattle } from '../../types';

interface EnemyCardProps {
  enemyName: string;
  battle?: ExerciseBattle;
  /** Plug real art in later — falls back to a placeholder silhouette until then. */
  imageSource?: ImageSourcePropType;
}

/**
 * Each exercise is an enemy the character fights: every non-warmup set
 * lands a hit (via battleService.applyDamage), and finishing the workout
 * guarantees a kill no matter how much HP was left (battleService.
 * finishForWorkout) — see backend/src/services/battleService.ts for the
 * full math. This component just renders whatever battle state it's given.
 */
export const EnemyCard = ({ enemyName, battle, imageSource }: EnemyCardProps) => {
  const hpMax = battle?.hp_max ?? 100;
  const hpCurrent = battle?.hp_current ?? hpMax;
  const defeated = battle?.defeated ?? false;
  const hpPercent = Math.max(0, Math.min(100, Math.round((hpCurrent / hpMax) * 100)));

  const [flash, setFlash] = useState<number | null>(null);
  const prevHp = useRef(hpCurrent);

  useEffect(() => {
    const damage = prevHp.current - hpCurrent;
    prevHp.current = hpCurrent;
    if (damage > 0) {
      setFlash(damage);
      const timeout = setTimeout(() => setFlash(null), 1200);
      return () => clearTimeout(timeout);
    }
  }, [hpCurrent]);

  return (
    <View style={styles.container}>
      <View style={[styles.spriteBox, defeated && styles.spriteBoxDefeated]}>
        {imageSource ? (
          <Image source={imageSource} style={styles.spriteImage} resizeMode="contain" />
        ) : (
          <Skull size={28} color={defeated ? colors.text.muted : colors.semantic.error} strokeWidth={1.8} />
        )}

        {flash !== null && (
          <View style={styles.damageFlash} pointerEvents="none">
            <Text style={styles.damageFlashText}>-{flash}</Text>
          </View>
        )}

        {defeated && (
          <View style={styles.defeatedOverlay} pointerEvents="none">
            <Text style={styles.defeatedText}>DERROTADO</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {enemyName}
        </Text>
        <View
          style={styles.hpTrack}
          accessible
          accessibilityLabel={`${enemyName}: ${hpCurrent} de ${hpMax} de vida${defeated ? ', derrotado' : ''}`}
        >
          <View
            accessible={false}
            style={[
              styles.hpFill,
              { width: `${hpPercent}%` },
              defeated && styles.hpFillDefeated,
            ]}
          />
        </View>
        <Text style={styles.hpLabel}>
          {defeated ? 'Derrotado' : `${hpCurrent} / ${hpMax} HP`}
        </Text>
      </View>
    </View>
  );
};

const SPRITE_SIZE = 56;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  spriteBox: {
    width: SPRITE_SIZE,
    height: SPRITE_SIZE,
    borderRadius: radius.md,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1.5,
    borderColor: colors.semantic.error,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  spriteBoxDefeated: {
    borderColor: colors.border.subtle,
    opacity: 0.5,
  },
  spriteImage: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
  },
  damageFlash: {
    position: 'absolute',
    top: -14,
    alignSelf: 'center',
  },
  damageFlashText: {
    ...typography.small,
    color: colors.semantic.error,
    fontWeight: '800',
  },
  defeatedOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: radius.md,
  },
  defeatedText: {
    ...typography.tiny,
    color: colors.text.primary,
    fontWeight: '800',
    textAlign: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    ...typography.small,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: 4,
  },
  hpTrack: {
    height: 8,
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  hpFill: {
    height: '100%',
    backgroundColor: colors.semantic.error,
  },
  hpFillDefeated: {
    backgroundColor: colors.text.muted,
  },
  hpLabel: {
    ...typography.tiny,
    color: colors.text.secondary,
    marginTop: 2,
  },
});
