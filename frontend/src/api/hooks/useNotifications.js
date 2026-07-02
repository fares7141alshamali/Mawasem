import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../client';

// Cache keys are role-scoped so farmer and consumer caches never collide.
const notifKey = (role) => ['notifications', role];

/**
 * Fetch the current user's notifications from the appropriate endpoint.
 *
 * Farmers  → GET /api/v1/farmer/notifications/
 * Consumers → GET /api/v1/consumer/notifications/
 *
 * Polls every 30 s so the badge stays live without a WebSocket.
 */
export function useNotifications() {
  const { isAuthenticated, isFarmer } = useAuth();
  const role     = isFarmer ? 'farmer' : 'consumer';
  const endpoint = isFarmer ? '/farmer/notifications/' : '/consumer/notifications/';

  return useQuery({
    queryKey:        notifKey(role),
    queryFn:         () =>
      apiClient.get(endpoint).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : (d.results ?? []);
      }),
    enabled:         isAuthenticated,
    refetchInterval: 30 * 1000,
    staleTime:       15 * 1000,
    retry:           false,
  });
}

/**
 * Mark all unread notifications as read for the current user.
 *
 * Uses an optimistic update so the badge clears instantly, then rolls back on
 * error and refetches to reconcile.
 */
export function useMarkNotificationsRead() {
  const { isFarmer } = useAuth();
  const qc       = useQueryClient();
  const role     = isFarmer ? 'farmer' : 'consumer';
  const endpoint = isFarmer
    ? '/farmer/notifications/mark-read/'
    : '/consumer/notifications/mark-read/';
  const key = notifKey(role);

  return useMutation({
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old) =>
        Array.isArray(old) ? old.map((n) => ({ ...n, is_read: true })) : old,
      );
      return { prev };
    },
    mutationFn: () => apiClient.post(endpoint).then((r) => r.data),
    onError:    (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(key, ctx.prev);
    },
    onSettled:  () => qc.invalidateQueries({ queryKey: key }),
  });
}
