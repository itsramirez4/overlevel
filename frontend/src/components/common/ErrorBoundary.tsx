import { Component, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../utils/theme';
import { Button } from '../ui/Button';
import { reportError } from '../../services/errorReporting';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Class component is required here — componentDidCatch/getDerivedStateFromError
 * have no hooks equivalent. Without this, any uncaught render error in any
 * screen takes down the entire app to a blank screen (or Expo's dev red-box,
 * which doesn't exist in production) with no way to recover short of a
 * full restart — same class of gap as the backend's unhandledRejection/
 * uncaughtException handlers, just on the other side of the stack.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('Uncaught render error:', error, info.componentStack);
    reportError(error, { componentStack: info.componentStack, context: 'ErrorBoundary' });
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container} accessible accessibilityRole="alert">
          <AlertTriangle size={40} color={colors.semantic.error} strokeWidth={1.8} />
          <Text style={styles.title}>Algo ha ido mal</Text>
          <Text style={styles.message}>
            La app encontró un error inesperado. Puedes intentar continuar o cerrar y volver a abrirla si el
            problema persiste.
          </Text>
          <Button label="INTENTAR DE NUEVO" onPress={this.handleReset} style={styles.button} />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.primary,
    padding: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  button: {
    borderRadius: radius.md,
    alignSelf: 'stretch',
  },
});
