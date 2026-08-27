import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { View, Text, StyleSheet } from 'react-native';
import { z } from 'zod';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { loginSchema } from '../../utils/validators';
import { colors } from '../../utils/theme';

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => Promise<void>;
  loading?: boolean;
}

export const LoginForm = ({ onSubmit, loading }: LoginFormProps) => {
  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <View>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <Input placeholder="Email" keyboardType="email-address" value={value} onChangeText={onChange} />
        )}
      />
      {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <Input placeholder="Password" secureTextEntry value={value} onChangeText={onChange} />
        )}
      />
      {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}

      <Button label="Login" loading={loading} onPress={handleSubmit(onSubmit)} />
    </View>
  );
};

const styles = StyleSheet.create({
  error: {
    color: colors.accent.fire,
    marginBottom: 12,
    marginTop: -8,
  },
});
