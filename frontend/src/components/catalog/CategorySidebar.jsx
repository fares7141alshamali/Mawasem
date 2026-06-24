import { useState } from 'react';

// ── SidebarItem ───────────────────────────────────────────────────────────────
function SidebarItem({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-1.5 text-start text-sm font-medium transition ${
        active
          ? 'bg-green-50 text-green-700'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="truncate">{label}</span>
        {count != null && (
          <span
            className={`shrink-0 rounded-full text-xs tabular-nums ${
              active ? 'text-green-500' : 'text-gray-400'
            }`}
          >
            {count}
          </span>
        )}
      </span>
    </button>
  );
}

// ── CategoryNode — handles parent + collapsible children ──────────────────────
function CategoryNode({ cat, activeSlug, onSelect, lang }) {
  const name = lang === 'ar' ? cat.name_ar : cat.name_en;
  const hasChildren = cat.children?.length > 0;
  const isActive = activeSlug === cat.slug;
  const childIsActive = cat.children?.some((c) => c.slug === activeSlug);

  // Auto-expand if a child is selected
  const [expanded, setExpanded] = useState(childIsActive);

  return (
    <li>
      <div className="flex items-center gap-1">
        <div className="flex-1">
          <SidebarItem
            label={name}
            count={cat.product_count}
            active={isActive}
            onClick={() => onSelect(cat.slug)}
          />
        </div>
        {hasChildren && (
          <button
            aria-label="expand"
            onClick={() => setExpanded((e) => !e)}
            className="rounded p-1 text-gray-300 transition hover:text-gray-500"
          >
            <svg
              className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m8.25 4.5 7.5 7.5-7.5 7.5"
              />
            </svg>
          </button>
        )}
      </div>

      {hasChildren && expanded && (
        <ul className="ms-3 mt-0.5 space-y-0.5 border-s border-gray-100 ps-2">
          {cat.children.map((child) => (
            <li key={child.id}>
              <SidebarItem
                label={lang === 'ar' ? child.name_ar : child.name_en}
                count={child.product_count}
                active={activeSlug === child.slug}
                onClick={() => onSelect(child.slug)}
              />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

// ── CategorySidebar ───────────────────────────────────────────────────────────
export default function CategorySidebar({ query, activeSlug, onSelect, t, lang }) {
  return (
    <nav aria-label={t.categories}>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        {t.categories}
      </h2>

      <ul className="space-y-0.5">
        {/* All categories */}
        <li>
          <SidebarItem
            label={t.allCategories}
            active={!activeSlug}
            onClick={() => onSelect('')}
          />
        </li>

        {/* Skeleton while loading */}
        {query.isLoading &&
          Array.from({ length: 5 }).map((_, i) => (
            <li key={i}>
              <div className="mx-1 h-7 animate-pulse rounded-lg bg-gray-100" />
            </li>
          ))}

        {/* Real categories */}
        {query.data?.map((cat) => (
          <CategoryNode
            key={cat.id}
            cat={cat}
            activeSlug={activeSlug}
            onSelect={onSelect}
            lang={lang}
          />
        ))}
      </ul>
    </nav>
  );
}
