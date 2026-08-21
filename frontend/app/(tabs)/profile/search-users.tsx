import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Search, User as UserIcon } from 'lucide-react-native';
import { api } from '../../../services/api';
import { colors, radius, shadow, spacing, typography } from '../../../utils/theme';
import { EmptyState } from '../../../components/common/EmptyState';
import { Input } from '../../../components/ui/Input';
import { PublicUser } from '../../../types';

export default function SearchUsersScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const { data: results, isLoading } = useQuery<PublicUser[]>({
    queryKey: ['users', 'search', query],
    queryFn: () => api.get('/users/search', { params: { q: query } }).then((r) => r.data),
    enabled: query.trim().length > 0,
  });

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
        <Text style={styles.title} accessibilityRole="header">
          Buscar usuarios
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <Input placeholder="Buscar por nombre de usuario…" value={query} onChangeText={setQuery} autoCapitalize="none" />
      </View>

      <FlatList
        data={query.trim() ? results || [] : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          isLoading || !query.trim() ? null : (
            <EmptyState
              icon={Search}
              title="Sin resultados"
              message="Solo se pueden encontrar perfiles públicos."
            />
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/profile/user/${item.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <UserIcon size={18} color={colors.accent.fire} strokeWidth={2} />
            </View>
            <View style={styles.info}>
              <Text style={styles.username}>{item.username}</Text>
              {!!item.full_name && <Text style={styles.fullName}>{item.full_name}</Text>}
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

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
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
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
