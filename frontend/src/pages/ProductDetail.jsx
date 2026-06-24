import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProduct } from '../api/hooks/useCatalog';
import { useAddToCart } from '../api/hooks/useCart';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';

// ─── Sub-components ───────────────────────────────────────────────────────────

function FarmerBadge({ farmer, t }) {
  if (!farmer) return null;
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-1.5">
      <span className="text-base">🌾</span>
      <div className="flex flex-col leading-tight">
        <span className="text-xs text-green-600">{t.soldBy}</span>
        <span className="text-sm font-semibold text-green-800">{farmer.farm_name}</span>
      </div>
      {farmer.is_verified && (
        <span className="ms-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
          ✓ {t.verified}
        </span>
      )}
    </div>
  );
}

function DiscountBadge({ pct }) {
  if (pct <= 0) return null;
  return (
    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-sm font-bold text-red-600">
      -{pct}%
    </span>
  );
}

function QuantitySelector({ qty, onChange, max }) {
  return (
    <div className="inline-flex items-center gap-0 rounded-xl border border-gray-200 bg-gray-50">
      <button
        onClick={() => onChange(Math.max(1, qty - 1))}
        aria-label="decrease"
        className="flex h-10 w-10 items-center justify-center rounded-s-xl text-lg font-semibold text-gray-600 transition hover:bg-gray-100 active:bg-gray-200"
      >
        −
      </button>
      <span className="min-w-[2.5rem] select-none text-center text-sm font-bold text-gray-800">
        {qty}
      </span>
      <button
        onClick={() => onChange(Math.min(max ?? 999, qty + 1))}
        aria-label="increase"
        className="flex h-10 w-10 items-center justify-center rounded-e-xl text-lg font-semibold text-gray-600 transition hover:bg-gray-100 active:bg-gray-200"
      >
        +
      </button>
    </div>
  );
}

function ImageGallery({ mainImage, images, productName }) {
  const [active, setActive] = useState(null);

  const displayed = active ?? mainImage;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-50 shadow-sm">
        {displayed ? (
          <img
            src={displayed}
            alt={productName}
            className="h-full w-full object-cover transition-all duration-300"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-8xl text-gray-200">
            🌿
          </span>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img) => (
            <button
              key={img.id}
              onClick={() => setActive(img.image)}
              className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition ${
                (active ?? mainImage) === img.image
                  ? 'border-green-500'
                  : 'border-transparent hover:border-gray-300'
              }`}
            >
              <img
                src={img.image}
                alt={img.alt_text || productName}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProductDetail() {
  const { slug } = useParams();
  const { lang, t } = useLang();
  const { isAuthenticated } = useAuth();
  const { data: product, isLoading, isError } = useProduct(slug);
  const { mutate: addToCart, isPending, isSuccess } = useAddToCart();
  const [qty, setQty] = useState(1);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-gray-400">
        <p className="text-lg">{t.loading}</p>
      </div>
    );
  }

  // ── Error / not found ────────────────────────────────────────────────────
  if (isError || !product) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-gray-400">
        <span className="text-5xl">🌾</span>
        <p className="text-lg font-medium">{t.noProducts}</p>
        <Link
          to="/products"
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          {t.backToProducts}
        </Link>
      </div>
    );
  }

  // ── Derived values ───────────────────────────────────────────────────────
  const name        = lang === 'ar' ? product.name_ar        : product.name_en;
  const description = lang === 'ar' ? product.description_ar : product.description_en;
  const categoryName = product.category
    ? lang === 'ar' ? product.category.name_ar : product.category.name_en
    : null;

  const hasDiscount =
    product.discount_price &&
    parseFloat(product.discount_price) < parseFloat(product.selling_price);

  const discountPct = hasDiscount
    ? Math.round((1 - parseFloat(product.current_price) / parseFloat(product.selling_price)) * 100)
    : 0;

  const images = product.images ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Back link */}
      <Link
        to="/products"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-700"
      >
        <span className="text-base">←</span>
        {t.backToProducts}
      </Link>

      {/* 2-column layout */}
      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2">

        {/* ── Left: Image gallery ──────────────────────────────────────── */}
        <ImageGallery
          mainImage={product.main_image}
          images={images}
          productName={name}
        />

        {/* ── Right: Product info ──────────────────────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Category */}
          {categoryName && (
            <span className="text-sm font-semibold uppercase tracking-wide text-green-600">
              {categoryName}
            </span>
          )}

          {/* Name */}
          <h1 className="text-3xl font-bold leading-tight text-gray-900">
            {name}
          </h1>

          {/* Farmer badge */}
          <FarmerBadge farmer={product.farmer} t={t} />

          {/* Price row */}
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-extrabold text-green-700">
              {product.current_price} JD
            </span>
            {hasDiscount && (
              <>
                <span className="text-lg text-gray-400 line-through">
                  {product.selling_price} JD
                </span>
                <DiscountBadge pct={discountPct} />
              </>
            )}
          </div>

          {/* Tags: organic + weight */}
          <div className="flex flex-wrap gap-2">
            {product.is_organic && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                🌱 {t.organic}
              </span>
            )}
            {product.weight_value && (
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                {product.weight_value} {product.weight_unit}
              </span>
            )}
          </div>

          {/* Divider */}
          <hr className="border-gray-100" />

          {/* Stock / cart controls */}
          {!product.is_in_stock ? (
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-500">
                {t.outOfStock}
              </span>
            </div>
          ) : isAuthenticated ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-600">{t.quantity}</span>
                <QuantitySelector qty={qty} onChange={setQty} />
                <span className="text-xs text-green-600">✓ {t.inStock}</span>
              </div>
              <button
                onClick={() => addToCart({ productId: product.id, quantity: qty })}
                disabled={isPending}
                className="w-full rounded-xl bg-green-600 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-green-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-10"
              >
                {isPending
                  ? '…'
                  : isSuccess
                  ? '✓'
                  : t.addToCart}
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-block rounded-xl border-2 border-green-600 px-8 py-3 text-center text-base font-semibold text-green-600 transition hover:bg-green-50"
            >
              {t.login}
            </Link>
          )}

          {/* Description */}
          {description && (
            <div className="mt-2 rounded-xl bg-gray-50 p-4 text-sm leading-relaxed text-gray-600">
              {description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
