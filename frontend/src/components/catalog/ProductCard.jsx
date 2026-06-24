import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAddToCart } from '../../api/hooks/useCart';

function DiscountBadge({ selling, current }) {
  const pct = Math.round((1 - parseFloat(current) / parseFloat(selling)) * 100);
  if (pct <= 0) return null;
  return (
    <span className="absolute top-2 start-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
      -{pct}%
    </span>
  );
}

export default function ProductCard({ product, t, lang }) {
  const { isAuthenticated } = useAuth();
  const { mutate: addToCart, isPending } = useAddToCart();

  const name = lang === 'ar' ? product.name_ar : product.name_en;
  const categoryName = product.category
    ? lang === 'ar'
      ? product.category.name_ar
      : product.category.name_en
    : null;
  const hasDiscount =
    product.discount_price &&
    parseFloat(product.discount_price) < parseFloat(product.selling_price);

  return (
    <article className="group flex flex-col rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Image */}
      <Link
        to={`/products/${product.slug}`}
        className="relative block aspect-square overflow-hidden rounded-t-xl bg-gray-50"
      >
        {product.main_image ? (
          <img
            src={product.main_image}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-5xl text-gray-200">
            🌿
          </span>
        )}

        {!product.is_in_stock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700">
              {t.outOfStock}
            </span>
          </div>
        )}

        {hasDiscount && (
          <DiscountBadge
            selling={product.selling_price}
            current={product.current_price}
          />
        )}
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {categoryName && (
          <span className="text-xs font-medium text-green-600">{categoryName}</span>
        )}

        <Link to={`/products/${product.slug}`}>
          <h3 className="line-clamp-2 text-sm font-semibold text-gray-800 hover:text-green-700">
            {name}
          </h3>
        </Link>

        {product.farmer?.is_verified && (
          <p className="text-xs text-blue-600">✓ {product.farmer.farm_name}</p>
        )}

        {/* Price */}
        <div className="mt-auto flex items-center gap-2 pt-1">
          <span className="font-bold text-green-700">
            {product.current_price} JD
          </span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">
              {product.selling_price} JD
            </span>
          )}
        </div>

        {/* Action */}
        {isAuthenticated ? (
          <button
            disabled={!product.is_in_stock || isPending}
            onClick={() => addToCart({ productId: product.id })}
            className="mt-2 w-full rounded-lg bg-green-600 py-1.5 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? '…' : t.addToCart}
          </button>
        ) : (
          <Link
            to="/login"
            className="mt-2 block w-full rounded-lg border border-green-600 py-1.5 text-center text-sm font-medium text-green-600 transition hover:bg-green-50"
          >
            {t.login}
          </Link>
        )}
      </div>
    </article>
  );
}
