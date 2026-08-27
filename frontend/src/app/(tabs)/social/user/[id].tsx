import { useState } from 'react';
import { Alert, View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Dumbbell } from 'lucide-react-native';
import { api } from '../../../../services/api';
import { colors, radius, shadow, spacing, typography } from '../../../../utils/theme';
import { EmptyState } from '../../../../components/common/EmptyState';
import { Loader } from '../../../../components/ui/Loader';
import { Button } from '../../../../components/ui/Button';
import { UserAvatar } from '../../../../components/character/UserAvatar';
import { getWorkoutName } from '../../../../utils/workoutName';
import { PublicProfile, Workout } from '../../../../types';
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

            <Text style={styles.sectionTitle}>Entrenamientos</Text>
          </>
        }
        ListEmptyComponent={
          workoutsLoading ? null : (
            <EmptyState icon={Dumbbell} title="Sin entrenamientos todavía" message="Este perfil no tiene entrenamientos terminados." />
          )
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 50).duration(250)} style={styles.workoutCard}>
            <Text style={styles.workoutName} numberOfLines={1}>
              {getWorkoutName(item)}
            </Text>
            <Text style={styles.workoutMeta}>
              {new Date(item.started_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' · '}
              {(item.sets || []).length} series
            </Text>
          </Animated.View>
        )}
      />
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 72;

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
