import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../client';

export const addressKeys = {
  all:  ['addresses'],
  list: () => [...addressKeys.all, 'list'],
};

// ─── useAddresses ─────────────────────────────────────────────────────────────
// GET /api/v1/addresses/ — the current user's saved delivery addresses.
export function useAddresses() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: addressKeys.list(),
    queryFn:  () =>
      apiClient.get('/addresses/').then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : (d.results ?? []);
      }),
    enabled:   isAuthenticated,
    staleTime: 60 * 1000,
  });
}

// ─── useCreateAddress ─────────────────────────────────────────────────────────
// POST /api/v1/addresses/  { label, custom_label?, full_address, extra_details?, city?, latitude, longitude, is_default? }
export function useCreateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiClient.post('/addresses/', data).then((r) => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: addressKeys.list() }),
  });
}

// ─── useUpdateAddress ─────────────────────────────────────────────────────────
// PATCH /api/v1/addresses/{id}/
export function useUpdateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) =>
      apiClient.patch(`/addresses/${id}/`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: addressKeys.list() }),
  });
}

// ─── useDeleteAddress ─────────────────────────────────────────────────────────
// DELETE /api/v1/addresses/{id}/
export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiClient.delete(`/addresses/${id}/`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: addressKeys.list() }),
  });
}

// ─── useSetDefaultAddress ─────────────────────────────────────────────────────
// POST /api/v1/addresses/{id}/set-default/
// Optimistic update so the default badge flips instantly instead of waiting
// on a round trip (same pattern as useMarkNotificationsRead).
export function useSetDefaultAddress() {
  const qc = useQueryClient();
  const key = addressKeys.list();

  return useMutation({
    mutationFn: (id) => apiClient.post(`/addresses/${id}/set-default/`).then((r) => r.data),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old) =>
        Array.isArray(old) ? old.map((a) => ({ ...a, is_default: a.id === id })) : old,
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
