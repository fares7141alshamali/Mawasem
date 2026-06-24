import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLang } from '../contexts/LanguageContext';
import { useCategories, useProducts } from '../api/hooks/useCatalog';
import CategorySidebar from '../components/catalog/CategorySidebar';
import ProductGrid from '../components/catalog/ProductGrid';

const PAGE_SIZE = 20;

// ── CategoryPill — horizontal scroll chip used on mobile ─────────────────────
function CategoryPill({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
        active
          ? 'border-green-600 bg-green-600 text-white'
          : 'border-gray-200 bg-white text-gray-600 hover:border-green-400 hover:text-green-700'
      }`}
    >
      {label}
      {count != null && (
        <span className={`ms-1.5 text-xs ${active ? 'text-green-100' : 'text-gray-400'}`}>
          ({count})
        </span>
      )}
    </button>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, onPageChange, lang }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-10 flex items-center justify-center gap-3">
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
      >
        {lang === 'ar' ? '→ السابق' : '← Prev'}
      </button>

      <span className="text-sm text-gray-500 tabular-nums">
        {page} / {totalPages}
      </span>

      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
      >
        {lang === 'ar' ? '← التالي' : 'Next →'}
      </button>
    </div>
  );
}

// ── Home ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const { t, lang } = useLang();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Filter state — initialised from URL so links and back-button work ──────
  const [search, setSearch]   = useState(searchParams.get('search')   ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [ordering, setOrdering] = useState(searchParams.get('ordering') ?? '');
  const [page, setPage]       = useState(Number(searchParams.get('page')) || 1);

  // Debounce search input 400 ms so the API isn't called on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(id);
  }, [search]);

  // Keep URL in sync with filters (replace so it doesn't pollute history)
  useEffect(() => {
    const params = {};
    if (debouncedSearch) params.search   = debouncedSearch;
    if (category)        params.category = category;
    if (ordering)        params.ordering = ordering;
    if (page > 1)        params.page     = String(page);
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, category, ordering, page, setSearchParams]);

  // ── Data ──────────────────────────────────────────────────────────────────
  const categoriesQuery = useCategories();
  const productsQuery   = useProducts({
    search: debouncedSearch,
    category,
    ordering,
    page,
  });

  const totalPages = productsQuery.data
    ? Math.ceil(productsQuery.data.count / PAGE_SIZE)
    : 0;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const selectCategory = (slug) => { setCategory(slug); setPage(1); };
  const changeOrdering = (val)  => { setOrdering(val);  setPage(1); };
  const changeSearch   = (val)  => { setSearch(val);    setPage(1); };

  return (
    <div className="flex flex-col gap-6">

      {/* ── Mobile: horizontal category pills ──────────────────────────────── */}
      <div className="lg:hidden -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <CategoryPill
          label={t.allCategories}
          active={!category}
          onClick={() => selectCategory('')}
        />
        {categoriesQuery.data?.map((cat) => (
          <CategoryPill
            key={cat.id}
            label={lang === 'ar' ? cat.name_ar : cat.name_en}
            count={cat.product_count}
            active={category === cat.slug}
            onClick={() => selectCategory(cat.slug)}
          />
        ))}
      </div>

      {/* ── Two-column layout ────────────────────────────────────────────────── */}
      <div className="flex gap-8">

        {/* Sidebar — desktop only */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <CategorySidebar
            query={categoriesQuery}
            activeSlug={category}
            onSelect={selectCategory}
            t={t}
            lang={lang}
          />
        </aside>

        {/* Main area */}
        <div className="min-w-0 flex-1">

          {/* ── Filter / sort bar ──────────────────────────────────────────── */}
          <div className="mb-6 flex flex-wrap items-center gap-3">

            {/* Search */}
            <div className="relative min-w-[200px] flex-1">
              <input
                type="search"
                value={search}
                onChange={(e) => changeSearch(e.target.value)}
                placeholder={t.searchPlaceholder}
                dir="auto"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 ps-9 pe-3 text-sm outline-none transition focus:border-green-400 focus:bg-white focus:ring-2 focus:ring-green-100"
              />
              <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-gray-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </span>
            </div>

            {/* Sort */}
            <select
              value={ordering}
              onChange={(e) => changeOrdering(e.target.value)}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-100"
            >
              <option value="">{t.sortBy}</option>
              <option value="selling_price">{t.priceAsc}</option>
              <option value="-selling_price">{t.priceDesc}</option>
              <option value="-stock">{t.stock}</option>
            </select>

            {/* Result count */}
            {productsQuery.data && (
              <span className="ms-auto text-sm text-gray-400 tabular-nums">
                {productsQuery.data.count}{' '}
                {lang === 'ar' ? 'منتج' : 'products'}
              </span>
            )}
          </div>

          {/* ── Product grid ────────────────────────────────────────────────── */}
          <ProductGrid query={productsQuery} t={t} lang={lang} />

          {/* ── Pagination ──────────────────────────────────────────────────── */}
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            lang={lang}
          />
        </div>
      </div>
    </div>
  );
}
