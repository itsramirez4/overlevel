import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../utils/theme';

export const Footer = () => (
  <View style={styles.container}>
    <Text style={styles.text}>Overlevel</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  text: {
    color: colors.text.muted,
    fontSize: 12,
  },
});
