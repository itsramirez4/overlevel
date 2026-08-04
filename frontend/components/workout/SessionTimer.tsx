import { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors } from '../../utils/theme';

interface SessionTimerProps {
  startedAt: string;
}

export const SessionTimer = ({ startedAt }: SessionTimerProps) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <Text style={styles.timer}>
      {minutes}:{seconds.toString().padStart(2, '0')}
    </Text>
  );
};

const styles = StyleSheet.create({
  timer: {
    color: colors.accent.fire,
    fontSize: 24,
    fontWeight: '800',
  },
});
