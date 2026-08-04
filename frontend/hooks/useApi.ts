import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export const useApiQuery = <T = any>(key: string[], url: string) => {
  return useQuery<T>({
    queryKey: key,
    queryFn: () => api.get(url).then((r) => r.data),
  });
};

export const useApiMutation = <T = any>(url: string, invalidateKey?: string[]) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: T) => api.post(url, body).then((r) => r.data),
    onSuccess: () => {
      if (invalidateKey) queryClient.invalidateQueries({ queryKey: invalidateKey });
    },
  });
};
