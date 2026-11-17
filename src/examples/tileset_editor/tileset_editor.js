// =====================================================================
// spark.js — Tileset & Map Editor
// Combines interactive sprite-atlas rectangle cropping with a 2D multi-layer
// tilemap grid builder and exports JSON directly loadable by `Tileset`.
// =====================================================================

// #region ---- STATE ----

let image = null;           // HTMLImageElement
let imageName = 'rts_tileset';
let imageFilename = 'rts_tileset.png';

// Tiles dictionary: { [id: number]: { id, name, x, y, w, h, walkable, terrainType, tags: string[] } }
let tiles = {};
let nextTileId = 1;
let selectedTileId = 1;     // Primary / anchor tile ID (0 = Eraser / Empty)
let selectedTileIds = new Set([1]); // Multi-selected tile IDs (> 0) for bulk editing

// Predefined zoom levels (10% steps around 100%, wider steps at high zoom)
const ZOOM_PRESETS = [
    0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9,
    1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0,
    2.25, 2.5, 3.0, 3.5, 4.0, 5.0, 6.0, 8.0, 10.0, 12.0, 16.0
];

function getNextZoomPreset(currentZoom, direction) {
    const eps = 0.005;
    if (direction > 0) {
        for (const z of ZOOM_PRESETS) {
            if (z > currentZoom + eps) return z;
        }
        return ZOOM_PRESETS[ZOOM_PRESETS.length - 1];
    } else {
        for (let i = ZOOM_PRESETS.length - 1; i >= 0; i--) {
            if (ZOOM_PRESETS[i] < currentZoom - eps) return ZOOM_PRESETS[i];
        }
        return ZOOM_PRESETS[0];
    }
}

// Map dimensions & cell size
let mapCols = 32;
let mapRows = 32;
let tileWidth = 32;
let tileHeight = 32;

// Layers: Array<{ name: string, visible: boolean, opacity: number, data: number[][] }>
let layers = [];
let activeLayerIndex = 0;

// Undo / Redo stacks (snapshots of { mapCols, mapRows, tileWidth, tileHeight, layers, activeLayerIndex })
const undoStack = [];
const redoStack = [];
const MAX_HISTORY = 40;

// Atlas viewport state
let atlasZoom = 1;
let atlasPanX = 20;
let atlasPanY = 20;
let atlasSnapEnabled = true;
let atlasSnapGrid = 32;
let atlasDragging = false;      // drawing a new crop rect
let atlasMovingCrop = false;    // moving or resizing existing crop rect
let atlasMoveMode = null;       // 'move' | 'nw' | 'ne' | 'sw' | 'se'
let atlasMoveInitial = null;    // { ix, iy, rect: {x,y,w,h} }
let atlasPanning = false;
let atlasDragStart = null;      // { ix, iy }
let atlasDragCurrent = null;    // { ix, iy }
let atlasPanStart = null;       // { mx, my, px, py }
let atlasMouseImg = { x: 0, y: 0 };

// Map viewport state
let mapZoom = 1;
let mapPanX = 20;
let mapPanY = 20;
let mapShowGrid = true;
let mapShowTerrain = false;
let mapEnginePreview = true;
let activeTool = 'brush';       // 'brush' | 'erase' | 'fill' | 'rect' | 'pick'
let mapPanning = false;
let mapPanStart = null;
let mapPainting = false;
let mapPaintButton = 0;         // 0 = left, 2 = right (erase)
let mapRectStart = null;        // { col, row }
let mapRectCurrent = null;      // { col, row }
let mapHoverCell = { col: -1, row: -1, wx: 0, wy: 0 };

// Palette view state
let paletteMode = 'grid';       // 'grid' | 'list'
let paletteFilter = '';
let spaceKeyHeld = false;

// DOM Canvas references
const atlasCanvas = document.getElementById('atlas-canvas');
const atlasCtx = atlasCanvas.getContext('2d');
const atlasWrap = document.getElementById('atlas-canvas-wrap');

const mapCanvas = document.getElementById('map-canvas');
const mapCtx = mapCanvas.getContext('2d');
const mapWrap = document.getElementById('map-canvas-wrap');

// Offscreen spark.js Canvas2DRenderer for 1:1 Engine `Tileset` rendering preview
const engineOffscreenCanvas = document.createElement('canvas');
let engineRenderer = null;

// #endregion

// #region ---- INITIALIZATION & HELPERS ----

function createEmptyGrid(cols, rows, fillValue = 0) {
    const grid = [];
    for (let r = 0; r < rows; r++) {
        const row = new Array(cols).fill(fillValue);
        grid.push(row);
    }
    return grid;
}

function initDefaultMap(cols = 16, rows = 16, tw = 32, th = 32) {
    mapCols = cols;
    mapRows = rows;
    tileWidth = tw;
    tileHeight = th;
    layers = [
        {
            name: 'Ground',
            visible: true,
            opacity: 1,
            data: createEmptyGrid(cols, rows, 0)
        }
    ];
    activeLayerIndex = 0;
    undoStack.length = 0;
    redoStack.length = 0;
    updateUndoRedoButtons();
    syncMapHeaderInputs();
}

function syncMapHeaderInputs() {
    document.getElementById('map-cols').value = mapCols;
    document.getElementById('map-rows').value = mapRows;
    document.getElementById('tile-w').value = tileWidth;
    document.getElementById('tile-h').value = tileHeight;

    // Also sync Atlas Crops Snap & Slice inputs to match tileWidth / tileHeight
    atlasSnapGrid = tileWidth;
    document.getElementById('atlas-grid-size').value = tileWidth;
    document.getElementById('slice-w').value = tileWidth;
    document.getElementById('slice-h').value = tileHeight;
}

function cloneLayersState() {
    return {
        mapCols,
        mapRows,
        tileWidth,
        tileHeight,
        activeLayerIndex,
        layers: layers.map(l => ({
            name: l.name,
            visible: l.visible,
            opacity: l.opacity,
            data: l.data.map(row => row.slice())
        }))
    };
}

function pushUndoState() {
    undoStack.push(cloneLayersState());
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack.length = 0;
    updateUndoRedoButtons();
}

function undoMapEdit() {
    if (undoStack.length === 0) return;
    redoStack.push(cloneLayersState());
    const prev = undoStack.pop();
    restoreLayersState(prev);
    updateUndoRedoButtons();
}

function redoMapEdit() {
    if (redoStack.length === 0) return;
    undoStack.push(cloneLayersState());
    const next = redoStack.pop();
    restoreLayersState(next);
    updateUndoRedoButtons();
}

function restoreLayersState(state) {
    mapCols = state.mapCols;
    mapRows = state.mapRows;
    tileWidth = state.tileWidth;
    tileHeight = state.tileHeight;
    layers = state.layers;
    activeLayerIndex = Math.min(state.activeLayerIndex, Math.max(0, layers.length - 1));
    syncMapHeaderInputs();
    refreshLayerList();
    redrawMap();
}

function updateUndoRedoButtons() {
    document.getElementById('btn-undo').disabled = undoStack.length === 0;
    document.getElementById('btn-redo').disabled = redoStack.length === 0;
}

function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// #endregion

// #region ---- ATLAS COORDINATE & CROP HELPERS ----

function snapAtlas(v) {
    if (!atlasSnapEnabled || atlasSnapGrid < 2) return Math.round(v);
    return Math.round(v / atlasSnapGrid) * atlasSnapGrid;
}

function getWrapPos(wrapEl, e) {
    const r = wrapEl.getBoundingClientRect();
    return { mx: e.clientX - r.left, my: e.clientY - r.top };
}

function toAtlasImg(mx, my) {
    return { ix: (mx - atlasPanX) / atlasZoom, iy: (my - atlasPanY) / atlasZoom };
}

function clampAtlasImg(ix, iy) {
    if (!image) return { ix, iy };
    return {
        ix: Math.max(0, Math.min(image.width, ix)),
        iy: Math.max(0, Math.min(image.height, iy))
    };
}

function normaliseAtlasRect(a, b) {
    const x1 = Math.max(0, Math.min(a.ix, b.ix));
    const y1 = Math.max(0, Math.min(a.iy, b.iy));
    const x2 = Math.max(0, Math.min(Math.max(a.ix, b.ix), image ? image.width : 9999));
    const y2 = Math.max(0, Math.min(Math.max(a.iy, b.iy), image ? image.height : 9999));
    const sx1 = snapAtlas(x1), sy1 = snapAtlas(y1);
    const sx2 = snapAtlas(x2), sy2 = snapAtlas(y2);
    return {
        x: sx1,
        y: sy1,
        w: Math.max(1, sx2 - sx1),
        h: Math.max(1, sy2 - sy1)
    };
}

function hitTestHandle(rect, ix, iy) {
    if (!rect) return null;
    const tol = Math.max(4, 7 / atlasZoom);
    const corners = [
        { mode: 'nw', x: rect.x, y: rect.y },
        { mode: 'ne', x: rect.x + rect.w, y: rect.y },
        { mode: 'sw', x: rect.x, y: rect.y + rect.h },
        { mode: 'se', x: rect.x + rect.w, y: rect.y + rect.h }
    ];
    for (const c of corners) {
        if (Math.abs(ix - c.x) <= tol && Math.abs(iy - c.y) <= tol) {
            return c.mode;
        }
    }
    return null;
}

function hitTestTiles(ix, iy) {
    const ids = Object.keys(tiles).map(Number);
    for (let i = ids.length - 1; i >= 0; i--) {
        const id = ids[i];
        const t = tiles[id];
        if (ix >= t.x && ix <= t.x + t.w && iy >= t.y && iy <= t.y + t.h) {
            return id;
        }
    }
    return null;
}

// #endregion

// #region ---- TILE MANAGEMENT & AUTO-SLICING ----

function ensureUniqueTileName(baseName, excludeId = null) {
    const clean = (baseName || 'tile').trim() || 'tile';
    const existingNames = new Set(
        Object.values(tiles)
            .filter(t => t.id !== excludeId)
            .map(t => t.name)
    );
    if (!existingNames.has(clean)) return clean;
    let n = 2;
    while (existingNames.has(`${clean}_${n}`)) n++;
    return `${clean}_${n}`;
}

function getNextAvailableTileId() {
    let id = 1;
    while (tiles[id]) id++;
    return id;
}

function addTileCrop(rect, customName = null, meta = {}) {
    const id = (meta.id !== undefined && Number(meta.id) > 0)
        ? Number(meta.id)
        : getNextAvailableTileId();

    const name = ensureUniqueTileName(customName || `tile_${id}`, id);
    const terrainType = meta.terrainType || 'grass';
    const walkable = meta.walkable !== undefined
        ? Boolean(meta.walkable)
        : !['water', 'wall', 'cliff', 'shore'].includes(terrainType);

    tiles[id] = {
        id,
        name,
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        w: Math.max(1, Math.round(rect.w)),
        h: Math.max(1, Math.round(rect.h)),
        walkable,
        terrainType,
        tags: Array.isArray(meta.tags) ? meta.tags : []
    };

    nextTileId = getNextAvailableTileId();
    refreshPalette();
    selectTile(id, { scrollPalette: true });
    return id;
}

function getFilteredPaletteTiles() {
    const allTiles = Object.values(tiles).sort((a, b) => a.id - b.id);
    const q = paletteFilter.trim().toLowerCase();
    if (!q) return allTiles;
    return allTiles.filter(t =>
        String(t.id).includes(q) ||
        t.name.toLowerCase().includes(q) ||
        (t.terrainType && t.terrainType.toLowerCase().includes(q)) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
    );
}

/**
 * Scrolls the Tile Palette (`#palette-wrap`) so the given tile card is aligned at the top.
 * @param {number} tileId
 */
function scrollPaletteToTile(tileId) {
    const wrap = document.getElementById('palette-wrap');
    if (!wrap) return;
    let card = wrap.querySelector(`.tile-card[data-tile-id="${tileId}"]`);
    if (!card && paletteFilter) {
        paletteFilter = '';
        document.getElementById('palette-filter').value = '';
        refreshPalette();
        card = wrap.querySelector(`.tile-card[data-tile-id="${tileId}"]`);
    }
    if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Selects a tile (or updates multi-selection when `options.toggle` or `options.range` is used).
 * @param {number} id
 * @param {{toggle?: boolean, range?: boolean, scrollPalette?: boolean}} [options={}]
 */
function selectTile(id, options = {}) {
    const numId = Number(id) || 0;

    if (numId === 0) {
        selectedTileId = 0;
        selectedTileIds.clear();
    }
    else if (options.range && selectedTileId > 0 && tiles[selectedTileId]) {
        const orderedIds = getFilteredPaletteTiles().map(t => t.id);
        const startIdx = orderedIds.indexOf(selectedTileId);
        const endIdx = orderedIds.indexOf(numId);
        if (startIdx !== -1 && endIdx !== -1) {
            if (!options.toggle) selectedTileIds.clear();
            const lo = Math.min(startIdx, endIdx);
            const hi = Math.max(startIdx, endIdx);
            for (let i = lo; i <= hi; i++) {
                selectedTileIds.add(orderedIds[i]);
            }
            selectedTileId = numId;
        } else {
            selectedTileIds.add(numId);
            selectedTileId = numId;
        }
    }
    else if (options.toggle) {
        if (selectedTileIds.has(numId)) {
            selectedTileIds.delete(numId);
            if (selectedTileId === numId) {
                const rem = [...selectedTileIds];
                selectedTileId = rem.length > 0 ? rem[rem.length - 1] : 0;
            }
        } else {
            selectedTileIds.add(numId);
            selectedTileId = numId;
        }
    }
    else {
        selectedTileId = numId;
        selectedTileIds = tiles[numId] ? new Set([numId]) : new Set();
    }

    refreshSelectedTileInspector();
    refreshPaletteSelection();
    if (options.scrollPalette) {
        scrollPaletteToTile(selectedTileId);
    }
    redrawAtlas();
    redrawMap();
}

function selectAllFilteredTiles() {
    const filtered = getFilteredPaletteTiles();
    if (filtered.length === 0) return;
    selectedTileIds = new Set(filtered.map(t => t.id));
    if (!selectedTileIds.has(selectedTileId)) {
        selectedTileId = filtered[0].id;
    }
    refreshSelectedTileInspector();
    refreshPaletteSelection();
    redrawAtlas();
    redrawMap();
}

function deleteSelectedTiles() {
    const toDelete = selectedTileIds.size > 0
        ? [...selectedTileIds]
        : (selectedTileId > 0 ? [selectedTileId] : []);
    if (toDelete.length === 0) return;

    for (const id of toDelete) {
        delete tiles[Number(id)];
    }
    selectedTileIds.clear();
    nextTileId = getNextAvailableTileId();

    const remainingIds = Object.keys(tiles).map(Number).sort((a, b) => a - b);
    const nextSel = remainingIds.length > 0 ? remainingIds[0] : 0;
    selectTile(nextSel);
    refreshPalette();
}

function deleteTile(id) {
    const numId = Number(id);
    if (!tiles[numId]) return;
    if (selectedTileIds.has(numId) && selectedTileIds.size > 1) {
        deleteSelectedTiles();
        return;
    }
    delete tiles[numId];
    selectedTileIds.delete(numId);
    nextTileId = getNextAvailableTileId();

    const remainingIds = Object.keys(tiles).map(Number).sort((a, b) => a - b);
    const nextSel = remainingIds.length > 0 ? remainingIds[0] : 0;
    selectTile(nextSel);
    refreshPalette();
}

function duplicateSelectedTile() {
    const src = tiles[selectedTileId];
    if (!src) return;
    addTileCrop(
        { x: src.x, y: src.y, w: src.w, h: src.h },
        `${src.name}_copy`,
        {
            walkable: src.walkable,
            terrainType: src.terrainType,
            tags: src.tags ? src.tags.slice() : []
        }
    );
}

/**
 * Slices the loaded image into a uniform grid of tile crops.
 */
function sliceImageGrid() {
    if (!image) {
        alert('Load an image first before slicing a grid.');
        return;
    }

    const sw = Math.max(1, parseInt(document.getElementById('slice-w').value) || 32);
    const sh = Math.max(1, parseInt(document.getElementById('slice-h').value) || 32);
    const margin = Math.max(0, parseInt(document.getElementById('slice-margin').value) || 0);
    const spacing = Math.max(0, parseInt(document.getElementById('slice-spacing').value) || 0);
    const skipEmpty = document.getElementById('slice-skip-empty').checked;

    const replaceExisting = Object.keys(tiles).length > 0
        ? confirm('Replace existing tile crops with the new grid slice?\n(Click Cancel to append new crops instead)')
        : true;

    if (replaceExisting) {
        tiles = {};
        nextTileId = 1;
    }

    // Prepare pixel data if skipEmpty is enabled
    let imgData = null;
    if (skipEmpty) {
        const off = document.createElement('canvas');
        off.width = image.width;
        off.height = image.height;
        const octx = off.getContext('2d');
        octx.drawImage(image, 0, 0);
        try {
            imgData = octx.getImageData(0, 0, image.width, image.height).data;
        } catch (e) {
            imgData = null;
        }
    }

    function isRectTransparent(rx, ry, rw, rh) {
        if (!imgData) return false;
        for (let py = ry; py < ry + rh; py++) {
            for (let px = rx; px < rx + rw; px++) {
                const idx = (py * image.width + px) * 4;
                if (imgData[idx + 3] > 0) return false;
            }
        }
        return true;
    }

    let addedCount = 0;
    for (let y = margin; y + sh <= image.height; y += sh + spacing) {
        for (let x = margin; x + sw <= image.width; x += sw + spacing) {
            if (skipEmpty && isRectTransparent(x, y, sw, sh)) {
                continue;
            }
            const id = nextTileId++;
            tiles[id] = {
                id,
                name: ensureUniqueTileName(`tile_${id}`, id),
                x,
                y,
                w: sw,
                h: sh,
                walkable: true,
                terrainType: 'grass',
                tags: []
            };
            addedCount++;
        }
    }

    // Also sync map cell size if user hasn't customized it
    tileWidth = sw;
    tileHeight = sh;
    atlasSnapGrid = sw;
    document.getElementById('atlas-grid-size').value = sw;
    syncMapHeaderInputs();

    const firstId = Object.keys(tiles).map(Number)[0] || 0;
    selectTile(firstId);
    refreshPalette();
    redrawAtlas();
    redrawMap();
}

// #endregion

// #region ---- RENDERING: ATLAS PANE ----

function resizeCanvases() {
    if (atlasWrap.clientWidth > 0 && atlasWrap.clientHeight > 0) {
        atlasCanvas.width = atlasWrap.clientWidth;
        atlasCanvas.height = atlasWrap.clientHeight;
    }
    if (mapWrap.clientWidth > 0 && mapWrap.clientHeight > 0) {
        mapCanvas.width = mapWrap.clientWidth;
        mapCanvas.height = mapWrap.clientHeight;
    }
    redrawAtlas();
    redrawMap();
}

function redrawAtlas() {
    atlasCtx.clearRect(0, 0, atlasCanvas.width, atlasCanvas.height);
    if (!image) return;

    atlasCtx.save();
    atlasCtx.translate(atlasPanX, atlasPanY);
    atlasCtx.scale(atlasZoom, atlasZoom);
    atlasCtx.imageSmoothingEnabled = false;

    // Subtle dark backing behind the sprite sheet
    atlasCtx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    atlasCtx.fillRect(0, 0, image.width, image.height);
    atlasCtx.drawImage(image, 0, 0);

    // Image border
    atlasCtx.lineWidth = 1 / atlasZoom;
    atlasCtx.strokeStyle = 'rgba(255,255,255,0.22)';
    atlasCtx.strokeRect(0, 0, image.width, image.height);

    // Snap grid overlay
    if (atlasSnapEnabled && atlasSnapGrid >= 2 && atlasZoom * atlasSnapGrid >= 6) {
        atlasCtx.lineWidth = 0.5 / atlasZoom;
        atlasCtx.strokeStyle = 'rgba(255,255,255,0.10)';
        atlasCtx.beginPath();
        for (let gx = 0; gx <= image.width; gx += atlasSnapGrid) {
            atlasCtx.moveTo(gx, 0);
            atlasCtx.lineTo(gx, image.height);
        }
        for (let gy = 0; gy <= image.height; gy += atlasSnapGrid) {
            atlasCtx.moveTo(0, gy);
            atlasCtx.lineTo(image.width, gy);
        }
        atlasCtx.stroke();
    }

    // Draw saved tile crop rectangles
    for (const t of Object.values(tiles)) {
        const isPrimary = t.id === selectedTileId;
        const isSelected = isPrimary || selectedTileIds.has(t.id);

        atlasCtx.fillStyle = isSelected ? 'rgba(91,140,255,0.25)' : 'rgba(255,255,255,0.06)';
        atlasCtx.fillRect(t.x, t.y, t.w, t.h);

        atlasCtx.lineWidth = isSelected ? 2 / atlasZoom : 1 / atlasZoom;
        atlasCtx.strokeStyle = isPrimary ? '#5b8cff' : (isSelected ? '#8bb0ff' : 'rgba(255,255,255,0.6)');
        atlasCtx.strokeRect(t.x + 0.5 / atlasZoom, t.y + 0.5 / atlasZoom, t.w - 1 / atlasZoom, t.h - 1 / atlasZoom);

        // Label badge (#id, plus name when zoom >= 300%)
        if (t.w * atlasZoom >= 18 && t.h * atlasZoom >= 14) {
            // Scale inversely with atlasZoom so screen font size stays a constant ~10px at all zoom levels
            const fontSize = 10 / atlasZoom;
            atlasCtx.font = `bold ${fontSize}px monospace`;
            atlasCtx.fillStyle = isSelected ? '#b8d4ff' : 'rgba(255,255,255,0.82)';
            atlasCtx.textBaseline = 'top';
            const showName = atlasZoom >= 3.0 && t.w * atlasZoom >= 48;
            const label = showName ? `#${t.id} ${t.name}` : `#${t.id}`;
            const maxLabelWidth = Math.max(4 / atlasZoom, t.w - 4 / atlasZoom);
            atlasCtx.fillText(label, t.x + 2 / atlasZoom, t.y + 2 / atlasZoom, maxLabelWidth);
        }

        // Resize handles on primary selected crop
        if (isPrimary && selectedTileIds.size <= 1) {
            const hs = Math.max(3, 5 / atlasZoom);
            atlasCtx.fillStyle = '#ff9800';
            const pts = [
                [t.x, t.y],
                [t.x + t.w, t.y],
                [t.x, t.y + t.h],
                [t.x + t.w, t.y + t.h]
            ];
            for (const [hx, hy] of pts) {
                atlasCtx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
            }
        }
    }

    // Draw crop rect currently being dragged
    if (atlasDragging && atlasDragStart && atlasDragCurrent) {
        const r = normaliseAtlasRect(atlasDragStart, atlasDragCurrent);
        atlasCtx.fillStyle = 'rgba(255,152,0,0.20)';
        atlasCtx.fillRect(r.x, r.y, r.w, r.h);
        atlasCtx.lineWidth = 1.5 / atlasZoom;
        atlasCtx.strokeStyle = '#ff9800';
        atlasCtx.strokeRect(r.x + 0.5 / atlasZoom, r.y + 0.5 / atlasZoom, r.w - 1 / atlasZoom, r.h - 1 / atlasZoom);

        const lbl = `${r.w} × ${r.h}`;
        const fSz = 11 / atlasZoom;
        atlasCtx.font = `bold ${fSz}px monospace`;
        atlasCtx.fillStyle = '#ff9800';
        atlasCtx.textBaseline = 'bottom';
        atlasCtx.fillText(lbl, r.x + 2 / atlasZoom, r.y - 2 / atlasZoom);
    }

    atlasCtx.restore();
    updateAtlasCoordBar();
}

function updateAtlasCoordBar() {
    const ix = Math.floor(atlasMouseImg.x);
    const iy = Math.floor(atlasMouseImg.y);
    let html = `<span>Cursor: <b>${ix}, ${iy}</b></span>`;
    if (image) html += `<span>Sheet: <b>${image.width} × ${image.height} px</b></span>`;
    html += `<span>Crops: <b>${Object.keys(tiles).length}</b></span>`;
    if (selectedTileId && tiles[selectedTileId]) {
        const t = tiles[selectedTileId];
        html += `<span>Selected: <b>#${t.id} ${escHtml(t.name)}</b> (${t.x},${t.y} ${t.w}×${t.h})</span>`;
    }
    document.getElementById('atlas-coord-bar').innerHTML = html;
}

function setAtlasZoom(newZoom, cx, cy) {
    newZoom = Math.max(0.15, Math.min(32, newZoom));
    if (!image) {
        atlasZoom = newZoom;
        return;
    }
    const ox = cx ?? atlasWrap.clientWidth / 2;
    const oy = cy ?? atlasWrap.clientHeight / 2;
    const ix = (ox - atlasPanX) / atlasZoom;
    const iy = (oy - atlasPanY) / atlasZoom;
    atlasZoom = newZoom;
    atlasPanX = ox - ix * atlasZoom;
    atlasPanY = oy - iy * atlasZoom;
    document.getElementById('atlas-zoom-display').textContent = Math.round(atlasZoom * 100) + '%';
    redrawAtlas();
}

function fitAtlasToWindow() {
    if (!image || atlasWrap.clientWidth === 0) return;
    const scaleX = (atlasWrap.clientWidth - 36) / image.width;
    const scaleY = (atlasWrap.clientHeight - 46) / image.height;
    const z = Math.max(0.15, Math.min(scaleX, scaleY, 6));
    atlasZoom = z;
    atlasPanX = (atlasWrap.clientWidth - image.width * z) / 2;
    atlasPanY = (atlasWrap.clientHeight - image.height * z) / 2;
    document.getElementById('atlas-zoom-display').textContent = Math.round(atlasZoom * 100) + '%';
    redrawAtlas();
}

// #endregion

// #region ---- RENDERING: MAP PANE ----

const TERRAIN_OVERLAY_COLORS = {
    grass: 'rgba(34, 197, 94, 0.25)',
    road:  'rgba(168, 162, 158, 0.25)',
    dirt:  'rgba(180, 83, 9, 0.25)',
    sand:  'rgba(250, 204, 21, 0.25)',
    shore: 'rgba(245, 158, 11, 0.28)',
    water: 'rgba(59, 130, 246, 0.32)',
    wall:  'rgba(239, 68, 68, 0.32)',
    cliff: 'rgba(239, 68, 68, 0.32)'
};

function redrawMap() {
    mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);

    const totalW = mapCols * tileWidth;
    const totalH = mapRows * tileHeight;

    mapCtx.save();
    mapCtx.translate(mapPanX, mapPanY);
    mapCtx.scale(mapZoom, mapZoom);
    mapCtx.imageSmoothingEnabled = false;

    // Map bounds background
    mapCtx.fillStyle = '#141418';
    mapCtx.fillRect(0, 0, totalW, totalH);

    // Render map layers
    if (image) {
        if (mapEnginePreview && typeof Tileset !== 'undefined' && typeof Canvas2DRenderer !== 'undefined') {
            // Render 1:1 using spark.js Tileset class onto the offscreen canvas
            if (engineOffscreenCanvas.width !== totalW || engineOffscreenCanvas.height !== totalH) {
                engineOffscreenCanvas.width = Math.max(1, totalW);
                engineOffscreenCanvas.height = Math.max(1, totalH);
                engineRenderer = new Canvas2DRenderer(engineOffscreenCanvas);
                engineRenderer.imageSmoothingEnabled = false;
            }
            if (!engineRenderer) {
                engineRenderer = new Canvas2DRenderer(engineOffscreenCanvas);
                engineRenderer.imageSmoothingEnabled = false;
            }
            engineRenderer.ctx.clearRect(0, 0, totalW, totalH);
            engineRenderer.imageSmoothingEnabled = false;

            const previewData = buildExportDataObject();
            const engineTileset = Tileset.FromData(image, new Vector2(0, 0), 1, previewData);
            engineTileset.Draw(engineRenderer);

            mapCtx.drawImage(engineOffscreenCanvas, 0, 0);
        }
        else {
            // Direct Canvas2D fallback rendering
            for (const layer of layers) {
                if (!layer.visible) continue;
                mapCtx.save();
                mapCtx.globalAlpha = layer.opacity ?? 1;
                for (let r = 0; r < mapRows; r++) {
                    const row = layer.data[r];
                    if (!row) continue;
                    for (let c = 0; c < mapCols; c++) {
                        const tid = row[c];
                        if (!tid || !tiles[tid]) continue;
                        const t = tiles[tid];
                        mapCtx.drawImage(
                            image,
                            t.x, t.y, t.w, t.h,
                            c * tileWidth, r * tileHeight, t.w, t.h
                        );
                    }
                }
                mapCtx.restore();
            }
        }
    }

    // Walkable / Terrain debug overlay (matches RTS GridMap overlay)
    if (mapShowTerrain) {
        const activeLayer = layers[activeLayerIndex] || layers[0];
        if (activeLayer) {
            for (let r = 0; r < mapRows; r++) {
                for (let c = 0; c < mapCols; c++) {
                    const tid = activeLayer.data[r]?.[c] || 0;
                    const t = tiles[tid];
                    if (!t) continue;
                    const color = TERRAIN_OVERLAY_COLORS[t.terrainType]
                        || (t.walkable ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.28)');
                    mapCtx.fillStyle = color;
                    mapCtx.fillRect(c * tileWidth, r * tileHeight, tileWidth, tileHeight);

                    if (!t.walkable) {
                        mapCtx.strokeStyle = 'rgba(239, 68, 68, 0.55)';
                        mapCtx.lineWidth = 1 / mapZoom;
                        mapCtx.strokeRect(c * tileWidth + 1 / mapZoom, r * tileHeight + 1 / mapZoom, tileWidth - 2 / mapZoom, tileHeight - 2 / mapZoom);
                    }
                }
            }
        }
    }

    // Ghost preview for rectangle fill tool or single-cell hover brush
    if (activeTool === 'rect' && mapRectStart && mapRectCurrent) {
        const c1 = Math.max(0, Math.min(mapRectStart.col, mapRectCurrent.col));
        const r1 = Math.max(0, Math.min(mapRectStart.row, mapRectCurrent.row));
        const c2 = Math.min(mapCols - 1, Math.max(mapRectStart.col, mapRectCurrent.col));
        const r2 = Math.min(mapRows - 1, Math.max(mapRectStart.row, mapRectCurrent.row));

        const isErasing = mapPaintButton === 2 || selectedTileId === 0;
        const t = tiles[selectedTileId];

        mapCtx.save();
        mapCtx.globalAlpha = 0.55;
        for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
                if (!isErasing && image && t) {
                    mapCtx.drawImage(image, t.x, t.y, t.w, t.h, c * tileWidth, r * tileHeight, t.w, t.h);
                } else {
                    mapCtx.fillStyle = 'rgba(224, 85, 85, 0.35)';
                    mapCtx.fillRect(c * tileWidth, r * tileHeight, tileWidth, tileHeight);
                }
            }
        }
        mapCtx.restore();

        mapCtx.lineWidth = 2 / mapZoom;
        mapCtx.strokeStyle = isErasing ? '#e05555' : '#ff9800';
        mapCtx.strokeRect(c1 * tileWidth, r1 * tileHeight, (c2 - c1 + 1) * tileWidth, (r2 - r1 + 1) * tileHeight);
    }
    else if (mapHoverCell.col >= 0 && mapHoverCell.col < mapCols && mapHoverCell.row >= 0 && mapHoverCell.row < mapRows) {
        const hc = mapHoverCell.col;
        const hr = mapHoverCell.row;
        const hx = hc * tileWidth;
        const hy = hr * tileHeight;

        if ((activeTool === 'brush' || activeTool === 'fill' || activeTool === 'rect') && selectedTileId > 0 && tiles[selectedTileId] && image) {
            const t = tiles[selectedTileId];
            mapCtx.save();
            mapCtx.globalAlpha = 0.55;
            mapCtx.drawImage(image, t.x, t.y, t.w, t.h, hx, hy, t.w, t.h);
            mapCtx.restore();
        }
        else if (activeTool === 'erase' || selectedTileId === 0) {
            mapCtx.fillStyle = 'rgba(224, 85, 85, 0.25)';
            mapCtx.fillRect(hx, hy, tileWidth, tileHeight);
        }

        mapCtx.lineWidth = 1.5 / mapZoom;
        mapCtx.strokeStyle = activeTool === 'erase' || selectedTileId === 0 ? '#e05555' : '#5b8cff';
        mapCtx.strokeRect(hx + 0.5 / mapZoom, hy + 0.5 / mapZoom, tileWidth - 1 / mapZoom, tileHeight - 1 / mapZoom);
    }

    // Grid lines overlay
    if (mapShowGrid && mapZoom * tileWidth >= 4) {
        mapCtx.lineWidth = 0.5 / mapZoom;
        mapCtx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        mapCtx.beginPath();
        for (let c = 0; c <= mapCols; c++) {
            const x = c * tileWidth;
            mapCtx.moveTo(x, 0);
            mapCtx.lineTo(x, totalH);
        }
        for (let r = 0; r <= mapRows; r++) {
            const y = r * tileHeight;
            mapCtx.moveTo(0, y);
            mapCtx.lineTo(totalW, y);
        }
        mapCtx.stroke();
    }

    // Outer map border
    mapCtx.lineWidth = 1.5 / mapZoom;
    mapCtx.strokeStyle = 'rgba(91, 140, 255, 0.5)';
    mapCtx.strokeRect(0, 0, totalW, totalH);

    mapCtx.restore();
    updateMapCoordBar();
}

function updateMapCoordBar() {
    const { col, row } = mapHoverCell;
    const inBounds = col >= 0 && col < mapCols && row >= 0 && row < mapRows;
    const activeLayer = layers[activeLayerIndex];

    let html = '';
    if (inBounds) {
        const tid = activeLayer?.data[row]?.[col] || 0;
        const t = tiles[tid];
        const tileDesc = tid ? `#${tid} (${escHtml(t ? t.name : 'unknown')})` : '0 (empty)';
        html += `<span>Cell: <b>${col}, ${row}</b> (${col * tileWidth}, ${row * tileHeight} px)</span>`;
        html += `<span>Cell Tile: <b>${tileDesc}</b></span>`;
    } else {
        html += `<span>Cell: <b>—</b></span>`;
    }
    html += `<span>Map: <b>${mapCols} × ${mapRows}</b> (${mapCols * tileWidth} × ${mapRows * tileHeight} px)</span>`;
    if (activeLayer) {
        html += `<span>Layer: <b>${escHtml(activeLayer.name)}</b></span>`;
    }
    let brushDesc = '0 (Eraser)';
    if (selectedTileIds.size > 1) {
        brushDesc = `Random (${selectedTileIds.size} tiles: ${[...selectedTileIds].map(id => '#' + id).join(', ')})`;
    } else if (selectedTileId && tiles[selectedTileId]) {
        brushDesc = `#${selectedTileId} ${escHtml(tiles[selectedTileId].name)}`;
    }
    html += `<span>Brush: <b>${brushDesc}</b></span>`;

    document.getElementById('map-coord-bar').innerHTML = html;
}

function setMapZoom(newZoom, cx, cy) {
    newZoom = Math.max(0.1, Math.min(16, newZoom));
    const ox = cx ?? mapWrap.clientWidth / 2;
    const oy = cy ?? mapWrap.clientHeight / 2;
    const wx = (ox - mapPanX) / mapZoom;
    const wy = (oy - mapPanY) / mapZoom;
    mapZoom = newZoom;
    mapPanX = ox - wx * mapZoom;
    mapPanY = oy - wy * mapZoom;
    document.getElementById('map-zoom-display').textContent = Math.round(mapZoom * 100) + '%';
    redrawMap();
}

function fitMapToWindow() {
    if (mapWrap.clientWidth === 0) return;
    const totalW = mapCols * tileWidth;
    const totalH = mapRows * tileHeight;
    if (totalW <= 0 || totalH <= 0) return;
    const scaleX = (mapWrap.clientWidth - 40) / totalW;
    const scaleY = (mapWrap.clientHeight - 50) / totalH;
    const z = Math.max(0.1, Math.min(scaleX, scaleY, 4));
    mapZoom = z;
    mapPanX = (mapWrap.clientWidth - totalW * z) / 2;
    mapPanY = (mapWrap.clientHeight - totalH * z) / 2;
    document.getElementById('map-zoom-display').textContent = Math.round(mapZoom * 100) + '%';
    redrawMap();
}

// #endregion

// #region ---- MAP PAINTING OPERATIONS ----

function toMapCell(mx, my) {
    const wx = (mx - mapPanX) / mapZoom;
    const wy = (my - mapPanY) / mapZoom;
    const col = Math.floor(wx / tileWidth);
    const row = Math.floor(wy / tileHeight);
    return { col, row, wx, wy };
}

function isCellInBounds(col, row) {
    return col >= 0 && col < mapCols && row >= 0 && row < mapRows;
}

/**
 * Returns a randomly selected tile ID from `selectedTileIds` when multiple tiles are selected,
 * or `selectedTileId` when a single tile (or 0 Eraser) is selected.
 */
function pickRandomBrushTileId() {
    if (selectedTileIds.size > 1) {
        const arr = [...selectedTileIds].filter(id => tiles[id]);
        if (arr.length > 0) {
            return arr[Math.floor(Math.random() * arr.length)];
        }
    }
    return selectedTileId;
}

function paintSingleCell(col, row, tileId) {
    if (!isCellInBounds(col, row)) return false;
    const layer = layers[activeLayerIndex];
    if (!layer || !layer.visible) return false;
    if (layer.data[row][col] === tileId) return false;
    layer.data[row][col] = tileId;
    return true;
}

function floodFillLayer(startCol, startRow, isErasing = false) {
    if (!isCellInBounds(startCol, startRow)) return;
    const layer = layers[activeLayerIndex];
    if (!layer || !layer.visible) return;

    const targetTileId = layer.data[startRow][startCol];
    const isMultiRandom = !isErasing && selectedTileIds.size > 1;
    const singleReplacement = isErasing ? 0 : selectedTileId;
    if (!isMultiRandom && targetTileId === singleReplacement) return;

    pushUndoState();

    const queue = [[startCol, startRow]];
    const visited = new Set([`${startCol},${startRow}`]);

    while (queue.length > 0) {
        const [c, r] = queue.shift();
        layer.data[r][c] = isErasing ? 0 : pickRandomBrushTileId();

        const neighbors = [
            [c + 1, r],
            [c - 1, r],
            [c, r + 1],
            [c, r - 1]
        ];
        for (const [nc, nr] of neighbors) {
            if (!isCellInBounds(nc, nr)) continue;
            const key = `${nc},${nr}`;
            if (visited.has(key)) continue;
            if (layer.data[nr][nc] === targetTileId) {
                visited.add(key);
                queue.push([nc, nr]);
            }
        }
    }
    redrawMap();
}

function fillRectOnLayer(a, b, isErasing = false) {
    const layer = layers[activeLayerIndex];
    if (!layer || !layer.visible) return;

    const c1 = Math.max(0, Math.min(a.col, b.col));
    const r1 = Math.max(0, Math.min(a.row, b.row));
    const c2 = Math.min(mapCols - 1, Math.max(a.col, b.col));
    const r2 = Math.min(mapRows - 1, Math.max(a.row, b.row));
    if (c1 > c2 || r1 > r2) return;

    pushUndoState();
    for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
            layer.data[r][c] = isErasing ? 0 : pickRandomBrushTileId();
        }
    }
    redrawMap();
}

function pickTileFromCell(col, row) {
    if (!isCellInBounds(col, row)) return;
    const activeLayer = layers[activeLayerIndex];
    let picked = activeLayer?.data[row]?.[col] || 0;

    if (!picked) {
        // Fallback: check topmost visible layer
        for (let i = layers.length - 1; i >= 0; i--) {
            if (layers[i].visible && layers[i].data[row]?.[col]) {
                picked = layers[i].data[row][col];
                break;
            }
        }
    }
    selectTile(picked, { scrollPalette: true });
    if (picked > 0 && activeTool === 'pick') {
        setActiveTool('brush');
    }
}

function resizeMapGrid(newCols, newRows, newTileW, newTileH) {
    newCols = Math.max(1, Math.min(512, newCols));
    newRows = Math.max(1, Math.min(512, newRows));
    newTileW = Math.max(1, Math.min(512, newTileW));
    newTileH = Math.max(1, Math.min(512, newTileH));

    pushUndoState();

    for (const layer of layers) {
        const nextData = createEmptyGrid(newCols, newRows, 0);
        const copyRows = Math.min(layer.data.length, newRows);
        for (let r = 0; r < copyRows; r++) {
            const copyCols = Math.min(layer.data[r].length, newCols);
            for (let c = 0; c < copyCols; c++) {
                nextData[r][c] = layer.data[r][c];
            }
        }
        layer.data = nextData;
    }

    mapCols = newCols;
    mapRows = newRows;
    tileWidth = newTileW;
    tileHeight = newTileH;
    syncMapHeaderInputs();
    redrawMap();
}

// #endregion

// #region ---- MOUSE EVENTS: ATLAS PANE ----

atlasWrap.addEventListener('mousedown', e => {
    if (!image) return;
    const { mx, my } = getWrapPos(atlasWrap, e);
    const { ix, iy } = toAtlasImg(mx, my);

    if (e.button === 1 || (e.button === 0 && (e.altKey || spaceKeyHeld))) {
        atlasPanning = true;
        atlasPanStart = { mx, my, px: atlasPanX, py: atlasPanY };
        atlasWrap.style.cursor = 'grabbing';
        e.preventDefault();
        return;
    }

    if (e.button === 0) {
        // 1. Check resize handles on currently selected tile crop
        if (selectedTileId && tiles[selectedTileId]) {
            const handle = hitTestHandle(tiles[selectedTileId], ix, iy);
            if (handle) {
                const t = tiles[selectedTileId];
                atlasMovingCrop = true;
                atlasMoveMode = handle;
                atlasMoveInitial = { ix, iy, rect: { x: t.x, y: t.y, w: t.w, h: t.h } };
                return;
            }
        }

        // 2. Check clicking inside an existing tile crop
        const hitId = hitTestTiles(ix, iy);
        if (hitId) {
            if (e.ctrlKey || e.metaKey) {
                selectTile(hitId, { toggle: true, scrollPalette: true });
                return;
            }
            if (!e.shiftKey) {
                selectTile(hitId, { scrollPalette: true });
                const t = tiles[hitId];
                atlasMovingCrop = true;
                atlasMoveMode = 'move';
                atlasMoveInitial = { ix, iy, rect: { x: t.x, y: t.y, w: t.w, h: t.h } };
                return;
            }
        }

        // 3. Otherwise start dragging a new crop rectangle
        atlasDragging = true;
        atlasDragStart = clampAtlasImg(ix, iy);
        atlasDragCurrent = { ...atlasDragStart };
        redrawAtlas();
    }
});

atlasWrap.addEventListener('mousemove', e => {
    const { mx, my } = getWrapPos(atlasWrap, e);
    const { ix, iy } = toAtlasImg(mx, my);
    atlasMouseImg = { x: ix, y: iy };

    if (atlasPanning && atlasPanStart) {
        atlasPanX = atlasPanStart.px + (mx - atlasPanStart.mx);
        atlasPanY = atlasPanStart.py + (my - atlasPanStart.my);
        redrawAtlas();
        return;
    }

    if (atlasMovingCrop && atlasMoveInitial && selectedTileId && tiles[selectedTileId]) {
        const t = tiles[selectedTileId];
        const init = atlasMoveInitial.rect;
        const dx = snapAtlas(ix - atlasMoveInitial.ix);
        const dy = snapAtlas(iy - atlasMoveInitial.iy);

        if (atlasMoveMode === 'move') {
            t.x = Math.max(0, Math.min(image.width - t.w, snapAtlas(init.x + (ix - atlasMoveInitial.ix))));
            t.y = Math.max(0, Math.min(image.height - t.h, snapAtlas(init.y + (iy - atlasMoveInitial.iy))));
        } else if (atlasMoveMode === 'se') {
            t.w = Math.max(1, Math.min(image.width - init.x, init.w + dx));
            t.h = Math.max(1, Math.min(image.height - init.y, init.h + dy));
        } else if (atlasMoveMode === 'nw') {
            const nx = Math.max(0, Math.min(init.x + init.w - 1, init.x + dx));
            const ny = Math.max(0, Math.min(init.y + init.h - 1, init.y + dy));
            t.w = init.w + (init.x - nx);
            t.h = init.h + (init.y - ny);
            t.x = nx;
            t.y = ny;
        } else if (atlasMoveMode === 'ne') {
            const ny = Math.max(0, Math.min(init.y + init.h - 1, init.y + dy));
            t.w = Math.max(1, Math.min(image.width - init.x, init.w + dx));
            t.h = init.h + (init.y - ny);
            t.y = ny;
        } else if (atlasMoveMode === 'sw') {
            const nx = Math.max(0, Math.min(init.x + init.w - 1, init.x + dx));
            t.w = init.w + (init.x - nx);
            t.h = Math.max(1, Math.min(image.height - init.y, init.h + dy));
            t.x = nx;
        }

        refreshSelectedTileInspector();
        refreshPalette();
        redrawAtlas();
        redrawMap();
        return;
    }

    if (atlasDragging && atlasDragStart) {
        atlasDragCurrent = clampAtlasImg(ix, iy);
        redrawAtlas();
        return;
    }

    updateAtlasCoordBar();
});

window.addEventListener('mouseup', () => {
    if (atlasPanning) {
        atlasPanning = false;
        atlasWrap.style.cursor = 'crosshair';
    }
    if (atlasMovingCrop) {
        atlasMovingCrop = false;
        atlasMoveMode = null;
        atlasMoveInitial = null;
    }
    if (atlasDragging && atlasDragStart && atlasDragCurrent && image) {
        const r = normaliseAtlasRect(atlasDragStart, atlasDragCurrent);
        if (r.w >= 2 && r.h >= 2) {
            addTileCrop(r);
        }
        atlasDragging = false;
        atlasDragStart = null;
        atlasDragCurrent = null;
        redrawAtlas();
    }
});

atlasWrap.addEventListener('wheel', e => {
    e.preventDefault();
    const { mx, my } = getWrapPos(atlasWrap, e);
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setAtlasZoom(atlasZoom * factor, mx, my);
}, { passive: false });

// #endregion

// #region ---- MOUSE EVENTS: MAP PANE ----

mapWrap.addEventListener('contextmenu', e => e.preventDefault());

mapWrap.addEventListener('mousedown', e => {
    const { mx, my } = getWrapPos(mapWrap, e);
    const cell = toMapCell(mx, my);
    mapHoverCell = cell;

    // Middle-click or Alt+click or Space+click: Pan map
    if (e.button === 1 || (e.button === 0 && (e.altKey || spaceKeyHeld))) {
        mapPanning = true;
        mapPanStart = { mx, my, px: mapPanX, py: mapPanY };
        mapWrap.style.cursor = 'grabbing';
        e.preventDefault();
        return;
    }

    // Ctrl+Click: Quick Eyedropper pick
    if (e.button === 0 && e.ctrlKey) {
        pickTileFromCell(cell.col, cell.row);
        return;
    }

    // Right-click: Erase (or rectangle erase if in rect tool)
    if (e.button === 2) {
        if (activeTool === 'rect') {
            mapPaintButton = 2;
            mapRectStart = { col: cell.col, row: cell.row };
            mapRectCurrent = { col: cell.col, row: cell.row };
            redrawMap();
            return;
        }
        pushUndoState();
        mapPainting = true;
        mapPaintButton = 2;
        if (paintSingleCell(cell.col, cell.row, 0)) redrawMap();
        return;
    }

    if (e.button === 0) {
        mapPaintButton = 0;

        if (activeTool === 'pick') {
            pickTileFromCell(cell.col, cell.row);
            return;
        }
        if (activeTool === 'fill') {
            floodFillLayer(cell.col, cell.row, selectedTileId === 0 && selectedTileIds.size === 0);
            return;
        }
        if (activeTool === 'rect') {
            if (e.shiftKey) mapPaintButton = 2; // Shift+drag erases rectangle
            mapRectStart = { col: cell.col, row: cell.row };
            mapRectCurrent = { col: cell.col, row: cell.row };
            redrawMap();
            return;
        }

        // Brush or Erase
        const targetTile = activeTool === 'erase' ? 0 : pickRandomBrushTileId();
        pushUndoState();
        mapPainting = true;
        if (paintSingleCell(cell.col, cell.row, targetTile)) {
            redrawMap();
        }
    }
});

mapWrap.addEventListener('mousemove', e => {
    const { mx, my } = getWrapPos(mapWrap, e);
    const cell = toMapCell(mx, my);
    const prevCol = mapHoverCell.col;
    const prevRow = mapHoverCell.row;
    mapHoverCell = cell;

    if (mapPanning && mapPanStart) {
        mapPanX = mapPanStart.px + (mx - mapPanStart.mx);
        mapPanY = mapPanStart.py + (my - mapPanStart.my);
        redrawMap();
        return;
    }

    if (activeTool === 'rect' && mapRectStart) {
        mapRectCurrent = { col: cell.col, row: cell.row };
        redrawMap();
        return;
    }

    if (mapPainting && (cell.col !== prevCol || cell.row !== prevRow)) {
        const targetTile = (mapPaintButton === 2 || activeTool === 'erase') ? 0 : pickRandomBrushTileId();
        if (paintSingleCell(cell.col, cell.row, targetTile)) {
            redrawMap();
            return;
        }
    }

    if (cell.col !== prevCol || cell.row !== prevRow) {
        redrawMap();
    } else {
        updateMapCoordBar();
    }
});

window.addEventListener('mouseup', () => {
    if (mapPanning) {
        mapPanning = false;
        mapWrap.style.cursor = 'crosshair';
    }
    if (mapPainting) {
        mapPainting = false;
    }
    if (activeTool === 'rect' && mapRectStart && mapRectCurrent) {
        const isErasing = mapPaintButton === 2 || (selectedTileId === 0 && selectedTileIds.size === 0);
        fillRectOnLayer(mapRectStart, mapRectCurrent, isErasing);
        mapRectStart = null;
        mapRectCurrent = null;
        mapPaintButton = 0;
        redrawMap();
    }
});

mapWrap.addEventListener('mouseleave', () => {
    mapHoverCell = { col: -1, row: -1, wx: 0, wy: 0 };
    redrawMap();
});

mapWrap.addEventListener('wheel', e => {
    e.preventDefault();
    const { mx, my } = getWrapPos(mapWrap, e);
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setMapZoom(mapZoom * factor, mx, my);
}, { passive: false });

// #endregion

// #region ---- SIDE PANEL UI: INSPECTOR, LAYERS, PALETTE ----

function getSelectedTileObjects() {
    const list = [...selectedTileIds].map(id => tiles[id]).filter(Boolean);
    if (list.length === 0 && selectedTileId > 0 && tiles[selectedTileId]) {
        return [tiles[selectedTileId]];
    }
    return list;
}

function refreshSelectedTileInspector() {
    const panel = document.getElementById('selected-tile-panel');
    const emptyMsg = document.getElementById('no-tile-selected');
    const selTiles = getSelectedTileObjects();

    if (selTiles.length === 0) {
        panel.style.display = 'none';
        emptyMsg.style.display = 'block';
        return;
    }

    panel.style.display = 'block';
    emptyMsg.style.display = 'none';

    const isMulti = selTiles.length > 1;
    const primary = tiles[selectedTileId] || selTiles[0];

    const idBadge = document.getElementById('sel-id-badge');
    const nameInput = document.getElementById('sel-name');
    const xInput = document.getElementById('sel-x');
    const yInput = document.getElementById('sel-y');
    const wInput = document.getElementById('sel-w');
    const hInput = document.getElementById('sel-h');
    const dupBtn = document.getElementById('btn-dup-tile');
    const walkCheck = document.getElementById('sel-walkable');
    const terrainSelect = document.getElementById('sel-terrain');
    const tagsInput = document.getElementById('sel-tags');

    if (isMulti) {
        idBadge.textContent = `${selTiles.length} sel`;
        idBadge.title = `Selected Tile IDs: ${selTiles.map(t => '#' + t.id).join(', ')}`;
        nameInput.value = `(${selTiles.length} tiles selected)`;
        nameInput.disabled = true;
        xInput.value = '';
        yInput.value = '';
        xInput.disabled = true;
        yInput.disabled = true;
        const sameW = selTiles.every(t => t.w === selTiles[0].w);
        const sameH = selTiles.every(t => t.h === selTiles[0].h);
        wInput.value = sameW ? selTiles[0].w : '';
        hInput.value = sameH ? selTiles[0].h : '';
        wInput.disabled = false;
        hInput.disabled = false;
        dupBtn.disabled = true;
    } else {
        idBadge.textContent = `#${primary.id}`;
        idBadge.title = "Click to change this tile's numeric ID";
        nameInput.value = primary.name;
        nameInput.disabled = false;
        xInput.value = primary.x;
        yInput.value = primary.y;
        wInput.value = primary.w;
        hInput.value = primary.h;
        xInput.disabled = false;
        yInput.disabled = false;
        wInput.disabled = false;
        hInput.disabled = false;
        dupBtn.disabled = false;
    }

    // Walkable checkbox (supports indeterminate state when multi-selected tiles differ)
    const allWalkable = selTiles.every(t => t.walkable !== false);
    const noneWalkable = selTiles.every(t => t.walkable === false);
    walkCheck.indeterminate = !allWalkable && !noneWalkable;
    walkCheck.checked = allWalkable;

    // Terrain select (shows "— mixed —" if multi-selected tiles have different terrain types)
    const existingMixedOpt = terrainSelect.querySelector('option[value="__mixed__"]');
    const sameTerrain = selTiles.every(t => (t.terrainType || 'grass') === (selTiles[0].terrainType || 'grass'));
    if (!sameTerrain) {
        if (!existingMixedOpt) {
            const opt = document.createElement('option');
            opt.value = '__mixed__';
            opt.textContent = '— mixed —';
            terrainSelect.insertBefore(opt, terrainSelect.firstChild);
        }
        terrainSelect.value = '__mixed__';
    } else {
        if (existingMixedOpt) existingMixedOpt.remove();
        const sharedTerrain = selTiles[0].terrainType || 'grass';
        if (![...terrainSelect.options].some(o => o.value === sharedTerrain)) {
            const opt = document.createElement('option');
            opt.value = sharedTerrain;
            opt.textContent = sharedTerrain;
            terrainSelect.appendChild(opt);
        }
        terrainSelect.value = sharedTerrain;
    }

    // Tags input
    const firstTagsStr = (selTiles[0].tags || []).join(', ');
    const sameTags = selTiles.every(t => (t.tags || []).join(', ') === firstTagsStr);
    tagsInput.value = sameTags ? firstTagsStr : '';
    tagsInput.placeholder = sameTags ? 'e.g. buildable, ground' : 'Mixed tags (type to set all)';

    // Draw thumbnail preview of primary selected tile
    const thumbCanvas = document.getElementById('sel-thumb-canvas');
    const tctx = thumbCanvas.getContext('2d');
    tctx.clearRect(0, 0, thumbCanvas.width, thumbCanvas.height);
    if (image && primary && primary.w > 0 && primary.h > 0) {
        tctx.imageSmoothingEnabled = false;
        const scale = Math.min(thumbCanvas.width / primary.w, thumbCanvas.height / primary.h);
        const dw = primary.w * scale;
        const dh = primary.h * scale;
        const dx = (thumbCanvas.width - dw) / 2;
        const dy = (thumbCanvas.height - dh) / 2;
        tctx.drawImage(image, primary.x, primary.y, primary.w, primary.h, dx, dy, dw, dh);
    }
}

function refreshLayerList() {
    const wrap = document.getElementById('layer-list');
    wrap.innerHTML = layers.map((l, idx) => {
        const activeClass = idx === activeLayerIndex ? ' active' : '';
        const visClass = l.visible ? '' : ' hidden';
        const visIcon = l.visible ? '👁' : '🚫';
        return `<div class="layer-item${activeClass}" data-idx="${idx}">
            <button class="layer-vis-btn${visClass}" data-vis="${idx}" title="Toggle layer visibility">${visIcon}</button>
            <input class="layer-name-input" data-name-idx="${idx}" value="${escHtml(l.name)}" spellcheck="false" autocomplete="off">
            <input class="layer-opacity" type="range" min="0.1" max="1" step="0.05" value="${l.opacity ?? 1}" data-op-idx="${idx}" title="Layer opacity: ${Math.round((l.opacity ?? 1) * 100)}%">
            <button class="mini-btn" data-up="${idx}" title="Move layer up" style="padding:1px 4px">↑</button>
            <button class="mini-btn" data-down="${idx}" title="Move layer down" style="padding:1px 4px">↓</button>
            <button class="mini-btn danger" data-del-layer="${idx}" title="Delete layer" style="padding:1px 5px">✕</button>
        </div>`;
    }).join('');

    wrap.querySelectorAll('.layer-item').forEach(el => {
        el.addEventListener('click', e => {
            if (e.target.tagName === 'BUTTON' || e.target.type === 'range') return;
            activeLayerIndex = Number(el.dataset.idx);
            wrap.querySelectorAll('.layer-item').forEach(item => {
                item.classList.toggle('active', Number(item.dataset.idx) === activeLayerIndex);
            });
            redrawMap();
        });
    });

    wrap.querySelectorAll('[data-vis]').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const idx = Number(btn.dataset.vis);
            layers[idx].visible = !layers[idx].visible;
            refreshLayerList();
            redrawMap();
        });
    });

    wrap.querySelectorAll('[data-name-idx]').forEach(inp => {
        inp.addEventListener('input', () => {
            const idx = Number(inp.dataset.nameIdx);
            const val = inp.value.trim();
            if (val) layers[idx].name = val;
            updateMapCoordBar();
        });
        inp.addEventListener('change', () => {
            const idx = Number(inp.dataset.nameIdx);
            const val = inp.value.trim();
            if (val) layers[idx].name = val;
            else inp.value = layers[idx].name;
            updateMapCoordBar();
        });
        inp.addEventListener('keydown', e => {
            if (e.key === 'Enter') inp.blur();
        });
    });

    wrap.querySelectorAll('[data-op-idx]').forEach(rng => {
        rng.addEventListener('input', e => {
            e.stopPropagation();
            const idx = Number(rng.dataset.opIdx);
            layers[idx].opacity = parseFloat(rng.value);
            redrawMap();
        });
    });

    wrap.querySelectorAll('[data-up]').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const idx = Number(btn.dataset.up);
            if (idx <= 0) return;
            pushUndoState();
            const tmp = layers[idx - 1];
            layers[idx - 1] = layers[idx];
            layers[idx] = tmp;
            if (activeLayerIndex === idx) activeLayerIndex = idx - 1;
            else if (activeLayerIndex === idx - 1) activeLayerIndex = idx;
            refreshLayerList();
            redrawMap();
        });
    });

    wrap.querySelectorAll('[data-down]').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const idx = Number(btn.dataset.down);
            if (idx >= layers.length - 1) return;
            pushUndoState();
            const tmp = layers[idx + 1];
            layers[idx + 1] = layers[idx];
            layers[idx] = tmp;
            if (activeLayerIndex === idx) activeLayerIndex = idx + 1;
            else if (activeLayerIndex === idx + 1) activeLayerIndex = idx;
            refreshLayerList();
            redrawMap();
        });
    });

    wrap.querySelectorAll('[data-del-layer]').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            if (layers.length <= 1) {
                alert('A map must have at least one layer.');
                return;
            }
            const idx = Number(btn.dataset.delLayer);
            pushUndoState();
            layers.splice(idx, 1);
            activeLayerIndex = Math.min(activeLayerIndex, layers.length - 1);
            refreshLayerList();
            redrawMap();
        });
    });
}

function refreshPalette() {
    const wrap = document.getElementById('palette-wrap');
    const allTiles = Object.values(tiles).sort((a, b) => a.id - b.id);
    document.getElementById('tile-count-label').textContent = allTiles.length;

    const q = paletteFilter.trim().toLowerCase();
    const filtered = allTiles.filter(t => {
        if (!q) return true;
        return (
            String(t.id).includes(q) ||
            t.name.toLowerCase().includes(q) ||
            (t.terrainType && t.terrainType.toLowerCase().includes(q)) ||
            (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
        );
    });

    let html = `<div class="tile-card${selectedTileId === 0 && selectedTileIds.size === 0 ? ' active' : ''}" data-tile-id="0" title="0 — Empty / Eraser">
        <span class="tc-id">#0</span>
        <canvas class="tc-thumb" width="36" height="36" data-thumb-id="0"></canvas>
        <span class="tc-name">Empty</span>
    </div>`;

    for (const t of filtered) {
        const isSel = t.id === selectedTileId || selectedTileIds.has(t.id);
        const activeClass = isSel ? ' active' : '';
        const dotClass = t.walkable ? 'walkable' : (t.terrainType === 'shore' ? 'shore' : 'blocked');
        html += `<div class="tile-card${activeClass}" data-tile-id="${t.id}" title="#${t.id} ${escHtml(t.name)} (${t.w}×${t.h}) — ${t.terrainType}, walkable: ${t.walkable} (Ctrl+Click or Shift+Click to multi-select)">
            <span class="tc-id">#${t.id}</span>
            <span class="tc-walk-dot ${dotClass}"></span>
            <canvas class="tc-thumb" width="36" height="36" data-thumb-id="${t.id}"></canvas>
            <span class="tc-name">${escHtml(t.name)}</span>
        </div>`;
    }

    wrap.innerHTML = html;

    // Render each tile's crop onto its thumbnail canvas
    wrap.querySelectorAll('canvas[data-thumb-id]').forEach(c => {
        const tid = Number(c.dataset.thumbId);
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, c.width, c.height);
        if (tid === 0) {
            ctx.strokeStyle = 'rgba(224,85,85,0.65)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(8, 8); ctx.lineTo(28, 28);
            ctx.moveTo(28, 8); ctx.lineTo(8, 28);
            ctx.stroke();
            return;
        }
        const t = tiles[tid];
        if (image && t && t.w > 0 && t.h > 0) {
            ctx.imageSmoothingEnabled = false;
            const scale = Math.min(c.width / t.w, c.height / t.h);
            const dw = t.w * scale;
            const dh = t.h * scale;
            const dx = (c.width - dw) / 2;
            const dy = (c.height - dh) / 2;
            ctx.drawImage(image, t.x, t.y, t.w, t.h, dx, dy, dw, dh);
        }
    });

    wrap.querySelectorAll('.tile-card').forEach(card => {
        card.addEventListener('click', e => {
            const id = Number(card.dataset.tileId);
            if (id === 0) {
                selectTile(0);
                return;
            }
            selectTile(id, {
                toggle: e.ctrlKey || e.metaKey,
                range: e.shiftKey
            });
            if (id > 0 && activeTool === 'erase') {
                setActiveTool('brush');
            }
        });
    });
}

function refreshPaletteSelection() {
    document.querySelectorAll('#palette-wrap .tile-card').forEach(card => {
        const id = Number(card.dataset.tileId);
        const isSel = id === 0
            ? (selectedTileId === 0 && selectedTileIds.size === 0)
            : (id === selectedTileId || selectedTileIds.has(id));
        card.classList.toggle('active', isSel);
    });
}

function setActiveTool(tool) {
    activeTool = tool;
    document.querySelectorAll('#map-tools-group .tb-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === tool);
    });
    redrawMap();
}

// #endregion

// #region ---- IMPORT / EXPORT & BUILT-IN SAMPLES ----

/**
 * Builds the JSON object exported by the Tileset & Map Editor.
 * Compatible with:
 * - `new Tileset(img, pos, scale, data)` / `Tileset.FromData(img, pos, scale, data)`
 * - `new SpriteAtlas(data)` (via the `sprites` dictionary)
 * - `GridMap.FromTileset(data)` (via per-tile `walkable` and `terrainType` fields)
 */
function buildExportDataObject() {
    const exportedTiles = {};
    const exportedSprites = {};

    for (const t of Object.values(tiles).sort((a, b) => a.id - b.id)) {
        exportedTiles[t.id] = {
            id: t.id,
            name: t.name,
            x: t.x,
            y: t.y,
            w: t.w,
            h: t.h,
            rect: { x: t.x, y: t.y, w: t.w, h: t.h },
            walkable: t.walkable !== false,
            terrainType: t.terrainType || 'grass',
            tags: t.tags || []
        };
        exportedSprites[t.name] = {
            id: t.id,
            x: t.x,
            y: t.y,
            w: t.w,
            h: t.h,
            walkable: t.walkable !== false,
            terrainType: t.terrainType || 'grass',
            tags: t.tags || []
        };
    }

    const exportedLayers = layers.map(l => ({
        name: l.name,
        visible: l.visible !== false,
        opacity: l.opacity ?? 1,
        data: l.data.map(row => row.slice())
    }));

    return {
        format: 'spark.tileset',
        version: 1,
        name: document.getElementById('project-name').value.trim() || 'tileset_map',
        image: imageFilename || (imageName ? imageName + '.png' : ''),
        tileWidth,
        tileHeight,
        mapWidth: mapCols,
        mapHeight: mapRows,
        tiles: exportedTiles,
        sprites: exportedSprites,
        map: exportedLayers[0] ? exportedLayers[0].data : createEmptyGrid(mapCols, mapRows, 0),
        layers: exportedLayers
    };
}

/**
 * Formats an object as pretty-printed JSON while keeping each 2D grid row (`number[]`) on a single horizontal line.
 */
function stringifyCompactRowsJSON(obj) {
    return JSON.stringify(obj, null, 2).replace(
        /\[\s+(-?\d+(?:,\s+-?\d+)*)\s+\]/g,
        (_, nums) => '[' + nums.replace(/\s+/g, ' ') + ']'
    );
}

function exportTilesetJSON() {
    const data = buildExportDataObject();
    const json = stringifyCompactRowsJSON(data);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    const filename = (document.getElementById('project-name').value.trim() || imageName || 'tileset_map') + '.json';
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

function exportAtlasOnlyJSON() {
    const full = buildExportDataObject();
    const atlasOnly = {
        format: 'spark.atlas',
        image: full.image,
        tileWidth: full.tileWidth,
        tileHeight: full.tileHeight,
        sprites: full.sprites,
        tiles: full.tiles
    };
    const json = JSON.stringify(atlasOnly, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (imageName || 'atlas') + '_atlas.json';
    a.click();
    URL.revokeObjectURL(a.href);
}

function copyJSSnippet() {
    const projName = (document.getElementById('project-name').value.trim() || 'rts_map').replace(/[^a-zA-Z0-9_]/g, '_');
    const imgFile = imageFilename || 'tileset.png';
    const multiLayer = layers.length > 1;

    const snippet = `// 1. In your Game constructor:
this.graphicAssets = {
    tileset: { path: "assets/${imgFile}", img: null }
};
this.tilesetAssets = {
    ${projName}: { path: "assets/${projName}.json", data: null }
};

// 2. In your Game Start():
${multiLayer
    ? `// Create a single composite Tileset (or use Tileset.CreateLayers for separate layer GameObjects):
this.tileset = this.AddGameObject(
    Tileset.FromData(this.graphicAssets.tileset.img, Vector2.Zero(), 1, this.tilesetAssets.${projName}.data)
);`
    : `this.tileset = this.AddGameObject(
    Tileset.FromData(this.graphicAssets.tileset.img, Vector2.Zero(), 1, this.tilesetAssets.${projName}.data)
);`}`;

    navigator.clipboard.writeText(snippet).then(() => {
        const btn = document.getElementById('btn-copy-js');
        const orig = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(() => { btn.textContent = orig; }, 1400);
    });
}

/**
 * Imports atlas crop definitions while keeping the current map layers intact.
 * Preserves exact tile IDs from `data.tiles` or `data.sprites[name].id` (or matches by existing tile name).
 */
function importAtlasCropsOnly(data) {
    const prevByName = {};
    const prevById = {};
    for (const t of Object.values(tiles)) {
        prevByName[t.name] = t;
        prevById[t.id] = t;
    }

    tiles = {};
    nextTileId = 1;

    if (data.tiles && typeof data.tiles === 'object' && Object.keys(data.tiles).length > 0) {
        const entries = Object.entries(data.tiles).sort((a, b) => (Number(a[0]) || 0) - (Number(b[0]) || 0));
        for (const [idStr, t] of entries) {
            if (!t || typeof t !== 'object') continue;
            const rect = t.rect || t;
            if (typeof rect.x !== 'number' || typeof rect.w !== 'number') continue;
            const id = Number(t.id) || Number(idStr) || getNextAvailableTileId();
            const prev = prevById[id] || prevByName[t.name];
            const terrainType = t.terrainType || prev?.terrainType || 'grass';
            const walkable = t.walkable !== undefined
                ? Boolean(t.walkable)
                : (prev?.walkable !== undefined ? prev.walkable : !['water', 'wall', 'cliff', 'shore'].includes(terrainType));

            tiles[id] = {
                id,
                name: ensureUniqueTileName(t.name || prev?.name || `tile_${id}`, id),
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                w: Math.max(1, Math.round(rect.w)),
                h: Math.max(1, Math.round(rect.h)),
                walkable,
                terrainType,
                tags: Array.isArray(t.tags) ? t.tags : (prev?.tags || [])
            };
        }
    }
    else {
        const incoming = data.sprites || data;
        for (const [key, r] of Object.entries(incoming)) {
            if (!r || typeof r !== 'object') continue;
            const src = r.rect || r;
            if (typeof src.x !== 'number' || typeof src.w !== 'number') continue;

            const rawName = r.name || key;
            const prevMatch = prevByName[rawName];
            let id = null;

            if (typeof r.id === 'number' && r.id > 0 && !tiles[r.id]) {
                id = Math.round(r.id);
            }
            else if (prevMatch && !tiles[prevMatch.id]) {
                id = prevMatch.id;
            }
            else {
                const numMatch = /^(?:tile_)?(\d+)$/i.exec(rawName);
                if (numMatch && Number(numMatch[1]) > 0 && !tiles[Number(numMatch[1])]) {
                    id = Number(numMatch[1]);
                } else {
                    id = getNextAvailableTileId();
                }
            }

            const prev = prevMatch || prevById[id];
            const terrainType = r.terrainType || prev?.terrainType || 'grass';
            const walkable = r.walkable !== undefined
                ? Boolean(r.walkable)
                : (prev?.walkable !== undefined ? prev.walkable : !['water', 'wall', 'cliff', 'shore'].includes(terrainType));

            tiles[id] = {
                id,
                name: ensureUniqueTileName(rawName, id),
                x: Math.round(src.x),
                y: Math.round(src.y),
                w: Math.max(1, Math.round(src.w)),
                h: Math.max(1, Math.round(src.h)),
                walkable,
                terrainType,
                tags: Array.isArray(r.tags) ? r.tags : (prev?.tags || [])
            };
        }
    }

    nextTileId = getNextAvailableTileId();
    if (Number(data.tileWidth) > 0) tileWidth = Number(data.tileWidth);
    if (Number(data.tileHeight) > 0) tileHeight = Number(data.tileHeight);
    syncMapHeaderInputs();

    const ids = Object.keys(tiles).map(Number).sort((a, b) => a - b);
    const nextSel = tiles[selectedTileId] ? selectedTileId : (ids.length > 0 ? ids[0] : 0);
    selectTile(nextSel);
    refreshPalette();
}

/**
 * Loads a JSON object — supports:
 * 1) spark.js Tileset Editor JSON (`format === "spark.tileset"` or `{ tiles, map/layers }`)
 * 2) Tiled Map Editor JSON (`type === "map"` and `Array.isArray(data.tilesets)`)
 * 3) Sprite Atlas Editor JSON (`{ sprites: { ... } }` or `format === "spark.atlas"`)
 */
function importJSONData(data, mergeAtlasOnly = false) {
    if (!data || typeof data !== 'object') {
        alert('Invalid JSON file.');
        return;
    }

    // Case A: Import Sprite Atlas JSON only (keep current map layers intact)
    const hasMapData = Array.isArray(data.map) || Array.isArray(data.layers);
    if (mergeAtlasOnly || data.format === 'spark.atlas' || (!hasMapData && (data.sprites || data.tiles))) {
        importAtlasCropsOnly(data);
        return;
    }

    // Case B: Tiled Map Editor JSON (`rts_map.json`, `island.json`, etc.)
    if (data.type === 'map' && Array.isArray(data.tilesets) && Array.isArray(data.layers)) {
        tiles = {};
        nextTileId = 1;
        tileWidth = Number(data.tilewidth) || 32;
        tileHeight = Number(data.tileheight) || 32;
        mapCols = Number(data.width) || 32;
        mapRows = Number(data.height) || 32;

        // Collect all used GIDs across tile layers so we can either import used tiles or full grid
        const usedGids = new Set();
        for (const l of data.layers) {
            if (l.type === 'tilelayer' && Array.isArray(l.data)) {
                l.data.forEach(gid => { if (gid > 0) usedGids.add(gid & 0x1FFFFFFF); });
            }
        }

        for (const ts of data.tilesets) {
            const firstgid = ts.firstgid || 1;
            const cols = ts.columns || 1;
            const tw = ts.tilewidth || tileWidth;
            const th = ts.tileheight || tileHeight;
            const count = ts.tilecount || 0;
            const margin = ts.margin || 0;
            const spacing = ts.spacing || 0;

            document.getElementById('slice-margin').value = margin;
            document.getElementById('slice-spacing').value = spacing;

            for (let i = 0; i < count; i++) {
                const gid = firstgid + i;
                const col = i % cols;
                const row = Math.floor(i / cols);
                const x = margin + col * (tw + spacing);
                const y = margin + row * (th + spacing);

                // Default RTS terrain heuristics for rts_map.json (gid 1=water, 2=shore, 3=grass)
                let name = `tile_${gid}`;
                let terrainType = 'grass';
                let walkable = true;
                if (ts.name === 'rts_tileset') {
                    if (gid === 1) { name = 'water'; terrainType = 'water'; walkable = false; }
                    else if (gid === 2) { name = 'shore'; terrainType = 'shore'; walkable = false; }
                    else if (gid === 3) { name = 'grass'; terrainType = 'grass'; walkable = true; }
                }

                tiles[gid] = {
                    id: gid,
                    name,
                    x,
                    y,
                    w: tw,
                    h: th,
                    walkable,
                    terrainType,
                    tags: []
                };
                if (gid >= nextTileId) nextTileId = gid + 1;
            }
        }

        const importedLayers = [];
        for (const l of data.layers) {
            if (l.type === 'tilelayer' && Array.isArray(l.data)) {
                const grid = [];
                const w = l.width || mapCols;
                const h = l.height || mapRows;
                for (let r = 0; r < h; r++) {
                    const row = l.data.slice(r * w, (r + 1) * w).map(g => g & 0x1FFFFFFF);
                    grid.push(row);
                }
                importedLayers.push({
                    name: l.name || 'Layer',
                    visible: l.visible !== false,
                    opacity: l.opacity !== undefined ? l.opacity : 1,
                    data: grid
                });
            }
        }

        layers = importedLayers.length > 0 ? importedLayers : [{
            name: 'Ground',
            visible: true,
            opacity: 1,
            data: createEmptyGrid(mapCols, mapRows, 0)
        }];
        activeLayerIndex = 0;
        undoStack.length = 0;
        redoStack.length = 0;
        updateUndoRedoButtons();
        syncMapHeaderInputs();

        const firstUsed = [...usedGids][0] || Number(Object.keys(tiles)[0]) || 0;
        selectTile(firstUsed);
        refreshLayerList();
        refreshPalette();
        redrawAtlas();
        fitMapToWindow();
        return;
    }

    // Case C: spark.js Tileset Editor JSON
    if (data.format === 'spark.tileset' || data.tiles || Array.isArray(data.map) || Array.isArray(data.layers)) {
        tiles = {};
        nextTileId = 1;
        tileWidth = Number(data.tileWidth) || 32;
        tileHeight = Number(data.tileHeight) || tileWidth;

        const rawTiles = data.tiles || data.tilesetConfig || {};
        for (const [idStr, t] of Object.entries(rawTiles)) {
            const id = Number(idStr) || nextTileId++;
            if (id >= nextTileId) nextTileId = id + 1;
            const rect = t.rect || t;
            tiles[id] = {
                id,
                name: t.name || `tile_${id}`,
                x: Number(rect.x) || 0,
                y: Number(rect.y) || 0,
                w: Number(rect.w) || tileWidth,
                h: Number(rect.h) || tileHeight,
                walkable: t.walkable !== undefined ? Boolean(t.walkable) : true,
                terrainType: t.terrainType || 'grass',
                tags: Array.isArray(t.tags) ? t.tags : []
            };
        }

        const parsed = Tileset.Parse(data, image);
        mapCols = parsed.width || 16;
        mapRows = parsed.height || 16;
        layers = parsed.layers.length > 0 ? parsed.layers : [{
            name: 'Ground',
            visible: true,
            opacity: 1,
            data: createEmptyGrid(mapCols, mapRows, 0)
        }];
        activeLayerIndex = 0;
        if (data.name) document.getElementById('project-name').value = data.name;

        undoStack.length = 0;
        redoStack.length = 0;
        updateUndoRedoButtons();
        syncMapHeaderInputs();

        const firstId = Number(Object.keys(tiles)[0]) || 0;
        selectTile(firstId);
        refreshLayerList();
        refreshPalette();
        redrawAtlas();
        fitMapToWindow();
        return;
    }

    // Case D: Sprite Atlas JSON (`{ sprites: { ... } }` or flat `{ name: {x,y,w,h} }`)
    importJSONData(data, true);
}

function loadImageFromFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    imageFilename = file.name;
    imageName = file.name.replace(/\.[^.]+$/, '');
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
        image = img;
        URL.revokeObjectURL(url);
        document.getElementById('atlas-drop-hint').style.display = 'none';
        document.getElementById('tb-image-name').textContent = file.name;
        fitAtlasToWindow();
        refreshSelectedTileInspector();
        refreshPalette();
        redrawMap();
    };
    img.src = url;
}

function loadSampleProject(sampleKey) {
    if (sampleKey === 'blank') {
        tiles = {};
        nextTileId = 1;
        selectedTileId = 0;
        selectedTileIds.clear();
        initDefaultMap(16, 16, 32, 32);
        refreshLayerList();
        refreshPalette();
        refreshSelectedTileInspector();
        redrawAtlas();
        fitMapToWindow();
        return;
    }

    const samples = {
        rts: {
            imgPath: 'src/examples/rts/assets/rts_tileset.png',
            imgFile: 'rts_tileset.png',
            jsonPath: 'src/examples/rts/assets/rts_map.json',
            projName: 'rts_map'
        },
        beach: {
            imgPath: 'src/examples/tileset/assets/rpg/beach_tileset.png',
            imgFile: 'beach_tileset.png',
            jsonPath: 'src/examples/tileset/assets/rpg/island.json',
            projName: 'island_map'
        }
    };

    const cfg = samples[sampleKey];
    if (!cfg) return;

    document.getElementById('project-name').value = cfg.projName;
    imageFilename = cfg.imgFile;
    imageName = cfg.imgFile.replace(/\.[^.]+$/, '');
    document.getElementById('tb-image-name').textContent = cfg.imgFile;

    const img = new Image();
    img.onload = () => {
        image = img;
        document.getElementById('atlas-drop-hint').style.display = 'none';
        fitAtlasToWindow();

        fetch(cfg.jsonPath)
            .then(r => r.json())
            .then(json => {
                importJSONData(json, false);
            })
            .catch(err => {
                console.warn('Could not fetch sample JSON:', err);
                initDefaultMap(16, 16, 32, 32);
                refreshLayerList();
                refreshPalette();
                redrawMap();
            });
    };
    img.src = cfg.imgPath;
}

// #endregion

// #region ---- UI EVENT WIRING ----

// Image & JSON File Inputs
document.getElementById('btn-load-img').addEventListener('click', () =>
    document.getElementById('file-img').click());
document.getElementById('file-img').addEventListener('change', e => {
    if (e.target.files[0]) loadImageFromFile(e.target.files[0]);
    e.target.value = '';
});

document.getElementById('select-sample').addEventListener('change', e => {
    loadSampleProject(e.target.value);
});

document.getElementById('btn-load-json').addEventListener('click', () =>
    document.getElementById('file-json').click());
document.getElementById('file-json').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        try {
            importJSONData(JSON.parse(ev.target.result), false);
        } catch (err) {
            alert('Invalid JSON: ' + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
});

document.getElementById('btn-import-atlas').addEventListener('click', () =>
    document.getElementById('file-atlas-json').click());
document.getElementById('file-atlas-json').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        try {
            importJSONData(JSON.parse(ev.target.result), true);
        } catch (err) {
            alert('Invalid Atlas JSON: ' + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
});

document.getElementById('btn-export').addEventListener('click', exportTilesetJSON);
document.getElementById('btn-export-atlas').addEventListener('click', exportAtlasOnlyJSON);
document.getElementById('btn-copy-js').addEventListener('click', copyJSSnippet);

// Workspace View Mode Switcher
document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.view;
        const ws = document.getElementById('workspace');
        ws.className = `view-${mode}`;
        // Reset inline flex widths when switching modes
        document.getElementById('atlas-pane').style.flex = '';
        document.getElementById('map-pane').style.flex = '';
        resizeCanvases();
        setTimeout(() => {
            fitAtlasToWindow();
            fitMapToWindow();
        }, 20);
    });
});

// Resizable Split Pane Divider
const resizer = document.getElementById('pane-resizer');
let resizingPanes = false;
resizer.addEventListener('mousedown', e => {
    resizingPanes = true;
    resizer.classList.add('dragging');
    e.preventDefault();
});
window.addEventListener('mousemove', e => {
    if (!resizingPanes) return;
    const ws = document.getElementById('workspace');
    const r = ws.getBoundingClientRect();
    const relX = Math.max(240, Math.min(r.width - 240, e.clientX - r.left));
    const pct = (relX / r.width) * 100;
    document.getElementById('atlas-pane').style.flex = `0 0 ${pct}%`;
    document.getElementById('map-pane').style.flex = `1 1 0`;
    resizeCanvases();
});
window.addEventListener('mouseup', () => {
    if (resizingPanes) {
        resizingPanes = false;
        resizer.classList.remove('dragging');
    }
});

// Map Tools
document.querySelectorAll('#map-tools-group .tb-btn').forEach(btn => {
    btn.addEventListener('click', () => setActiveTool(btn.dataset.tool));
});
document.getElementById('btn-undo').addEventListener('click', undoMapEdit);
document.getElementById('btn-redo').addEventListener('click', redoMapEdit);

// Atlas Controls (snap to predefined zoom presets on - / + buttons; click % badge to reset to 100%)
document.getElementById('btn-atlas-zoom-in').addEventListener('click', () =>
    setAtlasZoom(getNextZoomPreset(atlasZoom, +1)));
document.getElementById('btn-atlas-zoom-out').addEventListener('click', () =>
    setAtlasZoom(getNextZoomPreset(atlasZoom, -1)));
document.getElementById('atlas-zoom-display').addEventListener('click', () =>
    setAtlasZoom(1.0));
document.getElementById('btn-atlas-fit').addEventListener('click', fitAtlasToWindow);

document.getElementById('atlas-snap-check').addEventListener('change', e => {
    atlasSnapEnabled = e.target.checked;
    redrawAtlas();
});
document.getElementById('atlas-grid-size').addEventListener('input', e => {
    atlasSnapGrid = Math.max(1, parseInt(e.target.value) || 1);
    redrawAtlas();
});

document.getElementById('btn-slice-grid').addEventListener('click', sliceImageGrid);
document.getElementById('btn-clear-crops').addEventListener('click', () => {
    if (Object.keys(tiles).length > 0 && !confirm('Clear all tile crops?')) return;
    tiles = {};
    nextTileId = 1;
    selectedTileId = 0;
    selectedTileIds.clear();
    refreshSelectedTileInspector();
    refreshPalette();
    redrawAtlas();
    redrawMap();
});

// Map Controls (snap to predefined zoom presets on - / + buttons; click % badge to reset to 100%)
document.getElementById('btn-map-zoom-in').addEventListener('click', () =>
    setMapZoom(getNextZoomPreset(mapZoom, +1)));
document.getElementById('btn-map-zoom-out').addEventListener('click', () =>
    setMapZoom(getNextZoomPreset(mapZoom, -1)));
document.getElementById('map-zoom-display').addEventListener('click', () =>
    setMapZoom(1.0));
document.getElementById('btn-map-fit').addEventListener('click', fitMapToWindow);

document.getElementById('btn-apply-map-size').addEventListener('click', () => {
    const cols = parseInt(document.getElementById('map-cols').value) || mapCols;
    const rows = parseInt(document.getElementById('map-rows').value) || mapRows;
    const tw = parseInt(document.getElementById('tile-w').value) || tileWidth;
    const th = parseInt(document.getElementById('tile-h').value) || tileHeight;
    resizeMapGrid(cols, rows, tw, th);
});

document.getElementById('chk-map-grid').addEventListener('change', e => {
    mapShowGrid = e.target.checked;
    redrawMap();
});
document.getElementById('chk-terrain-overlay').addEventListener('change', e => {
    mapShowTerrain = e.target.checked;
    redrawMap();
});
document.getElementById('chk-engine-preview').addEventListener('change', e => {
    mapEnginePreview = e.target.checked;
    redrawMap();
});

document.getElementById('btn-fill-layer').addEventListener('click', () => {
    const layer = layers[activeLayerIndex];
    if (!layer) return;
    pushUndoState();
    const isErasing = activeTool === 'erase' || (selectedTileId === 0 && selectedTileIds.size === 0);
    for (let r = 0; r < mapRows; r++) {
        for (let c = 0; c < mapCols; c++) {
            layer.data[r][c] = isErasing ? 0 : pickRandomBrushTileId();
        }
    }
    redrawMap();
});

document.getElementById('btn-clear-layer').addEventListener('click', () => {
    const layer = layers[activeLayerIndex];
    if (!layer) return;
    pushUndoState();
    layer.data = createEmptyGrid(mapCols, mapRows, 0);
    redrawMap();
});

// Side Panel: Inspector Controls (supports both single-tile and multi-tile bulk editing)
document.getElementById('btn-new-crop').addEventListener('click', () => {
    addTileCrop({ x: 0, y: 0, w: tileWidth, h: tileHeight });
});
document.getElementById('btn-dup-tile').addEventListener('click', duplicateSelectedTile);
document.getElementById('btn-del-tile').addEventListener('click', () => {
    deleteSelectedTiles();
});

document.getElementById('sel-id-badge').addEventListener('click', () => {
    if (selectedTileIds.size > 1) return;
    const t = tiles[selectedTileId];
    if (!t) return;
    const raw = prompt(`Change numeric Tile ID for "${t.name}" (current: #${t.id}):`, String(t.id));
    if (raw === null) return;
    const newId = parseInt(raw, 10);
    if (!newId || newId < 1 || newId === t.id) return;

    const oldId = t.id;
    const existing = tiles[newId];
    if (existing) {
        if (!confirm(`Tile ID #${newId} is currently used by "${existing.name}". Swap their IDs?`)) return;
        existing.id = oldId;
        tiles[oldId] = existing;
    } else {
        delete tiles[oldId];
    }
    t.id = newId;
    tiles[newId] = t;
    nextTileId = getNextAvailableTileId();
    selectTile(newId);
    refreshPalette();
    redrawAtlas();
    redrawMap();
});

document.getElementById('sel-name').addEventListener('change', e => {
    if (selectedTileIds.size > 1) return;
    const t = tiles[selectedTileId];
    if (!t) return;
    t.name = ensureUniqueTileName(e.target.value, t.id);
    e.target.value = t.name;
    refreshPalette();
    redrawAtlas();
    updateMapCoordBar();
});

['sel-x', 'sel-y', 'sel-w', 'sel-h'].forEach(inputId => {
    document.getElementById(inputId).addEventListener('change', () => {
        const selTiles = getSelectedTileObjects();
        if (selTiles.length === 0) return;

        if (selTiles.length === 1) {
            const t = selTiles[0];
            t.x = Math.max(0, parseInt(document.getElementById('sel-x').value) || 0);
            t.y = Math.max(0, parseInt(document.getElementById('sel-y').value) || 0);
            t.w = Math.max(1, parseInt(document.getElementById('sel-w').value) || 1);
            t.h = Math.max(1, parseInt(document.getElementById('sel-h').value) || 1);
        } else {
            const newW = parseInt(document.getElementById('sel-w').value);
            const newH = parseInt(document.getElementById('sel-h').value);
            for (const t of selTiles) {
                if (newW >= 1) t.w = newW;
                if (newH >= 1) t.h = newH;
            }
        }
        refreshSelectedTileInspector();
        refreshPalette();
        redrawAtlas();
        redrawMap();
    });
});

document.getElementById('sel-walkable').addEventListener('change', e => {
    const selTiles = getSelectedTileObjects();
    if (selTiles.length === 0) return;
    for (const t of selTiles) {
        t.walkable = e.target.checked;
    }
    refreshSelectedTileInspector();
    refreshPalette();
    redrawMap();
});

document.getElementById('sel-terrain').addEventListener('change', e => {
    const val = e.target.value;
    if (val === '__mixed__') return;
    const selTiles = getSelectedTileObjects();
    if (selTiles.length === 0) return;

    for (const t of selTiles) {
        t.terrainType = val;
        // Sensible auto-walkable default when changing terrain type
        if (['water', 'wall', 'cliff', 'shore'].includes(val)) {
            t.walkable = false;
        } else if (['grass', 'road', 'dirt', 'sand'].includes(val)) {
            t.walkable = true;
        }
    }
    refreshSelectedTileInspector();
    refreshPalette();
    redrawMap();
});

document.getElementById('sel-tags').addEventListener('change', e => {
    const selTiles = getSelectedTileObjects();
    if (selTiles.length === 0) return;
    const parsedTags = e.target.value
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    for (const t of selTiles) {
        t.tags = parsedTags.slice();
    }
    refreshSelectedTileInspector();
    refreshPalette();
});

// Side Panel: Layer Buttons
document.getElementById('btn-add-layer').addEventListener('click', () => {
    pushUndoState();
    const newLayer = {
        name: `Layer ${layers.length + 1}`,
        visible: true,
        opacity: 1,
        data: createEmptyGrid(mapCols, mapRows, 0)
    };
    layers.push(newLayer);
    activeLayerIndex = layers.length - 1;
    refreshLayerList();
    redrawMap();
});

document.getElementById('btn-dup-layer').addEventListener('click', () => {
    const src = layers[activeLayerIndex];
    if (!src) return;
    pushUndoState();
    layers.splice(activeLayerIndex + 1, 0, {
        name: `${src.name} Copy`,
        visible: src.visible,
        opacity: src.opacity,
        data: src.data.map(row => row.slice())
    });
    activeLayerIndex++;
    refreshLayerList();
    redrawMap();
});

// Side Panel: Palette View & Filter
document.getElementById('btn-palette-select-all').addEventListener('click', selectAllFilteredTiles);
document.getElementById('btn-palette-grid').addEventListener('click', () => {
    paletteMode = 'grid';
    document.getElementById('btn-palette-grid').classList.add('active');
    document.getElementById('btn-palette-list').classList.remove('active');
    document.getElementById('palette-wrap').className = 'palette-grid-mode';
});
document.getElementById('btn-palette-list').addEventListener('click', () => {
    paletteMode = 'list';
    document.getElementById('btn-palette-list').classList.add('active');
    document.getElementById('btn-palette-grid').classList.remove('active');
    document.getElementById('palette-wrap').className = 'palette-list-mode';
});
document.getElementById('palette-filter').addEventListener('input', e => {
    paletteFilter = e.target.value;
    refreshPalette();
});

// Global Keyboard Shortcuts
window.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
        if (e.key === 'Escape') document.activeElement.blur();
        return;
    }

    if (e.key === ' ') {
        spaceKeyHeld = true;
        e.preventDefault();
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectAllFilteredTiles();
        return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redoMapEdit();
        else undoMapEdit();
        return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redoMapEdit();
        return;
    }

    const k = e.key.toLowerCase();
    if (k === 'b') setActiveTool('brush');
    else if (k === 'e') setActiveTool('erase');
    else if (k === 'g' || k === 'f') setActiveTool('fill');
    else if (k === 'r') setActiveTool('rect');
    else if (k === 'i') setActiveTool('pick');
    else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelectedTiles();
    }
    else if (e.key === '0') {
        selectTile(0);
    }
});

window.addEventListener('keyup', e => {
    if (e.key === ' ') spaceKeyHeld = false;
});

// Global File Drag & Drop
const dropOverlay = document.getElementById('drop-overlay');
window.addEventListener('dragover', e => {
    e.preventDefault();
    dropOverlay.classList.add('visible');
});
window.addEventListener('dragleave', e => {
    if (e.relatedTarget === null) dropOverlay.classList.remove('visible');
});
window.addEventListener('drop', e => {
    e.preventDefault();
    dropOverlay.classList.remove('visible');
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    if (file.type.startsWith('image/')) {
        loadImageFromFile(file);
    } else if (file.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                importJSONData(JSON.parse(ev.target.result), false);
            } catch (err) {
                alert('Invalid JSON: ' + err.message);
            }
        };
        reader.readAsText(file);
    }
});

// Observe resize on both canvas wraps
new ResizeObserver(resizeCanvases).observe(atlasWrap);
new ResizeObserver(resizeCanvases).observe(mapWrap);

// Initialize default state and load the RTS sample out of the box
initDefaultMap(32, 32, 32, 32);
refreshLayerList();
refreshPalette();
refreshSelectedTileInspector();
loadSampleProject('rts');

// #endregion
