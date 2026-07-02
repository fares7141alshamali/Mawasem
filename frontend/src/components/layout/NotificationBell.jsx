import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLang } from '../../contexts/LanguageContext';
import { useMarkNotificationsRead, useNotifications } from '../../api/hooks/useNotifications';
import { useOrder } from '../../api/hooks/useOrders';

// ─── Icons ────────────────────────────────────────────────────────────────────

function BellIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  );
}

function CheckIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function SpinnerIcon({ className }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr, lang) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m    = Math.floor(diff / 60_000);
  const h    = Math.floor(diff / 3_600_000);
  const d    = Math.floor(diff / 86_400_000);

  if (lang === 'ar') {
    if (m < 1)  return 'الآن';
    if (m < 60) return `منذ ${m} د`;
    if (h < 24) return `منذ ${h} س`;
    return `منذ ${d} ي`;
  }
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

function fmtDate(dateStr, lang) {
  return new Date(dateStr).toLocaleString(
    lang === 'ar' ? 'ar-EG' : 'en-GB',
    { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  );
}

const STATUS_COLORS = {
  pending:    'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100  text-blue-700',
  shipped:    'bg-indigo-100 text-indigo-700',
  completed:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100   text-red-700',
};

// ─── OrderPreviewPanel ────────────────────────────────────────────────────────
// Tooltip card shown on notification hover. Fetches and renders order details.

function OrderPreviewPanel({ notif, isFarmer, lang, t, onMouseEnter, onMouseLeave }) {
  const { data: order, isLoading, isError } = useOrder(notif?.order_id, isFarmer);

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute end-80 top-full z-50 mt-2 hidden w-72 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-2xl md:block"
    >
      {/* Panel header */}
      <div className="border-b border-gray-100 bg-gray-50/60 px-4 py-3">
        <p className="text-sm font-semibold text-gray-800">{t.orderPreview}</p>
        {order && (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-gray-500">{t.orderNumber}{order.id}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {order.status_display}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="max-h-72 overflow-y-auto px-4 py-3">
        {isLoading && (
          <div className="flex justify-center py-6">
            <SpinnerIcon className="h-5 w-5 text-green-500" />
          </div>
        )}

        {isError && (
          <p className="py-4 text-center text-xs text-red-400">{t.genericError}</p>
        )}

        {order && (
          <div className="space-y-3 text-sm">
            {/* Items */}
            <ul className="divide-y divide-gray-50">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-1.5 text-xs text-gray-700">
                  <span className="truncate">
                    {lang === 'ar' ? item.product_name_ar : item.product_name}
                    <span className="ms-1 text-gray-400">×{item.quantity}</span>
                  </span>
                  <span className="ms-2 shrink-0 font-medium">
                    {Number(item.total_price).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>

            {/* Total */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-xs font-semibold text-gray-800">
              <span>{t.orderTotal}</span>
              <span className="text-green-700">
                {Number(order.total_price).toFixed(2)} {lang === 'ar' ? 'د.أ' : 'JOD'}
              </span>
            </div>

            {/* Delivery address */}
            <div className="text-xs text-gray-500">
              <p className="mb-0.5 font-semibold text-gray-700">{t.deliveryAddress}</p>
              <p className="leading-snug">{order.shipping_address}</p>
            </div>

            {/* Status history */}
            {order.status_history?.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-gray-700">{t.statusHistory}</p>
                <ul className="space-y-1.5">
                  {order.status_history.map((h) => (
                    <li key={h.id} className="flex items-start gap-2 text-[11px] text-gray-500">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                      <span>
                        <span className="font-medium text-gray-700">{h.new_status_display}</span>
                        {' · '}
                        {fmtDate(h.changed_at, lang)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── NotificationBell ─────────────────────────────────────────────────────────

export default function NotificationBell() {
  const { isFarmer }    = useAuth();
  const { t, lang }     = useLang();
  const [open, setOpen] = useState(false);
  const containerRef    = useRef(null);

  // Tooltip hover state
  const [previewNotif, setPreviewNotif] = useState(null);
  const openTimerRef  = useRef(null);
  const closeTimerRef = useRef(null);

  const { data: notifications = [] } = useNotifications();
  const markRead                      = useMarkNotificationsRead();

  const unread = notifications.filter((n) => !n.is_read).length;

  // Navigation target per role/kind
  function notifHref(n) {
    return isFarmer ? '/farmer/dashboard' : '/orders';
  }

  // ── Hover timer helpers ───────────────────────────────────────────────────

  function scheduleOpen(n) {
    clearTimeout(closeTimerRef.current);
    clearTimeout(openTimerRef.current);
    openTimerRef.current = setTimeout(() => setPreviewNotif(n), 500);
  }

  function scheduleClose() {
    clearTimeout(openTimerRef.current);
    closeTimerRef.current = setTimeout(() => setPreviewNotif(null), 150);
  }

  function cancelClose() {
    clearTimeout(closeTimerRef.current);
  }

  // ── Close dropdown on outside click ──────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setPreviewNotif(null);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') { setOpen(false); setPreviewNotif(null); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Clear timers on unmount
  useEffect(() => () => {
    clearTimeout(openTimerRef.current);
    clearTimeout(closeTimerRef.current);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* ── Bell trigger ────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setPreviewNotif(null); }}
        aria-label={t.notifications}
        aria-expanded={open}
        className="relative flex items-center justify-center rounded-lg p-2 text-gray-600 transition hover:bg-green-50 hover:text-green-700"
      >
        <BellIcon className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -end-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white tabular-nums">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* ── Tooltip preview (sibling, so it's never clipped by the dropdown) */}
      {open && previewNotif && (
        <OrderPreviewPanel
          notif={previewNotif}
          isFarmer={isFarmer}
          lang={lang}
          t={t}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        />
      )}

      {/* ── Dropdown panel ──────────────────────────────────────────────── */}
      {open && (
        <div
          role="dialog"
          aria-label={t.notifications}
          className="absolute end-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <BellIcon className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-800">{t.notifications}</span>
            </div>
            {unread > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                {unread} {lang === 'ar' ? 'جديد' : 'new'}
              </span>
            )}
          </div>

          {/* Notification list */}
          <ul className="max-h-[22rem] divide-y divide-gray-50 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="flex flex-col items-center gap-3 py-12 text-gray-400">
                <BellIcon className="h-9 w-9 opacity-25" />
                <span className="text-sm">{t.noNotifications}</span>
              </li>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <li
                  key={n.id}
                  onMouseEnter={() => n.order_id && scheduleOpen(n)}
                  onMouseLeave={scheduleClose}
                  className={`group transition-colors ${
                    n.is_read ? 'bg-white' : 'bg-green-50'
                  }`}
                >
                  <Link
                    to={notifHref(n)}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 hover:bg-green-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-400"
                  >
                    {/* Unread dot + title */}
                    <div className="flex items-start gap-2">
                      {!n.is_read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green-500" aria-label="unread" />
                      )}
                      <p className={`flex-1 text-sm leading-snug ${
                        n.is_read ? 'font-normal text-gray-700' : 'font-semibold text-gray-900'
                      }`}>
                        {n.title}
                      </p>
                    </div>

                    {/* Body */}
                    <p className="ms-4 mt-0.5 text-xs leading-relaxed text-gray-500">
                      {n.body}
                    </p>

                    {/* Timestamp */}
                    <p className="ms-4 mt-1 text-[11px] text-gray-400">
                      {timeAgo(n.created_at, lang)}
                    </p>
                  </Link>
                </li>
              ))
            )}
          </ul>

          {/* Footer – mark all read */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-2.5">
              <button
                type="button"
                onClick={() => markRead.mutate()}
                disabled={unread === 0 || markRead.isPending}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CheckIcon className="h-3.5 w-3.5" />
                {markRead.isPending
                  ? (lang === 'ar' ? 'جاري…' : 'Updating…')
                  : t.markAllRead}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
