import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../client';

export const cartKeys = {
  all:    ['cart'],
  detail: () => [...cartKeys.all, 'detail'],
};

// ─── useCart ──────────────────────────────────────────────────────────────────
// Fetches GET /cart/ — only fires when the user is authenticated.
// Returns: { id, items, total_price, item_count }
export function useCart() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: cartKeys.detail(),
    queryFn:  () => apiClient.get('/cart/').then((r) => r.data),
    enabled:  isAuthenticated,
    staleTime: 30 * 1000,         // 30 s — cart is transactional data
    refetchOnWindowFocus: true,   // re-sync when user switches back to the tab
  });
}

// ─── useCartCount ─────────────────────────────────────────────────────────────
// Reads item_count directly from the cache — no extra network request.
// The header badge subscribes to this; optimistic mutations below keep it live.
export function useCartCount() {
  const { data } = useCart();
  return data?.item_count ?? 0;
}

// ─── helpers ──────────────────────────────────────────────────────────────────
// Shared optimistic-update helpers used by add / remove mutations.

function optimisticAdd(qc, delta) {
  qc.cancelQueries({ queryKey: cartKeys.detail() });
  const prev = qc.getQueryData(cartKeys.detail());
  if (prev) {
    qc.setQueryData(cartKeys.detail(), {
      ...prev,
      item_count: Math.max(0, (prev.item_count ?? 0) + delta),
    });
  }
  return prev;                   // returned as context so onError can roll back
}

function rollback(qc, ctx) {
  if (ctx?.prev) qc.setQueryData(cartKeys.detail(), ctx.prev);
}

// ─── useAddToCart ─────────────────────────────────────────────────────────────
// POST /cart/add/  { product_id, quantity }
// Optimistically increments item_count so the badge updates instantly.
export function useAddToCart() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, quantity = 1 }) =>
      apiClient
        .post('/cart/add/', { product_id: productId, quantity })
        .then((r) => r.data),

    onMutate: ({ quantity = 1 }) => ({ prev: optimisticAdd(qc, quantity) }),
    onError:  (_, __, ctx) => rollback(qc, ctx?.prev ? ctx : { prev: ctx?.prev }),
    onSettled: () => qc.invalidateQueries({ queryKey: cartKeys.all }),
  });
}

// ─── useUpdateCartItem ────────────────────────────────────────────────────────
// PATCH /cart/update-item/{itemId}/  { quantity }
// Optimistically updates item quantity and recalculates cart total.
export function useUpdateCartItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, quantity }) =>
      apiClient
        .patch(`/cart/update-item/${itemId}/`, { quantity })
        .then((r) => r.data),

    onMutate: ({ itemId, quantity }) => {
      qc.cancelQueries({ queryKey: cartKeys.detail() });
      const prev = qc.getQueryData(cartKeys.detail());
      if (prev) {
        const updatedItems = prev.items.map((item) => {
          if (item.id !== itemId) return item;
          const unitPrice = parseFloat(item.product.current_price);
          return { ...item, quantity, total_price: (unitPrice * quantity).toFixed(2) };
        });
        const newTotal = updatedItems
          .reduce((sum, item) => sum + parseFloat(item.total_price), 0)
          .toFixed(2);
        qc.setQueryData(cartKeys.detail(), { ...prev, items: updatedItems, total_price: newTotal });
      }
      return { prev };
    },
    onError:   (_, __, ctx) => rollback(qc, ctx),
    onSettled: () => qc.invalidateQueries({ queryKey: cartKeys.all }),
  });
}

// ─── useRemoveCartItem ────────────────────────────────────────────────────────
// DELETE /cart/remove-item/{itemId}/
// Optimistically removes the item from the list and recalculates the total.
export function useRemoveCartItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (itemId) => apiClient.delete(`/cart/remove-item/${itemId}/`),

    onMutate: (itemId) => {
      qc.cancelQueries({ queryKey: cartKeys.detail() });
      const prev = qc.getQueryData(cartKeys.detail());
      if (prev) {
        const updatedItems = prev.items.filter((item) => item.id !== itemId);
        const newTotal = updatedItems
          .reduce((sum, item) => sum + parseFloat(item.total_price), 0)
          .toFixed(2);
        qc.setQueryData(cartKeys.detail(), {
          ...prev,
          items:      updatedItems,
          item_count: updatedItems.length,
          total_price: newTotal,
        });
      }
      return { prev };
    },
    onError:   (_, __, ctx) => rollback(qc, ctx),
    onSettled: () => qc.invalidateQueries({ queryKey: cartKeys.all }),
  });
}

// ─── useClearCart ─────────────────────────────────────────────────────────────
// POST /cart/clear/
// Optimistically zeros out item_count.
export function useClearCart() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.post('/cart/clear/'),

    onMutate: () => {
      qc.cancelQueries({ queryKey: cartKeys.detail() });
      const prev = qc.getQueryData(cartKeys.detail());
      if (prev) qc.setQueryData(cartKeys.detail(), { ...prev, item_count: 0, items: [] });
      return { prev };
    },
    onError:   (_, __, ctx) => rollback(qc, ctx),
    onSettled: () => qc.invalidateQueries({ queryKey: cartKeys.all }),
  });
}
