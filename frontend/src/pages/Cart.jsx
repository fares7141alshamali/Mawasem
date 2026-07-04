import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useCart,
  useUpdateCartItem,
  useRemoveCartItem,
  useClearCart,
  cartKeys,
} from '../api/hooks/useCart';
import { useAddresses, addressKeys } from '../api/hooks/useAddresses';
import { useLang } from '../contexts/LanguageContext';
import apiClient from '../api/client';

const LocationPicker = lazy(() => import('../components/map/LocationPicker'));

// ─── Icons ────────────────────────────────────────────────────────────────────
function TrashIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

function MinusIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
    </svg>
  );
}

function PlusIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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

function ShoppingBagIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
    </svg>
  );
}

// ─── CartSkeleton ─────────────────────────────────────────────────────────────
function CartSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex animate-pulse gap-4 rounded-xl border border-gray-100 bg-white p-4">
              <div className="h-20 w-20 shrink-0 rounded-lg bg-gray-200" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 w-3/4 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-200" />
                <div className="h-7 w-28 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100 lg:col-span-1" />
      </div>
    </div>
  );
}

// ─── CartItemRow ──────────────────────────────────────────────────────────────
function CartItemRow({ item, t, lang }) {
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  const product = item.product;
  const name = lang === 'ar' ? (product.name_ar || product.name_en) : product.name_en;
  const unitPrice = parseFloat(product.current_price);
  const isBusy = updateItem.isPending || removeItem.isPending;

  return (
    <div className="flex gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      {/* Thumbnail */}
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {product.main_image
          ? <img src={product.main_image} alt={name} className="h-full w-full object-cover" />
          : <div className="flex h-full w-full items-center justify-center text-2xl">🌿</div>
        }
      </div>

      {/* Info + quantity */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-800">{name}</p>
        <p className="mt-0.5 text-xs text-gray-400 tabular-nums">
          {unitPrice.toFixed(2)} × {item.quantity} ={' '}
          <span className="font-medium text-gray-600">{parseFloat(item.total_price).toFixed(2)}</span>
        </p>

        {/* +/− stepper */}
        <div className="mt-2.5 flex items-center gap-2">
          <button
            onClick={() => updateItem.mutate({ itemId: item.id, quantity: item.quantity - 1 })}
            disabled={item.quantity <= 1 || isBusy}
            aria-label={t.decrease}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-green-400 hover:text-green-600 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <MinusIcon className="h-3 w-3" />
          </button>

          <span className="w-7 text-center text-sm font-medium tabular-nums">{item.quantity}</span>

          <button
            onClick={() => updateItem.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
            disabled={isBusy || item.quantity >= product.stock}
            aria-label={t.increase}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-green-400 hover:text-green-600 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <PlusIcon className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={() => removeItem.mutate(item.id)}
        disabled={removeItem.isPending}
        aria-label={t.remove}
        className="self-start rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── OrderSuccess ─────────────────────────────────────────────────────────────
function OrderSuccess({ order, t }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md rounded-2xl border border-green-100 bg-green-50 p-10 text-center">
        <CheckCircleIcon className="mx-auto mb-4 h-16 w-16 text-green-500" />
        <h2 className="mb-2 text-xl font-bold text-green-800">{t.orderPlaced}</h2>
        <p className="mb-1 text-sm text-green-700">
          {t.orderNumber}{order.id}
        </p>
        <p className="mb-8 text-sm text-green-700">
          {t.orderTotal}:{' '}
          <span className="font-semibold">{parseFloat(order.total_price).toFixed(2)}</span>
        </p>
        <Link
          to="/products"
          className="inline-block rounded-lg bg-green-600 px-7 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
        >
          {t.continueShopping}
        </Link>
      </div>
    </div>
  );
}

// ─── Cart ─────────────────────────────────────────────────────────────────────
export default function Cart() {
  const { data: cart, isLoading, isError } = useCart();
  const clearCart = useClearCart();
  const { lang, t } = useLang();
  const qc = useQueryClient();

  const { data: addresses = [] } = useAddresses();

  const [selectedAddressId, setSelectedAddressId] = useState(null); // number | 'new' | null
  const [newLocation, setNewLocation]       = useState(null); // { latitude, longitude, address }
  const [newLabel, setNewLabel]             = useState('home');
  const [saveNewAddress, setSaveNewAddress] = useState(true);
  const [showPicker, setShowPicker]         = useState(false);
  const [addressError, setAddressError]     = useState('');
  const [checkoutError, setCheckoutError]   = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  // Derived, not stored: defaults to the user's default/first saved address
  // until they explicitly pick something else via the radio cards below.
  const defaultAddressId = (addresses.find((a) => a.is_default) ?? addresses[0])?.id ?? null;
  const effectiveAddressId = selectedAddressId ?? defaultAddressId;

  const checkout = useMutation({
    mutationFn: (payload) =>
      apiClient.post('/orders/checkout/', payload).then((r) => r.data),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: cartKeys.all });
      qc.invalidateQueries({ queryKey: addressKeys.list() }); // save_address may have created one
      setConfirmedOrder(order);
    },
    onError: (err) => {
      const data = err.response?.data;
      const msg =
        data?.non_field_errors?.[0] ??
        data?.address_id?.[0] ??
        data?.shipping_address?.[0] ??
        data?.latitude?.[0] ??
        data?.longitude?.[0] ??
        data?.detail ??
        t.checkoutError;
      setCheckoutError(msg);
    },
  });

  function handleCheckout(e) {
    e.preventDefault();
    setCheckoutError('');
    setAddressError('');

    if (effectiveAddressId === 'new') {
      if (!newLocation) {
        setAddressError(t.pinLocationRequired);
        return;
      }
      checkout.mutate({
        shipping_address: newLocation.address,
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
        save_address: saveNewAddress,
        label: newLabel,
      });
    } else if (effectiveAddressId) {
      checkout.mutate({ address_id: effectiveAddressId });
    } else {
      setAddressError(t.selectDeliveryAddress);
    }
  }

  if (confirmedOrder) return <OrderSuccess order={confirmedOrder} t={t} />;

  if (isLoading) return <CartSkeleton />;

  if (isError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-red-500 sm:px-6 lg:px-8">
        {t.cartLoadError}
      </div>
    );
  }

  const items   = cart?.items ?? [];
  const isEmpty = items.length === 0;

  if (isEmpty) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <ShoppingBagIcon className="mx-auto mb-4 h-16 w-16 text-gray-300" />
        <h2 className="mb-2 text-lg font-semibold text-gray-700">{t.emptyCart}</h2>
        <p className="mb-8 text-sm text-gray-400">{t.emptyCartSub}</p>
        <Link
          to="/products"
          className="inline-block rounded-lg bg-green-600 px-7 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
        >
          {t.browseProducts}
        </Link>
      </div>
    );
  }

  const total = parseFloat(cart.total_price ?? 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">
        {t.cart}{' '}
        <span className="text-base font-normal text-gray-400">({cart.item_count})</span>
      </h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Items list */}
        <div className="space-y-3 lg:col-span-2">
          {items.map((item) => (
            <CartItemRow key={item.id} item={item} t={t} lang={lang} />
          ))}

          <div className="pt-1 text-end">
            <button
              onClick={() => clearCart.mutate()}
              disabled={clearCart.isPending}
              className="text-xs text-gray-400 underline-offset-2 transition hover:text-red-500 hover:underline disabled:opacity-50"
            >
              {t.clearCart}
            </button>
          </div>
        </div>

        {/* Order summary + checkout form */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-1 lg:self-start">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t.orderSummary}
          </h2>

          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {cart.item_count} {cart.item_count === 1 ? t.item : t.items}
            </span>
            <span className="font-semibold text-gray-800 tabular-nums">{total.toFixed(2)}</span>
          </div>

          <hr className="my-4 border-gray-100" />

          <form onSubmit={handleCheckout} className="space-y-3">
            <div className="space-y-2">
              <span className="mb-1 block text-xs font-medium text-gray-600">
                {t.selectDeliveryAddress}
              </span>

              {addresses.map((addr) => (
                <label
                  key={addr.id}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm transition ${
                    effectiveAddressId === addr.id ? 'border-green-400 bg-green-50/50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="delivery_address"
                    className="mt-0.5 accent-green-600"
                    checked={effectiveAddressId === addr.id}
                    onChange={() => { setSelectedAddressId(addr.id); setAddressError(''); }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-medium text-gray-800">
                      {t[`addressLabel_${addr.label}`] ?? addr.label}
                      {addr.is_default && (
                        <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                          {t.defaultAddress}
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-gray-500" dir="auto">
                      {addr.full_address}
                    </span>
                  </span>
                </label>
              ))}

              <label
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-sm transition ${
                  effectiveAddressId === 'new' ? 'border-green-400 bg-green-50/50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="delivery_address"
                  className="accent-green-600"
                  checked={effectiveAddressId === 'new'}
                  onChange={() => { setSelectedAddressId('new'); setAddressError(''); setShowPicker(true); }}
                />
                <span className="font-medium text-gray-700">+ {t.addNewAddressOption}</span>
              </label>

              {effectiveAddressId === 'new' && newLocation && (
                <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                  <p className="truncate" dir="auto">{newLocation.address}</p>
                  <button
                    type="button"
                    onClick={() => setShowPicker(true)}
                    className="mt-1 font-medium text-green-700 hover:underline"
                  >
                    {t.editOnMap}
                  </button>
                  <label className="mt-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={saveNewAddress}
                      onChange={(e) => setSaveNewAddress(e.target.checked)}
                      className="accent-green-600"
                    />
                    {t.saveAddressForLater}
                  </label>
                  {saveNewAddress && (
                    <select
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      className="mt-2 rounded-lg border border-gray-200 px-2 py-1 text-xs"
                    >
                      <option value="home">{t.addressLabel_home}</option>
                      <option value="work">{t.addressLabel_work}</option>
                      <option value="other">{t.addressLabel_other}</option>
                    </select>
                  )}
                </div>
              )}

              {addressError && <p className="text-xs text-red-500">{addressError}</p>}
            </div>

            {checkoutError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                {checkoutError}
              </p>
            )}

            <button
              type="submit"
              disabled={checkout.isPending}
              className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checkout.isPending ? t.placingOrder : t.placeOrder}
            </button>
          </form>
        </div>

      </div>

      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-gray-100 sm:h-96" />}>
              <LocationPicker
                initialLat={newLocation?.latitude}
                initialLng={newLocation?.longitude}
                onConfirm={(loc) => { setNewLocation(loc); setShowPicker(false); }}
                onCancel={() => setShowPicker(false)}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
