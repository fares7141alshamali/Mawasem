import { useLang } from '../../contexts/LanguageContext';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

function staticMapUrl(lat, lng) {
  return (
    `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/` +
    `pin-s+16a34a(${lng},${lat})/${lng},${lat},14,0/300x150@2x` +
    `?access_token=${MAPBOX_TOKEN}`
  );
}

/**
 * Delivery-location preview for an order card. Uses the Mapbox Static
 * Images API (one cheap, cacheable <img> per card) instead of a live map
 * instance — instantiating a mapboxgl.Map per card would mean N concurrent
 * WebGL contexts on a single orders/dashboard page, which browsers cap
 * around 8-16 and breaks past a handful of cards.
 *
 * Falls back to plain text when lat/lng are unavailable (orders placed
 * before this feature existed).
 */
export default function DeliveryPinThumbnail({ lat, lng, address, onExpand }) {
  const { t } = useLang();

  if (lat == null || lng == null) {
    return (
      <div className="mb-3 flex gap-1.5">
        <span className="mt-0.5 shrink-0 text-xs" aria-hidden="true">📍</span>
        <p className="break-words text-xs leading-relaxed text-gray-400" dir="auto">{address}</p>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => onExpand?.({ lat, lng, address })}
        className="block w-full overflow-hidden rounded-lg border border-gray-100"
      >
        <img src={staticMapUrl(lat, lng)} alt="" loading="lazy" className="h-24 w-full object-cover" />
      </button>
      <div className="mt-1 flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-xs text-gray-400" dir="auto">{address}</p>
        <a
          href={`https://www.google.com/maps?q=${lat},${lng}`}
          target="_blank"
          rel="noreferrer"
          dir="ltr"
          className="shrink-0 text-xs font-medium text-green-700 hover:underline"
        >
          {t.openInMaps} ↗
        </a>
      </div>
    </div>
  );
}
