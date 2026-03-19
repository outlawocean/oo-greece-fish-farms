let map, minimapInstance;
let finfishData = null;
let shellfishData = null;
let poayData = null;
let abandonedData = null;
let allFarms = [];
let filteredFarms = [];
let activePopup = null;

// Table state
let activeTab = 'map';
let tableSortField = 'owner';
let tableSortDirection = 'asc';
let tableCurrentPage = 1;
let tableSearchTerm = '';
const TABLE_ROWS_PER_PAGE = 100;

const TABLE_COLUMNS = [
    { key: 'owner', label: 'Owner' },
    { key: 'type', label: 'Type', info: 'Whether the farm raises finfish (e.g. sea bass, sea bream) or shellfish (e.g. mussels, oysters)' },
    { key: 'category', label: 'Category', info: 'The farm classification such as cage-based, pond, or hatchery' },
    { key: 'species', label: 'Species' },
    { key: 'production', label: 'Production' },
    { key: 'stage', label: 'Stage' },
    { key: 'position', label: 'Position' },
    { key: 'coastDist', label: 'Coast Dist.' },
    { key: 'status', label: 'Status' },
    { key: 'eurostat', label: 'Eurostat', info: 'EU statistical classification code used for harmonized aquaculture reporting' },
    { key: 'id', label: 'Site ID' },
    { key: 'lat', label: 'Lat' },
    { key: 'lng', label: 'Lon' }
];

const GREECE_CENTER = [23.5, 38.5];
const GREECE_BOUNDS = [[19.3, 34.5], [29.7, 42.0]];

async function init() {
    await Promise.all([loadData(), initMap()]);
    processData();
    populateFilters();
    applyFilters();
    addMapLayers();
    setupEvents();
    initMinimap();
}

async function loadData() {
    const [ff, sf, pz, ab] = await Promise.all([
        fetch('data/finfish.geojson').then(r => r.json()),
        fetch('data/shellfish.geojson').then(r => r.json()),
        fetch('data/poay_zones.geojson').then(r => r.json()),
        fetch('data/abandoned.geojson').then(r => r.json())
    ]);
    finfishData = ff;
    shellfishData = sf;
    poayData = pz;
    abandonedData = ab;
}

function initMap() {
    return new Promise(resolve => {
        map = new maplibregl.Map({
            container: 'map',
            style: {
                version: 8,
                sources: {
                    'carto-dark': {
                        type: 'raster',
                        tiles: [
                            'https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png',
                            'https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png'
                        ],
                        tileSize: 256,
                        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
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
                                { type: 'Feature', geometry: { type: 'Point', coordinates: [12.5, 42.5] }, properties: { name: 'Italy' } },
                                { type: 'Feature', geometry: { type: 'Point', coordinates: [33.4, 35.1] }, properties: { name: 'Cyprus' } },
                                { type: 'Feature', geometry: { type: 'Point', coordinates: [24.7, 35.2] }, properties: { name: 'Crete' } },
                                { type: 'Feature', geometry: { type: 'Point', coordinates: [30.8, 33.5] }, properties: { name: 'Egypt' } },
                                { type: 'Feature', geometry: { type: 'Point', coordinates: [35.5, 33.9] }, properties: { name: 'Lebanon' } },
                                { type: 'Feature', geometry: { type: 'Point', coordinates: [36.3, 35.0] }, properties: { name: 'Syria' } }
                            ]
                        }
                    }
                },
                layers: [
                    {
                        id: 'carto-dark-layer',
                        type: 'raster',
                        source: 'carto-dark',
                        minzoom: 0,
                        maxzoom: 20
                    },
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
                            'text-padding': 10
                        },
                        paint: {
                            'text-color': '#8a8a8a',
                            'text-halo-color': 'rgba(0, 0, 0, 0.8)',
                            'text-halo-width': 1.5
                        }
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
                            'text-padding': 10
                        },
                        paint: {
                            'text-color': '#8a8a8a',
                            'text-halo-color': 'rgba(0, 0, 0, 0.8)',
                            'text-halo-width': 1.5
                        }
                    }
                ],
                glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf'
            },
            center: GREECE_CENTER,
            zoom: 6,
            maxBounds: [[15, 32], [32, 44]],
            attributionControl: false
        });

        map.addControl(new maplibregl.NavigationControl(), 'top-right');
        map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

        map.on('load', resolve);
    });
}

function processData() {
    finfishData.features.forEach(f => {
        const p = f.properties;
        allFarms.push({
            type: 'finfish',
            id: p.site_id,
            owner: p.owner_name || '',
            category: p.farm_type || '',
            production: p.production || '',
            stage: p.producti_1 || '',
            species: p.species_so || '',
            position: p.position_c || '',
            coastDist: p.coast_dist || 0,
            status: p.status || '',
            eurostat: p.eurostatco || '',
            euroSpecies: p.eurospecie || '',
            euroSpeciesLatin: p.eurospeci0 || '',
            coords: f.geometry.coordinates,
            feature: f
        });
    });

    shellfishData.features.forEach(f => {
        const p = f.properties;
        allFarms.push({
            type: 'shellfish',
            id: p.site_id,
            owner: p.owner || '',
            category: p.farmtype || '',
            production: p.prod_metho || '',
            stage: p.prod_stage || '',
            species: p.species || '',
            position: p.costal_inl || '',
            coastDist: p.distance_t || 0,
            status: (!p.status || p.status.toLowerCase() === 'n.a.') ? 'Active' : p.status,
            eurostat: p.eurostatco || '',
            euroSpecies: p.species_gr || '',
            euroSpeciesLatin: p.species_na || '',
            coords: f.geometry.coordinates,
            feature: f
        });
    });

    document.getElementById('total-count').textContent = allFarms.length;
    document.getElementById('finfish-count').textContent = finfishData.features.length;
    document.getElementById('shellfish-count').textContent = shellfishData.features.length;
    document.getElementById('abandoned-count').textContent = abandonedData.features.length;
}

function populateFilters() {
    const categories = [...new Set(allFarms.map(f => f.category))].filter(c => c && c !== 'n.a.').sort();
    const select = document.getElementById('category-filter');
    categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        select.appendChild(opt);
    });
}

function matchCoastDist(dist, range) {
    const d = Number(dist) || 0;
    switch (range) {
        case '0-200': return d < 200;
        case '200-500': return d >= 200 && d < 500;
        case '500-1000': return d >= 500 && d < 1000;
        case '1000+': return d >= 1000;
        default: return true;
    }
}

function applyFilters() {
    const search = document.getElementById('search').value.toLowerCase();
    const typeFilter = document.querySelector('#type-filter .filter-btn.active').dataset.value;
    const categoryFilter = document.getElementById('category-filter').value;
    const coastDistFilter = document.getElementById('coast-dist-filter').value;

    filteredFarms = allFarms.filter(f => {
        if (typeFilter !== 'all' && f.type !== typeFilter) return false;
        if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;
        if (coastDistFilter !== 'all' && !matchCoastDist(f.coastDist, coastDistFilter)) return false;
        if (search) {
            const s = search;
            if (!f.owner.toLowerCase().includes(s) &&
                !f.id.toLowerCase().includes(s) &&
                !f.species.toLowerCase().includes(s) &&
                !f.category.toLowerCase().includes(s)) return false;
        }
        return true;
    });

    document.getElementById('results-count').textContent = `${filteredFarms.length} results`;
    renderList();
    updateMapFilters();

    // Update table if visible
    if (activeTab === 'table') {
        tableCurrentPage = 1;
        renderTable();
    }
}

function renderList() {
    const list = document.getElementById('farm-list');
    const fragment = document.createDocumentFragment();

    filteredFarms.forEach(farm => {
        const div = document.createElement('div');
        div.className = 'farm-item';
        div.dataset.id = farm.id;
        div.dataset.lng = farm.coords[0];
        div.dataset.lat = farm.coords[1];
        div.innerHTML = `
            <div class="farm-item-header">
                <span class="farm-item-name">${farm.owner || 'Unknown Owner'}</span>
                <span class="farm-item-type type-${farm.type}">${farm.type}</span>
            </div>
            <div class="farm-item-meta">
                <span>${farm.category}</span>
                <span>${farm.position}</span>
            </div>
        `;
        div.addEventListener('click', () => selectFarm(farm, true));
        fragment.appendChild(div);
    });

    list.innerHTML = '';
    list.appendChild(fragment);
}

function updateMapFilters() {
    if (!map.getSource('finfish-source')) return;

    const typeFilter = document.querySelector('#type-filter .filter-btn.active').dataset.value;
    const categoryFilter = document.getElementById('category-filter').value;
    const coastDistFilter = document.getElementById('coast-dist-filter').value;
    const search = document.getElementById('search').value.toLowerCase();

    const filteredFinfish = {
        type: 'FeatureCollection',
        features: finfishData.features.filter(f => {
            if (typeFilter === 'shellfish') return false;
            const p = f.properties;
            if (categoryFilter !== 'all' && p.farm_type !== categoryFilter) return false;
            if (coastDistFilter !== 'all' && !matchCoastDist(p.coast_dist, coastDistFilter)) return false;
            if (search) {
                if (!(p.owner_name || '').toLowerCase().includes(search) &&
                    !(p.site_id || '').toLowerCase().includes(search) &&
                    !(p.species_so || '').toLowerCase().includes(search) &&
                    !(p.farm_type || '').toLowerCase().includes(search)) return false;
            }
            return true;
        })
    };

    const filteredShellfish = {
        type: 'FeatureCollection',
        features: shellfishData.features.filter(f => {
            if (typeFilter === 'finfish') return false;
            const p = f.properties;
            if (categoryFilter !== 'all' && p.farmtype !== categoryFilter) return false;
            if (coastDistFilter !== 'all' && !matchCoastDist(p.distance_t, coastDistFilter)) return false;
            if (search) {
                if (!(p.owner || '').toLowerCase().includes(search) &&
                    !(p.site_id || '').toLowerCase().includes(search) &&
                    !(p.species || '').toLowerCase().includes(search) &&
                    !(p.farmtype || '').toLowerCase().includes(search)) return false;
            }
            return true;
        })
    };

    map.getSource('finfish-source').setData(filteredFinfish);
    map.getSource('shellfish-source').setData(filteredShellfish);

    // Hide abandoned farms when any filter is active
    const hasActiveFilter = typeFilter !== 'all' || categoryFilter !== 'all' || coastDistFilter !== 'all' || search;
    const abandonedToggle = document.getElementById('toggle-abandoned');
    const manuallyHidden = abandonedToggle.classList.contains('off');
    if (!manuallyHidden) {
        map.setLayoutProperty('abandoned-layer', 'visibility', hasActiveFilter ? 'none' : 'visible');
    }
}

function addMapLayers() {
    // Water body labels for geographic context
    map.addSource('water-labels', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: [
                { type: 'Feature', properties: { name: 'Aegean Sea' }, geometry: { type: 'Point', coordinates: [25.0, 38.5] } },
                { type: 'Feature', properties: { name: 'Ionian Sea' }, geometry: { type: 'Point', coordinates: [19.8, 37.5] } },
                { type: 'Feature', properties: { name: 'Sea of Crete' }, geometry: { type: 'Point', coordinates: [24.5, 35.8] } },
                { type: 'Feature', properties: { name: 'Thermaikos Gulf' }, geometry: { type: 'Point', coordinates: [23.1, 40.2] } },
                { type: 'Feature', properties: { name: 'Gulf of Corinth' }, geometry: { type: 'Point', coordinates: [22.2, 38.25] } }
            ]
        }
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
            'text-allow-overlap': false
        },
        paint: {
            'text-color': 'hsla(200, 30%, 60%, 0.6)',
            'text-halo-color': 'rgba(0, 0, 0, 0.5)',
            'text-halo-width': 1
        }
    });

    // Create triangle icon for finfish
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
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

    const imageData = ctx.getImageData(0, 0, size, size);
    map.addImage('triangle-icon', imageData, { pixelRatio: 2 });

    map.addSource('finfish-source', {
        type: 'geojson',
        data: finfishData
    });

    map.addSource('shellfish-source', {
        type: 'geojson',
        data: shellfishData
    });

    map.addLayer({
        id: 'shellfish-layer',
        type: 'circle',
        source: 'shellfish-source',
        paint: {
            'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                4, 3.75,
                8, 6.25,
                12, 10
            ],
            'circle-color': '#64b4dc',
            'circle-stroke-color': '#000',
            'circle-stroke-width': 1.5,
            'circle-opacity': 0.85
        }
    });

    map.addLayer({
        id: 'finfish-layer',
        type: 'symbol',
        source: 'finfish-source',
        layout: {
            'icon-image': 'triangle-icon',
            'icon-size': [
                'interpolate', ['linear'], ['zoom'],
                4, 0.625,
                8, 0.875,
                12, 1.25
            ],
            'icon-allow-overlap': true,
            'icon-ignore-placement': true
        }
    });

    // Abandoned sites — prohibition / "no entry" icon
    const xSize = 32;
    const xCanvas = document.createElement('canvas');
    xCanvas.width = xSize;
    xCanvas.height = xSize;
    const xCtx = xCanvas.getContext('2d');
    xCtx.strokeStyle = '#e74c3c';
    xCtx.lineWidth = 2.5;
    const cx = xSize / 2, cy = xSize / 2, r = 10;
    xCtx.beginPath();
    xCtx.arc(cx, cy, r, 0, Math.PI * 2);
    xCtx.stroke();
    xCtx.lineCap = 'round';
    xCtx.beginPath();
    xCtx.moveTo(cx - r * Math.cos(Math.PI / 4), cy - r * Math.sin(Math.PI / 4));
    xCtx.lineTo(cx + r * Math.cos(Math.PI / 4), cy + r * Math.sin(Math.PI / 4));
    xCtx.stroke();

    const xImageData = xCtx.getImageData(0, 0, xSize, xSize);
    map.addImage('x-icon', xImageData, { pixelRatio: 2 });

    map.addSource('abandoned-source', {
        type: 'geojson',
        data: abandonedData
    });

    map.addLayer({
        id: 'abandoned-layer',
        type: 'symbol',
        source: 'abandoned-source',
        layout: {
            'icon-image': 'x-icon',
            'icon-size': [
                'interpolate', ['linear'], ['zoom'],
                4, 0.625,
                8, 0.875,
                12, 1.25
            ],
            'icon-allow-overlap': true,
            'icon-ignore-placement': true
        }
    });

    // POAY aquaculture zones — rendered above farm layers for visibility
    map.addSource('poay-source', {
        type: 'geojson',
        data: poayData,
        generateId: true
    });

    map.addLayer({
        id: 'poay-fill',
        type: 'fill',
        source: 'poay-source',
        paint: {
            'fill-color': '#d4a052',
            'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                0.35,
                ['interpolate', ['linear'], ['zoom'],
                    4, 0.12,
                    8, 0.18,
                    12, 0.22
                ]
            ]
        }
    });

    map.addLayer({
        id: 'poay-outline',
        type: 'line',
        source: 'poay-source',
        paint: {
            'line-color': '#d4a052',
            'line-width': [
                'interpolate', ['linear'], ['zoom'],
                4, 1,
                8, 1.5,
                12, 2.5
            ],
            'line-opacity': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                1,
                0.7
            ]
        }
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
            'text-allow-overlap': false
        },
        paint: {
            'text-color': '#d4a052',
            'text-halo-color': '#000',
            'text-halo-width': 1.5,
            'text-opacity': 0.85
        }
    });

    // Unified click handler — farms/abandoned take priority over POAY fill
    map.on('click', (e) => {
        // Check point layers first (farms, abandoned)
        const pointLayers = ['finfish-layer', 'shellfish-layer', 'abandoned-layer'];
        const pointHits = map.queryRenderedFeatures(e.point, { layers: pointLayers });

        if (pointHits.length > 0) {
            const hit = pointHits[0];
            const layer = hit.layer.id;
            if (layer === 'abandoned-layer') {
                const props = hit.properties;
                const coords = hit.geometry.coordinates;
                map.flyTo({ center: coords, zoom: Math.max(map.getZoom(), 10), duration: 1000 });
                if (activePopup) activePopup.remove();
                activePopup = new maplibregl.Popup({ offset: 12, maxWidth: '280px' })
                    .setLngLat(coords)
                    .setHTML(`
                        <div class="popup-title">${props.name}</div>
                        <div class="popup-detail"><strong>Status:</strong> ${props.location_type}</div>
                    `)
                    .addTo(map);
            } else {
                const props = hit.properties;
                const farm = allFarms.find(f => f.id === props.site_id);
                if (farm) selectFarm(farm);
            }
            return;
        }

        // Then check POAY zones
        const poayHits = map.queryRenderedFeatures(e.point, { layers: ['poay-fill'] });
        if (poayHits.length > 0) {
            const hit = poayHits[0];
            const p = hit.properties;
            const bounds = new maplibregl.LngLatBounds();
            const coords = hit.geometry.coordinates[0];
            coords.forEach(c => bounds.extend(c));
            map.fitBounds(bounds, { padding: 80, duration: 1000, maxZoom: 12 });

            if (activePopup) activePopup.remove();
            activePopup = new maplibregl.Popup({ offset: 12, maxWidth: '300px' })
                .setLngLat(e.lngLat)
                .setHTML(`
                    <div class="popup-title">POAY Zone</div>
                    <div class="popup-owner">${p.zone_en || p.zone_gr}</div>
                    <div class="popup-detail"><strong>Greek Name:</strong> ${p.name_gr}</div>
                    <div class="popup-detail"><strong>Region:</strong> ${p.zone_gr}</div>
                `)
                .addTo(map);
            showPoayDetail(p);
            return;
        }

        // Clicked empty space — close panels
        document.getElementById('detail-panel').classList.add('hidden');
        document.querySelectorAll('.farm-item.active').forEach(el => el.classList.remove('active'));
        if (activePopup) activePopup.remove();
    });

    map.on('mouseenter', 'finfish-layer', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'finfish-layer', () => map.getCanvas().style.cursor = '');
    map.on('mouseenter', 'shellfish-layer', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'shellfish-layer', () => map.getCanvas().style.cursor = '');
    map.on('mouseenter', 'abandoned-layer', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'abandoned-layer', () => map.getCanvas().style.cursor = '');

    // Hover popup
    let hoverPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });

    function showHover(e, type) {
        const p = e.features[0].properties;
        const ownerKey = type === 'finfish' ? 'owner_name' : 'owner';
        const farmKey = type === 'finfish' ? 'farm_type' : 'farmtype';
        hoverPopup
            .setLngLat(e.lngLat)
            .setHTML(`
                <div class="popup-title">${p.site_id}</div>
                <div class="popup-owner">${p[ownerKey] || 'Unknown'}</div>
                <div class="popup-detail"><strong>Type:</strong> ${p[farmKey] || 'N/A'}</div>
            `)
            .addTo(map);
    }

    map.on('mousemove', 'finfish-layer', e => showHover(e, 'finfish'));
    map.on('mousemove', 'shellfish-layer', e => showHover(e, 'shellfish'));
    map.on('mousemove', 'abandoned-layer', e => {
        const p = e.features[0].properties;
        hoverPopup
            .setLngLat(e.lngLat)
            .setHTML(`
                <div class="popup-title">${p.name}</div>
                <div class="popup-detail">${p.location_type}</div>
            `)
            .addTo(map);
    });
    map.on('mouseleave', 'finfish-layer', () => hoverPopup.remove());
    map.on('mouseleave', 'shellfish-layer', () => hoverPopup.remove());
    map.on('mouseleave', 'abandoned-layer', () => hoverPopup.remove());

    // POAY zone hover
    let hoveredZoneId = null;
    map.on('mouseenter', 'poay-fill', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'poay-fill', () => {
        map.getCanvas().style.cursor = '';
        hoverPopup.remove();
        if (hoveredZoneId !== null) {
            map.setFeatureState({ source: 'poay-source', id: hoveredZoneId }, { hover: false });
            hoveredZoneId = null;
        }
    });
    map.on('mousemove', 'poay-fill', (e) => {
        if (hoveredZoneId !== null) {
            map.setFeatureState({ source: 'poay-source', id: hoveredZoneId }, { hover: false });
        }
        hoveredZoneId = e.features[0].id;
        map.setFeatureState({ source: 'poay-source', id: hoveredZoneId }, { hover: true });
        const p = e.features[0].properties;
        hoverPopup
            .setLngLat(e.lngLat)
            .setHTML(`
                <div class="popup-title">POAY Zone</div>
                <div class="popup-owner">${p.zone_en || p.zone_gr}</div>
                <div class="popup-detail">${p.name_gr}</div>
            `)
            .addTo(map);
    });
}

function selectFarm(farm, fromSidebar = false) {
    // Switch to map tab if on table
    if (activeTab === 'table') {
        switchTab('map');
    }

    // Only highlight/scroll sidebar when clicked from the sidebar
    if (fromSidebar) {
        document.querySelectorAll('.farm-item.active').forEach(el => el.classList.remove('active'));
        const listItem = document.querySelector(`.farm-item[data-id="${farm.id}"]`);
        if (listItem) {
            listItem.classList.add('active');
            listItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        map.flyTo({
            center: farm.coords,
            zoom: Math.max(map.getZoom(), 10),
            duration: 1000
        });
    }

    if (activePopup) activePopup.remove();
    activePopup = new maplibregl.Popup({ offset: 12, maxWidth: '280px' })
        .setLngLat(farm.coords)
        .setHTML(`
            <div class="popup-title">${farm.id}</div>
            <div class="popup-owner">${farm.owner}</div>
            <div class="popup-detail"><strong>Type:</strong> ${farm.category}</div>
            <div class="popup-detail"><strong>Species:</strong> ${farm.species}</div>
            <div class="popup-detail"><strong>Position:</strong> ${farm.position}</div>
        `)
        .addTo(map);

    showDetail(farm);
}

function showPoayDetail(props) {
    const panel = document.getElementById('detail-panel');
    const content = document.getElementById('detail-content');

    content.innerHTML = `
        <div class="detail-title">POAY Zone</div>
        <div class="detail-subtitle">${props.zone_en || props.zone_gr}</div>

        <div class="detail-section">
            <h3>Zone Information</h3>
            <div class="detail-field">
                <span class="detail-field-label">Name (EN)</span>
                <span class="detail-field-value">${props.zone_en || 'N/A'}</span>
            </div>
            <div class="detail-field">
                <span class="detail-field-label">Name (GR)</span>
                <span class="detail-field-value">${props.zone_gr || 'N/A'}</span>
            </div>
            <div class="detail-field">
                <span class="detail-field-label">Designation</span>
                <span class="detail-field-value">${props.name_gr || 'N/A'}</span>
            </div>
        </div>
    `;

    panel.classList.remove('hidden');
}

function showDetail(farm) {
    const panel = document.getElementById('detail-panel');
    const content = document.getElementById('detail-content');

    const distLabel = farm.coastDist > 1000
        ? `${(farm.coastDist / 1000).toFixed(1)} km`
        : `${Math.round(farm.coastDist)} m`;

    content.innerHTML = `
        <div class="detail-title">${farm.id}</div>
        <div class="detail-subtitle">${farm.owner}</div>

        <div class="detail-section">
            <h3>Classification</h3>
            <div class="detail-field">
                <span class="detail-field-label">Type</span>
                <span class="detail-field-value">${farm.type === 'finfish' ? 'Finfish' : 'Shellfish'}</span>
            </div>
            <div class="detail-field">
                <span class="detail-field-label">Category</span>
                <span class="detail-field-value">${farm.category}</span>
            </div>
            <div class="detail-field">
                <span class="detail-field-label">Status</span>
                <span class="detail-field-value">${farm.status || 'N/A'}</span>
            </div>
        </div>

        <div class="detail-section">
            <h3>Production</h3>
            <div class="detail-field">
                <span class="detail-field-label">Method</span>
                <span class="detail-field-value">${farm.production || 'N/A'}</span>
            </div>
            <div class="detail-field">
                <span class="detail-field-label">Stage</span>
                <span class="detail-field-value">${farm.stage || 'N/A'}</span>
            </div>
        </div>

        <div class="detail-section">
            <h3>Species</h3>
            <div class="detail-field">
                <span class="detail-field-label">Species</span>
                <span class="detail-field-value">${farm.species || 'N/A'}</span>
            </div>
            <div class="detail-field">
                <span class="detail-field-label">Eurostat Group</span>
                <span class="detail-field-value">${farm.euroSpecies || 'N/A'}</span>
            </div>
            <div class="detail-field">
                <span class="detail-field-label">Scientific Name</span>
                <span class="detail-field-value">${farm.euroSpeciesLatin || 'N/A'}</span>
            </div>
        </div>

        <div class="detail-section">
            <h3>Location</h3>
            <div class="detail-field">
                <span class="detail-field-label">Position</span>
                <span class="detail-field-value">${farm.position}</span>
            </div>
            <div class="detail-field">
                <span class="detail-field-label">Coast Distance</span>
                <span class="detail-field-value">${distLabel}</span>
            </div>
            <div class="detail-field">
                <span class="detail-field-label">Coordinates</span>
                <span class="detail-field-value">${farm.coords[1].toFixed(4)}, ${farm.coords[0].toFixed(4)}</span>
            </div>
        </div>

        <div class="detail-section">
            <h3>Eurostat</h3>
            <div class="detail-field">
                <span class="detail-field-label">Code</span>
                <span class="detail-field-value">${farm.eurostat || 'N/A'}</span>
            </div>
        </div>
    `;

    panel.classList.remove('hidden');
}

// --- Tab switching ---

function switchTab(tab) {
    activeTab = tab;

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    const mapContainer = document.getElementById('map-container');
    const tableContainer = document.getElementById('table-container');
    const sidebarFilters = document.getElementById('sidebar-filters');
    const legend = document.getElementById('legend');
    const minimap = document.getElementById('minimap');
    const detailPanel = document.getElementById('detail-panel');

    if (tab === 'map') {
        mapContainer.style.display = '';
        tableContainer.classList.add('hidden');
        sidebarFilters.style.display = '';
        legend.style.display = '';
        minimap.style.display = '';
        // Trigger map resize after becoming visible
        setTimeout(() => map.resize(), 50);
    } else {
        mapContainer.style.display = 'none';
        tableContainer.classList.remove('hidden');
        sidebarFilters.style.display = 'none';
        legend.style.display = 'none';
        minimap.style.display = 'none';
        detailPanel.classList.add('hidden');
        if (activePopup) activePopup.remove();
        tableCurrentPage = 1;
        renderTable();
    }
}

// --- Table view ---

function getTableFilteredFarms() {
    if (!tableSearchTerm) return filteredFarms;
    const s = tableSearchTerm.toLowerCase();
    return filteredFarms.filter(f =>
        f.owner.toLowerCase().includes(s) ||
        f.id.toLowerCase().includes(s) ||
        f.species.toLowerCase().includes(s) ||
        f.category.toLowerCase().includes(s)
    );
}

function renderTable() {
    renderTableHeader();
    renderTableBody();
    renderPagination();
    const tableFarms = getTableFilteredFarms();
    document.getElementById('table-count').textContent = `${tableFarms.length} farms`;
}

function renderTableHeader() {
    const headerRow = document.getElementById('table-header');
    headerRow.innerHTML = TABLE_COLUMNS.map(col => {
        const isSorted = tableSortField === col.key;
        const arrow = isSorted
            ? (tableSortDirection === 'asc' ? '\u2191' : '\u2193')
            : '\u2195';
        const cls = isSorted ? ' sorted' : '';
        const infoIcon = col.info ? `<span class="col-info" data-tip="${col.info}">&#9432;</span>` : '';
        return `<th class="${cls}" data-sort="${col.key}">${infoIcon}${col.label}<span class="sort-icon">${arrow}</span></th>`;
    }).join('');
}

function getSortedFarms() {
    return [...getTableFilteredFarms()].sort((a, b) => {
        let aVal = getFarmValue(a, tableSortField);
        let bVal = getFarmValue(b, tableSortField);

        // Numeric sort for coordinates and distances
        if (['lat', 'lng', 'coastDist'].includes(tableSortField)) {
            aVal = Number(aVal) || 0;
            bVal = Number(bVal) || 0;
            return tableSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // String sort
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
        if (aVal < bVal) return tableSortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return tableSortDirection === 'asc' ? 1 : -1;
        return 0;
    });
}

function getFarmValue(farm, key) {
    if (key === 'lat') return farm.coords[1];
    if (key === 'lng') return farm.coords[0];
    return farm[key];
}

function formatCoastDist(val) {
    if (!val || val === 0) return 'N/A';
    return val > 1000 ? `${(val / 1000).toFixed(1)} km` : `${Math.round(val)} m`;
}

function renderTableBody() {
    const sorted = getSortedFarms();
    const start = (tableCurrentPage - 1) * TABLE_ROWS_PER_PAGE;
    const pageData = sorted.slice(start, start + TABLE_ROWS_PER_PAGE);

    const tbody = document.getElementById('table-body');
    tbody.innerHTML = pageData.map(farm => `
        <tr>
            <td>${farm.owner || 'N/A'}</td>
            <td>${farm.type}</td>
            <td>${farm.category || 'N/A'}</td>
            <td>${farm.species || 'N/A'}</td>
            <td>${farm.production || 'N/A'}</td>
            <td>${farm.stage || 'N/A'}</td>
            <td>${farm.position || 'N/A'}</td>
            <td>${formatCoastDist(farm.coastDist)}</td>
            <td>${farm.status || 'N/A'}</td>
            <td>${farm.eurostat || 'N/A'}</td>
            <td>${farm.id}</td>
            <td>${farm.coords[1].toFixed(4)}</td>
            <td>${farm.coords[0].toFixed(4)}</td>
        </tr>
    `).join('');
}

function renderPagination() {
    const totalPages = Math.ceil(getTableFilteredFarms().length / TABLE_ROWS_PER_PAGE);
    const container = document.getElementById('table-pagination');

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    // Prev button
    html += `<button class="page-btn" ${tableCurrentPage === 1 ? 'disabled' : ''} data-page="${tableCurrentPage - 1}">\u2039</button>`;

    // Page numbers with ellipsis
    const pages = getPageNumbers(tableCurrentPage, totalPages);
    pages.forEach(p => {
        if (p === '...') {
            html += `<span class="page-ellipsis">\u2026</span>`;
        } else {
            html += `<button class="page-btn${p === tableCurrentPage ? ' active' : ''}" data-page="${p}">${p}</button>`;
        }
    });

    // Next button
    html += `<button class="page-btn" ${tableCurrentPage === totalPages ? 'disabled' : ''} data-page="${tableCurrentPage + 1}">\u203A</button>`;

    container.innerHTML = html;
}

function getPageNumbers(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages = [];
    pages.push(1);

    if (current > 3) pages.push('...');

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (current < total - 2) pages.push('...');

    pages.push(total);
    return pages;
}

// --- CSV Download ---

function generateCSV(farms) {
    const headers = [
        'Site ID', 'Owner', 'Type', 'Category', 'Species',
        'Production', 'Stage', 'Position', 'Coast Distance (m)', 'Status', 'Eurostat Code',
        'Eurostat Species', 'Scientific Name', 'Lat', 'Lon'
    ];

    const escapeCSV = (value) => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const rows = farms.map(farm => [
        escapeCSV(farm.id),
        escapeCSV(farm.owner),
        escapeCSV(farm.type),
        escapeCSV(farm.category),
        escapeCSV(farm.species),
        escapeCSV(farm.production),
        escapeCSV(farm.stage),
        escapeCSV(farm.position),
        farm.coastDist || '',
        escapeCSV(farm.status),
        escapeCSV(farm.eurostat),
        escapeCSV(farm.euroSpecies),
        escapeCSV(farm.euroSpeciesLatin),
        farm.coords[1].toFixed(6),
        farm.coords[0].toFixed(6)
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
}

function downloadCSV(csvContent, filename) {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// --- Events ---

function setupEvents() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Filter buttons
    document.querySelectorAll('.filter-buttons').forEach(group => {
        group.addEventListener('click', e => {
            if (e.target.classList.contains('filter-btn')) {
                group.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                applyFilters();
            }
        });
    });

    // Category filter
    document.getElementById('category-filter').addEventListener('change', applyFilters);

    // Coastal distance filter
    document.getElementById('coast-dist-filter').addEventListener('change', applyFilters);

    // Search
    let searchTimeout;
    document.getElementById('search').addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(applyFilters, 200);
    });

    // Clear filters
    document.getElementById('clear-filters').addEventListener('click', () => {
        document.getElementById('search').value = '';
        document.getElementById('category-filter').value = 'all';
        document.getElementById('coast-dist-filter').value = 'all';
        document.querySelectorAll('.filter-buttons').forEach(group => {
            group.querySelectorAll('.filter-btn').forEach((b, i) => {
                b.classList.toggle('active', i === 0);
            });
        });
        applyFilters();
    });

    // Close detail panel
    document.getElementById('close-detail').addEventListener('click', () => {
        document.getElementById('detail-panel').classList.add('hidden');
        document.querySelectorAll('.farm-item.active').forEach(el => el.classList.remove('active'));
        if (activePopup) activePopup.remove();
    });

    // Finfish toggle
    document.getElementById('toggle-finfish').addEventListener('click', function () {
        this.classList.toggle('off');
        const visible = !this.classList.contains('off');
        map.setLayoutProperty('finfish-layer', 'visibility', visible ? 'visible' : 'none');
    });

    // Shellfish toggle
    document.getElementById('toggle-shellfish').addEventListener('click', function () {
        this.classList.toggle('off');
        const visible = !this.classList.contains('off');
        map.setLayoutProperty('shellfish-layer', 'visibility', visible ? 'visible' : 'none');
    });

    // POAY zones toggle
    document.getElementById('toggle-poay').addEventListener('click', function (e) {
        if (e.target.classList.contains('legend-info')) return;
        this.classList.toggle('off');
        const visible = !this.classList.contains('off');
        ['poay-fill', 'poay-outline', 'poay-labels'].forEach(id => {
            map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
        });
    });

    // Abandoned toggle
    document.getElementById('toggle-abandoned').addEventListener('click', function () {
        this.classList.toggle('off');
        const visible = !this.classList.contains('off');
        map.setLayoutProperty('abandoned-layer', 'visibility', visible ? 'visible' : 'none');
    });

    // Table search
    let tableSearchTimeout;
    document.getElementById('table-search').addEventListener('input', (e) => {
        clearTimeout(tableSearchTimeout);
        tableSearchTimeout = setTimeout(() => {
            tableSearchTerm = e.target.value;
            tableCurrentPage = 1;
            renderTable();
        }, 200);
    });

    // Table header sort
    document.getElementById('table-header').addEventListener('click', (e) => {
        const th = e.target.closest('th');
        if (!th) return;
        const field = th.dataset.sort;
        if (tableSortField === field) {
            tableSortDirection = tableSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            tableSortField = field;
            tableSortDirection = 'asc';
        }
        tableCurrentPage = 1;
        renderTable();
    });

    // Table pagination
    document.getElementById('table-pagination').addEventListener('click', (e) => {
        const btn = e.target.closest('.page-btn');
        if (!btn || btn.disabled) return;
        tableCurrentPage = parseInt(btn.dataset.page);
        renderTable();
        document.querySelector('.table-wrapper').scrollTop = 0;
    });

    // Download CSV
    document.getElementById('download-filtered').addEventListener('click', () => {
        const csv = generateCSV(getTableFilteredFarms());
        downloadCSV(csv, 'greece-fish-farms.csv');
    });
}

function initMinimap() {
    minimapInstance = new maplibregl.Map({
        container: 'minimap',
        style: {
            version: 8,
            sources: {
                'carto-light': {
                    type: 'raster',
                    tiles: ['https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png'],
                    tileSize: 256
                }
            },
            layers: [{
                id: 'carto-light-layer',
                type: 'raster',
                source: 'carto-light'
            }],
            glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf'
        },
        center: [23.4, 40.9],
        zoom: 0.5,
        interactive: false,
        attributionControl: false
    });

    // Static polygon showing the Greece study area
    const greeceBounds = [[19.3, 34.5], [29.7, 34.5], [29.7, 42.0], [19.3, 42.0], [19.3, 34.5]];

    minimapInstance.on('load', () => {
        // Static extent box — outline only, no fill
        minimapInstance.addSource('viewport-box', {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates: [greeceBounds] }
            }
        });
        minimapInstance.addLayer({
            id: 'viewport-outline',
            type: 'line',
            source: 'viewport-box',
            paint: {
                'line-color': '#e74c3c',
                'line-width': 1.125
            }
        });

        // Geographic labels
        minimapInstance.addSource('globe-labels', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: [
                    { type: 'Feature', properties: { name: 'Europe', size: 'continent' }, geometry: { type: 'Point', coordinates: [15, 50] } },
                    { type: 'Feature', properties: { name: 'Africa', size: 'continent' }, geometry: { type: 'Point', coordinates: [22, 28] } }
                ]
            }
        });
        minimapInstance.addLayer({
            id: 'globe-labels-layer',
            type: 'symbol',
            source: 'globe-labels',
            layout: {
                'text-field': ['get', 'name'],
                'text-size': ['case', ['==', ['get', 'size'], 'continent'], 7, 5],
                'text-font': ['Open Sans Regular'],
                'text-allow-overlap': true
            },
            paint: {
                'text-color': ['case', ['==', ['get', 'size'], 'continent'], 'rgba(80, 80, 80, 0.7)', 'rgba(100, 100, 100, 0.6)'],
                'text-halo-color': 'rgba(255, 255, 255, 0.5)',
                'text-halo-width': 0.5
            }
        });
    });
}

init();
