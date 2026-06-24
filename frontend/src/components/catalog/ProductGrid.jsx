import ProductCard from './ProductCard';

// ── Skeleton ──────────────────────────────────────────────────────────────────
function ProductSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="aspect-square rounded-t-xl bg-gray-200" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-1/3 rounded bg-gray-200" />
        <div className="h-4 w-3/4 rounded bg-gray-200" />
        <div className="h-4 w-1/2 rounded bg-gray-200" />
        <div className="mt-3 h-8 rounded-lg bg-gray-200" />
      </div>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────
function ErrorState({ refetch, lang }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center gap-4 py-24 text-center">
      <span className="text-5xl">⚠️</span>
      <p className="text-lg font-semibold text-gray-700">
        {lang === 'ar' ? 'تعذّر الاتصال بالخادم' : 'Could not reach the server'}
      </p>
      <p className="text-sm text-gray-400">
        {lang === 'ar'
          ? 'تأكد من تشغيل Django على المنفذ 8000'
          : 'Make sure Django is running on port 8000'}
      </p>
      <button
        onClick={refetch}
        className="mt-1 rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700"
      >
        {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
      </button>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ t }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center gap-3 py-24 text-gray-400">
      <span className="text-5xl">🌾</span>
      <p className="text-base font-medium">{t.noProducts}</p>
    </div>
  );
}

// ── ProductGrid ───────────────────────────────────────────────────────────────
// isFetching (but not isLoading) = background refresh after a filter change —
// we dim the grid rather than replacing it with skeletons so the user keeps
// their visual context.
export default function ProductGrid({ query, t, lang }) {
  const { data, isLoading, isError, isFetching, refetch } = query;

  return (
    <div
      className={`grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 transition-opacity duration-200 ${
        isFetching && !isLoading ? 'opacity-60' : 'opacity-100'
      }`}
    >
      {isLoading &&
        Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}

      {isError && <ErrorState refetch={refetch} lang={lang} />}

      {!isLoading && !isError && data?.results?.length === 0 && (
        <EmptyState t={t} />
      )}

      {data?.results?.map((product) => (
        <ProductCard key={product.id} product={product} t={t} lang={lang} />
      ))}
    </div>
  );
}
