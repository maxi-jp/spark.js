// =====================================================================
// Sprite Atlas Editor — Interactive sprite-sheet cropping tool
// Standalone; no engine dependency.
// =====================================================================

// #region ---- STATE ----

let image       = null;   // HTMLImageElement
let imagePixels = null;   // ImageData for auto-trim / magic wand
let imageName   = '';
let zoom        = 1;
let panX        = 0, panY = 0;
let snapGrid    = 1;
let snapEnabled = false;

// sprites: { id: {x, y, w, h} }
let sprites = {};

// Interaction state
let selectedId   = null;
let dragging     = false;   // drawing a new rect
let panning      = false;   // middle-mouse / alt panning
let dragStart    = null;    // {ix, iy} image coords
let dragCurrent  = null;    // {ix, iy}
let panStart     = null;    // {mx, my, px, py}
let mouseImg     = {x:0, y:0};   // last mouse pos in image coords

// Move / resize active sprite state
// transformState: { mode: 'move'|'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w', startIx, startIy, startRect, moved }
let transformState = null;

// Undo / Redo history
const MAX_HISTORY = 50;
let undoStack = [];
let redoStack = [];
const STORAGE_KEY = 'spark_sprite_atlas_autosave_v1';

// Search filter
let searchFilter = '';

// Animation preview state
let animPlaying   = true;
let animFps       = 8;
let animFrameIdx  = 0;
let animLastTime  = 0;

// canvas
const canvas  = document.getElementById('editor-canvas');
const ctx     = canvas.getContext('2d');
const wrap    = document.getElementById('canvas-wrap');

// #endregion

// #region ---- HISTORY & AUTOSAVE ----

function cloneSprites(obj) {
    const out = {};
    for (const [k, r] of Object.entries(obj)) out[k] = { x: r.x, y: r.y, w: r.w, h: r.h };
    return out;
}

function recordHistory() {
    undoStack.push({ sprites: cloneSprites(sprites), selectedId });
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = [];
    updateHistoryButtons();
}

function undo() {
    if (undoStack.length === 0) return;
    redoStack.push({ sprites: cloneSprites(sprites), selectedId });
    const prev = undoStack.pop();
    sprites    = prev.sprites;
    selectedId = prev.selectedId && sprites[prev.selectedId] ? prev.selectedId : null;
    updateHistoryButtons();
    saveToLocalStorage();
    refreshList();
    refreshSelectedPanel();
    redraw();
}

function redo() {
    if (redoStack.length === 0) return;
    undoStack.push({ sprites: cloneSprites(sprites), selectedId });
    const next = redoStack.pop();
    sprites    = next.sprites;
    selectedId = next.selectedId && sprites[next.selectedId] ? next.selectedId : null;
    updateHistoryButtons();
    saveToLocalStorage();
    refreshList();
    refreshSelectedPanel();
    redraw();
}

function updateHistoryButtons() {
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    if (btnUndo) btnUndo.disabled = undoStack.length === 0;
    if (btnRedo) btnRedo.disabled = redoStack.length === 0;
}

function saveToLocalStorage() {
    try {
        const payload = { imageName, sprites };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (_) { /* ignore storage errors */ }
}

function loadFromLocalStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (data && data.sprites && typeof data.sprites === 'object' && Object.keys(data.sprites).length > 0) {
            sprites = {};
            for (const [id, r] of Object.entries(data.sprites)) {
                if (typeof r.x === 'number') sprites[id] = { x: r.x, y: r.y, w: r.w, h: r.h };
            }
            if (data.imageName && !imageName) imageName = data.imageName;
        }
    } catch (_) { /* ignore */ }
}

// #endregion

// #region ---- COORDINATE HELPERS ----

function snap(v) {
    if (!snapEnabled || snapGrid < 2) return v;
    return Math.round(v / snapGrid) * snapGrid;
}

/** Mouse event position relative to the canvas-wrap element */
function wrapPos(e) {
    const r = wrap.getBoundingClientRect();
    return { mx: e.clientX - r.left, my: e.clientY - r.top };
}

/** Convert canvas-wrap coords to image coords (unzoomed, un-panned) */
function toImg(mx, my) {
    return { ix: (mx - panX) / zoom, iy: (my - panY) / zoom };
}

/** Convert image coords to canvas-wrap coords */
function toWrap(ix, iy) {
    return { mx: ix * zoom + panX, my: iy * zoom + panY };
}

/** Clamp to image bounds */
function clampImg(ix, iy) {
    if (!image) return { ix, iy };
    return {
        ix: Math.max(0, Math.min(image.width,  ix)),
        iy: Math.max(0, Math.min(image.height, iy)),
    };
}

/** Normalise a drag into a {x,y,w,h} rect (always positive w/h, clamped + snapped). */
function normaliseRect(a, b) {
    const x1 = Math.max(0, Math.min(a.ix, b.ix));
    const y1 = Math.max(0, Math.min(a.iy, b.iy));
    const x2 = Math.max(0, Math.min(Math.max(a.ix, b.ix), image ? image.width  : 9999));
    const y2 = Math.max(0, Math.min(Math.max(a.iy, b.iy), image ? image.height : 9999));
    // Snap BOTH corner coordinates so every edge aligns to the grid
    const sx1 = snap(Math.round(x1)), sy1 = snap(Math.round(y1));
    const sx2 = snap(Math.round(x2)), sy2 = snap(Math.round(y2));
    return { x: sx1, y: sy1, w: Math.max(1, sx2 - sx1), h: Math.max(1, sy2 - sy1) };
}

/** Return the 8 resize handle positions in image coordinates for a rect */
function getHandlePositions(r) {
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    return [
        { mode: 'nw', x: r.x,       y: r.y,       cursor: 'nwse-resize' },
        { mode: 'n',  x: cx,        y: r.y,       cursor: 'ns-resize'   },
        { mode: 'ne', x: r.x + r.w, y: r.y,       cursor: 'nesw-resize' },
        { mode: 'e',  x: r.x + r.w, y: cy,        cursor: 'ew-resize'   },
        { mode: 'se', x: r.x + r.w, y: r.y + r.h, cursor: 'nwse-resize' },
        { mode: 's',  x: cx,        y: r.y + r.h, cursor: 'ns-resize'   },
        { mode: 'sw', x: r.x,       y: r.y + r.h, cursor: 'nesw-resize' },
        { mode: 'w',  x: r.x,       y: cy,        cursor: 'ew-resize'   },
    ];
}

/** Hit-test the 8 resize handles of the selected sprite. Returns handle object or null. */
function hitTestHandles(ix, iy) {
    if (!selectedId || !sprites[selectedId]) return null;
    const r = sprites[selectedId];
    const tol = 5 / zoom; // 5 screen pixels tolerance
    for (const h of getHandlePositions(r)) {
        if (Math.abs(ix - h.x) <= tol && Math.abs(iy - h.y) <= tol) return h;
    }
    return null;
}

// #endregion

// #region ---- RENDER ----

function resizeCanvas() {
    canvas.width  = wrap.clientWidth;
    canvas.height = wrap.clientHeight;
    redraw();
}

function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!image) return;

    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(image, 0, 0);

    // Draw saved sprites
    for (const [id, r] of Object.entries(sprites)) {
        const isSelected = id === selectedId;

        // semi-transparent fill
        ctx.fillStyle = isSelected ? 'rgba(91,140,255,0.22)' : 'rgba(255,255,255,0.08)';
        ctx.fillRect(r.x, r.y, r.w, r.h);

        // border
        ctx.lineWidth   = isSelected ? 2 / zoom : 1 / zoom;
        ctx.strokeStyle = isSelected ? '#5b8cff' : 'rgba(255,255,255,0.65)';
        ctx.strokeRect(r.x + 0.5 / zoom, r.y + 0.5 / zoom, r.w - 1 / zoom, r.h - 1 / zoom);

        // label (kept at a readable screen-space size and clipped to the sprite rect)
        const fontSize = 11 / zoom;
        ctx.save();
        ctx.beginPath();
        ctx.rect(r.x, r.y, r.w, r.h);
        ctx.clip();
        ctx.font         = `bold ${fontSize}px Arial`;
        ctx.fillStyle    = isSelected ? '#a0c4ff' : 'rgba(255,255,255,0.7)';
        ctx.textBaseline = 'top';
        ctx.fillText(id, r.x + 2 / zoom, r.y + 2 / zoom);
        ctx.restore();
    }

    // Draw 8 resize handles on the selected sprite
    if (selectedId && sprites[selectedId]) {
        const r  = sprites[selectedId];
        const hs = 6 / zoom; // 6x6 screen pixels
        ctx.fillStyle   = '#ffffff';
        ctx.strokeStyle = '#5b8cff';
        ctx.lineWidth   = 1.5 / zoom;
        for (const h of getHandlePositions(r)) {
            ctx.fillRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
            ctx.strokeRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
        }
    }

    // Draw the rect being dragged
    if (dragging && dragStart && dragCurrent) {
        const r = normaliseRect(dragStart, dragCurrent);
        ctx.fillStyle   = 'rgba(255,152,0,0.18)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.lineWidth   = 1.5 / zoom;
        ctx.strokeStyle = '#ff9800';
        ctx.strokeRect(r.x + 0.5 / zoom, r.y + 0.5 / zoom, r.w - 1 / zoom, r.h - 1 / zoom);

        // dimension label
        const lbl  = `${r.w} × ${r.h}`;
        const fSz  = 11 / zoom;
        ctx.font   = `${fSz}px Arial`;
        ctx.fillStyle = '#ff9800';
        ctx.textBaseline = 'bottom';
        ctx.fillText(lbl, r.x + 2 / zoom, r.y - 2 / zoom);
    }

    // Grid overlay
    if (snapEnabled && snapGrid >= 2 && zoom * snapGrid >= 4) {
        ctx.lineWidth   = 0.5 / zoom;
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath();
        for (let gx = 0; gx <= image.width; gx += snapGrid) {
            ctx.moveTo(gx, 0); ctx.lineTo(gx, image.height);
        }
        for (let gy = 0; gy <= image.height; gy += snapGrid) {
            ctx.moveTo(0, gy); ctx.lineTo(image.width, gy);
        }
        ctx.stroke();
    }

    ctx.restore();

    updateCoordBar();
}

function updateCoordBar() {
    const ix = Math.floor(mouseImg.x);
    const iy = Math.floor(mouseImg.y);
    let html = `<span>Mouse: <b>${ix}, ${iy}</b></span>`;
    if (image) html += `<span>Image: <b>${image.width} × ${image.height}</b></span>`;
    if (selectedId && sprites[selectedId]) {
        const r = sprites[selectedId];
        html += `<span>Selected: <b>${selectedId}</b> — x:${r.x} y:${r.y} w:${r.w} h:${r.h}</span>`;
    }
    document.getElementById('coord-bar').innerHTML = html;
}

// #endregion

// #region ---- ZOOM & PAN ----

function setZoom(newZoom, cx, cy) {
    newZoom = Math.max(0.1, Math.min(32, newZoom));
    if (!image) { zoom = newZoom; return; }
    // Zoom around the given canvas point (centre of wrap if not specified)
    const ox = cx ?? wrap.clientWidth  / 2;
    const oy = cy ?? wrap.clientHeight / 2;
    const ix = (ox - panX) / zoom;
    const iy = (oy - panY) / zoom;
    zoom  = newZoom;
    panX  = ox - ix * zoom;
    panY  = oy - iy * zoom;
    document.getElementById('zoom-display').textContent = Math.round(zoom * 100) + '%';
    redraw();
}

function fitToWindow() {
    if (!image) return;
    const scaleX = (wrap.clientWidth  - 40) / image.width;
    const scaleY = (wrap.clientHeight - 40) / image.height;
    const z      = Math.min(scaleX, scaleY, 4);
    zoom  = z;
    panX  = (wrap.clientWidth  - image.width  * z) / 2;
    panY  = (wrap.clientHeight - image.height * z) / 2;
    document.getElementById('zoom-display').textContent = Math.round(zoom * 100) + '%';
    redraw();
}

function focusOnSprite(id) {
    const r = sprites[id];
    if (!r) return;
    // Pick a comfortable zoom so the sprite occupies a good portion of the view
    const targetZoom = Math.max(zoom, Math.min(12, Math.min(
        (wrap.clientWidth  * 0.35) / Math.max(1, r.w),
        (wrap.clientHeight * 0.35) / Math.max(1, r.h)
    )));
    zoom = Math.max(0.5, Math.min(32, targetZoom));
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    panX = wrap.clientWidth  / 2 - cx * zoom;
    panY = wrap.clientHeight / 2 - cy * zoom;
    document.getElementById('zoom-display').textContent = Math.round(zoom * 100) + '%';
    redraw();
}

// #endregion

// #region ---- MOUSE EVENTS ----

wrap.addEventListener('mousedown', e => {
    if (!image) return;

    const { mx, my } = wrapPos(e);
    const { ix, iy } = toImg(mx, my);

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
        // Middle-click or alt+left-click: pan
        panning  = true;
        panStart = { mx, my, px: panX, py: panY };
        wrap.style.cursor = 'grabbing';
        e.preventDefault();
        return;
    }

    if (e.button === 0) {
        // 1. Check resize handles on currently selected sprite
        if (!e.shiftKey) {
            const handle = hitTestHandles(ix, iy);
            if (handle) {
                recordHistory();
                transformState = {
                    mode: handle.mode,
                    startIx: ix,
                    startIy: iy,
                    startRect: { ...sprites[selectedId] },
                    moved: false
                };
                return;
            }
        }

        // 2. Check if clicking on an existing sprite (select & start moving)
        const hit = hitTestSprites(ix, iy);
        if (hit && !e.shiftKey) {
            selectSprite(hit);
            recordHistory();
            transformState = {
                mode: 'move',
                startIx: ix,
                startIy: iy,
                startRect: { ...sprites[hit] },
                moved: false
            };
            wrap.style.cursor = 'move';
            return;
        }

        // 3. Start drawing a new rect
        dragging    = true;
        dragStart   = clampImg(ix, iy);
        dragCurrent = { ...dragStart };
        redraw();
    }
});

wrap.addEventListener('mousemove', e => {
    const { mx, my } = wrapPos(e);
    const { ix, iy } = toImg(mx, my);
    mouseImg = { x: ix, y: iy };

    if (panning && panStart) {
        panX = panStart.px + (mx - panStart.mx);
        panY = panStart.py + (my - panStart.my);
        redraw();
        return;
    }

    if (transformState && selectedId && sprites[selectedId]) {
        const dx = ix - transformState.startIx;
        const dy = iy - transformState.startIy;
        const sr = transformState.startRect;
        const maxW = image ? image.width  : 9999;
        const maxH = image ? image.height : 9999;

        if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) transformState.moved = true;

        if (transformState.mode === 'move') {
            let nx = snap(Math.round(sr.x + dx));
            let ny = snap(Math.round(sr.y + dy));
            nx = Math.max(0, Math.min(maxW - sr.w, nx));
            ny = Math.max(0, Math.min(maxH - sr.h, ny));
            sprites[selectedId] = { x: nx, y: ny, w: sr.w, h: sr.h };
        } else {
            let x1 = sr.x, y1 = sr.y, x2 = sr.x + sr.w, y2 = sr.y + sr.h;
            const m = transformState.mode;
            if (m.includes('w')) x1 = Math.max(0, Math.min(x2 - 1, snap(Math.round(sr.x + dx))));
            if (m.includes('e')) x2 = Math.min(maxW, Math.max(x1 + 1, snap(Math.round(sr.x + sr.w + dx))));
            if (m.includes('n')) y1 = Math.max(0, Math.min(y2 - 1, snap(Math.round(sr.y + dy))));
            if (m.includes('s')) y2 = Math.min(maxH, Math.max(y1 + 1, snap(Math.round(sr.y + sr.h + dy))));
            sprites[selectedId] = { x: x1, y: y1, w: Math.max(1, x2 - x1), h: Math.max(1, y2 - y1) };
        }
        refreshSelectedPanel();
        redraw();
        return;
    }

    if (dragging && dragStart) {
        dragCurrent = clampImg(ix, iy);
        redraw();
        return;
    }

    // Hover cursor feedback for handles & sprites
    if (image && !e.altKey) {
        const handle = hitTestHandles(ix, iy);
        if (handle) {
            wrap.style.cursor = handle.cursor;
        } else if (hitTestSprites(ix, iy)) {
            wrap.style.cursor = 'move';
        } else {
            wrap.style.cursor = 'crosshair';
        }
    }

    updateCoordBar();
});

wrap.addEventListener('mouseup', () => {
    if (panning) {
        panning = false;
        wrap.style.cursor = image ? 'crosshair' : 'default';
        return;
    }

    if (transformState) {
        if (!transformState.moved) {
            // Did not actually move/resize — discard the speculative undo snapshot
            undoStack.pop();
            updateHistoryButtons();
        } else {
            saveToLocalStorage();
            refreshList();
        }
        transformState = null;
        return;
    }

    if (dragging && dragStart && dragCurrent && image) {
        const r = normaliseRect(dragStart, dragCurrent);
        if (r.w > 1 && r.h > 1) {
            const proposedName = document.getElementById('new-name').value.trim()
                || `sprite_${Object.keys(sprites).length + 1}`;
            addSprite(proposedName, r);
        }
        dragging    = false;
        dragStart   = null;
        dragCurrent = null;
        redraw();
    }
});

wrap.addEventListener('mouseleave', () => {
    if (dragging) {
        dragging = false; dragStart = null; dragCurrent = null; redraw();
    }
    if (transformState) {
        if (transformState.moved) { saveToLocalStorage(); refreshList(); }
        else { undoStack.pop(); updateHistoryButtons(); }
        transformState = null;
    }
    if (panning) {
        panning = false;
        wrap.style.cursor = image ? 'crosshair' : 'default';
    }
});

// Double-click on canvas: magic-wand auto-detect non-transparent sprite bounds
wrap.addEventListener('dblclick', e => {
    if (!image || !imagePixels) return;
    const { mx, my } = wrapPos(e);
    const { ix, iy } = toImg(mx, my);
    const px = Math.floor(ix), py = Math.floor(iy);
    if (px < 0 || py < 0 || px >= image.width || py >= image.height) return;

    // If double-clicking inside an existing selected sprite, auto-trim it
    const hit = hitTestSprites(ix, iy);
    if (hit) {
        selectSprite(hit);
        autoTrimSelected();
        return;
    }

    // Otherwise flood-fill non-transparent connected pixels from (px, py)
    const rect = magicWandDetect(px, py);
    if (rect) {
        const proposedName = document.getElementById('new-name').value.trim()
            || `sprite_${Object.keys(sprites).length + 1}`;
        addSprite(proposedName, rect);
    }
});

wrap.addEventListener('wheel', e => {
    e.preventDefault();
    const { mx, my } = wrapPos(e);
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setZoom(zoom * factor, mx, my);
}, { passive: false });

// #endregion

// #region ---- AUTO-TRIM & MAGIC WAND ----

function cacheImagePixels(img) {
    try {
        const off = document.createElement('canvas');
        off.width  = img.width;
        off.height = img.height;
        const octx = off.getContext('2d');
        octx.drawImage(img, 0, 0);
        imagePixels = octx.getImageData(0, 0, img.width, img.height);
    } catch (_) {
        imagePixels = null;
    }
}

/** Check if pixel (x,y) is non-transparent (or differs from top-left background color if opaque sheet) */
function isForegroundPixel(x, y, bgColor) {
    if (!imagePixels) return false;
    const w = imagePixels.width;
    const d = imagePixels.data;
    const i = (y * w + x) * 4;
    if (d[i + 3] <= 10) return false; // transparent
    if (bgColor) {
        const dr = Math.abs(d[i]     - bgColor[0]);
        const dg = Math.abs(d[i + 1] - bgColor[1]);
        const db = Math.abs(d[i + 2] - bgColor[2]);
        const da = Math.abs(d[i + 3] - bgColor[3]);
        if (dr + dg + db + da <= 12) return false;
    }
    return true;
}

function detectSheetBgColor() {
    if (!imagePixels) return null;
    const d = imagePixels.data;
    // Only use top-left pixel as background color if the image is fully opaque at (0,0)
    if (d[3] > 245) return [d[0], d[1], d[2], d[3]];
    return null;
}

/** Shrink the selected sprite's rectangle to its tightest non-transparent pixel bounds */
function autoTrimSelected() {
    if (!selectedId || !sprites[selectedId] || !imagePixels) return;
    const r = sprites[selectedId];
    const bg = detectSheetBgColor();
    const xStart = Math.max(0, r.x);
    const yStart = Math.max(0, r.y);
    const xEnd   = Math.min(imagePixels.width  - 1, r.x + r.w - 1);
    const yEnd   = Math.min(imagePixels.height - 1, r.y + r.h - 1);

    let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
    for (let y = yStart; y <= yEnd; y++) {
        for (let x = xStart; x <= xEnd; x++) {
            if (isForegroundPixel(x, y, bg)) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (maxX < minX || maxY < minY) return; // completely empty
    recordHistory();
    sprites[selectedId] = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
    saveToLocalStorage();
    refreshSelectedPanel();
    refreshList();
    redraw();
}

/** Connected-component flood fill (8-way with 1px gap bridge) around (startX, startY) */
function magicWandDetect(startX, startY) {
    if (!imagePixels) return null;
    const w  = imagePixels.width;
    const h  = imagePixels.height;
    const bg = detectSheetBgColor();

    if (!isForegroundPixel(startX, startY, bg)) return null;

    const visited = new Uint8Array(w * h);
    const queue   = [startX, startY];
    visited[startY * w + startX] = 1;

    let minX = startX, maxX = startX, minY = startY, maxY = startY;

    while (queue.length > 0) {
        const cy = queue.pop();
        const cx = queue.pop();

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        for (let dy = -1; dy <= 1; dy++) {
            const ny = cy + dy;
            if (ny < 0 || ny >= h) continue;
            for (let dx = -1; dx <= 1; dx++) {
                const nx = cx + dx;
                if (nx < 0 || nx >= w) continue;
                const idx = ny * w + nx;
                if (!visited[idx] && isForegroundPixel(nx, ny, bg)) {
                    visited[idx] = 1;
                    queue.push(nx, ny);
                }
            }
        }
    }

    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// #endregion

// #region ---- SPRITE MANAGEMENT ----

function hitTestSprites(ix, iy) {
    // Reverse iterate so topmost (last-drawn) is tested first
    const ids = Object.keys(sprites);
    for (let i = ids.length - 1; i >= 0; i--) {
        const id = ids[i];
        const r  = sprites[id];
        if (ix >= r.x && ix <= r.x + r.w && iy >= r.y && iy <= r.y + r.h) return id;
    }
    return null;
}

function getNextSpriteName(base) {
    // If name already ends with _<number>, increment that number
    const match = base.match(/^(.*?)_(\d+)$/);
    const stem  = match ? match[1] : base;
    let n       = match ? parseInt(match[2], 10) + 1 : 2;
    let candidate = match ? `${stem}_${n}` : base;
    while (sprites[candidate]) {
        candidate = `${stem}_${n++}`;
    }
    return candidate;
}

function addSprite(name, rect) {
    recordHistory();
    let finalName = sprites[name] ? getNextSpriteName(name) : name;
    sprites[finalName] = rect;
    saveToLocalStorage();
    selectSprite(finalName);
    refreshList();
    document.getElementById('new-name').value = '';
}

function duplicateSelectedSprite() {
    if (!selectedId || !sprites[selectedId]) return;
    const r = sprites[selectedId];
    const newName = getNextSpriteName(selectedId);
    const maxW = image ? image.width : 99999;
    let nx = r.x + r.w;
    let ny = r.y;
    if (image && nx + r.w > maxW) {
        nx = 0;
        ny = Math.min(image.height - r.h, r.y + r.h);
    }
    recordHistory();
    sprites[newName] = { x: Math.max(0, nx), y: Math.max(0, ny), w: r.w, h: r.h };
    saveToLocalStorage();
    selectSprite(newName);
}

function sliceStripFromSelected() {
    if (!selectedId || !sprites[selectedId]) return;
    const count = Math.max(2, Math.min(64, parseInt(document.getElementById('strip-count').value, 10) || 4));
    const r = sprites[selectedId];
    const match = selectedId.match(/^(.*?)_(\d+)$/);
    const stem  = match ? match[1] : selectedId;
    let startNum = match ? parseInt(match[2], 10) : 1;

    recordHistory();
    // If current sprite doesn't have _1 suffix, optionally keep it as frame 1 and generate remaining frames
    let lastCreated = selectedId;
    for (let i = 1; i < count; i++) {
        const nx = r.x + r.w * i;
        if (image && nx + r.w > image.width) break;
        let num = startNum + i;
        let candidate = `${stem}_${num}`;
        while (sprites[candidate]) candidate = `${stem}_${++num}`;
        sprites[candidate] = { x: nx, y: r.y, w: r.w, h: r.h };
        lastCreated = candidate;
    }
    saveToLocalStorage();
    selectSprite(lastCreated);
}

function selectSprite(id) {
    selectedId = id;
    refreshList();
    refreshSelectedPanel();
    redraw();
}

function deleteSprite(id) {
    if (!sprites[id]) return;
    recordHistory();
    delete sprites[id];
    if (selectedId === id) {
        selectedId = null;
        refreshSelectedPanel();
    }
    saveToLocalStorage();
    refreshList();
    redraw();
}

function renameSprite(oldId, newId) {
    if (!newId || newId === oldId) return;
    if (sprites[newId]) { alert(`A sprite named "${newId}" already exists.`); return; }
    recordHistory();
    const next = {};
    for (const [k, v] of Object.entries(sprites)) {
        next[k === oldId ? newId : k] = v;
    }
    sprites = next;
    selectedId = newId;
    saveToLocalStorage();
    refreshList();
    refreshSelectedPanel();
    redraw();
}

function moveSprite(id, delta) {
    const entries = Object.entries(sprites);
    const idx = entries.findIndex(([k]) => k === id);
    if (idx < 0) return;
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= entries.length) return;
    recordHistory();
    const [item] = entries.splice(idx, 1);
    entries.splice(targetIdx, 0, item);
    sprites = Object.fromEntries(entries);
    saveToLocalStorage();
    refreshList();
    redraw();
}

function reorderSpriteTo(dragId, targetId, placeAfter) {
    if (!dragId || !targetId || dragId === targetId) return;
    const entries = Object.entries(sprites);
    const fromIdx = entries.findIndex(([k]) => k === dragId);
    if (fromIdx < 0) return;
    recordHistory();
    const [item] = entries.splice(fromIdx, 1);
    let toIdx = entries.findIndex(([k]) => k === targetId);
    if (toIdx < 0) return;
    if (placeAfter) toIdx += 1;
    entries.splice(toIdx, 0, item);
    sprites = Object.fromEntries(entries);
    saveToLocalStorage();
    refreshList();
    redraw();
}

// #endregion

// #region ---- UI REFRESH ----

let draggedSpriteId = null;

function refreshList() {
    const list  = document.getElementById('sprite-list-wrap');
    const allIds = Object.keys(sprites);
    const countEl = document.getElementById('sprite-count');
    if (countEl) countEl.textContent = allIds.length;

    if (allIds.length === 0) {
        list.innerHTML = '<p class="empty-msg">No sprites yet — drag to define one.</p>';
        return;
    }

    const q = searchFilter.trim().toLowerCase();
    const ids = q ? allIds.filter(id => id.toLowerCase().includes(q)) : allIds;

    if (ids.length === 0) {
        list.innerHTML = '<p class="empty-msg">No matching sprites.</p>';
        return;
    }

    list.innerHTML = ids.map(id => {
        const r = sprites[id];
        const active = id === selectedId ? ' active' : '';
        const globalIdx = allIds.indexOf(id);
        const isFirst = globalIdx === 0 ? ' disabled' : '';
        const isLast  = globalIdx === allIds.length - 1 ? ' disabled' : '';
        return `<div class="sprite-item${active}" draggable="true" data-id="${escHtml(id)}">
          <canvas class="si-thumb" width="24" height="24"></canvas>
          <span class="si-name" title="${escHtml(id)} (double-click to focus)">${escHtml(id)}</span>
          <span class="si-size">${r.w}×${r.h}</span>
          <div class="si-move-btns">
            <button class="si-move" title="Move Up" data-move="-1"${isFirst}>▲</button>
            <button class="si-move" title="Move Down" data-move="1"${isLast}>▼</button>
          </div>
          <button class="si-del" title="Delete" data-del="${escHtml(id)}">✕</button>
        </div>`;
    }).join('');

    list.querySelectorAll('.sprite-item').forEach(el => {
        const id = el.dataset.id;
        const r  = sprites[id];
        if (image && r && r.w > 0 && r.h > 0) {
            const thumb = el.querySelector('.si-thumb');
            const tctx  = thumb.getContext('2d');
            tctx.imageSmoothingEnabled = false;
            const scale = Math.min(thumb.width / r.w, thumb.height / r.h);
            const dw = r.w * scale;
            const dh = r.h * scale;
            const dx = (thumb.width  - dw) / 2;
            const dy = (thumb.height - dh) / 2;
            tctx.drawImage(image, r.x, r.y, r.w, r.h, dx, dy, dw, dh);
        }

        el.addEventListener('click', e => {
            if (e.target.dataset.del) { deleteSprite(e.target.dataset.del); return; }
            if (e.target.dataset.move) { moveSprite(id, parseInt(e.target.dataset.move, 10)); return; }
            selectSprite(id);
        });

        el.addEventListener('dblclick', e => {
            if (e.target.dataset.del || e.target.dataset.move) return;
            selectSprite(id);
            focusOnSprite(id);
        });

        el.addEventListener('dragstart', e => {
            draggedSpriteId = id;
            el.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        el.addEventListener('dragend', () => {
            draggedSpriteId = null;
            el.classList.remove('dragging');
            list.querySelectorAll('.sprite-item').forEach(item =>
                item.classList.remove('drag-over-top', 'drag-over-bottom'));
        });

        el.addEventListener('dragover', e => {
            if (!draggedSpriteId || draggedSpriteId === id) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const rect = el.getBoundingClientRect();
            const isAfter = (e.clientY - rect.top) > rect.height / 2;
            el.classList.toggle('drag-over-top', !isAfter);
            el.classList.toggle('drag-over-bottom', isAfter);
        });

        el.addEventListener('dragleave', () => {
            el.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        el.addEventListener('drop', e => {
            if (!draggedSpriteId || draggedSpriteId === id) return;
            e.preventDefault();
            e.stopPropagation();
            const rect = el.getBoundingClientRect();
            const placeAfter = (e.clientY - rect.top) > rect.height / 2;
            const fromId = draggedSpriteId;
            draggedSpriteId = null;
            reorderSpriteTo(fromId, id, placeAfter);
        });
    });
}

function refreshSelectedPanel() {
    const panel = document.getElementById('selected-panel');
    if (!selectedId || !sprites[selectedId]) {
        panel.classList.remove('visible');
        return;
    }
    panel.classList.add('visible');
    const r = sprites[selectedId];
    document.getElementById('sel-name').value = selectedId;
    document.getElementById('sel-x').value = r.x;
    document.getElementById('sel-y').value = r.y;
    document.getElementById('sel-w').value = r.w;
    document.getElementById('sel-h').value = r.h;
}

function applySelectedRect() {
    if (!selectedId) return;
    recordHistory();
    const x = parseInt(document.getElementById('sel-x').value) || 0;
    const y = parseInt(document.getElementById('sel-y').value) || 0;
    const w = Math.max(1, parseInt(document.getElementById('sel-w').value) || 1);
    const h = Math.max(1, parseInt(document.getElementById('sel-h').value) || 1);
    sprites[selectedId] = { x, y, w, h };
    saveToLocalStorage();
    refreshList();
    redraw();
}

function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// #endregion

// #region ---- ANIMATION PREVIEW ----

const animCanvas = document.getElementById('anim-canvas');
const animCtx    = animCanvas ? animCanvas.getContext('2d') : null;

function getAnimationFrames() {
    const allIds = Object.keys(sprites);
    if (allIds.length === 0) return [];

    const customPrefix = document.getElementById('anim-prefix')?.value.trim().toLowerCase();
    if (customPrefix) {
        return allIds.filter(id => id.toLowerCase().includes(customPrefix));
    }

    if (selectedId && sprites[selectedId]) {
        // Group sprites that share the same base stem (e.g. "pac_right_1" -> "pac_right")
        const match = selectedId.match(/^(.*?)[_-]?\d+$/);
        const stem  = match && match[1] ? match[1].toLowerCase() : selectedId.toLowerCase();
        const group = allIds.filter(id => {
            const m = id.match(/^(.*?)[_-]?\d+$/);
            const s = m && m[1] ? m[1].toLowerCase() : id.toLowerCase();
            return s === stem;
        });
        if (group.length > 0) return group;
        return [selectedId];
    }

    return allIds;
}

function tickAnimation(ts) {
    requestAnimationFrame(tickAnimation);
    if (!animCtx || !animCanvas) return;

    const frames = getAnimationFrames();
    const lbl = document.getElementById('anim-frames-label');
    if (lbl) lbl.textContent = `${frames.length} frame${frames.length === 1 ? '' : 's'}`;

    animCtx.clearRect(0, 0, animCanvas.width, animCanvas.height);
    if (!image || frames.length === 0) return;

    const interval = 1000 / Math.max(1, animFps);
    if (animPlaying && ts - animLastTime >= interval) {
        animFrameIdx = (animFrameIdx + 1) % frames.length;
        animLastTime = ts;
    }
    if (animFrameIdx >= frames.length) animFrameIdx = 0;

    const id = frames[animFrameIdx];
    const r  = sprites[id];
    if (!r || r.w <= 0 || r.h <= 0) return;

    animCtx.imageSmoothingEnabled = false;
    const pad   = 4;
    const avail = animCanvas.width - pad * 2;
    const scale = Math.min(avail / r.w, avail / r.h);
    const dw = r.w * scale;
    const dh = r.h * scale;
    const dx = (animCanvas.width  - dw) / 2;
    const dy = (animCanvas.height - dh) / 2;
    animCtx.drawImage(image, r.x, r.y, r.w, r.h, dx, dy, dw, dh);
}

// #endregion

// #region ---- FILE I/O ----

function loadImage(file) {
    if (!file || !file.type.startsWith('image/')) return;
    imageName = file.name.replace(/\.[^.]+$/, '');
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
        image = img;
        cacheImagePixels(img);
        URL.revokeObjectURL(url);
        document.getElementById('drop-hint').style.display = 'none';
        wrap.classList.remove('no-image');
        wrap.style.cursor = 'crosshair';
        document.getElementById('tb-image-name').textContent = file.name;
        saveToLocalStorage();
        refreshList();
        fitToWindow();
    };
    img.src = url;
}

function loadAtlasJSON(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            const incoming = data.sprites ?? data;
            recordHistory();
            sprites = {};
            for (const [id, r] of Object.entries(incoming)) {
                if (typeof r.x === 'number') sprites[id] = { x: r.x, y: r.y, w: r.w, h: r.h };
            }
            selectedId = null;
            saveToLocalStorage();
            refreshList();
            refreshSelectedPanel();
            redraw();
        } catch (err) {
            alert('Invalid JSON: ' + err.message);
        }
    };
    reader.readAsText(file);
}

function loadFiles(files) {
    const fileArr = Array.from(files || []);
    const images  = fileArr.filter(f => f.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(f.name));
    const jsons   = fileArr.filter(f => f.name.toLowerCase().endsWith('.json'));

    let imgFile  = images[0] || null;
    let jsonFile = jsons[0]  || null;

    // If multiple files were provided (e.g. from a folder), try to match by base name
    if (images.length > 0 && jsons.length > 0) {
        const baseName = n => n.replace(/\.[^.]+$/, '').toLowerCase();
        for (const j of jsons) {
            const jb = baseName(j.name);
            const matchImg = images.find(i => baseName(i.name) === jb);
            if (matchImg) {
                imgFile  = matchImg;
                jsonFile = j;
                break;
            }
        }
    }

    if (imgFile)  loadImage(imgFile);
    if (jsonFile) loadAtlasJSON(jsonFile);
}

/** Recursively read all files from DataTransferItemList (supports dropped folders). */
async function getFilesFromDataTransfer(dataTransfer) {
    const items = dataTransfer.items;
    if (!items) return Array.from(dataTransfer.files || []);

    const entries = [];
    for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry ? items[i].webkitGetAsEntry() : null;
        if (entry) entries.push(entry);
    }
    if (entries.length === 0) return Array.from(dataTransfer.files || []);

    const files = [];
    async function readEntry(entry) {
        if (entry.isFile) {
            const file = await new Promise(res => entry.file(res, () => res(null)));
            if (file) files.push(file);
        } else if (entry.isDirectory) {
            const reader = entry.createReader();
            let batch;
            do {
                batch = await new Promise(res => reader.readEntries(res, () => res([])));
                for (const child of batch) await readEntry(child);
            } while (batch.length > 0);
        }
    }

    for (const entry of entries) await readEntry(entry);
    return files;
}

function exportJSON() {
    const data = { image: imageName ? imageName + '.png' : '', sprites };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = (imageName || 'atlas') + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
}

// #endregion

// #region ---- INIT / EVENT WIRING ----

// Toolbar buttons
document.getElementById('btn-load-img').addEventListener('click', () =>
    document.getElementById('file-img').click());
document.getElementById('file-img').addEventListener('change', e => {
    loadImage(e.target.files[0]);
    e.target.value = '';
});

document.getElementById('btn-load-json').addEventListener('click', () =>
    document.getElementById('file-json').click());
document.getElementById('file-json').addEventListener('change', e => {
    loadAtlasJSON(e.target.files[0]);
    e.target.value = '';
});

document.getElementById('btn-load-both').addEventListener('click', () =>
    document.getElementById('file-both').click());
document.getElementById('file-both').addEventListener('change', e => {
    loadFiles(e.target.files);
    e.target.value = '';
});

document.getElementById('btn-export').addEventListener('click', exportJSON);
document.getElementById('btn-fit').addEventListener('click', fitToWindow);
document.getElementById('btn-clear').addEventListener('click', () => {
    if (Object.keys(sprites).length && !confirm('Clear all sprites?')) return;
    recordHistory();
    sprites = {}; selectedId = null;
    saveToLocalStorage();
    refreshList(); refreshSelectedPanel(); redraw();
});

document.getElementById('btn-undo').addEventListener('click', undo);
document.getElementById('btn-redo').addEventListener('click', redo);

document.getElementById('btn-zoom-in').addEventListener('click',  () => setZoom(zoom * 1.5));
document.getElementById('btn-zoom-out').addEventListener('click', () => setZoom(zoom / 1.5));

const gridInput = document.getElementById('grid-size');
const snapCheck = document.getElementById('snap-check');
snapGrid = parseInt(gridInput.value) || 1;
gridInput.addEventListener('input', () => { snapGrid = parseInt(gridInput.value) || 1; redraw(); });
snapCheck.addEventListener('change', () => { snapEnabled = snapCheck.checked; redraw(); });

// Selected sprite action buttons
document.getElementById('btn-dup').addEventListener('click', duplicateSelectedSprite);
document.getElementById('btn-trim').addEventListener('click', autoTrimSelected);
document.getElementById('btn-slice-strip').addEventListener('click', sliceStripFromSelected);

// Search input
const searchInput = document.getElementById('sprite-search');
const clearSearchBtn = document.getElementById('btn-clear-search');
searchInput.addEventListener('input', e => {
    searchFilter = e.target.value;
    clearSearchBtn.style.display = searchFilter.length > 0 ? 'block' : 'none';
    refreshList();
});
clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchFilter = '';
    clearSearchBtn.style.display = 'none';
    refreshList();
    searchInput.focus();
});

// Animation controls
document.getElementById('btn-anim-play').addEventListener('click', e => {
    animPlaying = !animPlaying;
    e.target.textContent = animPlaying ? '⏸' : '▶';
});
document.getElementById('anim-fps').addEventListener('input', e => {
    animFps = Math.max(1, Math.min(60, parseInt(e.target.value, 10) || 8));
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
    const inInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);

    if (e.key === 'Alt' && image && !dragging) {
        wrap.style.cursor = 'grab';
        e.preventDefault();
    }

    // Undo / Redo
    if ((e.ctrlKey || e.metaKey) && !inInput) {
        if (e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
        if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) { e.preventDefault(); redo(); return; }
        if (e.key.toLowerCase() === 'd' && selectedId) { e.preventDefault(); duplicateSelectedSprite(); return; }
    }

    // Arrow key nudging / resizing (Shift+Arrow resizes width/height)
    if (!inInput && selectedId && sprites[selectedId] && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
        e.preventDefault();
        recordHistory();
        const step = (snapEnabled && snapGrid > 1) ? snapGrid : 1;
        const r = { ...sprites[selectedId] };
        if (e.shiftKey) {
            if (e.key === 'ArrowLeft')  r.w = Math.max(1, r.w - step);
            if (e.key === 'ArrowRight') r.w += step;
            if (e.key === 'ArrowUp')    r.h = Math.max(1, r.h - step);
            if (e.key === 'ArrowDown')  r.h += step;
        } else {
            if (e.key === 'ArrowLeft')  r.x = Math.max(0, r.x - step);
            if (e.key === 'ArrowRight') r.x += step;
            if (e.key === 'ArrowUp')    r.y = Math.max(0, r.y - step);
            if (e.key === 'ArrowDown')  r.y += step;
        }
        sprites[selectedId] = r;
        saveToLocalStorage();
        refreshSelectedPanel();
        refreshList();
        redraw();
        return;
    }

    if ((e.key === 'Delete' || e.key === 'Backspace') && !inInput && selectedId) {
        deleteSprite(selectedId);
    }
    if (e.key === 'Escape') {
        selectedId = null;
        refreshSelectedPanel();
        refreshList();
        redraw();
    }
});

document.addEventListener('keyup', e => {
    if (e.key === 'Alt') wrap.style.cursor = image ? 'crosshair' : 'default';
});

// New sprite button — renames the last-drawn sprite to the typed name
document.getElementById('btn-add').addEventListener('click', () => {
    const name = document.getElementById('new-name').value.trim();
    if (!name) { document.getElementById('new-name').focus(); return; }
    if (selectedId && sprites[selectedId]) renameSprite(selectedId, name);
});
document.getElementById('new-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-add').click();
});

// Selected panel
document.getElementById('sel-name').addEventListener('change', e =>
    renameSprite(selectedId, e.target.value.trim()));
['sel-x','sel-y','sel-w','sel-h'].forEach(id =>
    document.getElementById(id).addEventListener('change', applySelectedRect));

// Drag & drop image, json, multiple files, or folder onto canvas wrap
wrap.addEventListener('dragover', e => e.preventDefault());
wrap.addEventListener('drop', async e => {
    e.preventDefault();
    const files = await getFilesFromDataTransfer(e.dataTransfer);
    loadFiles(files);
});

// Resize
new ResizeObserver(resizeCanvas).observe(wrap);

// Initial state
loadFromLocalStorage();
updateHistoryButtons();
refreshList();
redraw();
requestAnimationFrame(tickAnimation);

// #endregion
