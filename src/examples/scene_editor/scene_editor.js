// =====================================================================
// spark.js Scene Editor — Main Controller, UI Panels & Shortcuts
// =====================================================================

const SceneEditorUI = {
    _consoleErrors: 0,
    _toastTimer: null,

    ENTITY_ICONS: {
        GameObject: '📦',
        RectangleGO: '🟦',
        CircleGO: '🔵',
        SpriteObject: '🖼',
        SpriteSectionObject: '✂️',
        SSAnimationObjectBasic: '🎞',
        Tileset: '🗺️',
        ParticleSystemGO: '✨',
        TextGO: '🔤',
        Box2DRectangleGO: '⚛️',
        Box2DSpriteObject: '⚛️',
        Box2DTrigger: '🟨'
    },

    Init() {
        EditorScripts.InitModal();
        EditorPlaytest.Init();
        EditorViewport.Init();

        this._bindToolbar();
        this._bindTabs();
        this._bindResizers();
        this._bindKeyboard();

        EditorState.OnChange((reason) => {
            this.UpdateHeader();
            this.UpdateUndoRedoButtons();
            this.RenderHierarchy();
            this.RenderPrefabs();
            this.RenderAssets();
            this.RenderScripts();

            if (reason === 'project-loaded' || reason === 'restore') {
                EditorViewport.InvalidatePreviews();
                EditorInspector.RenderAll();
                if (reason === 'project-loaded') {
                    setTimeout(() => EditorViewport.FitToScene(), 30);
                }
            }
            else if (reason === 'selection' || reason === 'entities' || reason === 'scripts') {
                EditorInspector.RenderEntityTab();
                if (reason === 'entities') EditorInspector.RenderSceneTab();
            }
            else if (reason === 'transform') {
                EditorInspector.SyncQuickTransform();
            }
        });

        // Boot with the playable 2D Arcade Courtyard sample
        EditorState.LoadSample('arcadeCourtyard');
    },

    // ── Header & Status ──────────────────────────────────────

    UpdateHeader() {
        const title = document.getElementById('scene-title-label');
        const count = document.getElementById('entity-count-label');
        if (title) title.textContent = EditorState.scene?.meta?.name || 'Untitled Scene';
        if (count) count.textContent = `${EditorState.scene?.entities?.length || 0} entities`;
    },

    UpdateUndoRedoButtons() {
        document.getElementById('btn-undo').disabled = EditorState.undoStack.length === 0;
        document.getElementById('btn-redo').disabled = EditorState.redoStack.length === 0;
        const hasSel = EditorState.selectedIds.size > 0;
        document.getElementById('btn-dup-entity').disabled  = !hasSel;
        document.getElementById('btn-save-prefab').disabled = !hasSel;
        document.getElementById('btn-del-entity').disabled  = !hasSel;
    },

    UpdatePlayUI() {
        const st = EditorState.playState;
        const badge = document.getElementById('viewport-mode-badge');
        const wrap  = document.getElementById('viewport-wrap');
        const status = document.getElementById('playtest-status');
        const playBtn  = document.getElementById('btn-play');
        const pauseBtn = document.getElementById('btn-pause');

        playBtn.disabled  = st === 'playing';
        playBtn.textContent = st === 'paused' ? '▶ Resume' : '▶ Play';
        pauseBtn.disabled = st === 'edit';
        pauseBtn.classList.toggle('active', st === 'paused');
        document.getElementById('btn-step').disabled  = st !== 'paused';
        document.getElementById('btn-stop').disabled  = st === 'edit';

        wrap.classList.toggle('playing', st === 'playing');
        wrap.classList.toggle('paused',  st === 'paused');

        if (st === 'edit') {
            badge.textContent = 'EDIT MODE';
            badge.className = 'mode-badge edit';
        }
        else if (st === 'playing') {
            badge.textContent = 'PLAYING';
            badge.className = 'mode-badge play';
            if (status) status.textContent = '▶ PLAYING (Click canvas for keyboard focus)';
        }
        else {
            badge.textContent = 'PAUSED';
            badge.className = 'mode-badge paused';
            if (status) status.textContent = '⏸ PAUSED';
        }
    },

    // ── Hierarchy Panel ──────────────────────────────────────

    RenderHierarchy() {
        const list = document.getElementById('hierarchy-list');
        if (!list || !EditorState.scene) return;
        const filter = (document.getElementById('hierarchy-search')?.value || '').trim().toLowerCase();
        list.innerHTML = '';

        const sorted = EditorState.scene.entities.slice().sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

        if (sorted.length === 0) {
            list.innerHTML = '<div class="empty-hint">No entities yet.<br>Click <b>+ Add Entity</b> or drag an asset onto the viewport.</div>';
            return;
        }

        for (const ent of sorted) {
            if (filter && !ent.name.toLowerCase().includes(filter) && !ent.type.toLowerCase().includes(filter) && !(ent.tag || '').toLowerCase().includes(filter)) {
                continue;
            }
            const item = document.createElement('div');
            item.className = 'hierarchy-item'
                + (EditorState.selectedIds.has(ent.id) ? ' selected' : '')
                + (ent.active === false ? ' inactive' : '');

            item.innerHTML = `
                <span class="hi-icon">${this.ENTITY_ICONS[ent.type] || '📦'}</span>
                <span class="hi-name" title="${ent.name} (${ent.type})">${ent.name}</span>
                <span class="hi-z">z:${ent.zIndex || 0}</span>
            `;

            const visBtn = document.createElement('button');
            visBtn.className = 'hi-toggle';
            visBtn.textContent = ent.active === false ? '🚫' : '👁';
            visBtn.title = 'Toggle Active';
            visBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                EditorState.PushUndo();
                ent.active = ent.active === false ? true : false;
                EditorState.Emit('entities');
            });

            const lockBtn = document.createElement('button');
            lockBtn.className = 'hi-toggle';
            lockBtn.textContent = EditorState.lockedIds.has(ent.id) ? '🔒' : '🔓';
            lockBtn.title = 'Toggle Lock';
            lockBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (EditorState.lockedIds.has(ent.id)) EditorState.lockedIds.delete(ent.id);
                else EditorState.lockedIds.add(ent.id);
                this.RenderHierarchy();
            });

            item.appendChild(visBtn);
            item.appendChild(lockBtn);

            item.addEventListener('click', (e) => {
                EditorState.SelectEntity(ent.id, e.shiftKey);
            });
            item.addEventListener('dblclick', () => {
                EditorViewport.FocusEntity(ent);
            });

            list.appendChild(item);
        }
    },

    // ── Prefabs Panel ────────────────────────────────────────

    RenderPrefabs() {
        const list = document.getElementById('prefab-list');
        if (!list || !EditorState.scene) return;
        list.innerHTML = '';

        const prefabs = EditorState.scene.prefabs || {};
        const keys = Object.keys(prefabs);
        if (keys.length === 0) {
            list.innerHTML = '<div class="empty-hint">No prefabs yet.<br>Select an entity and click <b>★ Prefab</b>.</div>';
            return;
        }

        for (const key of keys) {
            const pf = prefabs[key];
            const row = document.createElement('div');
            row.className = 'prefab-item';
            row.draggable = true;
            row.innerHTML = `<span>${this.ENTITY_ICONS[pf.type] || '★'}</span><span class="pf-name">${key}</span>`;

            row.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/x-spark-item', JSON.stringify({ kind: 'prefab', id: key }));
            });

            const spawnBtn = document.createElement('button');
            spawnBtn.className = 'mini-btn accent';
            spawnBtn.textContent = '+ Spawn';
            spawnBtn.addEventListener('click', () => {
                const cfg = EditorState.scene.config || { screenWidth: 800, screenHeight: 500 };
                EditorState.SpawnPrefabInEditor(key, cfg.screenWidth / 2, cfg.screenHeight / 2);
            });

            const delBtn = document.createElement('button');
            delBtn.className = 'mini-btn danger';
            delBtn.textContent = '✕';
            delBtn.addEventListener('click', () => {
                EditorState.PushUndo();
                delete EditorState.scene.prefabs[key];
                EditorState.Emit('prefabs');
            });

            row.appendChild(spawnBtn);
            row.appendChild(delBtn);
            list.appendChild(row);
        }
    },

    // ── Bottom Drawer: Assets, Scripts & Console ─────────────

    RenderAssets() {
        const grid = document.getElementById('asset-grid');
        if (!grid || !EditorState.scene) return;
        grid.innerHTML = '';

        const assets = EditorState.scene.assets || {};
        let total = 0;

        const addCard = (kind, key, thumbHtml, onDelete) => {
            total++;
            const card = document.createElement('div');
            card.className = 'asset-card';
            card.draggable = true;
            card.innerHTML = `
                <div class="asset-thumb">${thumbHtml}</div>
                <div class="asset-name" title="${key}">${key}</div>
                <div class="asset-kind">${kind}</div>
            `;
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/x-spark-item', JSON.stringify({ kind, key }));
            });
            const del = document.createElement('button');
            del.className = 'asset-del';
            del.textContent = '✕';
            del.addEventListener('click', (e) => { e.stopPropagation(); onDelete(); });
            card.appendChild(del);
            grid.appendChild(card);
        };

        for (const [key] of Object.entries(assets.images || {})) {
            const rt = EditorState.runtimeAssets.images[key];
            const thumb = rt?.url ? `<img src="${rt.url}" alt="${key}">` : '🖼';
            const label = rt?.atlas ? 'image + atlas' : 'image';
            addCard(label.startsWith('image') ? 'image' : label, key, thumb, () => {
                delete assets.images[key];
                delete EditorState.runtimeAssets.images[key];
                EditorState.Emit('assets');
            });
        }

        for (const [key] of Object.entries(assets.tilesets || {})) {
            addCard('tileset', key, '🗺️', () => {
                delete assets.tilesets[key];
                delete EditorState.runtimeAssets.tilesets[key];
                EditorState.Emit('assets');
            });
        }

        for (const [key] of Object.entries(assets.particles || {})) {
            addCard('particle', key, '✨', () => {
                delete assets.particles[key];
                delete EditorState.runtimeAssets.particles[key];
                EditorState.Emit('assets');
            });
        }

        for (const [key] of Object.entries(assets.audio || {})) {
            addCard('audio', key, '🔊', () => {
                delete assets.audio[key];
                delete EditorState.runtimeAssets.audio[key];
                EditorState.Emit('assets');
            });
        }

        if (total === 0) {
            grid.innerHTML = '<div class="empty-hint" style="grid-column:1/-1">No assets imported. Click <b>+ Import Asset</b> to add images, sprite atlases, tilesets, particle configs, or audio.</div>';
        }
    },

    RenderScripts() {
        const list = document.getElementById('script-list');
        if (!list) return;
        list.innerHTML = '';

        const entries = Object.values(EditorState.scripts);
        if (entries.length === 0) {
            list.innerHTML = '<div class="empty-hint">No Behavior scripts yet. Click <b>+ New Script</b> to create one.</div>';
            return;
        }

        for (const s of entries) {
            const row = document.createElement('div');
            row.className = 'script-row';
            const fieldCount = Object.keys(s.schema || {}).length;
            const statusHtml = s.error
                ? `<span class="sr-err" title="${s.error}">⚠ Syntax Error</span>`
                : `<span class="sr-fields">${fieldCount} inspector field${fieldCount === 1 ? '' : 's'}</span>`;

            row.innerHTML = `
                <span>📜</span>
                <span class="sr-name">${s.id}</span>
                <span class="sr-path">${s.path}</span>
                ${statusHtml}
            `;

            const editBtn = document.createElement('button');
            editBtn.className = 'mini-btn accent';
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', () => EditorScripts.OpenModal(s.id));

            const delBtn = document.createElement('button');
            delBtn.className = 'mini-btn danger';
            delBtn.textContent = '✕';
            delBtn.addEventListener('click', () => EditorScripts.DeleteScript(s.id));

            row.appendChild(editBtn);
            row.appendChild(delBtn);
            list.appendChild(row);
        }
    },

    AppendConsole(level, text) {
        const log = document.getElementById('console-log');
        if (!log) return;
        const line = document.createElement('div');
        line.className = `console-line ${level}`;
        const ts = new Date().toLocaleTimeString();
        line.textContent = `[${ts}] ${text}`;
        log.appendChild(line);
        log.scrollTop = log.scrollHeight;

        if (level === 'error') {
            this._consoleErrors++;
            const badge = document.getElementById('console-badge');
            if (badge) {
                badge.textContent = String(this._consoleErrors);
                badge.style.display = 'inline-block';
            }
        }
    },

    ClearConsole() {
        document.getElementById('console-log').innerHTML = '';
        this._consoleErrors = 0;
        const badge = document.getElementById('console-badge');
        if (badge) badge.style.display = 'none';
    },

    ShowToast(msg) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
    },

    // ── Event Wiring ─────────────────────────────────────────

    _bindToolbar() {
        document.getElementById('select-sample').addEventListener('change', (e) => {
            if (EditorState.playState !== 'edit') EditorPlaytest.Stop();
            EditorState.LoadSample(e.target.value);
            this.ShowToast(`Loaded sample: ${EditorState.scene.meta.name}`);
        });

        document.getElementById('btn-open-folder').addEventListener('click', () => EditorProjectIO.OpenLocalFolder());
        document.getElementById('btn-save-folder').addEventListener('click', () => EditorProjectIO.SaveToFolder());

        const fileProj = document.getElementById('file-project');
        document.getElementById('btn-load-project').addEventListener('click', () => fileProj.click());
        fileProj.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                await EditorProjectIO.ImportFiles(e.target.files);
                fileProj.value = '';
            }
        });

        document.getElementById('btn-export-scene').addEventListener('click',  () => EditorProjectIO.ExportSceneJSON());
        document.getElementById('btn-export-bundle').addEventListener('click', () => EditorProjectIO.ExportProjectBundle());
        document.getElementById('btn-export-html').addEventListener('click',   () => EditorProjectIO.ExportPlayableHTML());

        // Transform tools
        document.querySelectorAll('#tool-group [data-tool]').forEach(btn => {
            btn.addEventListener('click', () => this.SetActiveTool(btn.dataset.tool));
        });

        document.getElementById('btn-undo').addEventListener('click', () => EditorState.Undo());
        document.getElementById('btn-redo').addEventListener('click', () => EditorState.Redo());

        document.getElementById('chk-grid').addEventListener('change', (e) => { EditorState.showGrid = e.target.checked; });
        document.getElementById('chk-snap').addEventListener('change', (e) => { EditorState.snapEnabled = e.target.checked; });
        document.getElementById('grid-size').addEventListener('change', (e) => {
            EditorState.gridSize = Math.max(4, parseInt(e.target.value, 10) || 32);
            if (EditorState.scene?.meta) EditorState.scene.meta.gridSize = EditorState.gridSize;
        });
        document.getElementById('chk-colliders').addEventListener('change', (e) => { EditorState.showColliders = e.target.checked; });
        document.getElementById('chk-live-particles').addEventListener('change', (e) => { EditorState.liveParticles = e.target.checked; });

        // Playtest transport
        document.getElementById('btn-play').addEventListener('click', () => {
            if (EditorState.playState === 'paused') EditorPlaytest.Resume();
            else EditorPlaytest.Start();
        });
        document.getElementById('btn-pause').addEventListener('click', () => EditorPlaytest.TogglePause());
        document.getElementById('btn-step').addEventListener('click',  () => EditorPlaytest.StepFrame());
        document.getElementById('btn-stop').addEventListener('click',  () => EditorPlaytest.Stop());
        document.getElementById('btn-play-restart').addEventListener('click',     () => EditorPlaytest.Start());
        document.getElementById('btn-play-stop-banner').addEventListener('click', () => EditorPlaytest.Stop());
        document.getElementById('chk-play-colliders').addEventListener('change', (e) => EditorPlaytest.SetDrawColliders(e.target.checked));
        document.getElementById('select-play-renderer').addEventListener('change', (e) => { EditorState.playRenderer = e.target.value; });

        // Viewport zoom
        document.getElementById('btn-zoom-in').addEventListener('click',  () => EditorViewport.ZoomStep(1));
        document.getElementById('btn-zoom-out').addEventListener('click', () => EditorViewport.ZoomStep(-1));
        document.getElementById('zoom-display').addEventListener('click', () => EditorViewport.SetZoom(1));
        document.getElementById('btn-fit').addEventListener('click',      () => EditorViewport.FitToScene());

        // Add Entity dropdown
        const addBtn  = document.getElementById('btn-add-entity');
        const addMenu = document.getElementById('add-entity-menu');
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addMenu.style.display = addMenu.style.display === 'none' ? 'flex' : 'none';
        });
        document.addEventListener('click', () => { addMenu.style.display = 'none'; });
        addMenu.querySelectorAll('[data-entity-type]').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.entityType;
                const cfg = EditorState.scene.config || { screenWidth: 800, screenHeight: 500 };
                const ent = EditorState.CreateDefaultEntity(type, cfg.screenWidth / 2, cfg.screenHeight / 2);
                if (type.startsWith('Box2D') && !EditorState.scene.physics.enabled) {
                    EditorState.scene.physics.enabled = true;
                    EditorInspector.RenderPhysicsTab();
                    this.ShowToast('Auto-enabled Box2D Physics World.');
                }
                EditorState.AddEntity(ent);
            });
        });

        document.getElementById('hierarchy-search').addEventListener('input', () => this.RenderHierarchy());
        document.getElementById('btn-dup-entity').addEventListener('click',  () => EditorState.DuplicateSelected());
        document.getElementById('btn-del-entity').addEventListener('click',  () => EditorState.DeleteSelected());
        document.getElementById('btn-save-prefab').addEventListener('click', () => {
            const key = EditorState.SaveSelectedAsPrefab();
            if (key) this.ShowToast(`Saved prefab "${key}"`);
        });

        // Bottom drawer actions
        const fileAsset = document.getElementById('file-asset');
        document.getElementById('btn-import-asset').addEventListener('click', () => fileAsset.click());
        fileAsset.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                await EditorProjectIO.ImportFiles(e.target.files);
                fileAsset.value = '';
            }
        });
        document.getElementById('btn-new-script').addEventListener('click',     () => EditorScripts.OpenModal(null));
        document.getElementById('btn-reload-scripts').addEventListener('click', () => EditorProjectIO.ReloadScriptsFromFolder());
        document.getElementById('btn-clear-console').addEventListener('click',  () => this.ClearConsole());
    },

    SetActiveTool(tool) {
        EditorState.activeTool = tool;
        document.querySelectorAll('#tool-group [data-tool]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
    },

    _bindTabs() {
        document.querySelectorAll('#left-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#left-tabs .tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('#left-panel .tab-pane').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(`tab-${btn.dataset.leftTab}`).classList.add('active');
            });
        });

        document.querySelectorAll('#right-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#right-tabs .tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('#inspector-scroll .insp-pane').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(`insp-${btn.dataset.rightTab}`).classList.add('active');
            });
        });

        document.querySelectorAll('#bottom-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#bottom-tabs .tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('#bottom-drawer .drawer-pane').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const tab = btn.dataset.bottomTab;
                document.getElementById(`drawer-${tab}`).classList.add('active');

                document.getElementById('btn-import-asset').style.display  = tab === 'assets'  ? 'inline-block' : 'none';
                document.getElementById('btn-new-script').style.display    = tab === 'scripts' ? 'inline-block' : 'none';
                document.getElementById('btn-reload-scripts').style.display = (tab === 'scripts' && EditorState.folderHandle) ? 'inline-block' : 'none';
                document.getElementById('btn-clear-console').style.display = tab === 'console' ? 'inline-block' : 'none';
            });
        });
    },

    _bindResizers() {
        document.querySelectorAll('.col-resizer, .row-resizer').forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const which = handle.dataset.resize;
                const onMove = (ev) => {
                    if (which === 'left') {
                        document.getElementById('left-panel').style.width = `${Math.max(190, Math.min(420, ev.clientX))}px`;
                    }
                    else if (which === 'right') {
                        document.getElementById('right-panel').style.width = `${Math.max(240, Math.min(520, window.innerWidth - ev.clientX))}px`;
                    }
                    else if (which === 'bottom') {
                        document.getElementById('bottom-drawer').style.height = `${Math.max(110, Math.min(window.innerHeight * 0.45, window.innerHeight - ev.clientY))}px`;
                    }
                    EditorViewport.Resize();
                };
                const onUp = () => {
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
            });
        });
    },

    _bindKeyboard() {
        window.addEventListener('keydown', (e) => {
            const tag = document.activeElement?.tagName;
            const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

            if (e.key === 'F5') {
                e.preventDefault();
                if (EditorState.playState === 'edit') EditorPlaytest.Start();
                else EditorPlaytest.Stop();
                return;
            }
            if (e.key === 'Escape' && EditorState.playState !== 'edit') {
                EditorPlaytest.Stop();
                return;
            }

            if (inInput || EditorState.playState !== 'edit') return;

            if (e.code === 'Space') { EditorViewport._spaceHeld = true; e.preventDefault(); return; }
            if (e.ctrlKey && e.key.toLowerCase() === 'z') { e.preventDefault(); EditorState.Undo(); return; }
            if (e.ctrlKey && e.key.toLowerCase() === 'y') { e.preventDefault(); EditorState.Redo(); return; }
            if (e.ctrlKey && e.key.toLowerCase() === 'd') { e.preventDefault(); EditorState.DuplicateSelected(); return; }
            if (e.ctrlKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                if (EditorState.folderHandle) EditorProjectIO.SaveToFolder();
                else EditorProjectIO.ExportSceneJSON();
                return;
            }

            const k = e.key.toLowerCase();
            if (k === 'w') this.SetActiveTool('move');
            else if (k === 'e') this.SetActiveTool('rotate');
            else if (k === 'r') this.SetActiveTool('scale');
            else if (k === 'f') EditorViewport.FocusEntity(EditorState.GetPrimarySelected());
            else if (e.key === 'Delete' || e.key === 'Backspace') EditorState.DeleteSelected();
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') EditorViewport._spaceHeld = false;
        });
    }
};

window.addEventListener('DOMContentLoaded', () => SceneEditorUI.Init());
