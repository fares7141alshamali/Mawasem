import { lazy, Suspense, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import {
  useAddresses,
  useCreateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
  useUpdateAddress,
} from '../api/hooks/useAddresses';

const LocationPicker = lazy(() => import('../components/map/LocationPicker'));

const LABEL_ICON = { home: '🏠', work: '🏢', other: '📍' };

// ─── AddressCard ────────────────────────────────────────────────────────────

function AddressCard({ address, t, onEdit }) {
  const setDefault = useSetDefaultAddress();
  const del = useDeleteAddress();

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        address.is_default ? 'border-green-400 bg-green-50/40' : 'border-gray-100 bg-white'
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
          <span aria-hidden="true">{LABEL_ICON[address.label] ?? '📍'}</span>
          {address.label === 'other' && address.custom_label
            ? address.custom_label
            : t[`addressLabel_${address.label}`] ?? address.label_display}
        </span>
        {address.is_default && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
            {t.defaultAddress}
          </span>
        )}
      </div>
      <p className="mb-1 break-words text-xs leading-relaxed text-gray-500" dir="auto">
        {address.full_address}
      </p>
      {address.extra_details && (
        <p className="mb-3 break-words text-xs leading-relaxed text-gray-400" dir="auto">
          {address.extra_details}
        </p>
      )}
      <div className="flex flex-wrap gap-3 text-xs">
        {!address.is_default && (
          <button
            type="button"
            onClick={() => setDefault.mutate(address.id)}
            className="font-medium text-green-700 hover:underline"
          >
            {t.setAsDefault}
          </button>
        )}
        <button type="button" onClick={() => onEdit(address)} className="font-medium text-gray-600 hover:underline">
          {t.editAddress}
        </button>
        <button
          type="button"
          onClick={() => del.mutate(address.id)}
          className="font-medium text-red-500 hover:underline"
        >
          {t.deleteAddress}
        </button>
      </div>
    </div>
  );
}

// ─── AddressFormModal ───────────────────────────────────────────────────────

function AddressFormModal({ initial, onClose, t }) {
  const isEdit = Boolean(initial);
  const create = useCreateAddress();
  const update = useUpdateAddress();

  const [label, setLabel] = useState(initial?.label ?? 'home');
  const [customLabel, setCustomLabel] = useState(initial?.custom_label ?? '');
  const [extraDetails, setExtraDetails] = useState(initial?.extra_details ?? '');
  const [location, setLocation] = useState(
    initial
      ? { latitude: initial.latitude, longitude: initial.longitude, address: initial.full_address }
      : null,
  );
  const [error, setError] = useState('');

  const isPending = create.isPending || update.isPending;

  function handleSave() {
    setError('');
    if (!location) {
      setError(t.pinLocationRequired);
      return;
    }
    if (label === 'other' && !customLabel.trim()) {
      setError(t.customLabelRequired);
      return;
    }

    const payload = {
      label,
      custom_label: label === 'other' ? customLabel.trim() : '',
      full_address: location.address,
      extra_details: extraDetails.trim(),
      latitude: location.latitude,
      longitude: location.longitude,
    };

    const onError = (err) => {
      const d = err.response?.data ?? {};
      const fieldError = Object.values(d).flat().find((v) => typeof v === 'string');
      setError(fieldError ?? t.genericError);
    };

    if (isEdit) {
      update.mutate({ id: initial.id, ...payload }, { onSuccess: onClose, onError });
    } else {
      create.mutate(payload, { onSuccess: onClose, onError });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-bold text-gray-800">{isEdit ? t.editAddress : t.addAddress}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="space-y-4 p-6">
          <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-gray-100 sm:h-96" />}>
            <LocationPicker
              initialLat={location?.latitude}
              initialLng={location?.longitude}
              onConfirm={setLocation}
              onCancel={onClose}
            />
          </Suspense>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">{t.addressLabelField}</span>
              <select
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
              >
                <option value="home">{t.addressLabel_home}</option>
                <option value="work">{t.addressLabel_work}</option>
                <option value="other">{t.addressLabel_other}</option>
              </select>
            </label>
            {label === 'other' && (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600">{t.customLabel}</span>
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder={t.customLabelPlaceholder}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
                />
              </label>
            )}
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">{t.extraDetails}</span>
            <input
              type="text"
              value={extraDetails}
              onChange={(e) => setExtraDetails(e.target.value)}
              placeholder={t.extraDetailsPlaceholder}
              dir="auto"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
            />
          </label>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? t.loading : t.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Addresses page ─────────────────────────────────────────────────────────

export default function Addresses() {
  const { isAuthenticated } = useAuth();
  const { t } = useLang();
  const { data: addresses = [], isLoading, isError } = useAddresses();
  const [editing, setEditing] = useState(null); // null | 'new' | address object

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t.addressBook}</h1>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
        >
          + {t.addAddress}
        </button>
      </div>

      {isLoading && <p className="text-center text-sm text-gray-400">{t.loading}</p>}
      {isError && <p className="text-center text-sm text-red-500">{t.genericError}</p>}

      {!isLoading && !isError && addresses.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-20 text-gray-400">
          <span className="text-5xl">📍</span>
          <p className="text-base font-medium">{t.noAddressesYet}</p>
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            {t.addFirstAddress}
          </button>
        </div>
      )}

      {!isLoading && !isError && addresses.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard key={address.id} address={address} t={t} onEdit={setEditing} />
          ))}
        </div>
      )}

      {editing && (
        <AddressFormModal
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          t={t}
        />
      )}
    </main>
  );
}
