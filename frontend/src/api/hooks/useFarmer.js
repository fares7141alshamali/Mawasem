import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../client';

export const farmerKeys = {
  all:      ['farmer'],
  me:       () => [...farmerKeys.all, 'me'],
  products: () => [...farmerKeys.all, 'products'],
  orders:   () => [...farmerKeys.all, 'orders'],
};

// ─── useMyFarmerProfile ───────────────────────────────────────────────────────
// GET /api/v1/farmer/me/
// retry:false so a 403 (user has no farmer profile) doesn't hammer the server.
export function useMyFarmerProfile() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey:  farmerKeys.me(),
    queryFn:   () => apiClient.get('/farmer/me/').then((r) => r.data),
    enabled:   isAuthenticated,
    retry:     false,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── useFarmerProducts ────────────────────────────────────────────────────────
// GET /api/v1/farmer/products/
// Returns all products owned by the authenticated farmer including stock + is_low_stock.
// The ViewSet sets pagination_class=None, so the response is always a plain
// array.  The .results fallback is a safety net in case that ever changes.
export function useFarmerProducts() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey:  farmerKeys.products(),
    queryFn:   () =>
      apiClient.get('/farmer/products/').then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : (d.results ?? []);
      }),
    enabled:   isAuthenticated,
    staleTime: 30 * 1000,
  });
}

// ─── useAddProduct ────────────────────────────────────────────────────────────
// POST /api/v1/farmer/products/
// Accepts a FormData object — axios auto-sets multipart/form-data + boundary.
export function useAddProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData) =>
      apiClient.post('/farmer/products/', formData).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: farmerKeys.products() }),
  });
}

// ─── useUpdateProduct ─────────────────────────────────────────────────────────
// PATCH /api/v1/farmer/products/{id}/  { stock?, selling_price?, is_active?, ... }
export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) =>
      apiClient.patch(`/farmer/products/${id}/`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: farmerKeys.products() }),
  });
}

// ─── useFarmerOrders ─────────────────────────────────────────────────────────
// GET /api/v1/farmer/orders/
// Lists orders that contain at least one product belonging to this farmer.
// Same defensive .results unwrap as useFarmerProducts.
export function useFarmerOrders() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey:  farmerKeys.orders(),
    queryFn:   () =>
      apiClient.get('/farmer/orders/').then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : (d.results ?? []);
      }),
    enabled:           isAuthenticated,
    staleTime:         30 * 1000,
    refetchOnWindowFocus: true,
  });
}

// ─── useUpdateFarmerProfile ───────────────────────────────────────────────────
// PATCH /api/v1/farmer/me/  { farm_name?, city?, phone_number?, bio? }
// Updates the profile cache in-place on success to avoid a re-fetch.
export function useUpdateFarmerProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiClient.patch('/farmer/me/', data).then((r) => r.data),
    onSuccess: (updated) => qc.setQueryData(farmerKeys.me(), updated),
  });
}

// ─── useUpdateOrderStatus ─────────────────────────────────────────────────────
// PATCH /api/v1/farmer/orders/{orderId}/status/
// Allowed transitions: pending→processing/cancelled, processing→shipped/cancelled,
// shipped→completed.
// When status='shipped', delivery_method is required; courier + tracking_number optional.
export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      status,
      notes = '',
      delivery_method = null,
      courier = '',
      tracking_number = '',
    }) =>
      apiClient
        .patch(`/farmer/orders/${orderId}/status/`, {
          status,
          notes,
          delivery_method,
          courier,
          tracking_number,
        })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: farmerKeys.orders() }),
  });
}
