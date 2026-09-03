import { useState } from 'react';
import { Alert, View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Dumbbell, Trophy } from 'lucide-react-native';
import { api } from '../../../../services/api';
import { colors, radius, shadow, spacing, typography } from '../../../../utils/theme';
import { EmptyState } from '../../../../components/common/EmptyState';
import { Loader } from '../../../../components/ui/Loader';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { ProgressBar } from '../../../../components/ui/ProgressBar';
import { UserAvatar } from '../../../../components/character/UserAvatar';
import { CharacterAvatar } from '../../../../components/character/CharacterAvatar';
import { getWorkoutName } from '../../../../utils/workoutName';
import { Character, PublicProfile, Workout } from '../../../../types';
import { authStore } from '../../../../stores/authStore';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const ownUserId = authStore((s) => s.user?.id);
  const [followBusy, setFollowBusy] = useState(false);

  const { data: profile, isLoading } = useQuery<PublicProfile>({
    queryKey: ['users', id],
    queryFn: () => api.get(`/users/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: workouts, isLoading: workoutsLoading } = useQuery({
    queryKey: ['users', id, 'workouts'],
    queryFn: () => api.get<Workout[]>(`/users/${id}/workouts`).then((r) => r.data),
    enabled: !!id && !!profile,
  });

  const { data: character } = useQuery<Character | null>({
    queryKey: ['users', id, 'character'],
    queryFn: () => api.get<Character | null>(`/users/${id}/character`).then((r) => r.data),
    enabled: !!id && !!profile,
  });

  const handleToggleFollow = async () => {
    if (!profile || followBusy) return;
    setFollowBusy(true);
    try {
      if (profile.is_following) {
        await api.delete(`/users/${id}/follow`);
      } else {
        await api.post(`/users/${id}/follow`);
      }
      await queryClient.invalidateQueries({ queryKey: ['users', id] });
      // The target's follower_count just changed, but so did the acting
      // user's own following_count — without this, their own public
      // profile view (social/index.tsx) keeps showing the pre-follow count.
      if (ownUserId) await queryClient.invalidateQueries({ queryKey: ['users', ownUserId] });
    } catch {
      Alert.alert('Error', 'No se pudo actualizar. Inténtalo de nuevo.');
    } finally {
      setFollowBusy(false);
    }
  };

  if (isLoading || !profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Loader />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backButton}
          accessibilityLabel="Volver"
          accessibilityRole="button"
        >
          <ChevronLeft size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {profile.username}
        </Text>
      </View>

      <FlatList
        data={workouts || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.profileCard}>
              <View style={styles.avatarWrap}>
                <UserAvatar characterType={profile.character_type} size={AVATAR_SIZE} />
              </View>
              {!!profile.full_name && <Text style={styles.fullName}>{profile.full_name}</Text>}
              {!!profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

              <View style={styles.statsRow}>
                <TouchableOpacity
                  style={styles.statItem}
                  onPress={() => router.push(`/social/connections?id=${id}&type=followers`)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.statValue}>{profile.followers_count}</Text>
                  <Text style={styles.statLabel}>Seguidores</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.statItem}
                  onPress={() => router.push(`/social/connections?id=${id}&type=following`)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.statValue}>{profile.following_count}</Text>
                  <Text style={styles.statLabel}>Seguidos</Text>
                </TouchableOpacity>
              </View>

              {!profile.is_self && (
                <Button
                  label={followBusy ? 'Un momento…' : profile.is_following ? 'DEJAR DE SEGUIR' : 'SEGUIR'}
                  variant={profile.is_following ? 'outline' : 'primary'}
                  loading={followBusy}
                  onPress={handleToggleFollow}
                  style={styles.followButton}
                />
              )}
            </View>

            {character && (
              <Card style={styles.characterCard}>
                <View style={styles.characterHeader}>
                  <View style={styles.characterAvatarWrap}>
                    <CharacterAvatar type={character.character_type} size={56} animated={false} />
                  </View>
                  <View style={styles.characterInfo}>
                    <Text style={styles.characterName}>{character.name}</Text>
                    <Text style={styles.characterTagline} numberOfLines={1}>
                      {character.type_info?.tagline}
                    </Text>
                  </View>
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelBadgeLabel}>NIVEL</Text>
                    <Text style={styles.levelBadgeValue}>{character.level}</Text>
                  </View>
                </View>
                <ProgressBar progress={character.progress} height={8} />
                <View style={styles.characterStatsRow}>
                  <View style={styles.characterStat}>
                    <Trophy size={14} color={colors.accent.ember} strokeWidth={2.2} />
                    <Text style={styles.characterStatText}>Fuerza {character.stats.fuerza}kg</Text>
                  </View>
                  <View style={styles.characterStat}>
                    <Text style={styles.characterStatText}>Resistencia {character.stats.resistencia}</Text>
                  </View>
                  <View style={styles.characterStat}>
                    <Text style={styles.characterStatText}>Constancia {character.stats.constancia}d</Text>
                  </View>
                </View>
              </Card>
            )}

            <Text style={styles.sectionTitle}>Entrenamientos</Text>
          </>
        }
        ListEmptyComponent={
          workoutsLoading ? null : (
            <EmptyState icon={Dumbbell} title="Sin entrenamientos todavía" message="Este perfil no tiene entrenamientos terminados." />
          )
        }
        renderItem={({ item, index }) => (
          <AnimatedTouchable
            entering={FadeInDown.delay(index * 50).duration(250)}
            style={styles.workoutCard}
            onPress={() => router.push(`/social/user-workout?ownerId=${id}&workoutId=${item.id}`)}
            activeOpacity={0.7}
          >
            <Text style={styles.workoutName} numberOfLines={1}>
              {getWorkoutName(item)}
            </Text>
            <Text style={styles.workoutMeta}>
              {new Date(item.started_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' · '}
              {(item.sets || []).length} series
            </Text>
          </AnimatedTouchable>
        )}
      />
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 72;
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  backButton: {
    marginRight: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    flexShrink: 1,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarWrap: {
    marginBottom: spacing.sm,
  },
  fullName: {
    ...typography.h3,
    color: colors.text.primary,
  },
  bio: {
    ...typography.small,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
    color: colors.text.primary,
  },
  statLabel: {
    ...typography.tiny,
    color: colors.text.secondary,
  },
  followButton: {
    marginTop: spacing.md,
    minWidth: 180,
  },
  characterCard: {
    marginBottom: spacing.lg,
  },
  characterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  characterAvatarWrap: {
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  characterInfo: {
    flex: 1,
  },
  characterName: {
    ...typography.h3,
    color: colors.text.primary,
  },
  characterTagline: {
    ...typography.tiny,
    color: colors.text.secondary,
    marginTop: 2,
  },
  levelBadge: {
    alignItems: 'center',
    backgroundColor: colors.bg.elevated,
    borderWidth: 1.5,
    borderColor: colors.accent.fire,
    borderRadius: radius.md,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  levelBadgeLabel: {
    ...typography.tiny,
    color: colors.text.secondary,
    fontWeight: '700',
    fontSize: 9,
  },
  levelBadgeValue: {
    ...typography.h3,
    color: colors.accent.fire,
  },
  characterStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  characterStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  characterStatText: {
    ...typography.tiny,
    color: colors.text.secondary,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  workoutCard: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  workoutName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  workoutMeta: {
    ...typography.tiny,
    color: colors.text.secondary,
    marginTop: 2,
  },
});
