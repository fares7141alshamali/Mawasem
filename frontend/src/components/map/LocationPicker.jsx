import { useCallback, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useLang } from '../../contexts/LanguageContext';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

// Jordan bounding box — restricts both the pannable map area and geocoding results.
const JORDAN_BBOX = [34.9, 29.15, 39.3, 33.4]; // [minLng, minLat, maxLng, maxLat]
const JORDAN_CENTER = { lat: 31.9539, lng: 35.9106 }; // Amman

function reverseGeocode(lng, lat, lang) {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
    `?access_token=${mapboxgl.accessToken}&language=${lang}&country=jo&limit=1`;
  return fetch(url)
    .then((r) => r.json())
    .then((d) => d.features?.[0]?.place_name ?? '');
}

function forwardGeocode(query, lang) {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
    `?access_token=${mapboxgl.accessToken}&language=${lang}&country=jo` +
    `&bbox=${JORDAN_BBOX.join(',')}&autocomplete=true&limit=5`;
  return fetch(url)
    .then((r) => r.json())
    .then((d) => d.features ?? []);
}

/**
 * Talabat-style location picker: a fixed pin stays centered while the map
 * pans underneath it (not a draggable marker — avoids the touch-gesture
 * conflict between "drag the marker" and "pan the map").
 *
 * Props:
 *  - initialLat, initialLng (optional — defaults to Amman center)
 *  - onConfirm({ latitude, longitude, address })
 *  - onCancel()
 */
export default function LocationPicker({ initialLat, initialLng, onConfirm, onCancel }) {
  const { lang, isRTL, t } = useLang();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  const [address, setAddress] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const debounceRef = useRef(null);

  // ── Map init (once) ──────────────────────────────────────────────────────
  useEffect(() => {
    const center = [initialLng ?? JORDAN_CENTER.lng, initialLat ?? JORDAN_CENTER.lat];

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom: 15,
      maxBounds: [
        [JORDAN_BBOX[0] - 1, JORDAN_BBOX[1] - 1],
        [JORDAN_BBOX[2] + 1, JORDAN_BBOX[3] + 1],
      ],
    });
    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), isRTL ? 'top-left' : 'top-right');

    const runReverseGeocode = () => {
      const c = map.getCenter();
      setIsGeocoding(true);
      reverseGeocode(c.lng, c.lat, lang)
        .then((placeName) => setAddress(placeName))
        .finally(() => setIsGeocoding(false));
    };

    map.on('moveend', runReverseGeocode);
    map.once('load', runReverseGeocode);

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-once; language changes don't need to re-init the map

  // ── Forward-geocode search (debounced) ───────────────────────────────────
  const queryIsSearchable = query.trim().length >= 3;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!queryIsSearchable) return;
    debounceRef.current = setTimeout(() => {
      forwardGeocode(query, lang).then(setResults);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, lang, queryIsSearchable]);

  const visibleResults = queryIsSearchable ? results : [];

  const flyTo = useCallback((lng, lat) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 16 });
  }, []);

  function handleSelectResult(feature) {
    const [lng, lat] = feature.center;
    flyTo(lng, lat);
    setAddress(feature.place_name);
    setQuery('');
    setResults([]);
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        flyTo(pos.coords.longitude, pos.coords.latitude);
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  function handleConfirm() {
    const c = mapRef.current.getCenter();
    onConfirm({ latitude: c.lat, longitude: c.lng, address: address.trim() });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-72 w-full overflow-hidden rounded-xl border border-gray-200 sm:h-96">
        <div ref={mapContainerRef} className="h-full w-full" />

        {/* Fixed center pin — purely CSS-centered, not a mapbox Marker */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-[calc(100%+6px)]">
          <span className="text-3xl drop-shadow-md" aria-hidden="true">📍</span>
        </div>

        {/* Search bar */}
        <div className="absolute inset-x-3 top-3 z-20">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchAddressPlaceholder}
            dir="auto"
            className="w-full rounded-full border border-gray-200 bg-white/95 px-4 py-2 text-sm text-gray-800 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-green-400 focus:ring-2 focus:ring-green-100"
          />
          {visibleResults.length > 0 && (
            <ul className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-lg">
              {visibleResults.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectResult(f)}
                    className="block w-full px-4 py-2 text-start text-sm text-gray-700 hover:bg-green-50"
                  >
                    {f.place_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Use my location */}
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={isLocating}
          className="absolute bottom-3 end-3 z-20 flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-semibold text-green-700 shadow-md transition hover:bg-green-50 disabled:opacity-50"
        >
          📍 {isLocating ? t.locatingYou : t.useMyLocation}
        </button>
      </div>

      {/* Editable resolved address */}
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-gray-600">{t.shippingAddress}</span>
        <textarea
          value={isGeocoding ? t.loading : address}
          onChange={(e) => setAddress(e.target.value)}
          rows={2}
          dir="auto"
          className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-100"
        />
      </label>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
        >
          {t.cancel}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!address.trim() || isGeocoding}
          className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t.confirmLocation}
        </button>
      </div>
    </div>
  );
}
