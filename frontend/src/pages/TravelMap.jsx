
import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const countries = [
  ['Canada', -106, 56],
  ['United States', -98, 39],
  ['Mexico', -102, 24],
  ['Brazil', -52, -12],
  ['United Kingdom', -2, 54],
  ['France', 2, 47],
  ['Spain', -4, 40],
  ['Italy', 12, 43],
  ['Morocco', -7, 32],
  ['Egypt', 30, 27],
  ['Pakistan', 69, 30],
  ['India', 79, 22],
  ['China', 104, 35],
  ['Japan', 138, 37],
  ['Australia', 134, -25]
];

export default function TravelMap({ visited = [], onToggle }) {
  const container = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const toggleRef = useRef(onToggle);
  const [loading, setLoading] = useState(true);

  toggleRef.current = onToggle;

  // Initialize map only once
  useEffect(() => {
    if (!container.current || map.current) return;

    const instance = new maplibregl.Map({
      container: container.current,
    style: {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: [
            'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors',
          maxzoom: 19
        }
      },
      layers: [
        {
          id: 'osm-tiles',
          type: 'raster',
          source: 'osm'
        }
      ]
    },
      center: [0, 20],
      zoom: 1,
      minZoom: 0.5,
      maxZoom: 18,
      attributionControl: true,
      antialias: false,
      maxPitch: 0,
      fadeDuration: 0,
      renderWorldCopies: false
    });

    map.current = instance;

    instance.addControl(
      new maplibregl.NavigationControl({
        showCompass: false
      }),
      'top-right'
    );
    // Hide the overlay once the map begins rendering
    instance.once('render', () => {
      setLoading(false);
    });

    // Also hide it if the map encounters an error
    instance.on('error', (event) => {
      console.error('MapLibre error:', event.error);
      setLoading(false);
    });

    // Never leave the user stuck behind the loading overlay
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 3000);

    instance.on('error', (event) => {
      console.warn('MapLibre error:', event.error);
    });

    // Create markers once
    markers.current = countries.map(([name, lng, lat]) => {
      const el = document.createElement('button');

      el.type = 'button';
      el.className = 'sm-real-pin';
      el.dataset.country = name;
      el.title = name;
      el.setAttribute('aria-label', name);

      el.onclick = () => {
        toggleRef.current?.(name);
      };

      const marker = new maplibregl.Marker({
        element: el
      })
        .setLngLat([lng, lat])
        .setPopup(
          new maplibregl.Popup({ offset: 18 }).setText(name)
        )
        .addTo(instance);

      return { name, element: el, marker };
    });

    return () => {
      markers.current.forEach(({ marker }) => marker.remove());
      markers.current = [];

      instance.remove();
      map.current = null;
    };
  }, []);

  // Update marker appearance without recreating markers
  useEffect(() => {
    markers.current.forEach(({ name, element }) => {
      const isVisited = visited.includes(name);

      element.classList.toggle('visited', isVisited);

      const label = `${name}: ${
        isVisited ? 'visited' : 'not visited'
      } — click to toggle`;

      element.title = label;
      element.setAttribute('aria-label', label);
    });
  }, [visited]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        className="sm-real-map"
        ref={container}
        aria-label="Interactive geographic world map"
      />

      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#151a20',
            color: '#fff',
            fontSize: '14px',
            pointerEvents: 'none',
            zIndex: 5
          }}
        >
          Loading world map...
        </div>
      )}
    </div>
  );
}
