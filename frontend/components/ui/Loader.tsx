import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../../utils/theme';

export const Loader = () => (
  <View style={styles.container} accessible accessibilityRole="progressbar" accessibilityLabel="Cargando">
    <ActivityIndicator size="large" color={colors.accent.fire} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
