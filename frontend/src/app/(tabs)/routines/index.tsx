import { TouchableOpacity, View, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ListChecks, Trash } from 'lucide-react-native';
import { api } from '../../../services/api';
import { colors, radius, spacing } from '../../../utils/theme';
import { Header } from '../../../components/common/Header';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/common/EmptyState';
import { RoutineCard } from '../../../components/routine/RoutineCard';
import { Routine } from '../../../types';

export default function RoutinesScreen() {
  const router = useRouter();

  const { data: routines, isLoading } = useQuery({
    queryKey: ['routines'],
    queryFn: () => api.get<Routine[]>('/routines').then((r) => r.data),
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.content}>
        <Header
          title="Rutinas"
          subtitle="Planifica tus sesiones"
          showLogo
          action={
            <TouchableOpacity
              onPress={() => router.push('/routines/trash')}
              hitSlop={10}
              style={styles.trashButton}
              accessibilityLabel="Ver papelera"
            >
              <Trash size={18} color={colors.text.secondary} strokeWidth={2} />
            </TouchableOpacity>
          }
        />

        <Button
          label="NUEVA RUTINA"
          onPress={() => router.push('/routines/create')}
          style={styles.createButton}
        />

        <FlatList
          data={routines || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            isLoading ? null : (
              <EmptyState
                icon={ListChecks}
                title="Sin rutinas todavía"
                message="Crea tu primera rutina para empezar a planificar."
              />
            )
          }
          renderItem={({ item, index }) => (
            <RoutineCard routine={item} index={index} onPress={() => router.push(`/routines/${item.id}`)} />
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  createButton: {
    marginBottom: spacing.lg,
  },
  trashButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
});
