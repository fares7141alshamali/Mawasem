import { lazy, Suspense, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLang } from '../../contexts/LanguageContext';
import { useCategories } from '../../api/hooks/useCatalog';
import {
  useAddProduct,
  useFarmerOrders,
  useFarmerProducts,
  useMyFarmerProfile,
  useUpdateFarmerProfile,
  useUpdateOrderStatus,
  useUpdateProduct,
} from '../../api/hooks/useFarmer';
import { JORDAN_CITIES } from '../../constants/jordanCities';
import DeliveryPinThumbnail from '../../components/map/DeliveryPinThumbnail';

const FullMapModal = lazy(() => import('../../components/map/FullMapModal'));

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_BADGE = {
  pending:    'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped:    'bg-purple-100 text-purple-700',
  completed:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-500',
};

const STATUS_TRANSITIONS = {
  pending:    ['processing', 'cancelled'],
  processing: ['shipped',    'cancelled'],
  shipped:    ['completed'],
  completed:  [],
  cancelled:  [],
};

const WALLET_PROVIDERS = ['ZainCash', 'CliQ', 'Orange Money'];
const PAYMENT_KEY = 'mawasem_payment_settings';

function readPayment() {
  try { return JSON.parse(localStorage.getItem(PAYMENT_KEY) ?? '{}'); } catch { return {}; }
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function PlusIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}
function CubeIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  );
}
function ExclamationIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
}
function ClipboardIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
    </svg>
  );
}
function XIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
function UserIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}
function CheckCircleIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
function BanknotesIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
    </svg>
  );
}
function ArrowTrendingUpIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
    </svg>
  );
}
function CreditCardIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 21Z" />
    </svg>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, colorClass }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <p className="text-2xl font-bold text-gray-800 tabular-nums">{value}</p>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        {sub && <p className="mt-0.5 text-[10px] text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

// ─── StockEditor ──────────────────────────────────────────────────────────────
function StockEditor({ product, t }) {
  const [value, setValue]   = useState(String(product.stock));
  const [dirty, setDirty]   = useState(false);
  const update = useUpdateProduct();

  function handleChange(e) {
    setValue(e.target.value);
    setDirty(e.target.value !== String(product.stock));
  }

  function handleSave() {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0) return;
    update.mutate({ id: product.id, stock: parsed }, {
      onSuccess: () => setDirty(false),
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min="0"
        value={value}
        onChange={handleChange}
        onKeyDown={(e) => e.key === 'Enter' && dirty && handleSave()}
        className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-center text-sm text-gray-700 outline-none transition focus:border-green-400 focus:ring-1 focus:ring-green-100"
      />
      {dirty && (
        <button
          onClick={handleSave}
          disabled={update.isPending}
          className="rounded-lg bg-green-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
        >
          {t.save}
        </button>
      )}
    </div>
  );
}

// ─── ProductRow ───────────────────────────────────────────────────────────────
function ProductRow({ product, t, lang }) {
  const update = useUpdateProduct();
  const name = lang === 'ar' ? (product.name_ar || product.name_en) : product.name_en;
  const nameSub = lang === 'ar' ? product.name_en : product.name_ar;

  const stockLabel = (() => {
    if (product.stock === 0)
      return <span className="text-xs font-medium text-red-500">{t.outOfStock}</span>;
    if (product.is_low_stock)
      return <span className="text-xs font-medium text-amber-600">{product.stock} ⚠</span>;
    return <span className="text-xs text-gray-500">{product.stock}</span>;
  })();

  return (
    <tr className="border-b border-gray-50 transition hover:bg-gray-50/60">
      <td className="py-3 ps-4 pe-3">
        <div className="h-10 w-10 overflow-hidden rounded-lg bg-gray-100">
          {product.main_image
            ? <img src={product.main_image} alt={name} className="h-full w-full object-cover" />
            : <div className="flex h-full w-full items-center justify-center text-lg">🌿</div>
          }
        </div>
      </td>
      <td className="py-3 pe-4 max-w-[200px]">
        <p className="truncate text-sm font-medium text-gray-800">{name}</p>
        {nameSub && <p className="truncate text-xs text-gray-400">{nameSub}</p>}
      </td>
      <td className="py-3 pe-4 text-sm tabular-nums text-gray-700">
        <span className="font-medium">{parseFloat(product.current_price).toFixed(2)}</span>
        {product.discount_price && (
          <span className="ms-1 text-xs text-gray-400 line-through">
            {parseFloat(product.selling_price).toFixed(2)}
          </span>
        )}
      </td>
      <td className="py-3 pe-4">{stockLabel}</td>
      <td className="py-3 pe-4"><StockEditor product={product} t={t} /></td>
      <td className="py-3 pe-4">
        <button
          onClick={() => update.mutate({ id: product.id, is_active: !product.is_active })}
          disabled={update.isPending}
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
            product.is_active
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {product.is_active ? '● Active' : '○ Inactive'}
        </button>
      </td>
    </tr>
  );
}

// ─── OrderStatusControl ───────────────────────────────────────────────────────
// Two-phase flow: status select → delivery form (only when transitioning to 'shipped').
// All other transitions (processing, cancelled, completed) fire immediately.
function OrderStatusControl({ order, t }) {
  const updateStatus = useUpdateOrderStatus();
  const allowed = STATUS_TRANSITIONS[order.status] ?? [];

  const [pendingStatus,   setPendingStatus]   = useState('');
  const [deliveryMethod,  setDeliveryMethod]  = useState('self');
  const [courier,         setCourier]         = useState('');
  const [trackingNum,     setTrackingNum]     = useState('');

  if (!allowed.length) return null;

  const showDeliveryForm = pendingStatus === 'shipped';

  function handleSelectChange(e) {
    const val = e.target.value;
    if (!val) return;
    if (val === 'shipped') {
      setPendingStatus('shipped');
    } else {
      updateStatus.mutate({ orderId: order.id, status: val });
    }
  }

  function handleConfirmShipped() {
    updateStatus.mutate(
      {
        orderId:         order.id,
        status:          'shipped',
        delivery_method: deliveryMethod,
        courier,
        tracking_number: trackingNum,
      },
      {
        onSuccess: () => {
          setPendingStatus('');
          setCourier('');
          setTrackingNum('');
          setDeliveryMethod('self');
        },
      },
    );
  }

  const inputCls =
    'w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 outline-none transition focus:border-purple-400 focus:ring-1 focus:ring-purple-100';

  const methodBtnCls = (active) =>
    `flex flex-1 items-center justify-center gap-1 rounded-lg border py-1.5 text-[11px] font-semibold transition ${
      active
        ? 'border-purple-400 bg-purple-50 text-purple-700'
        : 'border-gray-200 text-gray-500 hover:border-gray-300'
    }`;

  return (
    <div className="mt-2 space-y-2.5">
      {/* Status selector — hidden once delivery form is open */}
      {!showDeliveryForm && (
        <select
          value=""
          onChange={handleSelectChange}
          disabled={updateStatus.isPending}
          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700 outline-none transition focus:border-green-400 focus:ring-1 focus:ring-green-100 disabled:opacity-50"
        >
          <option value="" disabled>{t.changeStatus}</option>
          {allowed.map((s) => (
            <option key={s} value={s}>{t[`status_${s}`] ?? s}</option>
          ))}
        </select>
      )}

      {/* Delivery form — shown only for 'shipped' transition */}
      {showDeliveryForm && (
        <div className="rounded-xl border border-purple-100 bg-purple-50 p-3 space-y-2.5">
          <p className="text-[11px] font-semibold text-purple-700">{t.deliveryMethod}</p>

          {/* Method toggle */}
          <div className="flex gap-2">
            <button type="button" onClick={() => setDeliveryMethod('self')}
              className={methodBtnCls(deliveryMethod === 'self')}>
              🚗 {t.selfDelivery}
            </button>
            <button type="button" onClick={() => setDeliveryMethod('partner')}
              className={methodBtnCls(deliveryMethod === 'partner')}>
              📦 {t.partnerDelivery}
            </button>
          </div>

          {/* Courier + tracking — only for partner delivery */}
          {deliveryMethod === 'partner' && (
            <>
              <input
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                placeholder={t.courierName}
                className={inputCls}
              />
              <input
                value={trackingNum}
                onChange={(e) => setTrackingNum(e.target.value)}
                placeholder={t.trackingNum}
                dir="ltr"
                className={inputCls}
              />
            </>
          )}

          {/* Action row */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPendingStatus('')}
              className="flex-1 rounded-lg border border-gray-200 py-1.5 text-[11px] font-medium text-gray-500 transition hover:bg-gray-50"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleConfirmShipped}
              disabled={updateStatus.isPending}
              className="flex-1 rounded-lg bg-purple-600 py-1.5 text-[11px] font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
            >
              {updateStatus.isPending ? '…' : t.confirmShipped}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── fmtDate ─────────────────────────────────────────────────────────────────
// Formats an ISO timestamp for the order card header.
// Uses the browser's Intl API — no library needed.
function fmtDate(iso, lang) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(
      lang === 'ar' ? 'ar-JO' : 'en-GB',
      { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
    );
  } catch {
    return iso;
  }
}

// ─── OrderCard ────────────────────────────────────────────────────────────────
function OrderCard({ order, t, lang, onExpandMap }) {
  const itemSummary =
    order.items
      .slice(0, 2)
      .map((i) =>
        `${i.quantity}× ${lang === 'ar' ? (i.product_name_ar || i.product_name) : i.product_name}`,
      )
      .join(', ') + (order.items.length > 2 ? ` +${order.items.length - 2}` : '');

  const orderDate = fmtDate(order.created_at, lang);

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">

      {/* ── Header: order ID + status badge ── */}
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-gray-700">#{order.id}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {t[`status_${order.status}`] ?? order.status_display}
        </span>
      </div>

      {/* ── Order date ── */}
      {orderDate && (
        <p className="mb-3 text-[11px] text-gray-400">
          ⏱ <span>{orderDate}</span>
        </p>
      )}

      {/* ── Items summary ── */}
      <p className="mb-2.5 truncate text-xs text-gray-500">{itemSummary}</p>

      {/* ── Customer contact ── */}
      <div className="mb-2.5 space-y-1">
        {order.customer_username && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
            <span aria-label={t.customer}>👤</span>
            {order.customer_username}
          </p>
        )}
        {order.customer_phone && (
          /* dir="ltr" keeps the phone number left-to-right even in Arabic RTL layout */
          <p className="flex items-center gap-1.5 text-xs text-gray-600" dir="ltr">
            <span aria-label={t.phone}>📞</span>
            {order.customer_phone}
          </p>
        )}
      </div>

      {/* ── Delivery location ── */}
      <DeliveryPinThumbnail
        lat={order.shipping_lat}
        lng={order.shipping_lng}
        address={order.shipping_address}
        onExpand={onExpandMap}
      />

      {/* ── Order total ── */}
      <p className="mb-3 text-sm font-semibold text-gray-800 tabular-nums">
        {parseFloat(order.total_price).toFixed(2)} JD
      </p>

      <OrderStatusControl order={order} t={t} />
    </div>
  );
}

// ─── AddProductModal ──────────────────────────────────────────────────────────
const BLANK_FORM = {
  name_en: '', name_ar: '',
  description_en: '', description_ar: '',
  farm_cost: '', selling_price: '', discount_price: '',
  stock: '', category: '', is_organic: false, image: null,
};

function AddProductModal({ onClose, t, lang }) {
  const { data: categoriesRaw = [] } = useCategories();
  const addProduct = useAddProduct();
  const [form, setForm]   = useState(BLANK_FORM);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const categories = categoriesRaw.flatMap((c) => [c, ...(c.children ?? [])]);

  function handleChange(e) {
    const { name, value, type, checked, files } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'file' ? (files[0] ?? null) : value,
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const ar = lang === 'ar';
    if (!form.name_en.trim()) {
      setError(ar ? 'الاسم بالإنجليزية مطلوب.' : 'English name is required.');
      return;
    }
    if (!form.name_ar.trim()) {
      setError(ar ? 'الاسم بالعربية مطلوب.' : 'Arabic name is required.');
      return;
    }
    if (!form.selling_price) {
      setError(ar ? 'سعر البيع مطلوب.' : 'Selling price is required.');
      return;
    }
    if (form.stock === '') {
      setError(ar ? 'الكمية في المخزون مطلوبة.' : 'Stock level is required.');
      return;
    }

    const { image, is_organic, ...textFields } = form;
    const fd = new FormData();

    // Text / number fields — skip blanks so the backend sees them as absent (optional)
    Object.entries(textFields).forEach(([key, val]) => {
      if (val !== null && val !== '') fd.append(key, val);
    });

    // Boolean must always be sent (even false) so Django's BooleanField receives it
    fd.append('is_organic', String(is_organic));

    // File — only append when the farmer actually chose one
    if (image instanceof File) fd.append('image', image);

    addProduct.mutate(fd, {
      onSuccess: () => onClose(),
      onError: (err) => {
        const d = err.response?.data ?? {};
        const fieldError = Object.values(d).flat().find((v) => typeof v === 'string');
        setError(fieldError ?? t.genericError);
      },
    });
  }

  const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-100';
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-bold text-gray-800">{t.addNewCrop}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>{t.nameEn} <span className="text-red-500">*</span></label>
              <input name="name_en" value={form.name_en} onChange={handleChange}
                placeholder="e.g. Cherry Tomatoes" dir="ltr" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t.nameAr} <span className="text-red-500">*</span></label>
              <input name="name_ar" value={form.name_ar} onChange={handleChange}
                placeholder="مثال: طماطم كرزية" dir="rtl" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t.sellingPrice} <span className="text-red-500">*</span></label>
              <input name="selling_price" type="number" min="0" step="0.01"
                value={form.selling_price} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t.discountPrice}</label>
              <input name="discount_price" type="number" min="0" step="0.01"
                value={form.discount_price} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t.farmCost}</label>
              <input name="farm_cost" type="number" min="0" step="0.01"
                value={form.farm_cost} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t.stockLevel} <span className="text-red-500">*</span></label>
              <input name="stock" type="number" min="0" step="1"
                value={form.stock} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t.selectCategory}</label>
              <select name="category" value={form.category} onChange={handleChange}
                className={`${inputCls} bg-white`}>
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {lang === 'ar' ? (c.name_ar || c.name_en) : c.name_en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t.uploadImage}</label>
              <input ref={fileRef} type="file" name="image" accept="image/*"
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 file:me-3 file:rounded file:border-0 file:bg-green-50 file:px-2 file:py-1 file:text-xs file:font-medium file:text-green-700 outline-none" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>{t.descriptionEn}</label>
              <textarea name="description_en" value={form.description_en}
                onChange={handleChange} rows={2} dir="ltr"
                className={`${inputCls} resize-none`} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>{t.descriptionAr}</label>
              <textarea name="description_ar" value={form.description_ar}
                onChange={handleChange} rows={2} dir="rtl"
                className={`${inputCls} resize-none`} />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input id="is_organic" name="is_organic" type="checkbox"
                checked={form.is_organic} onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 accent-green-600" />
              <label htmlFor="is_organic" className="text-sm text-gray-700">{t.organic}</label>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50">
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={
                addProduct.isPending ||
                !form.name_en.trim() ||
                !form.name_ar.trim() ||
                !form.selling_price ||
                form.stock === ''
              }
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {addProduct.isPending ? '…' : t.addCrop}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── ProfileTab ───────────────────────────────────────────────────────────────
function ProfileTab({ profile, t, lang }) {
  const updateProfile = useUpdateFarmerProfile();
  const [form, setForm] = useState({
    farm_name:    profile?.farm_name    ?? '',
    city:         profile?.city         ?? '',
    phone_number: profile?.phone_number ?? '',
    bio:          profile?.bio          ?? '',
  });
  const [saved, setSaved] = useState(false);

  function handleChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setSaved(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    updateProfile.mutate(form, {
      onSuccess: () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      },
    });
  }

  const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-100';
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelCls}>{t.farmNameLabel}</label>
        <input
          name="farm_name"
          value={form.farm_name}
          onChange={handleChange}
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>{t.selectCity}</label>
        <select
          name="city"
          value={form.city}
          onChange={handleChange}
          className={`${inputCls} bg-white`}
        >
          <option value="">—</option>
          {JORDAN_CITIES.map((c) => (
            <option key={c.en} value={c.en}>
              {lang === 'ar' ? `${c.ar} — ${c.en}` : `${c.en} — ${c.ar}`}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>{t.phoneLabel}</label>
        <input
          name="phone_number"
          type="tel"
          dir="ltr"
          value={form.phone_number}
          onChange={handleChange}
          placeholder="+962…"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>{t.farmBio}</label>
        <textarea
          name="bio"
          rows={3}
          value={form.bio}
          onChange={handleChange}
          className={`${inputCls} resize-none`}
        />
      </div>

      {saved && (
        <p className="text-sm font-medium text-green-600">✓ {t.profileSaved}</p>
      )}
      {updateProfile.isError && (
        <p className="text-sm text-red-600">{t.genericError}</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={updateProfile.isPending}
          className="rounded-xl bg-green-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
        >
          {updateProfile.isPending ? t.savingProfile : t.save}
        </button>
      </div>
    </form>
  );
}

// ─── PaymentTab ───────────────────────────────────────────────────────────────
function PaymentTab({ t }) {
  const saved0 = readPayment();
  const [method,  setMethod]  = useState(saved0.method  ?? 'bank');
  const [bank,    setBank]    = useState(saved0.bank    ?? { bankName: '', accountHolder: '', iban: '' });
  const [wallet,  setWallet]  = useState(saved0.wallet  ?? { provider: 'ZainCash', phone: '', cliqAlias: '' });
  const [saved,   setSaved]   = useState(false);

  function handleSave(e) {
    e.preventDefault();
    localStorage.setItem(PAYMENT_KEY, JSON.stringify({ method, bank, wallet }));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-100';
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1';

  const methodBtnCls = (active) =>
    `flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-semibold transition ${
      active
        ? 'border-green-500 bg-green-50 text-green-700'
        : 'border-gray-200 text-gray-500 hover:border-gray-300'
    }`;

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Method picker */}
      <div>
        <p className={`${labelCls} mb-2`}>{t.paymentMethod}</p>
        <div className="flex gap-3">
          <button type="button" onClick={() => { setMethod('bank'); setSaved(false); }}
            className={methodBtnCls(method === 'bank')}>
            <BanknotesIcon className="h-4 w-4" />
            {t.bankTransfer}
          </button>
          <button type="button" onClick={() => { setMethod('wallet'); setSaved(false); }}
            className={methodBtnCls(method === 'wallet')}>
            <CreditCardIcon className="h-4 w-4" />
            {t.mobileWallet}
          </button>
        </div>
      </div>

      {/* Bank fields */}
      {method === 'bank' && (
        <div className="space-y-4">
          <div>
            <label className={labelCls}>{t.bankName}</label>
            <input value={bank.bankName} onChange={(e) => setBank((p) => ({ ...p, bankName: e.target.value }))}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t.accountHolder}</label>
            <input value={bank.accountHolder} onChange={(e) => setBank((p) => ({ ...p, accountHolder: e.target.value }))}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t.iban}</label>
            <input value={bank.iban} dir="ltr"
              onChange={(e) => setBank((p) => ({ ...p, iban: e.target.value }))}
              placeholder="JO94CBJO0010000000000131000302"
              className={inputCls} />
          </div>
        </div>
      )}

      {/* Wallet fields */}
      {method === 'wallet' && (
        <div className="space-y-4">
          <div>
            <label className={labelCls}>{t.walletType}</label>
            <select value={wallet.provider}
              onChange={(e) => setWallet((p) => ({ ...p, provider: e.target.value }))}
              className={`${inputCls} bg-white`}>
              {WALLET_PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>{t.walletPhone}</label>
            <input value={wallet.phone} dir="ltr"
              onChange={(e) => setWallet((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+962 7X XXX XXXX"
              className={inputCls} />
          </div>
          {wallet.provider === 'CliQ' && (
            <div>
              <label className={labelCls}>{t.cliqAlias}</label>
              <input value={wallet.cliqAlias} dir="ltr"
                onChange={(e) => setWallet((p) => ({ ...p, cliqAlias: e.target.value }))}
                placeholder="e.g. farmer@cliq"
                className={inputCls} />
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-gray-400">{t.paymentNote}</p>

      {saved && (
        <p className="text-sm font-medium text-green-600">✓ {t.profileSaved}</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-xl bg-green-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
        >
          {t.savePayment}
        </button>
      </div>
    </form>
  );
}

// ─── ProfileModal ─────────────────────────────────────────────────────────────
function ProfileModal({ profile, onClose, t, lang }) {
  const [tab, setTab] = useState('profile');

  const tabCls = (active) =>
    `flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
      active
        ? 'border-green-600 text-green-700'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-green-600" />
            <h2 className="text-base font-bold text-gray-800">{t.profileSettings}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-100 px-6">
          <button className={tabCls(tab === 'profile')} onClick={() => setTab('profile')}>
            <UserIcon className="h-4 w-4" />
            {t.profileTab}
          </button>
          <button className={tabCls(tab === 'payment')} onClick={() => setTab('payment')}>
            <CreditCardIcon className="h-4 w-4" />
            {t.paymentTab}
          </button>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {tab === 'profile'
            ? <ProfileTab profile={profile} t={t} lang={lang} />
            : <PaymentTab t={t} lang={lang} />
          }
        </div>
      </div>
    </div>
  );
}

// ─── FarmerGuard ──────────────────────────────────────────────────────────────
export function FarmerGuard({ children }) {
  const { isAuthenticated, isFarmer } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isFarmer)        return <Navigate to="/"      replace />;
  return children;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data: products = [], isLoading: productsLoading } = useFarmerProducts();
  const { data: orders   = [], isLoading: ordersLoading   } = useFarmerOrders();
  const { data: profile  }                                  = useMyFarmerProfile();
  const { lang, t }                                         = useLang();

  const [showModal,   setShowModal]   = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [mapModal,    setMapModal]    = useState(null); // { lat, lng, address } | null

  // ── Operational stats (derived from cache — no extra fetch) ──────────────
  const activeCount  = products.filter((p) => p.is_active).length;
  const ooStock      = products.filter((p) => p.is_active && !p.is_in_stock).length;
  const pendingCount = orders.filter((o) => o.status?.toLowerCase() === 'pending').length;

  // ── Financial stats (completed orders only) ──────────────────────────────
  const completedOrders = orders.filter((o) => o.status?.toLowerCase() === 'completed');
  const totalSalesCount = completedOrders.length;
  const grossRevenue    = completedOrders.reduce(
    (sum, o) => sum + parseFloat(o.total_price ?? 0), 0,
  );
  const netProfit = grossRevenue * 0.9;

  const fmtJD = (n) => `${n.toFixed(2)} JD`;

  // Sort descending: prefer created_at timestamp, fall back to id (higher = newer).
  const sortedOrders = [...orders].sort((a, b) => {
    if (a.created_at && b.created_at) {
      return new Date(b.created_at) - new Date(a.created_at);
    }
    return b.id - a.id;
  });

  const farmName = profile?.farm_name;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

      {/* ── Page header ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t.farmerDashboard}</h1>
          {farmName && <p className="mt-0.5 text-sm text-gray-500">{farmName}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm transition hover:border-green-400 hover:text-green-700"
          >
            <UserIcon className="h-4 w-4" />
            {t.profileSettings}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
          >
            <PlusIcon className="h-4 w-4" />
            {t.addNewCrop}
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="mb-8 space-y-4">
        {/* Operational row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={CubeIcon}
            label={t.activeProducts}
            value={productsLoading ? '…' : activeCount}
            colorClass="bg-green-50 text-green-600"
          />
          <StatCard
            icon={ExclamationIcon}
            label={t.outOfStockItems}
            value={productsLoading ? '…' : ooStock}
            colorClass="bg-amber-50 text-amber-600"
          />
          <StatCard
            icon={ClipboardIcon}
            label={t.pendingOrders}
            value={ordersLoading ? '…' : pendingCount}
            colorClass="bg-blue-50 text-blue-600"
          />
        </div>

        {/* Financial row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={CheckCircleIcon}
            label={t.totalSales}
            value={ordersLoading ? '…' : totalSalesCount}
            colorClass="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            icon={BanknotesIcon}
            label={t.grossRevenue}
            value={ordersLoading ? '…' : fmtJD(grossRevenue)}
            colorClass="bg-teal-50 text-teal-600"
          />
          <StatCard
            icon={ArrowTrendingUpIcon}
            label={t.netProfit}
            value={ordersLoading ? '…' : fmtJD(netProfit)}
            sub={t.netProfitSub}
            colorClass="bg-violet-50 text-violet-600"
          />
        </div>
      </div>

      {/* ── Main grid: products (2/3) + orders (1/3) ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Products section */}
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t.myProducts}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {productsLoading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex animate-pulse gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gray-200" />
                    <div className="flex-1 space-y-1.5 py-1">
                      <div className="h-3 w-2/3 rounded bg-gray-200" />
                      <div className="h-3 w-1/3 rounded bg-gray-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-gray-400">{t.noProducts}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left rtl:text-right">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      <th className="py-3 ps-4 pe-3 w-14" />
                      <th className="py-3 pe-4">{t.cropName}</th>
                      <th className="py-3 pe-4">{t.pricePerUnit}</th>
                      <th className="py-3 pe-4">{t.stockLevel}</th>
                      <th className="py-3 pe-4">{t.updateStock}</th>
                      <th className="py-3 pe-4">{t.orderStatus}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <ProductRow key={p.id} product={p} t={t} lang={lang} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Orders section */}
        <section className="lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t.incomingOrders}
          </h2>
          {ordersLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : sortedOrders.length === 0 ? (
            <p className="rounded-2xl border border-gray-100 bg-white px-4 py-10 text-center text-sm text-gray-400">
              {t.noOrders}
            </p>
          ) : (
            <div className="space-y-3">
              {sortedOrders.map((o) => (
                <OrderCard key={o.id} order={o} t={t} lang={lang} onExpandMap={setMapModal} />
              ))}
            </div>
          )}
        </section>

      </div>

      {/* Modals */}
      {showModal && (
        <AddProductModal onClose={() => setShowModal(false)} t={t} lang={lang} />
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
      {showProfile && (
        <ProfileModal
          profile={profile}
          onClose={() => setShowProfile(false)}
          t={t}
          lang={lang}
        />
      )}
    </div>
  );
}
