import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart3, Dumbbell, Home, ListChecks, User, type LucideIcon } from 'lucide-react-native';
import { colors, spacing } from '../../utils/theme';

const TAB_CONFIG: { name: string; title: string; icon: LucideIcon }[] = [
  { name: 'dashboard', title: 'Inicio', icon: Home },
  { name: 'workouts', title: 'Entrenar', icon: Dumbbell },
  { name: 'routines', title: 'Rutinas', icon: ListChecks },
  { name: 'analytics', title: 'Analíticas', icon: BarChart3 },
  { name: 'profile', title: 'Perfil', icon: User },
];

/**
 * react-navigation's built-in web tab bar clips the label under its own
 * fixed-height item container — no amount of outer padding fixes that,
 * since the cut happens inside that container, above the padding. Owning
 * the layout outright sidesteps it entirely.
 */
function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 12);

  return (
    <View style={[styles.bar, { paddingBottom: bottomPadding }]}>
      {state.routes.map((route: any, index: number) => {
        const config = TAB_CONFIG.find((t) => t.name === route.name);
        if (!config) return null;

        const focused = state.index === index;
        const color = focused ? colors.accent.fire : colors.text.secondary;
        const Icon = config.icon;

        const handlePress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity key={route.key} style={styles.item} onPress={handlePress} activeOpacity={0.7}>
            <Icon size={22} color={color} strokeWidth={2.2} />
            <Text style={[styles.label, { color }]} numberOfLines={1}>
              {config.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="workouts" options={{ title: 'Entrenar' }} />
      <Tabs.Screen name="routines" options={{ title: 'Rutinas' }} />
      <Tabs.Screen name="analytics" options={{ title: 'Analíticas' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.bg.secondary,
    borderTopColor: colors.border.subtle,
    borderTopWidth: 1,
    paddingTop: spacing.sm,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
  },
  label: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
});
