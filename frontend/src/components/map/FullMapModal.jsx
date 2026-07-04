import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useLang } from '../../contexts/LanguageContext';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

/**
 * A single on-demand interactive map with a real marker, shown for one
 * order at a time — unlike DeliveryPinThumbnail (a static <img> used per
 * card in a list), this instantiates one real mapboxgl.Map, so it must
 * only ever be mounted once at a time (owned by page-level modal state,
 * not rendered inside each card).
 */
export default function FullMapModal({ lat, lng, address, onClose }) {
  const { t } = useLang();
  const containerRef = useRef(null);

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom: 15,
      interactive: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    new mapboxgl.Marker({ color: '#16a34a' }).setLngLat([lng, lat]).addTo(map);

    return () => map.remove();
  }, [lat, lng]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-bold text-gray-800">{t.deliveryLocation}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            ✕
          </button>
        </div>
        <div className="p-6">
          <div ref={containerRef} className="h-80 w-full overflow-hidden rounded-xl border border-gray-200 sm:h-96" />
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="min-w-0 flex-1 truncate text-xs text-gray-500" dir="auto">{address}</p>
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
      </div>
    </div>
  );
}
