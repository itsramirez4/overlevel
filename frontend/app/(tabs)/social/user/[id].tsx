import { useState } from 'react';
import { Alert, View, Text, Image, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Dumbbell } from 'lucide-react-native';
import { api } from '../../../../services/api';
import { colors, radius, shadow, spacing, typography } from '../../../../utils/theme';
import { EmptyState } from '../../../../components/common/EmptyState';
import { Loader } from '../../../../components/ui/Loader';
import { Button } from '../../../../components/ui/Button';
import { getWorkoutName } from '../../../../utils/workoutName';
import { PublicProfile } from '../../../../types';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [followBusy, setFollowBusy] = useState(false);

  const { data: profile, isLoading } = useQuery<PublicProfile>({
    queryKey: ['users', id],
    queryFn: () => api.get(`/users/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: workouts, isLoading: workoutsLoading } = useQuery({
    queryKey: ['users', id, 'workouts'],
    queryFn: () => api.get(`/users/${id}/workouts`).then((r) => r.data),
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

  const initial = (profile.username || '?').charAt(0).toUpperCase();

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
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                {profile.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{initial}</Text>
                )}
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
        renderItem={({ item }: any) => (
          <View style={styles.workoutCard}>
            <Text style={styles.workoutName} numberOfLines={1}>
              {getWorkoutName(item)}
            </Text>
            <Text style={styles.workoutMeta}>
              {new Date(item.started_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' · '}
              {(item.sets || []).length} series
            </Text>
          </View>
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
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.accent.fire,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    ...typography.h1,
    color: colors.accent.fire,
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
