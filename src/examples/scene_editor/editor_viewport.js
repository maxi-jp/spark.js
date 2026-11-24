// =====================================================================
// spark.js Scene Editor — Interactive 2D Viewport & Transform Gizmos
// Uses Canvas2DRenderer for 1:1 engine rendering + #gizmo-canvas overlay
// =====================================================================

const EditorViewport = {
    sceneCanvas: null,
    gizmoCanvas: null,
    gizmoCtx: null,
    wrap: null,
    coordBar: null,
    engineRenderer: null,

    /** Live ParticleSystem instances keyed by entity.id for Edit Mode preview */
    _particlePreviews: new Map(),
    /** Cached Tileset instances keyed by entity.id */
    _tilesetPreviews: new Map(),

    /** Interaction state */
    _panning: false,
    _panStart: null,
    _dragging: false,
    _dragMode: null, // 'move' | 'move-x' | 'move-y' | 'rotate' | 'scale' | 'marquee'
    _dragStartWorld: null,
    _dragOriginals: null,
    _marqueeCurrent: null,
    _spaceHeld: false,
    _lastTime: 0,
    _rafId: -1,

    ZOOM_PRESETS: [0.2, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6],

    Init() {
        this.sceneCanvas = document.getElementById('scene-canvas');
        this.gizmoCanvas = document.getElementById('gizmo-canvas');
        this.gizmoCtx    = this.gizmoCanvas.getContext('2d');
        this.wrap        = document.getElementById('viewport-wrap');
        this.coordBar    = document.getElementById('coord-bar');

        this.engineRenderer = new Canvas2DRenderer(this.sceneCanvas);

        this._bindEvents();
        this.Resize();
        window.addEventListener('resize', () => this.Resize());

        this._lastTime = performance.now();
        const tick = (now) => {
            const dt = Math.min(0.05, (now - this._lastTime) / 1000);
            this._lastTime = now;
            if (EditorState.playState === 'edit') {
                this._updatePreviews(dt);
                this.Render();
            }
            this._rafId = requestAnimationFrame(tick);
        };
        this._rafId = requestAnimationFrame(tick);
    },

    Resize() {
        if (!this.wrap) return;
        const rect = this.wrap.getBoundingClientRect();
        const w = Math.max(1, Math.floor(rect.width));
        const h = Math.max(1, Math.floor(rect.height));

        if (this.sceneCanvas.width !== w || this.sceneCanvas.height !== h) {
            this.sceneCanvas.width  = w;
            this.sceneCanvas.height = h;
            this.gizmoCanvas.width  = w;
            this.gizmoCanvas.height = h;
            if (this.engineRenderer) {
                this.engineRenderer._width = w;
                this.engineRenderer._height = h;
                this.engineRenderer._halfWidth = w / 2;
                this.engineRenderer._halfHeight = h / 2;
            }
        }
    },

    ScreenToWorld(sx, sy) {
        return {
            x: (sx - EditorState.panX) / EditorState.zoom,
            y: (sy - EditorState.panY) / EditorState.zoom
        };
    },

    WorldToScreen(wx, wy) {
        return {
            x: wx * EditorState.zoom + EditorState.panX,
            y: wy * EditorState.zoom + EditorState.panY
        };
    },

    SetZoom(newZoom, anchorScreenX = null, anchorScreenY = null) {
        const clamped = Math.max(0.15, Math.min(8, newZoom));
        const ax = anchorScreenX ?? (this.gizmoCanvas.width / 2);
        const ay = anchorScreenY ?? (this.gizmoCanvas.height / 2);
        const before = this.ScreenToWorld(ax, ay);
        EditorState.zoom = clamped;
        EditorState.panX = ax - before.x * clamped;
        EditorState.panY = ay - before.y * clamped;
        const lbl = document.getElementById('zoom-display');
        if (lbl) lbl.textContent = `${Math.round(clamped * 100)}%`;
    },

    ZoomStep(dir) {
        const cur = EditorState.zoom;
        if (dir > 0) {
            for (const z of this.ZOOM_PRESETS) {
                if (z > cur + 0.01) { this.SetZoom(z); return; }
            }
        }
        else {
            for (let i = this.ZOOM_PRESETS.length - 1; i >= 0; i--) {
                if (this.ZOOM_PRESETS[i] < cur - 0.01) { this.SetZoom(this.ZOOM_PRESETS[i]); return; }
            }
        }
    },

    FitToScene() {
        const cfg = EditorState.scene?.config || { screenWidth: 800, screenHeight: 600 };
        const w = cfg.screenWidth || 800;
        const h = cfg.screenHeight || 600;
        const pad = 60;
        const vw = Math.max(100, this.gizmoCanvas.width - pad * 2);
        const vh = Math.max(100, this.gizmoCanvas.height - pad * 2);
        const z = Math.min(2, Math.max(0.25, Math.min(vw / w, vh / h)));
        EditorState.zoom = z;
        const camX = EditorState.scene?.camera?.x || 0;
        const camY = EditorState.scene?.camera?.y || 0;
        EditorState.panX = (this.gizmoCanvas.width  - w * z) / 2 - camX * z;
        EditorState.panY = (this.gizmoCanvas.height - h * z) / 2 - camY * z;
        const lbl = document.getElementById('zoom-display');
        if (lbl) lbl.textContent = `${Math.round(z * 100)}%`;
    },

    FocusEntity(ent) {
        if (!ent) { this.FitToScene(); return; }
        EditorState.panX = this.gizmoCanvas.width  / 2 - ent.transform.x * EditorState.zoom;
        EditorState.panY = this.gizmoCanvas.height / 2 - ent.transform.y * EditorState.zoom;
    },

    InvalidatePreviews() {
        this._particlePreviews.clear();
        this._tilesetPreviews.clear();
    },

    // ── Bounding Box & Picking ───────────────────────────────

    GetEntitySize(ent) {
        const p = ent.props || {};
        const sx = Math.abs(ent.transform.scaleX ?? 1);
        const sy = Math.abs(ent.transform.scaleY ?? 1);

        switch (ent.type) {
            case 'RectangleGO':
            case 'Box2DRectangleGO':
            case 'Box2DTrigger':
                return { w: (p.width || 64) * sx, h: (p.height || 64) * sy, topLeft: false };
            case 'CircleGO': {
                const d = (p.radius || 32) * 2;
                return { w: d * sx, h: d * sy, topLeft: false };
            }
            case 'SpriteObject':
            case 'Box2DSpriteObject': {
                const img = EditorState.runtimeAssets.images[p.imageKey]?.img;
                const w = img ? img.width : 48;
                const h = img ? img.height : 48;
                return { w: w * sx, h: h * sy, topLeft: false };
            }
            case 'SpriteSectionObject': {
                const entry = EditorState.runtimeAssets.images[p.imageKey];
                let w = p.sectionW || 32, h = p.sectionH || 32;
                if (p.atlasFrame && entry?.atlas) {
                    const r = new SpriteAtlas(entry.atlas).get(p.atlasFrame);
                    if (r) { w = r.w; h = r.h; }
                }
                return { w: w * sx, h: h * sy, topLeft: false };
            }
            case 'SSAnimationObjectBasic':
                return { w: (p.frameWidth || 32) * sx, h: (p.frameHeight || 32) * sy, topLeft: false };
            case 'Tileset': {
                const ts = EditorState.runtimeAssets.tilesets[p.tilesetKey]?.data;
                if (ts) {
                    const parsed = Tileset.Parse(ts, null);
                    return {
                        w: Math.max(32, parsed.width * parsed.tileWidth * sx),
                        h: Math.max(32, parsed.height * parsed.tileHeight * sy),
                        topLeft: true
                    };
                }
                return { w: 128, h: 128, topLeft: true };
            }
            case 'TextGO': {
                const txt = p.text || 'Text';
                return { w: Math.max(40, txt.length * 10), h: 26, topLeft: false };
            }
            case 'ParticleSystemGO':
            case 'GameObject':
            default:
                return { w: 32, h: 32, topLeft: false };
        }
    },

    GetEntityBounds(ent) {
        const sz = this.GetEntitySize(ent);
        const cx = sz.topLeft ? ent.transform.x + sz.w / 2 : ent.transform.x;
        const cy = sz.topLeft ? ent.transform.y + sz.h / 2 : ent.transform.y;
        return {
            cx, cy,
            x: cx - sz.w / 2,
            y: cy - sz.h / 2,
            w: sz.w,
            h: sz.h
        };
    },

    HitTestEntity(wx, wy) {
        const entities = EditorState.scene?.entities || [];
        // Sort descending by zIndex (top-most drawn picked first)
        const sorted = entities.slice().sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
        for (const ent of sorted) {
            if (ent.active === false || EditorState.lockedIds.has(ent.id)) continue;
            const b = this.GetEntityBounds(ent);
            // Transform point into local unrotated space around (cx, cy)
            const rot = -(ent.transform.rotation || 0);
            const dx = wx - b.cx;
            const dy = wy - b.cy;
            const lx = dx * Math.cos(rot) - dy * Math.sin(rot);
            const ly = dx * Math.sin(rot) + dy * Math.cos(rot);
            const hw = Math.max(10, b.w / 2);
            const hh = Math.max(10, b.h / 2);
            if (Math.abs(lx) <= hw && Math.abs(ly) <= hh) {
                return ent;
            }
        }
        return null;
    },

    _hitTestGizmo(sx, sy) {
        const ent = EditorState.GetPrimarySelected();
        if (!ent || EditorState.lockedIds.has(ent.id)) return null;
        const b = this.GetEntityBounds(ent);
        const center = this.WorldToScreen(b.cx, b.cy);
        const dx = sx - center.x;
        const dy = sy - center.y;
        const dist = Math.hypot(dx, dy);

        if (EditorState.activeTool === 'move') {
            // X arrow handle (right, ~56px)
            if (dx >= 12 && dx <= 64 && Math.abs(dy) <= 10) return 'move-x';
            // Y arrow handle (down, ~56px)
            if (dy >= 12 && dy <= 64 && Math.abs(dx) <= 10) return 'move-y';
        }
        else if (EditorState.activeTool === 'rotate') {
            if (Math.abs(dist - 48) <= 10) return 'rotate';
        }
        else if (EditorState.activeTool === 'scale') {
            // Corner handle at (+46, +46)
            if (Math.hypot(dx - 46, dy - 46) <= 12) return 'scale';
        }
        return null;
    },

    // ── Live Edit-Mode Previews ──────────────────────────────

    _updatePreviews(dt) {
        if (!EditorState.liveParticles || !EditorState.scene) return;
        const activeIds = new Set();

        for (const ent of EditorState.scene.entities) {
            if (ent.type !== 'ParticleSystemGO' || ent.active === false) continue;
            activeIds.add(ent.id);

            const p = ent.props || {};
            const baseCfg = p.particleKey ? (EditorState.runtimeAssets.particles[p.particleKey]?.data || {}) : {};
            const cfg = Object.assign({}, baseCfg, p.config || {});
            const sig = JSON.stringify(cfg) + '|' + (p.imageKey || '');
            let entry = this._particlePreviews.get(ent.id);

            if (!entry || entry.sig !== sig) {
                const img = p.imageKey ? (EditorState.runtimeAssets.images[p.imageKey]?.img || null) : null;
                const ps = new ParticleSystem(img, cfg, new Vector2(ent.transform.x, ent.transform.y));
                ps.SetRotation(ent.transform.rotation || 0);
                entry = { ps, sig };
                this._particlePreviews.set(ent.id, entry);
            }

            entry.ps.SetPosition(ent.transform.x, ent.transform.y);
            entry.ps.SetRotation(ent.transform.rotation || 0);
            entry.ps.active = p.emitting !== false;
            entry.ps.Update(dt);
        }

        for (const key of this._particlePreviews.keys()) {
            if (!activeIds.has(key)) this._particlePreviews.delete(key);
        }
    },

    // ── Rendering (Scene Canvas + Gizmo Overlay) ─────────────

    Render() {
        if (!EditorState.scene || !this.engineRenderer) return;
        const r = this.engineRenderer;
        const ctx = r.ctx;
        const w = this.sceneCanvas.width;
        const h = this.sceneCanvas.height;

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#121216';
        ctx.fillRect(0, 0, w, h);

        // Apply editor pan + zoom transform
        ctx.translate(EditorState.panX, EditorState.panY);
        ctx.scale(EditorState.zoom, EditorState.zoom);
        r.imageSmoothingEnabled = EditorState.scene.config?.imageSmoothingEnabled !== false;

        // Draw Game Camera background fill
        const cfg = EditorState.scene.config || { screenWidth: 800, screenHeight: 600 };
        const camX = EditorState.scene.camera?.x || 0;
        const camY = EditorState.scene.camera?.y || 0;
        const bgCol = SceneLoader.ParseColor(EditorState.scene.meta?.backgroundColor, Color.FromHex('#1a1a2e'));
        r.DrawFillBasicRectangle(camX, camY, cfg.screenWidth || 800, cfg.screenHeight || 600, bgCol);

        // Draw BackgroundLayers preview
        this._drawBackgroundLayersPreview(r, camX, camY, cfg.screenWidth || 800, cfg.screenHeight || 600);

        // Draw Entities sorted by zIndex
        const sorted = EditorState.scene.entities.slice().sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
        for (const ent of sorted) {
            if (ent.active === false) continue;
            this._drawEntityPreview(r, ent);
        }

        ctx.restore();

        // Draw crisp screen-space gizmos on overlay canvas
        this._drawGizmos();
    },

    _drawBackgroundLayersPreview(r, camX, camY, sw, sh) {
        const layers = EditorState.scene.backgroundLayers;
        if (!Array.isArray(layers)) return;
        for (const layer of layers) {
            if (!layer || layer.visible === false) continue;
            if (layer.type === 'StaticColorLayer') {
                r.DrawFillBasicRectangle(camX, camY, sw, sh, SceneLoader.ParseColor(layer.color, Color.black));
            }
            else if (layer.type === 'StaticGradientLayer') {
                const stops = (layer.colorStops || [[0, '#14192b'], [1, '#1f2940']]).map(s => [s[0], SceneLoader.ParseColor(s[1])]);
                const grad = new LinearGradient(r, new Vector2(layer.dirX ?? 0, layer.dirY ?? 1), stops);
                r.DrawGradientRectangle(camX, camY, sw, sh, grad);
            }
            else if (layer.type === 'ColorRectangleLayer') {
                r.DrawFillBasicRectangle(layer.x || 0, layer.y || 0, layer.width || sw, layer.height || sh, SceneLoader.ParseColor(layer.color, Color.grey));
            }
            else if (layer.type === 'SpriteBackgroundLayer') {
                const img = EditorState.runtimeAssets.images[layer.imageKey]?.img;
                if (img) {
                    r.DrawImageBasic(img, layer.x || 0, layer.y || 0, img.width * (layer.scale ?? 1), img.height * (layer.scale ?? 1), 1);
                }
            }
        }
    },

    _drawEntityPreview(r, ent) {
        const t = ent.transform;
        const p = ent.props || {};
        const sx = (t.scaleX ?? 1) * (p.flipX ? -1 : 1);
        const sy = (t.scaleY ?? 1) * (p.flipY ? -1 : 1);
        const pivot = { x: t.pivotX || 0, y: t.pivotY || 0 };

        switch (ent.type) {
            case 'RectangleGO':
            case 'Box2DRectangleGO':
                r.DrawRectangle(t.x, t.y, (p.width || 64) * Math.abs(t.scaleX ?? 1), (p.height || 64) * Math.abs(t.scaleY ?? 1), SceneLoader.ParseColor(p.color, Color.red), Boolean(p.stroke), p.lineWidth || 1, t.rotation || 0, pivot);
                break;

            case 'Box2DTrigger':
                r.DrawRectangle(t.x, t.y, (p.width || 96) * Math.abs(t.scaleX ?? 1), (p.height || 48) * Math.abs(t.scaleY ?? 1), new Color(1, 0.85, 0.2, 0.22), false, 1, t.rotation || 0, pivot);
                r.DrawStrokeRectangle(t.x, t.y, (p.width || 96) * Math.abs(t.scaleX ?? 1), (p.height || 48) * Math.abs(t.scaleY ?? 1), Color.yellow, 2, t.rotation || 0, pivot);
                break;

            case 'CircleGO':
                r.DrawCircle(t.x, t.y, (p.radius || 32) * Math.abs(t.scaleX ?? 1), SceneLoader.ParseColor(p.color, Color.blue), Boolean(p.stroke), p.lineWidth || 1);
                break;

            case 'SpriteObject':
            case 'Box2DSpriteObject': {
                const img = EditorState.runtimeAssets.images[p.imageKey]?.img;
                if (img) {
                    r.DrawImage(img, t.x, t.y, sx, sy, t.rotation || 0, pivot, p.alpha ?? 1);
                }
                else {
                    r.DrawStrokeRectangle(t.x, t.y, 48, 48, Color.pink, 2, t.rotation || 0, pivot);
                    r.DrawFillText('IMG?', t.x, t.y, '10px monospace', Color.pink, 'center', 'middle');
                }
                break;
            }

            case 'SpriteSectionObject': {
                const entry = EditorState.runtimeAssets.images[p.imageKey];
                const img = entry?.img;
                if (img) {
                    let rect = { x: p.sectionX || 0, y: p.sectionY || 0, w: p.sectionW || 32, h: p.sectionH || 32 };
                    if (p.atlasFrame && entry.atlas) {
                        const found = new SpriteAtlas(entry.atlas).get(p.atlasFrame);
                        if (found) rect = found;
                    }
                    r.DrawImageSection(img, t.x, t.y, rect.x, rect.y, rect.w, rect.h, sx, sy, t.rotation || 0, pivot, p.alpha ?? 1);
                }
                else {
                    r.DrawStrokeRectangle(t.x, t.y, 40, 40, Color.pink, 2, t.rotation || 0, pivot);
                }
                break;
            }

            case 'SSAnimationObjectBasic': {
                const img = EditorState.runtimeAssets.images[p.imageKey]?.img;
                const fw = p.frameWidth || 32, fh = p.frameHeight || 32;
                if (img) {
                    r.DrawImageSection(img, t.x, t.y, 0, (p.initialAnimation || 0) * fh, fw, fh, sx, sy, t.rotation || 0, pivot, 1);
                }
                else {
                    r.DrawStrokeRectangle(t.x, t.y, fw, fh, Color.orange, 2, t.rotation || 0, pivot);
                }
                break;
            }

            case 'Tileset': {
                const img = EditorState.runtimeAssets.images[p.imageKey]?.img;
                const tsData = EditorState.runtimeAssets.tilesets[p.tilesetKey]?.data;
                if (img && tsData) {
                    const sig = `${p.imageKey}|${p.tilesetKey}|${t.x}|${t.y}|${t.scaleX}|${t.scaleY}`;
                    let cached = this._tilesetPreviews.get(ent.id);
                    if (!cached || cached.sig !== sig) {
                        cached = { ts: Tileset.FromData(img, new Vector2(t.x, t.y), new Vector2(t.scaleX ?? 1, t.scaleY ?? 1), tsData), sig };
                        this._tilesetPreviews.set(ent.id, cached);
                    }
                    cached.ts.Draw(r);
                }
                else {
                    r.DrawStrokeBasicRectangle(t.x, t.y, 128, 128, Color.aqua, 2);
                    r.DrawFillText('Tileset', t.x + 64, t.y + 64, '12px monospace', Color.aqua, 'center', 'middle');
                }
                break;
            }

            case 'ParticleSystemGO': {
                const preview = this._particlePreviews.get(ent.id);
                if (preview && EditorState.liveParticles) {
                    preview.ps.Draw(r);
                }
                break;
            }

            case 'TextGO':
                r.DrawText(p.text || 'Text', t.x, t.y, p.font || '20px Arial', SceneLoader.ParseColor(p.color, Color.white), p.align || 'center', p.baseline || 'middle', Boolean(p.stroke), p.lineWidth || 1);
                break;
        }
    },

    _drawGizmos() {
        const ctx = this.gizmoCtx;
        const w = this.gizmoCanvas.width;
        const h = this.gizmoCanvas.height;
        ctx.clearRect(0, 0, w, h);

        const z = EditorState.zoom;

        // 1. World Grid
        if (EditorState.showGrid) {
            const step = Math.max(4, EditorState.gridSize || 32);
            const screenStep = step * z;
            if (screenStep >= 6) {
                const startX = ((EditorState.panX % screenStep) + screenStep) % screenStep;
                const startY = ((EditorState.panY % screenStep) + screenStep) % screenStep;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.055)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                for (let x = startX; x < w; x += screenStep) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
                for (let y = startY; y < h; y += screenStep) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
                ctx.stroke();
            }

            // World origin axes (0, 0)
            ctx.strokeStyle = 'rgba(255, 100, 100, 0.32)';
            ctx.beginPath(); ctx.moveTo(0, EditorState.panY); ctx.lineTo(w, EditorState.panY); ctx.stroke();
            ctx.strokeStyle = 'rgba(100, 255, 130, 0.32)';
            ctx.beginPath(); ctx.moveTo(EditorState.panX, 0); ctx.lineTo(EditorState.panX, h); ctx.stroke();
        }

        // 2. Game Camera Viewport Frame
        const cfg = EditorState.scene.config || { screenWidth: 800, screenHeight: 600 };
        const cam = EditorState.scene.camera || { x: 0, y: 0 };
        const tl = this.WorldToScreen(cam.x || 0, cam.y || 0);
        const camW = (cfg.screenWidth || 800) * z;
        const camH = (cfg.screenHeight || 600) * z;

        ctx.save();
        ctx.strokeStyle = 'rgba(91, 140, 255, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(tl.x, tl.y, camW, camH);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(91, 140, 255, 0.9)';
        ctx.font = '11px monospace';
        ctx.fillText(`📷 Camera (${cfg.screenWidth}×${cfg.screenHeight})`, tl.x + 6, tl.y - 6);
        ctx.restore();

        // 3. Entity Marker Icons, Colliders & Selection Boxes
        for (const ent of EditorState.scene.entities) {
            if (ent.active === false) continue;
            const b = this.GetEntityBounds(ent);
            const sc = this.WorldToScreen(b.cx, b.cy);

            // Empty / ParticleSystem marker
            if (ent.type === 'GameObject' || ent.type === 'ParticleSystemGO') {
                ctx.save();
                ctx.strokeStyle = ent.type === 'ParticleSystemGO' ? '#ffaa33' : '#88aaff';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(sc.x, sc.y, 9, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = ctx.strokeStyle;
                ctx.font = '11px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(ent.type === 'ParticleSystemGO' ? '✨' : '❖', sc.x, sc.y);
                ctx.restore();
            }

            // Collider / Box2D debug overlay
            if (EditorState.showColliders) {
                const col = ent.collider;
                if (col && col.type && col.type !== 'None') {
                    const colPos = this.WorldToScreen(ent.transform.x + (col.offsetX || 0), ent.transform.y + (col.offsetY || 0));
                    ctx.save();
                    ctx.strokeStyle = 'rgba(76, 220, 120, 0.85)';
                    ctx.fillStyle = 'rgba(76, 220, 120, 0.12)';
                    ctx.lineWidth = 1.5;
                    if (col.type === 'RectangleCollider') {
                        const rw = (col.width || 32) * z;
                        const rh = (col.height || 32) * z;
                        ctx.fillRect(colPos.x - rw / 2, colPos.y - rh / 2, rw, rh);
                        ctx.strokeRect(colPos.x - rw / 2, colPos.y - rh / 2, rw, rh);
                    }
                    else if (col.type === 'CircleCollider') {
                        const rad = (col.radius || 24) * z;
                        ctx.beginPath(); ctx.arc(colPos.x, colPos.y, rad, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                    }
                    ctx.restore();
                }

                const pb = ent.physicsBody;
                if (pb && pb.enabled) {
                    const pPos = this.WorldToScreen(ent.transform.x + (pb.offsetX || 0), ent.transform.y + (pb.offsetY || 0));
                    ctx.save();
                    ctx.translate(pPos.x, pPos.y);
                    ctx.rotate(ent.transform.rotation || 0);
                    ctx.strokeStyle = pb.isSensor ? '#ffd54f' : (pb.bodyType === 'static' ? '#66bb6a' : '#ff9800');
                    ctx.lineWidth = 1.5;
                    ctx.setLineDash([4, 3]);
                    if (pb.shape === 'Circle') {
                        ctx.beginPath(); ctx.arc(0, 0, (pb.radiusPx || 32) * z, 0, Math.PI * 2); ctx.stroke();
                    }
                    else {
                        const bw = (pb.widthPx || 64) * z;
                        const bh = (pb.heightPx || 64) * z;
                        ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
                    }
                    ctx.restore();
                }
            }

            // Selection Highlight
            if (EditorState.selectedIds.has(ent.id)) {
                ctx.save();
                ctx.translate(sc.x, sc.y);
                ctx.rotate(ent.transform.rotation || 0);
                const sw = Math.max(16, b.w * z);
                const sh = Math.max(16, b.h * z);
                ctx.strokeStyle = '#5b8cff';
                ctx.lineWidth = 2;
                ctx.strokeRect(-sw / 2, -sh / 2, sw, sh);
                ctx.restore();
            }
        }

        // 4. Active Transform Gizmo on Primary Selected Entity
        const primary = EditorState.GetPrimarySelected();
        if (primary && !EditorState.lockedIds.has(primary.id)) {
            const b = this.GetEntityBounds(primary);
            const c = this.WorldToScreen(b.cx, b.cy);

            ctx.save();
            if (EditorState.activeTool === 'move') {
                // X axis (red)
                ctx.strokeStyle = '#ff5252'; ctx.fillStyle = '#ff5252'; ctx.lineWidth = 2.5;
                ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + 54, c.y); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(c.x + 62, c.y); ctx.lineTo(c.x + 50, c.y - 6); ctx.lineTo(c.x + 50, c.y + 6); ctx.closePath(); ctx.fill();
                // Y axis (green)
                ctx.strokeStyle = '#69f0ae'; ctx.fillStyle = '#69f0ae'; ctx.lineWidth = 2.5;
                ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x, c.y + 54); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(c.x, c.y + 62); ctx.lineTo(c.x - 6, c.y + 50); ctx.lineTo(c.x + 6, c.y + 50); ctx.closePath(); ctx.fill();
                // Center pivot handle
                ctx.fillStyle = '#fff'; ctx.strokeStyle = '#5b8cff'; ctx.lineWidth = 2;
                ctx.fillRect(c.x - 5, c.y - 5, 10, 10); ctx.strokeRect(c.x - 5, c.y - 5, 10, 10);
            }
            else if (EditorState.activeTool === 'rotate') {
                ctx.strokeStyle = '#ffca28'; ctx.lineWidth = 2.2;
                ctx.beginPath(); ctx.arc(c.x, c.y, 48, 0, Math.PI * 2); ctx.stroke();
                const ang = primary.transform.rotation || 0;
                const hx = c.x + Math.cos(ang) * 48;
                const hy = c.y + Math.sin(ang) * 48;
                ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(hx, hy); ctx.stroke();
                ctx.fillStyle = '#ffca28';
                ctx.beginPath(); ctx.arc(hx, hy, 6, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.font = '11px monospace';
                ctx.fillText(`${Math.round(ang * 180 / Math.PI)}°`, hx + 10, hy - 6);
            }
            else if (EditorState.activeTool === 'scale') {
                ctx.strokeStyle = '#40c4ff'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + 46, c.y + 46); ctx.stroke();
                ctx.fillStyle = '#40c4ff';
                ctx.fillRect(c.x + 40, c.y + 40, 12, 12);
            }
            ctx.restore();
        }

        // 5. Marquee Selection Box
        if (this._dragging && this._dragMode === 'marquee' && this._dragStartWorld && this._marqueeCurrent) {
            const p1 = this.WorldToScreen(this._dragStartWorld.x, this._dragStartWorld.y);
            const p2 = this.WorldToScreen(this._marqueeCurrent.x, this._marqueeCurrent.y);
            ctx.save();
            ctx.fillStyle = 'rgba(91, 140, 255, 0.16)';
            ctx.strokeStyle = '#5b8cff';
            ctx.lineWidth = 1;
            ctx.fillRect(Math.min(p1.x, p2.x), Math.min(p1.y, p2.y), Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
            ctx.strokeRect(Math.min(p1.x, p2.x), Math.min(p1.y, p2.y), Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
            ctx.restore();
        }
    },

    // ── Pointer & Drag-Drop Events ───────────────────────────

    _bindEvents() {
        const c = this.gizmoCanvas;

        c.addEventListener('mousedown', (e) => {
            if (EditorState.playState !== 'edit') return;
            const rect = c.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            const world = this.ScreenToWorld(sx, sy);

            // Middle mouse or Alt/Space + left click => pan
            if (e.button === 1 || (e.button === 0 && (e.altKey || this._spaceHeld))) {
                this._panning = true;
                this._panStart = { sx, sy, panX: EditorState.panX, panY: EditorState.panY };
                c.style.cursor = 'grabbing';
                return;
            }

            if (e.button !== 0) return;

            // Check gizmo handle hit first
            const gizmoHit = this._hitTestGizmo(sx, sy);
            if (gizmoHit) {
                this._startTransformDrag(gizmoHit, world);
                return;
            }

            // Hit-test entities
            const hit = this.HitTestEntity(world.x, world.y);
            if (hit) {
                if (!EditorState.selectedIds.has(hit.id)) {
                    EditorState.SelectEntity(hit.id, e.shiftKey);
                }
                else if (e.shiftKey) {
                    EditorState.SelectEntity(hit.id, true);
                    return;
                }
                this._startTransformDrag('move', world);
            }
            else {
                if (!e.shiftKey) EditorState.SelectEntity(null, false);
                this._dragging = true;
                this._dragMode = 'marquee';
                this._dragStartWorld = world;
                this._marqueeCurrent = world;
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (EditorState.playState !== 'edit') return;
            const rect = c.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            const world = this.ScreenToWorld(sx, sy);

            if (sx >= 0 && sy >= 0 && sx <= rect.width && sy <= rect.height) {
                this.coordBar.textContent = `x: ${Math.round(world.x)}, y: ${Math.round(world.y)}  |  zoom: ${Math.round(EditorState.zoom * 100)}%`;
            }

            if (this._panning && this._panStart) {
                EditorState.panX = this._panStart.panX + (sx - this._panStart.sx);
                EditorState.panY = this._panStart.panY + (sy - this._panStart.sy);
                return;
            }

            if (this._dragging) {
                if (this._dragMode === 'marquee') {
                    this._marqueeCurrent = world;
                    return;
                }
                this._applyTransformDrag(world, e.shiftKey);
            }
        });

        window.addEventListener('mouseup', () => {
            if (this._panning) {
                this._panning = false;
                this._panStart = null;
                c.style.cursor = 'default';
            }
            if (this._dragging) {
                if (this._dragMode === 'marquee' && this._dragStartWorld && this._marqueeCurrent) {
                    const x1 = Math.min(this._dragStartWorld.x, this._marqueeCurrent.x);
                    const y1 = Math.min(this._dragStartWorld.y, this._marqueeCurrent.y);
                    const x2 = Math.max(this._dragStartWorld.x, this._marqueeCurrent.x);
                    const y2 = Math.max(this._dragStartWorld.y, this._marqueeCurrent.y);
                    if (Math.hypot(x2 - x1, y2 - y1) > 4) {
                        for (const ent of EditorState.scene.entities) {
                            if (ent.active === false || EditorState.lockedIds.has(ent.id)) continue;
                            const b = this.GetEntityBounds(ent);
                            if (b.cx >= x1 && b.cx <= x2 && b.cy >= y1 && b.cy <= y2) {
                                EditorState.selectedIds.add(ent.id);
                            }
                        }
                        EditorState.Emit('selection');
                    }
                }
                else {
                    EditorState.CommitTransaction();
                    EditorState.Emit('transform');
                }
                this._dragging = false;
                this._dragMode = null;
                this._dragOriginals = null;
            }
        });

        c.addEventListener('wheel', (e) => {
            if (EditorState.playState !== 'edit') return;
            e.preventDefault();
            const rect = c.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            const factor = e.deltaY < 0 ? 1.12 : (1 / 1.12);
            this.SetZoom(EditorState.zoom * factor, sx, sy);
        }, { passive: false });

        // Drag-and-drop Assets or Prefabs onto Viewport
        this.wrap.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        this.wrap.addEventListener('drop', (e) => {
            e.preventDefault();
            if (EditorState.playState !== 'edit') return;
            const rect = c.getBoundingClientRect();
            const world = this.ScreenToWorld(e.clientX - rect.left, e.clientY - rect.top);
            const snap = (v) => EditorState.snapEnabled ? Math.round(v / EditorState.gridSize) * EditorState.gridSize : Math.round(v);
            const wx = snap(world.x);
            const wy = snap(world.y);

            const payload = e.dataTransfer.getData('application/x-spark-item');
            if (payload) {
                try {
                    const item = JSON.parse(payload);
                    if (item.kind === 'prefab') {
                        EditorState.SpawnPrefabInEditor(item.id, wx, wy);
                    }
                    else if (item.kind === 'image') {
                        const ent = EditorState.CreateDefaultEntity('SpriteObject', wx, wy, { imageKey: item.key });
                        ent.name = item.key;
                        EditorState.AddEntity(ent);
                    }
                    else if (item.kind === 'tileset') {
                        const ent = EditorState.CreateDefaultEntity('Tileset', wx, wy, { tilesetKey: item.key });
                        ent.name = item.key;
                        EditorState.AddEntity(ent);
                    }
                    else if (item.kind === 'particle') {
                        const ent = EditorState.CreateDefaultEntity('ParticleSystemGO', wx, wy, { particleKey: item.key, config: {} });
                        ent.name = item.key;
                        EditorState.AddEntity(ent);
                    }
                } catch (_) {}
            }
        });
    },

    _startTransformDrag(mode, world) {
        EditorState.BeginTransaction();
        this._dragging = true;
        this._dragMode = mode;
        this._dragStartWorld = { x: world.x, y: world.y };
        this._dragOriginals = new Map();
        for (const id of EditorState.selectedIds) {
            const ent = EditorState.GetEntity(id);
            if (ent) {
                this._dragOriginals.set(id, { ...ent.transform });
            }
        }
    },

    _applyTransformDrag(world, shiftHeld) {
        const dx = world.x - this._dragStartWorld.x;
        const dy = world.y - this._dragStartWorld.y;
        const grid = EditorState.gridSize || 32;

        if (this._dragMode === 'move' || this._dragMode === 'move-x' || this._dragMode === 'move-y') {
            for (const [id, orig] of this._dragOriginals.entries()) {
                const ent = EditorState.GetEntity(id);
                if (!ent) continue;
                let nx = this._dragMode === 'move-y' ? orig.x : orig.x + dx;
                let ny = this._dragMode === 'move-x' ? orig.y : orig.y + dy;
                if (EditorState.snapEnabled) {
                    nx = Math.round(nx / grid) * grid;
                    ny = Math.round(ny / grid) * grid;
                }
                else {
                    nx = Math.round(nx);
                    ny = Math.round(ny);
                }
                ent.transform.x = nx;
                ent.transform.y = ny;
            }
        }
        else if (this._dragMode === 'rotate') {
            const primary = EditorState.GetPrimarySelected();
            const orig = primary ? this._dragOriginals.get(primary.id) : null;
            if (primary && orig) {
                let angle = Math.atan2(world.y - orig.y, world.x - orig.x);
                if (shiftHeld) {
                    const step = Math.PI / 12; // 15° snap
                    angle = Math.round(angle / step) * step;
                }
                primary.transform.rotation = Number(angle.toFixed(4));
            }
        }
        else if (this._dragMode === 'scale') {
            const primary = EditorState.GetPrimarySelected();
            const orig = primary ? this._dragOriginals.get(primary.id) : null;
            if (primary && orig) {
                const factorX = Math.max(0.1, Number((orig.scaleX + dx / 80).toFixed(2)));
                const factorY = shiftHeld ? factorX : Math.max(0.1, Number((orig.scaleY + dy / 80).toFixed(2)));
                primary.transform.scaleX = factorX;
                primary.transform.scaleY = factorY;
            }
        }

        EditorInspector.SyncQuickTransform();
    }
};
