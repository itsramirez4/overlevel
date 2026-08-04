import { Tabs } from 'expo-router';
import { BarChart3, Dumbbell, Home, ListChecks, User } from 'lucide-react-native';
import { colors } from '../../utils/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent.fire,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: {
          backgroundColor: colors.bg.secondary,
          borderTopColor: colors.border.subtle,
          borderTopWidth: 1,
          height: 64,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <Home size={22} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Entrenar',
          tabBarIcon: ({ color }) => <Dumbbell size={22} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: 'Rutinas',
          tabBarIcon: ({ color }) => <ListChecks size={22} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analíticas',
          tabBarIcon: ({ color }) => <BarChart3 size={22} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <User size={22} color={color} strokeWidth={2.2} />,
        }}
      />
    </Tabs>
  );
}
