import { useQuery } from '@tanstack/react-query';
import apiClient from '../client';

// ─── Query key factory ────────────────────────────────────────────────────────
// Centralised key factory keeps invalidation predictable:
//   queryClient.invalidateQueries({ queryKey: catalogKeys.all })  → bust everything
//   queryClient.invalidateQueries({ queryKey: catalogKeys.products() }) → only products
export const catalogKeys = {
  all: ['catalog'],
  categories: () => [...catalogKeys.all, 'categories'],
  products: (filters) => [...catalogKeys.all, 'products', filters ?? {}],
  product: (slug) => [...catalogKeys.all, 'product', slug],
};

// ─── useCategories ────────────────────────────────────────────────────────────
// Fetches GET /categories/ — top-level list with nested children and counts.
// Categories are structural data; 10-minute stale window is appropriate.
export function useCategories() {
  return useQuery({
    queryKey: catalogKeys.categories(),
    queryFn: () => apiClient.get('/categories/').then((r) => r.data),
    staleTime: 10 * 60 * 1000,  // 10 min
    gcTime:    30 * 60 * 1000,  // 30 min
  });
}

// ─── useProduct ──────────────────────────────────────────────────────────────
// Fetches GET /products/{slug}/ — full detail including descriptions and images.
export function useProduct(slug) {
  return useQuery({
    queryKey: catalogKeys.product(slug),
    queryFn: () => apiClient.get(`/products/${slug}/`).then((r) => r.data),
    staleTime: 2 * 60 * 1000,
    gcTime:    10 * 60 * 1000,
    enabled: Boolean(slug),
  });
}

// ─── useProducts ─────────────────────────────────────────────────────────────
// Fetches GET /products/ with optional filter / search / ordering params.
//
// Supported params (all optional):
//   search      string  – full-text search across name_en / name_ar
//   category    string  – category slug (fan-out: includes child categories)
//   min_price   number  – lower price bound
//   max_price   number  – upper price bound
//   ordering    string  – e.g. "selling_price", "-selling_price", "stock"
//   page        number  – page number for pagination
//
// placeholderData keeps the previous result visible while a new filter loads,
// preventing the UI from blanking out on every keystroke.
export function useProducts(filters = {}) {
  // Strip undefined / empty-string values so they don't pollute the query string.
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''),
  );

  return useQuery({
    queryKey: catalogKeys.products(params),
    queryFn: () => apiClient.get('/products/', { params }).then((r) => r.data),
    staleTime: 2 * 60 * 1000,           // 2 min
    gcTime:    10 * 60 * 1000,          // 10 min
    placeholderData: (prev) => prev,    // smooth filter / page transitions
  });
}
