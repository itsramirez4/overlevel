import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react-native';
import { api } from '../../../services/api';
import { colors, radius, shadow, spacing, typography } from '../../../utils/theme';
import { Header } from '../../../components/common/Header';
import { EmptyState } from '../../../components/common/EmptyState';
import { Input } from '../../../components/ui/Input';
import { UserAvatar } from '../../../components/character/UserAvatar';
import { authStore } from '../../../stores/authStore';
import { PublicUser, PublicProfile } from '../../../types';

export default function SocialScreen() {
  const router = useRouter();
  const user = authStore((state) => state.user);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Without this, every keystroke fired its own /users/search request —
  // each a distinct query-key, so React Query has nothing to dedupe/cancel.
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const { data: ownProfile } = useQuery<PublicProfile>({
    queryKey: ['users', user?.id],
    queryFn: () => api.get(`/users/${user!.id}`).then((r) => r.data),
    enabled: !!user?.id,
  });

  const { data: results, isLoading } = useQuery<PublicUser[]>({
    queryKey: ['users', 'search', debouncedQuery],
    queryFn: () => api.get('/users/search', { params: { q: debouncedQuery } }).then((r) => r.data),
    enabled: debouncedQuery.trim().length > 0,
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.content}>
        <Header title="Social" subtitle="Sigue a otros usuarios y mira sus entrenamientos" showLogo />

        {ownProfile && (
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => router.push(`/social/connections?id=${user!.id}&type=followers`)}
              activeOpacity={0.7}
            >
              <Text style={styles.statValue}>{ownProfile.followers_count}</Text>
              <Text style={styles.statLabel}>Seguidores</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => router.push(`/social/connections?id=${user!.id}&type=following`)}
              activeOpacity={0.7}
            >
              <Text style={styles.statValue}>{ownProfile.following_count}</Text>
              <Text style={styles.statLabel}>Seguidos</Text>
            </TouchableOpacity>
          </View>
        )}

        <Input placeholder="Buscar por nombre de usuario…" value={query} onChangeText={setQuery} autoCapitalize="none" />
      </View>

      <FlatList
        data={debouncedQuery.trim() ? results || [] : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          isLoading || !debouncedQuery.trim() ? null : (
            <EmptyState icon={Search} title="Sin resultados" message="Solo se pueden encontrar perfiles públicos." />
          )
        }
        renderItem={({ item, index }) => (
          <AnimatedTouchable
            entering={FadeInDown.delay(index * 50).duration(250)}
            style={styles.card}
            onPress={() => router.push(`/social/user/${item.id}`)}
            activeOpacity={0.7}
          >
            <UserAvatar characterType={item.character_type} size={36} />
            <View style={styles.info}>
              <Text style={styles.username}>{item.username}</Text>
              {!!item.full_name && <Text style={styles.fullName}>{item.full_name}</Text>}
            </View>
          </AnimatedTouchable>
        )}
      />
    </SafeAreaView>
  );
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: spacing.lg,
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
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  info: {
    flex: 1,
  },
  username: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '700',
  },
  fullName: {
    ...typography.tiny,
    color: colors.text.secondary,
    marginTop: 2,
  },
});
