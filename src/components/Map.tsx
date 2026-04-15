'use client';

import { useEffect, useRef } from 'react';
import maplibregl, { Map as MLMap, Popup } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import type { Farm, GeoData, Filters, LayerToggles } from '@/lib/types';
import {
  filterMapFinfish,
  filterMapShellfish,
  hasActiveFilters,
} from '@/lib/data';

interface Props {
  data: GeoData;
  allFarms: Farm[];
  filters: Filters;
  toggles: LayerToggles;
  flySignal: { farm: Farm; nonce: number } | null;
  onSelectFarm: (farm: Farm) => void;
  onSelectPoay: (props: Record<string, unknown>) => void;
  onEmptyClick: () => void;
}

const GREECE_CENTER: [number, number] = [24.112839983906383, 38.20523604895351];

function makeTriangleIcon(): ImageData {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.beginPath();
  ctx.moveTo(size / 2, 2);
  ctx.lineTo(size - 2, size - 2);
  ctx.lineTo(2, size - 2);
  ctx.closePath();
  ctx.fillStyle = '#d4a052';
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  return ctx.getImageData(0, 0, size, size);
}

function makeDiamondIcon(): ImageData {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.beginPath();
  ctx.moveTo(size / 2, 2);
  ctx.lineTo(size - 2, size / 2);
  ctx.lineTo(size / 2, size - 2);
  ctx.lineTo(2, size / 2);
  ctx.closePath();
  ctx.fillStyle = '#2ecc71';
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  return ctx.getImageData(0, 0, size, size);
}

function makeXIcon(): ImageData {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.strokeStyle = '#e74c3c';
  ctx.lineWidth = 2.5;
  const cx = size / 2;
  const cy = size / 2;
  const r = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - r * Math.cos(Math.PI / 4), cy - r * Math.sin(Math.PI / 4));
  ctx.lineTo(cx + r * Math.cos(Math.PI / 4), cy + r * Math.sin(Math.PI / 4));
  ctx.stroke();
  return ctx.getImageData(0, 0, size, size);
}

export function MapView({
  data,
  allFarms,
  filters,
  toggles,
  flySignal,
  onSelectFarm,
  onSelectPoay,
  onEmptyClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const activePopupRef = useRef<Popup | null>(null);
  const loadedRef = useRef(false);
  // Keep latest props accessible from long-lived event handlers.
  const farmsRef = useRef(allFarms);
  const filtersRef = useRef(filters);
  const togglesRef = useRef(toggles);
  const onSelectFarmRef = useRef(onSelectFarm);
  const onSelectPoayRef = useRef(onSelectPoay);
  const onEmptyClickRef = useRef(onEmptyClick);

  farmsRef.current = allFarms;
  filtersRef.current = filters;
  togglesRef.current = toggles;
  onSelectFarmRef.current = onSelectFarm;
  onSelectPoayRef.current = onSelectPoay;
  onEmptyClickRef.current = onEmptyClick;

  // Init map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const isMobile = window.innerWidth < 768;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
          },
          'country-labels': {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [
                { type: 'Feature', geometry: { type: 'Point', coordinates: [21.8, 39.5] }, properties: { name: 'Greece', large: true } },
                { type: 'Feature', geometry: { type: 'Point', coordinates: [29.0, 38.5] }, properties: { name: 'Turkey' } },
                { type: 'Feature', geometry: { type: 'Point', coordinates: [25.3, 42.7] }, properties: { name: 'Bulgaria' } },
                { type: 'Feature', geometry: { type: 'Point', coordinates: [20.1, 41.3] }, properties: { name: 'Albania' } },
                { type: 'Feature', geometry: { type: 'Point', coordinates: [21.7, 41.2] }, properties: { name: 'North Macedonia' } },
                { type: 'Feature', geometry: { type: 'Point', coordinates: [16.5, 40.5] }, properties: { name: 'Italy' } },
                { type: 'Feature', geometry: { type: 'Point', coordinates: [33.4, 35.1] }, properties: { name: 'Cyprus' } },
                { type: 'Feature', geometry: { type: 'Point', coordinates: [24.7, 35.2] }, properties: { name: 'Crete' } },
                { type: 'Feature', geometry: { type: 'Point', coordinates: [30.8, 33.5] }, properties: { name: 'Egypt' } },
                { type: 'Feature', geometry: { type: 'Point', coordinates: [35.5, 33.9] }, properties: { name: 'Lebanon' } },
                { type: 'Feature', geometry: { type: 'Point', coordinates: [36.3, 35.0] }, properties: { name: 'Syria' } },
              ],
            },
          },
        },
        layers: [
          { id: 'carto-dark-layer', type: 'raster', source: 'carto-dark', minzoom: 0, maxzoom: 20 },
          {
            id: 'country-labels-layer',
            type: 'symbol',
            source: 'country-labels',
            filter: ['!=', ['get', 'large'], true],
            layout: {
              'text-field': ['get', 'name'],
              'text-font': ['Open Sans Regular'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 3, 10, 6, 14, 9, 16],
              'text-transform': 'uppercase',
              'text-letter-spacing': 0.15,
              'text-max-width': 8,
              'text-allow-overlap': false,
              'text-padding': 10,
            },
            paint: {
              'text-color': '#8a8a8a',
              'text-halo-color': 'rgba(0, 0, 0, 0.8)',
              'text-halo-width': 1.5,
            },
          },
          {
            id: 'greece-label-layer',
            type: 'symbol',
            source: 'country-labels',
            filter: ['==', ['get', 'large'], true],
            layout: {
              'text-field': ['get', 'name'],
              'text-font': ['Open Sans Regular'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 3, 20, 6, 28, 9, 32],
              'text-transform': 'uppercase',
              'text-letter-spacing': 0.15,
              'text-max-width': 8,
              'text-allow-overlap': false,
              'text-padding': 10,
            },
            paint: {
              'text-color': '#8a8a8a',
              'text-halo-color': 'rgba(0, 0, 0, 0.8)',
              'text-halo-width': 1.5,
            },
          },
        ],
        glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
      },
      center: GREECE_CENTER,
      zoom: 5.95,
      pitch: 23.5,
      bearing: isMobile ? 0 : 20,
      maxBounds: [[15, 32], [32, 44]],
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    mapRef.current = map;
    if (process.env.NODE_ENV !== 'production') {
      (window as unknown as { __map: MLMap }).__map = map;
    }

    map.on('load', () => {
      addLayers(map, data);
      wireInteractions(map);
      applyMapFilters(map, data, filtersRef.current, togglesRef.current);
      loadedRef.current = true;
    });

    return () => {
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
    // Only run once. Data/filters/toggles are handled in downstream effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply filter/toggle changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    applyMapFilters(map, data, filters, toggles);
  }, [data, filters, toggles]);

  // Fly-to on external selection.
  useEffect(() => {
    if (!flySignal) return;
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const { farm } = flySignal;
    map.flyTo({ center: farm.coords, zoom: Math.max(map.getZoom(), 10), duration: 1000 });
    if (activePopupRef.current) activePopupRef.current.remove();
    activePopupRef.current = new maplibregl.Popup({ offset: 12, maxWidth: '280px' })
      .setLngLat(farm.coords)
      .setHTML(
        `<div class="popup-title">${escapeHtml(farm.id)}</div>
         <div class="popup-owner">${escapeHtml(farm.owner)}</div>
         <div class="popup-detail"><strong>Type:</strong> ${escapeHtml(farm.category)}</div>
         <div class="popup-detail"><strong>Species:</strong> ${escapeHtml(farm.species)}</div>`
      )
      .addTo(map);
  }, [flySignal]);

  function wireInteractions(map: MLMap) {
    const hoverPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });

    map.on('click', (e) => {
      try {
        const pointHits = map.queryRenderedFeatures(e.point, {
          layers: ['finfish-layer', 'shellfish-layer', 'abandoned-layer'],
        });
        if (pointHits.length > 0) {
          const hit = pointHits[0];
          const layer = hit.layer.id;
          if (layer === 'abandoned-layer') {
            const props = hit.properties || {};
            const coords = (hit.geometry as unknown as { coordinates: [number, number] })
              .coordinates;
            map.flyTo({ center: coords, zoom: Math.max(map.getZoom(), 10), duration: 1000 });
            if (activePopupRef.current) activePopupRef.current.remove();
            activePopupRef.current = new maplibregl.Popup({ offset: 12, maxWidth: '280px' })
              .setLngLat(coords)
              .setHTML(
                `<div class="popup-title">${escapeHtml(String(props.name ?? ''))}</div>
                 <div class="popup-detail"><strong>Status:</strong> ${escapeHtml(String(props.location_type ?? ''))}</div>`
              )
              .addTo(map);
          } else {
            const siteId = (hit.properties || {}).site_id as string | undefined;
            const farm = farmsRef.current.find((f) => f.id === siteId);
            if (farm) {
              if (activePopupRef.current) activePopupRef.current.remove();
              activePopupRef.current = new maplibregl.Popup({ offset: 12, maxWidth: '280px' })
                .setLngLat(farm.coords)
                .setHTML(
                  `<div class="popup-title">${escapeHtml(farm.id)}</div>
                   <div class="popup-owner">${escapeHtml(farm.owner)}</div>
                   <div class="popup-detail"><strong>Type:</strong> ${escapeHtml(farm.category)}</div>
                   <div class="popup-detail"><strong>Species:</strong> ${escapeHtml(farm.species)}</div>`
                )
                .addTo(map);
              onSelectFarmRef.current(farm);
            }
          }
          return;
        }

        const poayHits = map.getLayer('poay-fill')
          ? map.queryRenderedFeatures(e.point, { layers: ['poay-fill'] })
          : [];
        if (poayHits.length > 0) {
          const hit = poayHits[0];
          const p = (hit.properties || {}) as Record<string, unknown>;
          const srcFeatures = map.querySourceFeatures('poay-source');
          const match = srcFeatures.find(
            (f) =>
              (f.properties as Record<string, unknown>).name_gr === p.name_gr &&
              (f.properties as Record<string, unknown>).zone_gr === p.zone_gr
          );
          const geom = (match?.geometry || hit.geometry) as {
            type: string;
            coordinates: number[][][] | number[][][][];
          };
          const bounds = new maplibregl.LngLatBounds();
          const ring =
            geom.type === 'MultiPolygon'
              ? (geom.coordinates as number[][][][])[0][0]
              : (geom.coordinates as number[][][])[0];
          if (ring) ring.forEach((c) => bounds.extend(c as [number, number]));
          if (!bounds.isEmpty()) {
            map.fitBounds(bounds, { padding: 80, duration: 1000, maxZoom: 12 });
          }

          if (activePopupRef.current) activePopupRef.current.remove();
          activePopupRef.current = new maplibregl.Popup({ offset: 12, maxWidth: '300px' })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div class="popup-title">Fish Farm Expansion Zone</div>
               <div class="popup-owner">${escapeHtml(String(p.zone_en ?? p.zone_gr ?? ''))}</div>
               <div class="popup-detail"><strong>Greek Name:</strong> ${escapeHtml(String(p.name_gr ?? ''))}</div>
               <div class="popup-detail"><strong>Region:</strong> ${escapeHtml(String(p.zone_gr ?? ''))}</div>`
            )
            .addTo(map);
          onSelectPoayRef.current(p);
          return;
        }

        const n2kHits = map.getLayer('natura2000-fill')
          ? map.queryRenderedFeatures(e.point, { layers: ['natura2000-fill'] })
          : [];
        if (n2kHits.length > 0) {
          const hit = n2kHits[0];
          const p = (hit.properties || {}) as Record<string, unknown>;
          const siteTypeLabels: Record<string, string> = {
            A: 'SPA (Birds Directive)',
            B: 'SCI/SAC (Habitats Directive)',
            C: 'SPA + SCI/SAC',
          };
          if (activePopupRef.current) activePopupRef.current.remove();
          const areaNum = Number(p.AREAHA);
          activePopupRef.current = new maplibregl.Popup({ offset: 12, maxWidth: '320px' })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div class="popup-title">Natura 2000 Marine Protected Area</div>
               <div class="popup-owner">${escapeHtml(String(p.SITENAME ?? ''))}</div>
               <div class="popup-detail"><strong>Site Code:</strong> ${escapeHtml(String(p.SITECODE ?? ''))}</div>
               <div class="popup-detail"><strong>Designation:</strong> ${escapeHtml(siteTypeLabels[String(p.SITETYPE)] ?? String(p.SITETYPE ?? ''))}</div>
               <div class="popup-detail"><strong>Area:</strong> ${isFinite(areaNum) ? areaNum.toLocaleString() : ''} ha</div>
               <div class="popup-detail"><strong>Marine:</strong> ${escapeHtml(String(p.MARINE_AREA_PERCENTAGE ?? ''))}%</div>`
            )
            .addTo(map);
          return;
        }

        // Empty click.
        if (activePopupRef.current) activePopupRef.current.remove();
        onEmptyClickRef.current();
      } catch (err) {
        console.error('Click handler error:', err);
      }
    });

    const setCursor = (cursor: string) => (map.getCanvas().style.cursor = cursor);

    (['finfish-layer', 'shellfish-layer', 'abandoned-layer'] as const).forEach((id) => {
      map.on('mouseenter', id, () => setCursor('pointer'));
      map.on('mouseleave', id, () => setCursor(''));
    });

    function showHover(
      e: maplibregl.MapLayerMouseEvent,
      type: 'finfish' | 'shellfish'
    ) {
      const p = (e.features?.[0]?.properties || {}) as Record<string, unknown>;
      const ownerKey = type === 'finfish' ? 'owner_name' : 'owner';
      const farmKey = type === 'finfish' ? 'farm_type' : 'farmtype';
      hoverPopup
        .setLngLat(e.lngLat)
        .setHTML(
          `<div class="popup-title">${escapeHtml(String(p.site_id ?? ''))}</div>
           <div class="popup-owner">${escapeHtml(String(p[ownerKey] ?? 'Unknown'))}</div>
           <div class="popup-detail"><strong>Type:</strong> ${escapeHtml(String(p[farmKey] ?? 'N/A'))}</div>`
        )
        .addTo(map);
    }

    map.on('mousemove', 'finfish-layer', (e) => showHover(e, 'finfish'));
    map.on('mousemove', 'shellfish-layer', (e) => showHover(e, 'shellfish'));
    map.on('mousemove', 'abandoned-layer', (e) => {
      const p = (e.features?.[0]?.properties || {}) as Record<string, unknown>;
      hoverPopup
        .setLngLat(e.lngLat)
        .setHTML(
          `<div class="popup-title">${escapeHtml(String(p.name ?? ''))}</div>
           <div class="popup-detail">${escapeHtml(String(p.location_type ?? ''))}</div>`
        )
        .addTo(map);
    });
    map.on('mouseleave', 'finfish-layer', () => hoverPopup.remove());
    map.on('mouseleave', 'shellfish-layer', () => hoverPopup.remove());
    map.on('mouseleave', 'abandoned-layer', () => hoverPopup.remove());

    let hoveredZoneId: number | string | null = null;
    map.on('mouseenter', 'poay-fill', () => setCursor('pointer'));
    map.on('mouseleave', 'poay-fill', () => {
      setCursor('');
      hoverPopup.remove();
      if (hoveredZoneId !== null) {
        map.setFeatureState({ source: 'poay-source', id: hoveredZoneId }, { hover: false });
        hoveredZoneId = null;
      }
    });
    map.on('mousemove', 'poay-fill', (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      if (hoveredZoneId !== null) {
        map.setFeatureState({ source: 'poay-source', id: hoveredZoneId }, { hover: false });
      }
      hoveredZoneId = feat.id as number | string;
      map.setFeatureState({ source: 'poay-source', id: hoveredZoneId }, { hover: true });
      const p = (feat.properties || {}) as Record<string, unknown>;
      hoverPopup
        .setLngLat(e.lngLat)
        .setHTML(
          `<div class="popup-title">Fish Farm Expansion Zone</div>
           <div class="popup-owner">${escapeHtml(String(p.zone_en ?? p.zone_gr ?? ''))}</div>
           <div class="popup-detail">${escapeHtml(String(p.name_gr ?? ''))}</div>`
        )
        .addTo(map);
    });

    let hoveredN2kId: number | string | null = null;
    map.on('mouseenter', 'natura2000-fill', () => setCursor('pointer'));
    map.on('mouseleave', 'natura2000-fill', () => {
      setCursor('');
      hoverPopup.remove();
      if (hoveredN2kId !== null) {
        map.setFeatureState({ source: 'natura2000-source', id: hoveredN2kId }, { hover: false });
        hoveredN2kId = null;
      }
    });
    map.on('mousemove', 'natura2000-fill', (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      if (hoveredN2kId !== null) {
        map.setFeatureState({ source: 'natura2000-source', id: hoveredN2kId }, { hover: false });
      }
      hoveredN2kId = feat.id as number | string;
      map.setFeatureState({ source: 'natura2000-source', id: hoveredN2kId }, { hover: true });
      const p = (feat.properties || {}) as Record<string, unknown>;
      hoverPopup
        .setLngLat(e.lngLat)
        .setHTML(
          `<div class="popup-title">Marine Protected Area</div>
           <div class="popup-owner">${escapeHtml(String(p.SITENAME ?? ''))}</div>
           <div class="popup-detail">${escapeHtml(String(p.SITECODE ?? ''))}</div>`
        )
        .addTo(map);
    });
  }

  return <div id="map" ref={containerRef} />;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function addLayers(map: MLMap, data: GeoData) {
  map.addImage('triangle-icon', makeTriangleIcon(), { pixelRatio: 2 });
  map.addImage('diamond-icon', makeDiamondIcon(), { pixelRatio: 2 });
  map.addImage('x-icon', makeXIcon(), { pixelRatio: 2 });

  map.addSource('finfish-source', { type: 'geojson', data: data.finfish });
  map.addSource('shellfish-source', { type: 'geojson', data: data.shellfish });
  map.addSource('abandoned-source', { type: 'geojson', data: data.abandoned });

  const sizeExpr = [
    'interpolate',
    ['linear'],
    ['zoom'],
    4,
    0.625,
    8,
    0.875,
    12,
    1.25,
  ];

  map.addLayer({
    id: 'shellfish-layer',
    type: 'symbol',
    source: 'shellfish-source',
    layout: {
      'icon-image': 'diamond-icon',
      'icon-size': sizeExpr as unknown as number,
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  });

  map.addLayer({
    id: 'finfish-layer',
    type: 'symbol',
    source: 'finfish-source',
    layout: {
      'icon-image': 'triangle-icon',
      'icon-size': sizeExpr as unknown as number,
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  });

  map.addLayer({
    id: 'abandoned-layer',
    type: 'symbol',
    source: 'abandoned-source',
    layout: {
      'icon-image': 'x-icon',
      'icon-size': sizeExpr as unknown as number,
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  });

  map.addSource('water-labels', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { name: 'Aegean Sea' }, geometry: { type: 'Point', coordinates: [25.0, 38.5] } },
        { type: 'Feature', properties: { name: 'Ionian Sea' }, geometry: { type: 'Point', coordinates: [19.8, 37.5] } },
        { type: 'Feature', properties: { name: 'Sea of Crete' }, geometry: { type: 'Point', coordinates: [24.5, 35.8] } },
        { type: 'Feature', properties: { name: 'Thermaikos Gulf' }, geometry: { type: 'Point', coordinates: [23.1, 40.2] } },
        { type: 'Feature', properties: { name: 'Gulf of Corinth' }, geometry: { type: 'Point', coordinates: [22.2, 38.25] } },
      ],
    },
  });

  map.addLayer({
    id: 'water-labels-layer',
    type: 'symbol',
    source: 'water-labels',
    layout: {
      'text-field': ['get', 'name'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 5, 11, 8, 13],
      'text-font': ['Open Sans Italic'],
      'text-letter-spacing': 0.15,
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: {
      'text-color': 'hsla(200, 30%, 60%, 0.6)',
      'text-halo-color': 'rgba(0, 0, 0, 0.5)',
      'text-halo-width': 1,
    },
  });

  map.addSource('natura2000-source', { type: 'geojson', data: data.natura2000, generateId: true });
  map.addLayer({
    id: 'natura2000-fill',
    type: 'fill',
    source: 'natura2000-source',
    paint: {
      'fill-color': '#2d9e8f',
      'fill-opacity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        4,
        ['case', ['boolean', ['feature-state', 'hover'], false], 0.3, 0.1],
        8,
        ['case', ['boolean', ['feature-state', 'hover'], false], 0.3, 0.15],
        12,
        ['case', ['boolean', ['feature-state', 'hover'], false], 0.3, 0.18],
      ],
    },
  });
  map.addLayer({
    id: 'natura2000-outline',
    type: 'line',
    source: 'natura2000-source',
    paint: {
      'line-color': '#2d9e8f',
      'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.5, 8, 1, 12, 1.5],
      'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0.6],
    },
  });
  map.addLayer({
    id: 'natura2000-labels',
    type: 'symbol',
    source: 'natura2000-source',
    minzoom: 10,
    layout: {
      'text-field': ['get', 'SITENAME'],
      'text-size': 10,
      'text-font': ['Open Sans Regular'],
      'text-allow-overlap': false,
    },
    paint: {
      'text-color': '#2d9e8f',
      'text-halo-color': '#000',
      'text-halo-width': 1.5,
      'text-opacity': 0.85,
    },
  });

  map.addSource('poay-source', { type: 'geojson', data: data.poay, generateId: true });
  map.addLayer({
    id: 'poay-fill',
    type: 'fill',
    source: 'poay-source',
    paint: {
      'fill-color': '#d4a052',
      'fill-opacity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        4,
        ['case', ['boolean', ['feature-state', 'hover'], false], 0.35, 0.12],
        8,
        ['case', ['boolean', ['feature-state', 'hover'], false], 0.35, 0.18],
        12,
        ['case', ['boolean', ['feature-state', 'hover'], false], 0.35, 0.22],
      ],
    },
  });
  map.addLayer({
    id: 'poay-outline',
    type: 'line',
    source: 'poay-source',
    paint: {
      'line-color': '#d4a052',
      'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1, 8, 1.5, 12, 2.5],
      'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0.7],
    },
  });
  map.addLayer({
    id: 'poay-labels',
    type: 'symbol',
    source: 'poay-source',
    minzoom: 9,
    layout: {
      'text-field': ['get', 'name_gr'],
      'text-size': 11,
      'text-font': ['Open Sans Regular'],
      'text-allow-overlap': false,
    },
    paint: {
      'text-color': '#d4a052',
      'text-halo-color': '#000',
      'text-halo-width': 1.5,
      'text-opacity': 0.85,
    },
  });
}

function applyMapFilters(
  map: MLMap,
  data: GeoData,
  filters: Filters,
  toggles: LayerToggles
) {
  const finSrc = map.getSource('finfish-source') as maplibregl.GeoJSONSource | undefined;
  const shellSrc = map.getSource('shellfish-source') as maplibregl.GeoJSONSource | undefined;
  if (!finSrc || !shellSrc) return;

  const ff = filterMapFinfish(data.finfish, filters) as FeatureCollection;
  const sf = filterMapShellfish(data.shellfish, filters) as FeatureCollection;
  finSrc.setData(ff);
  shellSrc.setData(sf);

  // Layer visibility from toggles.
  setVis(map, 'finfish-layer', toggles.finfish);
  setVis(map, 'shellfish-layer', toggles.shellfish);
  ['poay-fill', 'poay-outline', 'poay-labels'].forEach((id) => setVis(map, id, toggles.poay));
  ['natura2000-fill', 'natura2000-outline', 'natura2000-labels'].forEach((id) =>
    setVis(map, id, toggles.natura2000)
  );

  // Abandoned: hidden when any filter active (unless manually off already).
  const hideByFilter = hasActiveFilters(filters);
  const shouldShowAbandoned = toggles.abandoned && !hideByFilter;
  setVis(map, 'abandoned-layer', shouldShowAbandoned);
}

function setVis(map: MLMap, id: string, visible: boolean) {
  if (!map.getLayer(id)) return;
  map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
}
