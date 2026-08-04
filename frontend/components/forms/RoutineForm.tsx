import { useState } from 'react';
import { View } from 'react-native';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface RoutineFormData {
  name: string;
  day_of_week?: string;
  notes?: string;
}

interface RoutineFormProps {
  onSubmit: (data: RoutineFormData) => Promise<void>;
  loading?: boolean;
  initialValues?: RoutineFormData;
  submitLabel?: string;
}

export const RoutineForm = ({ onSubmit, loading, initialValues, submitLabel }: RoutineFormProps) => {
  const [name, setName] = useState(initialValues?.name || '');
  const [dayOfWeek, setDayOfWeek] = useState(initialValues?.day_of_week || '');
  const [notes, setNotes] = useState(initialValues?.notes || '');

  return (
    <View>
      <Input label="Nombre" placeholder="Ej. Empuje / Torso" value={name} onChangeText={setName} />
      <Input
        label="Día de la semana (opcional)"
        placeholder="Lunes"
        value={dayOfWeek}
        onChangeText={setDayOfWeek}
      />
      <Input
        label="Notas (opcional)"
        placeholder="Cualquier apunte sobre esta rutina…"
        value={notes}
        onChangeText={setNotes}
        multiline
        style={{ minHeight: 72, textAlignVertical: 'top' }}
      />
      <Button
        label={loading ? 'Guardando…' : submitLabel || 'CREAR RUTINA'}
        loading={loading}
        onPress={() => onSubmit({ name, day_of_week: dayOfWeek || undefined, notes: notes || undefined })}
      />
    </View>
  );
};
