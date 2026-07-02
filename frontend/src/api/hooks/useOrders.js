import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../client';

export function useOrders() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey:  ['orders'],
    queryFn:   () =>
      apiClient.get('/orders/').then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : (d.results ?? []);
      }),
    enabled:   isAuthenticated,
    staleTime: 30_000,
  });
}

export function useOrder(orderId, isFarmer) {
  const endpoint = isFarmer ? `/farmer/orders/${orderId}/` : `/orders/${orderId}/`;
  return useQuery({
    queryKey:  ['order', orderId, isFarmer ? 'farmer' : 'consumer'],
    queryFn:   () => apiClient.get(endpoint).then((r) => r.data),
    enabled:   !!orderId,
    staleTime: 30_000,
    retry:     false,
  });
}
