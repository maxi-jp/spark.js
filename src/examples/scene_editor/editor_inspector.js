// =====================================================================
// spark.js Scene Editor — Tabbed Schema-Driven Inspector
// Tabs: Entity | Scene & Camera | Backgrounds | Input | Physics
// =====================================================================

const EditorInspector = {
    RenderAll() {
        this.RenderEntityTab();
        this.RenderSceneTab();
        this.RenderBackgroundsTab();
        this.RenderInputTab();
        this.RenderPhysicsTab();
    },

    /** Fast transform number sync during viewport gizmo drags (avoids rebuilding DOM). */
    SyncQuickTransform() {
        const ent = EditorState.GetPrimarySelected();
        if (!ent) return;
        const setVal = (id, v) => {
            const el = document.getElementById(id);
            if (el && document.activeElement !== el) el.value = v;
        };
        setVal('insp-tx', ent.transform.x);
        setVal('insp-ty', ent.transform.y);
        setVal('insp-trot', Math.round((ent.transform.rotation || 0) * 180 / Math.PI));
        setVal('insp-tsx', ent.transform.scaleX ?? 1);
        setVal('insp-tsy', ent.transform.scaleY ?? 1);
    },

    // ── DOM Helper Builders ──────────────────────────────────

    _section(title, headerBtn = null) {
        const sec = document.createElement('div');
        sec.className = 'insp-section';
        const head = document.createElement('div');
        head.className = 'insp-section-header';
        const span = document.createElement('span');
        span.textContent = title;
        head.appendChild(span);
        if (headerBtn) head.appendChild(headerBtn);
        const body = document.createElement('div');
        body.className = 'insp-section-body';
        sec.appendChild(head);
        sec.appendChild(body);
        return { sec, body };
    },

    _row(label, inputEl) {
        const row = document.createElement('div');
        row.className = 'field-row';
        const lbl = document.createElement('label');
        lbl.textContent = label;
        lbl.title = label;
        row.appendChild(lbl);
        row.appendChild(inputEl);
        return row;
    },

    _input(type, value, onChange, opts = {}) {
        const el = document.createElement('input');
        el.type = type;
        if (opts.id) el.id = opts.id;
        if (opts.min !== undefined) el.min = opts.min;
        if (opts.max !== undefined) el.max = opts.max;
        if (opts.step !== undefined) el.step = opts.step;
        if (opts.placeholder) el.placeholder = opts.placeholder;
        if (type === 'checkbox') {
            el.checked = Boolean(value);
            el.addEventListener('change', () => {
                EditorState.PushUndo();
                onChange(el.checked);
                EditorState.Emit('inspector');
            });
        }
        else {
            el.value = value ?? '';
            el.addEventListener('focus', () => EditorState.BeginTransaction());
            el.addEventListener('input', () => {
                const v = type === 'number' ? Number(el.value) : el.value;
                onChange(v);
            });
            el.addEventListener('change', () => {
                EditorState.CommitTransaction();
                EditorState.Emit('inspector');
            });
        }
        return el;
    },

    _select(options, value, onChange) {
        const sel = document.createElement('select');
        for (const opt of options) {
            const o = document.createElement('option');
            if (typeof opt === 'object') {
                o.value = opt.value;
                o.textContent = opt.label;
            }
            else {
                o.value = opt;
                o.textContent = opt;
            }
            if (String(o.value) === String(value ?? '')) o.selected = true;
            sel.appendChild(o);
        }
        sel.addEventListener('change', () => {
            EditorState.PushUndo();
            onChange(sel.value);
            EditorState.Emit('inspector');
        });
        return sel;
    },

    // ── 1. ENTITY TAB ────────────────────────────────────────

    RenderEntityTab() {
        const container = document.getElementById('insp-entity');
        container.innerHTML = '';

        const ent = EditorState.GetPrimarySelected();
        if (!ent) {
            container.innerHTML = '<div class="empty-hint">Select an entity in the Hierarchy or Viewport to inspect its properties, collider, and scripts.</div>';
            return;
        }

        // Identity
        const idSec = this._section(`Entity · ${ent.type}`);
        idSec.body.appendChild(this._row('Name', this._input('text', ent.name, v => { ent.name = v; SceneEditorUI.RenderHierarchy(); })));
        idSec.body.appendChild(this._row('Tag',  this._input('text', ent.tag,  v => { ent.tag = v; }, { placeholder: 'e.g. player, enemy' })));
        idSec.body.appendChild(this._row('Active', this._input('checkbox', ent.active !== false, v => { ent.active = v; SceneEditorUI.RenderHierarchy(); })));
        idSec.body.appendChild(this._row('Z-Index', this._input('number', ent.zIndex || 0, v => { ent.zIndex = v; SceneEditorUI.RenderHierarchy(); }, { step: 1 })));
        container.appendChild(idSec.sec);

        // Transform
        const trSec = this._section('Transform');
        const posPair = document.createElement('div');
        posPair.className = 'field-pair';
        posPair.innerHTML = '<div class="fp-cell"><span>X</span></div><div class="fp-cell"><span>Y</span></div>';
        posPair.children[0].appendChild(this._input('number', ent.transform.x, v => { ent.transform.x = v; }, { id: 'insp-tx', step: 1 }));
        posPair.children[1].appendChild(this._input('number', ent.transform.y, v => { ent.transform.y = v; }, { id: 'insp-ty', step: 1 }));
        trSec.body.appendChild(this._row('Position', posPair));

        const deg = Math.round((ent.transform.rotation || 0) * 180 / Math.PI);
        trSec.body.appendChild(this._row('Rotation (°)', this._input('number', deg, v => { ent.transform.rotation = Number((v * Math.PI / 180).toFixed(4)); }, { id: 'insp-trot', step: 1 })));

        const scPair = document.createElement('div');
        scPair.className = 'field-pair';
        scPair.innerHTML = '<div class="fp-cell"><span>X</span></div><div class="fp-cell"><span>Y</span></div>';
        scPair.children[0].appendChild(this._input('number', ent.transform.scaleX ?? 1, v => { ent.transform.scaleX = v; }, { id: 'insp-tsx', step: 0.1 }));
        scPair.children[1].appendChild(this._input('number', ent.transform.scaleY ?? 1, v => { ent.transform.scaleY = v; }, { id: 'insp-tsy', step: 0.1 }));
        trSec.body.appendChild(this._row('Scale', scPair));

        const pvPair = document.createElement('div');
        pvPair.className = 'field-pair';
        pvPair.innerHTML = '<div class="fp-cell"><span>X</span></div><div class="fp-cell"><span>Y</span></div>';
        pvPair.children[0].appendChild(this._input('number', ent.transform.pivotX || 0, v => { ent.transform.pivotX = v; }, { step: 1 }));
        pvPair.children[1].appendChild(this._input('number', ent.transform.pivotY || 0, v => { ent.transform.pivotY = v; }, { step: 1 }));
        trSec.body.appendChild(this._row('Pivot', pvPair));
        container.appendChild(trSec.sec);

        // Type-Specific Visual Properties
        this._appendTypeProperties(container, ent);

        // Standard Collider
        this._appendColliderSection(container, ent);

        // Box2D Physics Body (shown when Physics enabled or entity is Box2D type)
        if (EditorState.scene.physics?.enabled || ent.type.startsWith('Box2D')) {
            this._appendPhysicsBodySection(container, ent);
        }

        // Attached Behavior Scripts
        this._appendScriptsSection(container, ent);
    },

    _appendTypeProperties(container, ent) {
        const p = ent.props;
        const imgOptions = [{ value: '', label: '(none)' }, ...Object.keys(EditorState.scene.assets.images || {}).map(k => ({ value: k, label: k }))];
        const tsOptions  = [{ value: '', label: '(none)' }, ...Object.keys(EditorState.scene.assets.tilesets || {}).map(k => ({ value: k, label: k }))];
        const ptOptions  = [{ value: '', label: '(inline config)' }, ...Object.keys(EditorState.scene.assets.particles || {}).map(k => ({ value: k, label: k }))];

        if (ent.type === 'RectangleGO' || ent.type === 'Box2DRectangleGO' || ent.type === 'Box2DTrigger') {
            const sec = this._section('Rectangle');
            sec.body.appendChild(this._row('Width',  this._input('number', p.width ?? 64,  v => { p.width = v; }, { min: 1 })));
            sec.body.appendChild(this._row('Height', this._input('number', p.height ?? 64, v => { p.height = v; }, { min: 1 })));
            sec.body.appendChild(this._row('Color',  this._input('color',  p.color || '#5b8cff', v => { p.color = v; })));
            if (ent.type === 'RectangleGO') {
                sec.body.appendChild(this._row('Stroke', this._input('checkbox', p.stroke, v => { p.stroke = v; })));
                sec.body.appendChild(this._row('Line Width', this._input('number', p.lineWidth ?? 1, v => { p.lineWidth = v; }, { min: 1 })));
            }
            container.appendChild(sec.sec);
        }
        else if (ent.type === 'CircleGO') {
            const sec = this._section('Circle');
            sec.body.appendChild(this._row('Radius', this._input('number', p.radius ?? 32, v => { p.radius = v; }, { min: 1 })));
            sec.body.appendChild(this._row('Color',  this._input('color',  p.color || '#ff9800', v => { p.color = v; })));
            sec.body.appendChild(this._row('Stroke', this._input('checkbox', p.stroke, v => { p.stroke = v; })));
            sec.body.appendChild(this._row('Line Width', this._input('number', p.lineWidth ?? 1, v => { p.lineWidth = v; }, { min: 1 })));
            container.appendChild(sec.sec);
        }
        else if (ent.type === 'SpriteObject' || ent.type === 'Box2DSpriteObject') {
            const sec = this._section('Sprite');
            sec.body.appendChild(this._row('Image', this._select(imgOptions, p.imageKey, v => { p.imageKey = v; })));
            sec.body.appendChild(this._row('Alpha', this._input('number', p.alpha ?? 1, v => { p.alpha = v; }, { min: 0, max: 1, step: 0.05 })));
            if (ent.type === 'SpriteObject') {
                sec.body.appendChild(this._row('Flip X', this._input('checkbox', p.flipX, v => { p.flipX = v; })));
                sec.body.appendChild(this._row('Flip Y', this._input('checkbox', p.flipY, v => { p.flipY = v; })));
            }
            container.appendChild(sec.sec);
        }
        else if (ent.type === 'SpriteSectionObject') {
            const sec = this._section('Sprite Section / Atlas');
            sec.body.appendChild(this._row('Image', this._select(imgOptions, p.imageKey, v => { p.imageKey = v; this.RenderEntityTab(); })));
            const atlas = EditorState.runtimeAssets.images[p.imageKey]?.atlas;
            if (atlas) {
                const frameIds = new SpriteAtlas(atlas).ids;
                sec.body.appendChild(this._row('Atlas Frame', this._select(['', ...frameIds], p.atlasFrame || '', v => { p.atlasFrame = v; })));
            }
            sec.body.appendChild(this._row('Section X', this._input('number', p.sectionX || 0,  v => { p.sectionX = v; }, { min: 0 })));
            sec.body.appendChild(this._row('Section Y', this._input('number', p.sectionY || 0,  v => { p.sectionY = v; }, { min: 0 })));
            sec.body.appendChild(this._row('Section W', this._input('number', p.sectionW || 32, v => { p.sectionW = v; }, { min: 1 })));
            sec.body.appendChild(this._row('Section H', this._input('number', p.sectionH || 32, v => { p.sectionH = v; }, { min: 1 })));
            sec.body.appendChild(this._row('Alpha', this._input('number', p.alpha ?? 1, v => { p.alpha = v; }, { min: 0, max: 1, step: 0.05 })));
            container.appendChild(sec.sec);
        }
        else if (ent.type === 'SSAnimationObjectBasic') {
            const sec = this._section('Sprite Sheet Animation');
            sec.body.appendChild(this._row('Image', this._select(imgOptions, p.imageKey, v => { p.imageKey = v; })));
            sec.body.appendChild(this._row('Frame W', this._input('number', p.frameWidth || 32, v => { p.frameWidth = v; }, { min: 1 })));
            sec.body.appendChild(this._row('Frame H', this._input('number', p.frameHeight || 32, v => { p.frameHeight = v; }, { min: 1 })));
            sec.body.appendChild(this._row('Frame Counts', this._input('text', (p.frameCount || [4]).join(','), v => {
                p.frameCount = v.split(',').map(n => Math.max(1, parseInt(n.trim(), 10) || 1));
            })));
            sec.body.appendChild(this._row('Frame Sec', this._input('number', p.framesDuration ?? 0.12, v => { p.framesDuration = v; }, { min: 0.01, step: 0.01 })));
            sec.body.appendChild(this._row('Loop', this._input('checkbox', p.loop !== false, v => { p.loop = v; })));
            container.appendChild(sec.sec);
        }
        else if (ent.type === 'Tileset') {
            const sec = this._section('Tileset Map');
            sec.body.appendChild(this._row('Tileset Image', this._select(imgOptions, p.imageKey, v => { p.imageKey = v; })));
            sec.body.appendChild(this._row('Tileset JSON',  this._select(tsOptions,  p.tilesetKey, v => { p.tilesetKey = v; })));
            container.appendChild(sec.sec);
        }
        else if (ent.type === 'ParticleSystemGO') {
            const sec = this._section('Particle System');
            sec.body.appendChild(this._row('Particle JSON', this._select(ptOptions, p.particleKey || '', v => { p.particleKey = v; })));
            sec.body.appendChild(this._row('Sprite Image',  this._select(imgOptions, p.imageKey || '', v => { p.imageKey = v; })));
            sec.body.appendChild(this._row('Emitting',      this._input('checkbox', p.emitting !== false, v => { p.emitting = v; })));
            const cfg = p.config || (p.config = {});
            sec.body.appendChild(this._row('Shape', this._select(['circle', 'rect', 'line', 'sprite'], cfg.renderShape || 'circle', v => { cfg.renderShape = v; })));
            sec.body.appendChild(this._row('Max Count', this._input('number', cfg.maxParticleCount ?? 80, v => { cfg.maxParticleCount = v; }, { min: 1, max: 2000 })));
            sec.body.appendChild(this._row('Start Color', this._input('color', cfg.startColor || '#ffcc33', v => { cfg.startColor = v; })));
            sec.body.appendChild(this._row('End Color',   this._input('color', cfg.endColor   || '#ff3300', v => { cfg.endColor = v; })));
            container.appendChild(sec.sec);
        }
        else if (ent.type === 'TextGO') {
            const sec = this._section('Text');
            sec.body.appendChild(this._row('Text',  this._input('text', p.text || '', v => { p.text = v; })));
            sec.body.appendChild(this._row('Font',  this._input('text', p.font || '20px Arial', v => { p.font = v; })));
            sec.body.appendChild(this._row('Color', this._input('color', p.color || '#ffffff', v => { p.color = v; })));
            sec.body.appendChild(this._row('Align', this._select(['left', 'center', 'right'], p.align || 'center', v => { p.align = v; })));
            sec.body.appendChild(this._row('Stroke', this._input('checkbox', p.stroke, v => { p.stroke = v; })));
            container.appendChild(sec.sec);
        }
    },

    _appendColliderSection(container, ent) {
        const col = ent.collider || (ent.collider = { type: 'None' });
        const sec = this._section('Collider');
        sec.body.appendChild(this._row('Type', this._select(['None', 'RectangleCollider', 'CircleCollider'], col.type || 'None', v => {
            col.type = v;
            if (v === 'RectangleCollider') {
                col.width = col.width || ent.props?.width || 48;
                col.height = col.height || ent.props?.height || 48;
            }
            else if (v === 'CircleCollider') {
                col.radius = col.radius || ent.props?.radius || 24;
            }
            col.offsetX = col.offsetX || 0;
            col.offsetY = col.offsetY || 0;
            col.enabled = true;
            this.RenderEntityTab();
        })));

        if (col.type === 'RectangleCollider') {
            sec.body.appendChild(this._row('Width',   this._input('number', col.width  || 32, v => { col.width = v; }, { min: 1 })));
            sec.body.appendChild(this._row('Height',  this._input('number', col.height || 32, v => { col.height = v; }, { min: 1 })));
            sec.body.appendChild(this._row('Offset X', this._input('number', col.offsetX || 0, v => { col.offsetX = v; })));
            sec.body.appendChild(this._row('Offset Y', this._input('number', col.offsetY || 0, v => { col.offsetY = v; })));
            sec.body.appendChild(this._row('Enabled',  this._input('checkbox', col.enabled !== false, v => { col.enabled = v; })));
        }
        else if (col.type === 'CircleCollider') {
            sec.body.appendChild(this._row('Radius',   this._input('number', col.radius || 24, v => { col.radius = v; }, { min: 1 })));
            sec.body.appendChild(this._row('Offset X', this._input('number', col.offsetX || 0, v => { col.offsetX = v; })));
            sec.body.appendChild(this._row('Offset Y', this._input('number', col.offsetY || 0, v => { col.offsetY = v; })));
            sec.body.appendChild(this._row('Enabled',  this._input('checkbox', col.enabled !== false, v => { col.enabled = v; })));
        }
        container.appendChild(sec.sec);
    },

    _appendPhysicsBodySection(container, ent) {
        const pb = ent.physicsBody || (ent.physicsBody = {
            enabled: false, shape: 'Box', bodyType: 'dynamic',
            widthPx: ent.props?.width || 64, heightPx: ent.props?.height || 64, radiusPx: ent.props?.radius || 32,
            density: 1, friction: 0.5, restitution: 0.3, isSensor: false, fixedRotation: false
        });
        const sec = this._section('Box2D Physics Body');
        sec.body.appendChild(this._row('Enabled', this._input('checkbox', pb.enabled, v => { pb.enabled = v; this.RenderEntityTab(); })));
        if (pb.enabled) {
            sec.body.appendChild(this._row('Body Type', this._select(['dynamic', 'static', 'kinematic'], pb.bodyType || 'dynamic', v => { pb.bodyType = v; })));
            sec.body.appendChild(this._row('Shape',     this._select(['Box', 'Circle'], pb.shape || 'Box', v => { pb.shape = v; this.RenderEntityTab(); })));
            if (pb.shape === 'Circle') {
                sec.body.appendChild(this._row('Radius (px)', this._input('number', pb.radiusPx ?? 32, v => { pb.radiusPx = v; }, { min: 1 })));
            }
            else {
                sec.body.appendChild(this._row('Width (px)',  this._input('number', pb.widthPx  ?? 64, v => { pb.widthPx = v; }, { min: 1 })));
                sec.body.appendChild(this._row('Height (px)', this._input('number', pb.heightPx ?? 64, v => { pb.heightPx = v; }, { min: 1 })));
            }
            sec.body.appendChild(this._row('Density',     this._input('number', pb.density ?? 1, v => { pb.density = v; }, { min: 0, step: 0.1 })));
            sec.body.appendChild(this._row('Friction',    this._input('number', pb.friction ?? 0.5, v => { pb.friction = v; }, { min: 0, max: 1, step: 0.05 })));
            sec.body.appendChild(this._row('Restitution', this._input('number', pb.restitution ?? 0.3, v => { pb.restitution = v; }, { min: 0, max: 1, step: 0.05 })));
            sec.body.appendChild(this._row('Is Sensor',   this._input('checkbox', pb.isSensor, v => { pb.isSensor = v; })));
            sec.body.appendChild(this._row('Fixed Rot.',  this._input('checkbox', pb.fixedRotation, v => { pb.fixedRotation = v; })));
        }
        container.appendChild(sec.sec);
    },

    _appendScriptsSection(container, ent) {
        if (!Array.isArray(ent.scripts)) ent.scripts = [];
        const addBtn = document.createElement('button');
        addBtn.className = 'mini-btn accent';
        addBtn.textContent = '+ Attach';

        const sec = this._section('Attached Scripts', addBtn);

        const available = Object.keys(EditorState.scripts);
        addBtn.addEventListener('click', () => {
            if (available.length === 0) {
                SceneEditorUI.ShowToast('Create a script first in the Scripts drawer below.');
                return;
            }
            const first = available[0];
            EditorState.PushUndo();
            ent.scripts.push({
                className: first,
                enabled: true,
                props: EditorScripts.BuildDefaultProps(first)
            });
            EditorState.Emit('inspector');
            this.RenderEntityTab();
        });

        if (ent.scripts.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'tb-label';
            empty.textContent = 'No Behavior scripts attached.';
            sec.body.appendChild(empty);
        }

        ent.scripts.forEach((sDef, idx) => {
            const card = document.createElement('div');
            card.className = 'script-card';

            const head = document.createElement('div');
            head.className = 'script-card-head';

            const chk = this._input('checkbox', sDef.enabled !== false, v => { sDef.enabled = v; });
            head.appendChild(chk);

            const sel = this._select(available.length ? available : [sDef.className], sDef.className, v => {
                sDef.className = v;
                sDef.props = EditorScripts.BuildDefaultProps(v);
                this.RenderEntityTab();
            });
            head.appendChild(sel);

            const actions = document.createElement('div');
            actions.className = 'sc-actions';
            const editBtn = document.createElement('button');
            editBtn.className = 'mini-btn';
            editBtn.textContent = '✎';
            editBtn.title = 'Edit Script';
            editBtn.addEventListener('click', () => EditorScripts.OpenModal(sDef.className));

            const rmBtn = document.createElement('button');
            rmBtn.className = 'mini-btn danger';
            rmBtn.textContent = '✕';
            rmBtn.title = 'Detach Script';
            rmBtn.addEventListener('click', () => {
                EditorState.PushUndo();
                ent.scripts.splice(idx, 1);
                EditorState.Emit('inspector');
                this.RenderEntityTab();
            });
            actions.appendChild(editBtn);
            actions.appendChild(rmBtn);
            head.appendChild(actions);
            card.appendChild(head);

            // Render schema-driven inspector fields
            const schema = EditorState.scripts[sDef.className]?.schema || {};
            if (!sDef.props) sDef.props = {};
            const keys = Object.keys(schema);
            if (keys.length === 0) {
                const note = document.createElement('div');
                note.className = 'tb-label';
                note.textContent = 'No static inspector fields declared.';
                card.appendChild(note);
            }
            else {
                for (const propKey of keys) {
                    const field = schema[propKey];
                    const curVal = sDef.props[propKey] !== undefined ? sDef.props[propKey] : field.default;
                    let ctrl = null;

                    if (field.type === 'number') {
                        ctrl = this._input('number', curVal ?? 0, v => { sDef.props[propKey] = v; }, { min: field.min, max: field.max, step: field.step ?? 'any' });
                    }
                    else if (field.type === 'boolean') {
                        ctrl = this._input('checkbox', curVal, v => { sDef.props[propKey] = v; });
                    }
                    else if (field.type === 'color') {
                        ctrl = this._input('color', curVal || '#ffffff', v => { sDef.props[propKey] = v; });
                    }
                    else if (field.type === 'select') {
                        ctrl = this._select(field.options || [], curVal ?? '', v => { sDef.props[propKey] = v; });
                    }
                    else if (field.type === 'entityRef') {
                        const entOpts = [{ value: '', label: '(none)' }, ...EditorState.scene.entities.map(e => ({ value: e.id, label: e.name }))];
                        ctrl = this._select(entOpts, curVal || '', v => { sDef.props[propKey] = v; });
                    }
                    else if (field.type === 'prefabId') {
                        const pfOpts = [{ value: '', label: '(none)' }, ...Object.keys(EditorState.scene.prefabs || {}).map(k => ({ value: k, label: k }))];
                        ctrl = this._select(pfOpts, curVal || '', v => { sDef.props[propKey] = v; });
                    }
                    else if (field.type === 'imageKey') {
                        const imOpts = [{ value: '', label: '(none)' }, ...Object.keys(EditorState.scene.assets.images || {}).map(k => ({ value: k, label: k }))];
                        ctrl = this._select(imOpts, curVal || '', v => { sDef.props[propKey] = v; });
                    }
                    else {
                        ctrl = this._input('text', curVal ?? '', v => { sDef.props[propKey] = v; });
                    }
                    card.appendChild(this._row(field.label || propKey, ctrl));
                }
            }
            sec.body.appendChild(card);
        });

        container.appendChild(sec.sec);
    },

    // ── 2. SCENE & GAME SETTINGS TAB ─────────────────────────

    RenderSceneTab() {
        const container = document.getElementById('insp-scene');
        container.innerHTML = '';
        if (!EditorState.scene) return;

        const meta = EditorState.scene.meta;
        const cfg  = EditorState.scene.config;
        const cam  = EditorState.scene.camera || (EditorState.scene.camera = { type: 'Camera', x: 0, y: 0, zoom: 1 });

        const mSec = this._section('Scene Metadata');
        mSec.body.appendChild(this._row('Scene Name', this._input('text', meta.name || '', v => { meta.name = v; SceneEditorUI.UpdateHeader(); })));
        mSec.body.appendChild(this._row('BG Color',   this._input('color', meta.backgroundColor || '#1a1a2e', v => { meta.backgroundColor = v; })));
        container.appendChild(mSec.sec);

        const gSec = this._section('Game.Configure()');
        gSec.body.appendChild(this._row('Screen W', this._input('number', cfg.screenWidth || 800,  v => { cfg.screenWidth = v; }, { min: 160 })));
        gSec.body.appendChild(this._row('Screen H', this._input('number', cfg.screenHeight || 600, v => { cfg.screenHeight = v; }, { min: 120 })));
        gSec.body.appendChild(this._row('Smoothing', this._input('checkbox', cfg.imageSmoothingEnabled !== false, v => { cfg.imageSmoothingEnabled = v; })));
        gSec.body.appendChild(this._row('Fill Window', this._select(['false', 'true', 'mobile'], String(cfg.fillWindow ?? false), v => { cfg.fillWindow = v === 'true' ? true : (v === 'false' ? false : 'mobile'); })));
        gSec.body.appendChild(this._row('Draw Colliders', this._input('checkbox', cfg.drawColliders, v => { cfg.drawColliders = v; })));
        gSec.body.appendChild(this._row('Mobile Support', this._input('checkbox', cfg.mobileSupport, v => { cfg.mobileSupport = v; })));
        gSec.body.appendChild(this._row('FPS Cap (0=off)', this._input('number', cfg.fpsCap || 0, v => { cfg.fpsCap = v; }, { min: 0, max: 240 })));
        container.appendChild(gSec.sec);

        const cSec = this._section('Camera');
        cSec.body.appendChild(this._row('Type', this._select(['Camera', 'FollowCameraBasic', 'FollowCamera'], cam.type || 'Camera', v => { cam.type = v; this.RenderSceneTab(); })));
        cSec.body.appendChild(this._row('X', this._input('number', cam.x || 0, v => { cam.x = v; })));
        cSec.body.appendChild(this._row('Y', this._input('number', cam.y || 0, v => { cam.y = v; })));
        cSec.body.appendChild(this._row('Zoom', this._input('number', cam.zoom ?? 1, v => { cam.zoom = v; }, { min: 0.1, max: 5, step: 0.1 })));
        if (cam.type === 'FollowCameraBasic' || cam.type === 'FollowCamera') {
            const entOpts = [{ value: '', label: '(none)' }, ...EditorState.scene.entities.map(e => ({ value: e.id, label: e.name }))];
            cSec.body.appendChild(this._row('Target', this._select(entOpts, cam.targetEntityId || '', v => { cam.targetEntityId = v; })));
            if (cam.type === 'FollowCamera') {
                cSec.body.appendChild(this._row('Smoothing', this._input('number', cam.smoothingSpeed ?? 5, v => { cam.smoothingSpeed = v; }, { min: 0.5, step: 0.5 })));
                cSec.body.appendChild(this._row('Min X', this._input('number', cam.minX ?? -500, v => { cam.minX = v; })));
                cSec.body.appendChild(this._row('Max X', this._input('number', cam.maxX ?? 500,  v => { cam.maxX = v; })));
                cSec.body.appendChild(this._row('Min Y', this._input('number', cam.minY ?? -500, v => { cam.minY = v; })));
                cSec.body.appendChild(this._row('Max Y', this._input('number', cam.maxY ?? 500,  v => { cam.maxY = v; })));
            }
        }
        container.appendChild(cSec.sec);
    },

    // ── 3. BACKGROUND LAYERS TAB ─────────────────────────────

    RenderBackgroundsTab() {
        const container = document.getElementById('insp-backgrounds');
        container.innerHTML = '';
        if (!EditorState.scene) return;
        if (!Array.isArray(EditorState.scene.backgroundLayers)) EditorState.scene.backgroundLayers = [];

        const addBtn = document.createElement('button');
        addBtn.className = 'mini-btn accent';
        addBtn.textContent = '+ Add Layer';
        addBtn.addEventListener('click', () => {
            EditorState.PushUndo();
            EditorState.scene.backgroundLayers.push({ type: 'StaticColorLayer', color: '#1a1a2e', visible: true });
            this.RenderBackgroundsTab();
        });

        const sec = this._section('BackgroundLayers Stack', addBtn);
        const imgOpts = [{ value: '', label: '(none)' }, ...Object.keys(EditorState.scene.assets.images || {}).map(k => ({ value: k, label: k }))];

        if (EditorState.scene.backgroundLayers.length === 0) {
            sec.body.innerHTML = '<div class="tb-label">No background layers. Scene BG Color is used.</div>';
        }

        EditorState.scene.backgroundLayers.forEach((layer, idx) => {
            const card = document.createElement('div');
            card.className = 'script-card';

            const head = document.createElement('div');
            head.className = 'script-card-head';
            head.appendChild(this._input('checkbox', layer.visible !== false, v => { layer.visible = v; }));
            head.appendChild(this._select(['StaticColorLayer', 'StaticGradientLayer', 'ColorRectangleLayer', 'SpriteBackgroundLayer'], layer.type, v => {
                layer.type = v;
                this.RenderBackgroundsTab();
            }));
            const rm = document.createElement('button');
            rm.className = 'mini-btn danger';
            rm.textContent = '✕';
            rm.addEventListener('click', () => {
                EditorState.PushUndo();
                EditorState.scene.backgroundLayers.splice(idx, 1);
                this.RenderBackgroundsTab();
            });
            head.appendChild(rm);
            card.appendChild(head);

            if (layer.type === 'StaticColorLayer' || layer.type === 'ColorRectangleLayer') {
                card.appendChild(this._row('Color', this._input('color', layer.color || '#1a1a2e', v => { layer.color = v; })));
            }
            else if (layer.type === 'StaticGradientLayer') {
                if (!layer.colorStops) layer.colorStops = [[0, '#14192b'], [1, '#1f2940']];
                card.appendChild(this._row('Top Color',    this._input('color', layer.colorStops[0][1], v => { layer.colorStops[0][1] = v; })));
                card.appendChild(this._row('Bottom Color', this._input('color', layer.colorStops[1][1], v => { layer.colorStops[1][1] = v; })));
            }
            else if (layer.type === 'SpriteBackgroundLayer') {
                card.appendChild(this._row('Image',   this._select(imgOpts, layer.imageKey || '', v => { layer.imageKey = v; })));
                card.appendChild(this._row('X',       this._input('number', layer.x || 0, v => { layer.x = v; })));
                card.appendChild(this._row('Y',       this._input('number', layer.y || 0, v => { layer.y = v; })));
                card.appendChild(this._row('Speed X', this._input('number', layer.speedX ?? 0.5, v => { layer.speedX = v; }, { step: 0.05 })));
                card.appendChild(this._row('Speed Y', this._input('number', layer.speedY ?? 0,   v => { layer.speedY = v; }, { step: 0.05 })));
            }
            sec.body.appendChild(card);
        });
        container.appendChild(sec.sec);
    },

    // ── 4. INPUT ACTIONS & AXES TAB ──────────────────────────

    RenderInputTab() {
        const container = document.getElementById('insp-input');
        container.innerHTML = '';
        if (!EditorState.scene) return;
        const inp = EditorState.scene.input || (EditorState.scene.input = { actions: {}, axes: {} });

        // Actions
        const addActBtn = document.createElement('button');
        addActBtn.className = 'mini-btn accent';
        addActBtn.textContent = '+ Action';
        addActBtn.addEventListener('click', () => {
            const name = prompt('Action name (e.g. Jump, Fire):');
            if (!name || !name.trim()) return;
            EditorState.PushUndo();
            inp.actions[name.trim()] = [{ type: 'key', code: 32 }];
            this.RenderInputTab();
        });

        const actSec = this._section('Input Actions', addActBtn);
        for (const [name, bindings] of Object.entries(inp.actions || {})) {
            const card = document.createElement('div');
            card.className = 'script-card';
            const head = document.createElement('div');
            head.className = 'script-card-head';
            head.innerHTML = `<span>${name}</span>`;
            const rm = document.createElement('button');
            rm.className = 'mini-btn danger'; rm.textContent = '✕';
            rm.style.marginLeft = 'auto';
            rm.addEventListener('click', () => { EditorState.PushUndo(); delete inp.actions[name]; this.RenderInputTab(); });
            head.appendChild(rm);
            card.appendChild(head);

            bindings.forEach((b) => {
                const row = document.createElement('div');
                row.className = 'binding-row';
                row.innerHTML = `<span>${b.type}: <b>${b.type === 'key' ? this._keyName(b.code) : (b.code || 'click')}</b></span>`;
                if (b.type === 'key') {
                    const listenBtn = document.createElement('button');
                    listenBtn.className = 'mini-btn';
                    listenBtn.style.marginLeft = 'auto';
                    listenBtn.textContent = 'Bind Key…';
                    listenBtn.addEventListener('click', () => {
                        listenBtn.textContent = 'Press key…';
                        const handler = (ev) => {
                            ev.preventDefault();
                            window.removeEventListener('keydown', handler, true);
                            EditorState.PushUndo();
                            b.code = ev.keyCode;
                            this.RenderInputTab();
                        };
                        window.addEventListener('keydown', handler, true);
                    });
                    row.appendChild(listenBtn);
                }
                card.appendChild(row);
            });
            actSec.body.appendChild(card);
        }
        container.appendChild(actSec.sec);

        // Axes
        const addAxisBtn = document.createElement('button');
        addAxisBtn.className = 'mini-btn accent';
        addAxisBtn.textContent = '+ Axis';
        addAxisBtn.addEventListener('click', () => {
            const name = prompt('Axis name (e.g. MoveX, MoveY):');
            if (!name || !name.trim()) return;
            EditorState.PushUndo();
            inp.axes[name.trim()] = [{ type: 'key', positive: 68, negative: 65 }];
            this.RenderInputTab();
        });

        const axSec = this._section('Input Axes', addAxisBtn);
        for (const [name, bindings] of Object.entries(inp.axes || {})) {
            const card = document.createElement('div');
            card.className = 'script-card';
            const head = document.createElement('div');
            head.className = 'script-card-head';
            head.innerHTML = `<span>${name}</span>`;
            const rm = document.createElement('button');
            rm.className = 'mini-btn danger'; rm.textContent = '✕';
            rm.style.marginLeft = 'auto';
            rm.addEventListener('click', () => { EditorState.PushUndo(); delete inp.axes[name]; this.RenderInputTab(); });
            head.appendChild(rm);
            card.appendChild(head);

            bindings.forEach((b) => {
                const row = document.createElement('div');
                row.className = 'binding-row';
                row.innerHTML = `<span>${b.type}: +<b>${this._keyName(b.positive)}</b> / −<b>${this._keyName(b.negative)}</b></span>`;
                card.appendChild(row);
            });
            axSec.body.appendChild(card);
        }
        container.appendChild(axSec.sec);
    },

    _keyName(code) {
        const map = { 32: 'SPACE', 37: 'LEFT', 38: 'UP', 39: 'RIGHT', 40: 'DOWN', 13: 'ENTER', 27: 'ESC', 16: 'SHIFT', 17: 'CTRL' };
        if (map[code]) return map[code];
        if (code >= 65 && code <= 90) return String.fromCharCode(code);
        if (code >= 48 && code <= 57) return String.fromCharCode(code);
        return `Key(${code})`;
    },

    // ── 5. PHYSICS (BOX2D WORLD) TAB ─────────────────────────

    RenderPhysicsTab() {
        const container = document.getElementById('insp-physics');
        container.innerHTML = '';
        if (!EditorState.scene) return;
        const phys = EditorState.scene.physics || (EditorState.scene.physics = { enabled: false, scale: 30, gravity: { x: 0, y: -9.8 }, doSleep: true });

        const sec = this._section('Box2D Physics World');
        sec.body.appendChild(this._row('Enable Box2D', this._input('checkbox', phys.enabled, v => {
            phys.enabled = v;
            this.RenderPhysicsTab();
            this.RenderEntityTab();
        })));
        if (phys.enabled) {
            sec.body.appendChild(this._row('Scale (px/m)', this._input('number', phys.scale ?? 30, v => { phys.scale = v; }, { min: 1 })));
            sec.body.appendChild(this._row('Gravity X', this._input('number', phys.gravity?.x ?? 0, v => { phys.gravity.x = v; }, { step: 0.5 })));
            sec.body.appendChild(this._row('Gravity Y', this._input('number', phys.gravity?.y ?? -9.8, v => { phys.gravity.y = v; }, { step: 0.5 })));
            sec.body.appendChild(this._row('Allow Sleep', this._input('checkbox', phys.doSleep !== false, v => { phys.doSleep = v; })));
        }
        container.appendChild(sec.sec);
    }
};
