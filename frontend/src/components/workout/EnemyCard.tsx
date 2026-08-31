import { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, ImageSourcePropType } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
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
  // null = no real battle data seen yet. Without that distinction, the
  // battles query still loading on mount means `battle` is undefined and
  // hpCurrent defaults to hpMax — when the query then resolves with HP
  // already below max (sets logged earlier this session, or a remount
  // mid-workout), the jump from that placeholder max down to the real
  // value reads as "damage" and flashes, even though nothing was just hit.
  const prevHp = useRef<number | null>(null);
  // Same reasoning, for the defeat punch below — only the live false→true
  // transition should animate, not a battle that was already defeated
  // when this card first mounted (reopening a workout, a remount mid-set).
  const prevDefeated = useRef<boolean | null>(null);
  const scale = useSharedValue(1);
  const flashOpacity = useSharedValue(0);

  useEffect(() => {
    if (!battle) return;
    if (prevHp.current !== null && prevHp.current > hpCurrent) {
      const damage = prevHp.current - hpCurrent;
      prevHp.current = hpCurrent;
      setFlash(damage);
      const timeout = setTimeout(() => setFlash(null), 1200);
      return () => clearTimeout(timeout);
    }
    prevHp.current = hpCurrent;
  }, [battle, hpCurrent]);

  useEffect(() => {
    if (!battle) return;
    if (prevDefeated.current === false && defeated) {
      scale.value = withSequence(withTiming(1.25, { duration: 120 }), withSpring(1, { damping: 6 }));
      flashOpacity.value = withSequence(withTiming(1, { duration: 80 }), withTiming(0, { duration: 500 }));
    }
    prevDefeated.current = defeated;
  }, [battle, defeated, scale, flashOpacity]);

  const spriteAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const flashAnimatedStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.spriteBox, defeated && styles.spriteBoxDefeated, spriteAnimatedStyle]}>
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

        <Animated.View style={[styles.defeatFlash, flashAnimatedStyle]} pointerEvents="none" />
      </Animated.View>

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
  // The kill punch — briefly floods the sprite gold/white, then fades. Only
  // ever driven by flashOpacity (starts and stays at 0 otherwise), so it's
  // invisible outside the moment defeated flips true.
  defeatFlash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.accent.gold,
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
