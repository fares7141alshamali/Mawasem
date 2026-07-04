import { lazy, Suspense, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { useOrders } from '../api/hooks/useOrders';
import DeliveryPinThumbnail from '../components/map/DeliveryPinThumbnail';

const FullMapModal = lazy(() => import('../components/map/FullMapModal'));

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  pending:    'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped:    'bg-indigo-100 text-indigo-700',
  completed:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
};

function StatusBadge({ status, label }) {
  const cls = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

// ─── OrderCard ────────────────────────────────────────────────────────────────

function OrderCard({ order, lang, t, onExpandMap }) {
  const date = new Date(order.created_at).toLocaleDateString(
    lang === 'ar' ? 'ar-EG' : 'en-GB',
    { year: 'numeric', month: 'short', day: 'numeric' },
  );

  return (
    <article className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-800">
            {t.orderNumber}{order.id}
          </span>
          <StatusBadge status={order.status} label={order.status_display} />
        </div>
        <span className="text-xs text-gray-400">{date}</span>
      </div>

      {/* Items list */}
      <ul className="mt-3 space-y-1">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between text-sm text-gray-600">
            <span className="truncate">
              {lang === 'ar' ? item.product_name_ar : item.product_name}
              <span className="ms-1 text-gray-400">×{item.quantity}</span>
            </span>
            <span className="shrink-0 font-medium text-gray-800">
              {Number(item.total_price).toFixed(2)} {lang === 'ar' ? 'د.أ' : 'JOD'}
            </span>
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div className="mt-4 border-t border-gray-50 pt-3">
        <DeliveryPinThumbnail
          lat={order.shipping_lat}
          lng={order.shipping_lng}
          address={order.shipping_address}
          onExpand={onExpandMap}
        />
        <div className="flex items-center justify-end">
          <span className="text-sm font-bold text-green-700">
            {Number(order.total_price).toFixed(2)} {lang === 'ar' ? 'د.أ' : 'JOD'}
          </span>
        </div>
      </div>
    </article>
  );
}

// ─── Orders page ──────────────────────────────────────────────────────────────

export default function Orders() {
  const { isAuthenticated } = useAuth();
  const { t, lang }         = useLang();
  const { data: orders = [], isLoading, isError } = useOrders();
  const [mapModal, setMapModal] = useState(null); // { lat, lng, address } | null

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t.orderHistory}</h1>

      {isLoading && (
        <p className="text-center text-sm text-gray-400">{t.loading}</p>
      )}

      {isError && (
        <p className="text-center text-sm text-red-500">{t.genericError}</p>
      )}

      {!isLoading && !isError && orders.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-20 text-gray-400">
          <span className="text-5xl">📦</span>
          <p className="text-base font-medium">{t.noOrdersYet}</p>
          <Link
            to="/products"
            className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            {t.browseProducts}
          </Link>
        </div>
      )}

      {!isLoading && !isError && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} lang={lang} t={t} onExpandMap={setMapModal} />
          ))}
        </div>
      )}

      {mapModal && (
        <Suspense fallback={null}>
          <FullMapModal
            lat={mapModal.lat}
            lng={mapModal.lng}
            address={mapModal.address}
            onClose={() => setMapModal(null)}
          />
        </Suspense>
      )}
    </main>
  );
}
