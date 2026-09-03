import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';

export interface BodyMeasurement {
  id: string;
  user_id: string;
  logged_at: string;
  waist_cm?: number | null;
  chest_cm?: number | null;
  hips_cm?: number | null;
  bicep_cm?: number | null;
  thigh_cm?: number | null;
  neck_cm?: number | null;
  body_fat_pct?: number | null;
  created_at: string;
}

export type LoggableMeasurement = Partial<
  Pick<BodyMeasurement, 'waist_cm' | 'chest_cm' | 'hips_cm' | 'bicep_cm' | 'thigh_cm' | 'neck_cm' | 'body_fat_pct'>
>;

export class MeasurementService {
  async list(userId: string, days = 365): Promise<BodyMeasurement[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabaseAdmin
      .from('body_measurements')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_at', since.toISOString())
      .order('logged_at', { ascending: true });

    if (error) throw new AppError('Failed to fetch body measurements');
    return (data || []) as BodyMeasurement[];
  }

  async log(userId: string, input: LoggableMeasurement): Promise<BodyMeasurement> {
    const { data, error } = await supabaseAdmin
      .from('body_measurements')
      .insert({ user_id: userId, ...input })
      .select()
      .single();

    if (error || !data) throw new AppError('Failed to log body measurement');
    return data as BodyMeasurement;
  }

  async remove(id: string, userId: string): Promise<void> {
    const { data, error } = await supabaseAdmin
      .from('body_measurements')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();

    if (error) throw new AppError('Failed to delete body measurement');
    if (!data) throw new AppError('Body measurement not found', 404);
  }
}

export const measurementService = new MeasurementService();
