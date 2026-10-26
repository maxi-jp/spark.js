// =====================================================================
// Sprite Atlas Editor — Interactive sprite-sheet cropping tool
// Standalone; no engine dependency.
// =====================================================================

// #region ---- STATE ----

let image       = null;   // HTMLImageElement
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
let panning      = false;   // middle-mouse panning
let dragStart    = null;    // {ix, iy} image coords
let dragCurrent  = null;    // {ix, iy}
let panStart     = null;    // {mx, my, px, py}
let mouseImg     = {x:0, y:0};   // last mouse pos in image coords

// canvas
const canvas  = document.getElementById('editor-canvas');
const ctx     = canvas.getContext('2d');
const wrap    = document.getElementById('canvas-wrap');

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

        // label
        const fontSize = Math.max(8, Math.min(14, 12 / zoom));
        ctx.font        = `bold ${fontSize}px Arial`;
        ctx.fillStyle   = isSelected ? '#a0c4ff' : 'rgba(255,255,255,0.7)';
        ctx.textBaseline = 'top';
        ctx.fillText(id, r.x + 2 / zoom, r.y + 2 / zoom);
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
        const fSz  = Math.max(8, 11 / zoom);
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
        // Check if clicking on an existing sprite
        const hit = hitTestSprites(ix, iy);
        if (hit && !e.shiftKey) {
            selectSprite(hit);
            return;
        }
        // Start drawing a new rect
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

    if (dragging && dragStart) {
        dragCurrent = clampImg(ix, iy);
        redraw();
    }

    updateCoordBar();
});

wrap.addEventListener('mouseup', e => {
    if (panning) {
        panning = false;
        wrap.style.cursor = image ? 'crosshair' : 'default';
        return;
    }

    if (dragging && dragStart && dragCurrent && image) {
        const r = normaliseRect(dragStart, dragCurrent);
        if (r.w > 1 && r.h > 1) {
            // Propose a name based on existing count
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
    if (panning) {
        panning = false;
        wrap.style.cursor = image ? 'crosshair' : 'default';
    }
});

wrap.addEventListener('wheel', e => {
    e.preventDefault();
    const { mx, my } = wrapPos(e);
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setZoom(zoom * factor, mx, my);
}, { passive: false });

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

function addSprite(name, rect) {
    // If name is taken, append a number
    let finalName = name;
    let n = 2;
    while (sprites[finalName]) finalName = `${name}_${n++}`;
    sprites[finalName] = rect;
    selectSprite(finalName);
    refreshList();
    document.getElementById('new-name').value = '';
}

function selectSprite(id) {
    selectedId = id;
    refreshList();
    refreshSelectedPanel();
    redraw();
}

function deleteSprite(id) {
    delete sprites[id];
    if (selectedId === id) {
        selectedId = null;
        refreshSelectedPanel();
    }
    refreshList();
    redraw();
}

function renameSprite(oldId, newId) {
    if (!newId || newId === oldId) return;
    if (sprites[newId]) { alert(`A sprite named "${newId}" already exists.`); return; }
    const rect = sprites[oldId];
    delete sprites[oldId];
    sprites[newId] = rect;
    selectedId = newId;
    refreshList();
    refreshSelectedPanel();
    redraw();
}

// #endregion

// #region ---- UI REFRESH ----

function refreshList() {
    const list  = document.getElementById('sprite-list-wrap');
    const ids   = Object.keys(sprites);

    if (ids.length === 0) {
        list.innerHTML = '<p class="empty-msg">No sprites yet — drag to define one.</p>';
        return;
    }

    list.innerHTML = ids.map(id => {
        const r = sprites[id];
        const active = id === selectedId ? ' active' : '';
        return `<div class="sprite-item${active}" data-id="${escHtml(id)}">
          <span class="si-name" title="${escHtml(id)}">${escHtml(id)}</span>
          <span class="si-size">${r.w}×${r.h}</span>
          <button class="si-del" title="Delete" data-del="${escHtml(id)}">✕</button>
        </div>`;
    }).join('');

    list.querySelectorAll('.sprite-item').forEach(el => {
        el.addEventListener('click', e => {
            if (e.target.dataset.del) { deleteSprite(e.target.dataset.del); return; }
            selectSprite(el.dataset.id);
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
    const x = parseInt(document.getElementById('sel-x').value) || 0;
    const y = parseInt(document.getElementById('sel-y').value) || 0;
    const w = Math.max(1, parseInt(document.getElementById('sel-w').value) || 1);
    const h = Math.max(1, parseInt(document.getElementById('sel-h').value) || 1);
    sprites[selectedId] = { x, y, w, h };
    refreshList();
    redraw();
}

function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
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
        URL.revokeObjectURL(url);
        document.getElementById('drop-hint').style.display = 'none';
        wrap.classList.remove('no-image');
        wrap.style.cursor = 'crosshair';
        document.getElementById('tb-image-name').textContent = file.name;
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
            sprites = {};
            for (const [id, r] of Object.entries(incoming)) {
                if (typeof r.x === 'number') sprites[id] = { x: r.x, y: r.y, w: r.w, h: r.h };
            }
            selectedId = null;
            refreshList();
            refreshSelectedPanel();
            redraw();
        } catch (err) {
            alert('Invalid JSON: ' + err.message);
        }
    };
    reader.readAsText(file);
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
document.getElementById('file-img').addEventListener('change', e => loadImage(e.target.files[0]));

document.getElementById('btn-load-json').addEventListener('click', () =>
    document.getElementById('file-json').click());
document.getElementById('file-json').addEventListener('change', e => loadAtlasJSON(e.target.files[0]));

document.getElementById('btn-export').addEventListener('click', exportJSON);
document.getElementById('btn-fit').addEventListener('click', fitToWindow);
document.getElementById('btn-clear').addEventListener('click', () => {
    if (Object.keys(sprites).length && !confirm('Clear all sprites?')) return;
    sprites = {}; selectedId = null;
    refreshList(); refreshSelectedPanel(); redraw();
});

document.getElementById('btn-zoom-in').addEventListener('click',  () => setZoom(zoom * 1.5));
document.getElementById('btn-zoom-out').addEventListener('click', () => setZoom(zoom / 1.5));

const gridInput = document.getElementById('grid-size');
const snapCheck = document.getElementById('snap-check');
snapGrid = parseInt(gridInput.value) || 1;
gridInput.addEventListener('input', () => { snapGrid = parseInt(gridInput.value) || 1; redraw(); });
snapCheck.addEventListener('change', () => { snapEnabled = snapCheck.checked; redraw(); });

// Alt key → show grab cursor so the pan affordance is obvious
document.addEventListener('keydown', e => {
    if (e.key === 'Alt' && image && !dragging) {
        wrap.style.cursor = 'grab';
        e.preventDefault(); // prevent browser menu-bar activation on some OSes
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') &&
        document.activeElement === document.body && selectedId) {
        deleteSprite(selectedId);
    }
    if (e.key === 'Escape') { selectedId = null; refreshSelectedPanel(); refreshList(); redraw(); }
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

// Drag & drop image onto canvas wrap
wrap.addEventListener('dragover', e => e.preventDefault());
wrap.addEventListener('drop', e => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) loadImage(file);
    else if (file?.name.endsWith('.json')) loadAtlasJSON(file);
});

// Resize
new ResizeObserver(resizeCanvas).observe(wrap);

// Initial state
refreshList();
redraw();

// #endregion
