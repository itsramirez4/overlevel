import { useState } from 'react';
import { TextInput, TextInputProps, View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../../utils/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input = ({ label, error, style, onFocus, onBlur, ...props }: InputProps) => {
  const [focused, setFocused] = useState(false);

  // RN's TextInput has no HTML-style `<label for>` — an adjacent sibling
  // Text is purely visual and never gets announced on its own, so the
  // accessible name has to be set explicitly. The error is folded in too,
  // since there's no RN equivalent of aria-describedby to associate it
  // with the field separately.
  const accessibleLabel = [label || props.placeholder, error].filter(Boolean).join('. ');

  return (
    <View style={styles.container}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          focused && styles.inputFocused,
          !!error && styles.inputError,
          style,
        ]}
        placeholderTextColor={colors.text.muted}
        accessibilityLabel={accessibleLabel || undefined}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
      {!!error && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.bg.secondary,
    borderColor: colors.border.default,
    borderWidth: 1.5,
    color: colors.text.primary,
    paddingVertical: 16,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    fontSize: 16,
  },
  inputFocused: {
    borderColor: colors.accent.fire,
  },
  inputError: {
    borderColor: colors.semantic.error,
  },
  error: {
    ...typography.tiny,
    color: colors.semantic.error,
    marginTop: spacing.xs,
  },
});
