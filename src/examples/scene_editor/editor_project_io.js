// =====================================================================
// spark.js Scene Editor — Hybrid Project I/O
// 1) Local Folder Mode (File System Access API — Chrome/Edge + VS Code)
// 2) Portable Mode (.scene.json, .spark-project.json bundle, Playable HTML)
// =====================================================================

const EditorProjectIO = {
    // ── Local Folder Mode (File System Access API) ───────────

    async OpenLocalFolder() {
        if (typeof window.showDirectoryPicker !== 'function') {
            SceneEditorUI.ShowToast('Local Folder API requires Chrome/Edge. Use Load JSON / Save Bundle instead.');
            return;
        }

        try {
            const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            EditorState.folderHandle = dirHandle;
            EditorState.folderName = dirHandle.name;

            document.getElementById('btn-save-folder').disabled = false;
            document.getElementById('btn-reload-scripts').style.display = 'inline-block';
            const badge = document.getElementById('folder-badge');
            badge.textContent = `📁 ${dirHandle.name}`;
            badge.style.display = 'inline-block';

            await this._scanFolder(dirHandle);
            SceneEditorUI.ShowToast(`Opened folder "${dirHandle.name}"`);
        }
        catch (err) {
            if (err && err.name !== 'AbortError') {
                console.error('OpenLocalFolder error:', err);
                SceneEditorUI.ShowToast(`Folder error: ${err.message}`);
            }
        }
    },

    async _scanFolder(rootHandle) {
        let foundSceneJson = null;
        const foundImages = [];
        const foundJsons  = [];
        const foundScripts = [];

        const walk = async (dir, prefix = '') => {
            for await (const [name, handle] of dir.entries()) {
                if (name.startsWith('.') || name === 'node_modules') continue;
                const relPath = prefix ? `${prefix}/${name}` : name;
                if (handle.kind === 'directory') {
                    await walk(handle, relPath);
                }
                else if (handle.kind === 'file') {
                    const lower = name.toLowerCase();
                    if (lower === 'scene.json' || lower.endsWith('.scene.json')) {
                        const text = await (await handle.getFile()).text();
                        foundSceneJson = JSON.parse(text);
                    }
                    else if (/\.(png|jpg|jpeg|webp|gif)$/.test(lower)) {
                        foundImages.push({ name, relPath, handle });
                    }
                    else if (lower.endsWith('.json')) {
                        foundJsons.push({ name, relPath, handle });
                    }
                    else if (lower.endsWith('.js') && (prefix.includes('scripts') || !prefix)) {
                        foundScripts.push({ name, relPath, handle });
                    }
                }
            }
        };

        await walk(rootHandle);

        if (foundSceneJson && foundSceneJson.format === 'spark.scene') {
            EditorState.ClearHistory();
            EditorState.selectedIds.clear();
            EditorState.scene = foundSceneJson;
            EditorState.scripts = {};
        }

        // Load discovered images as Object URLs
        for (const item of foundImages) {
            const file = await item.handle.getFile();
            const url = URL.createObjectURL(file);
            const key = item.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_');
            if (!EditorState.scene.assets.images[key]) {
                EditorState.scene.assets.images[key] = { path: item.relPath };
            }
            EditorState.scene.assets.images[key]._dataUrl = url;
            await EditorState.LoadImageAsset(key, url, null);
        }

        // Classify discovered JSON files (SpriteAtlas / Tileset / Particle)
        for (const item of foundJsons) {
            try {
                const data = JSON.parse(await (await item.handle.getFile()).text());
                const key = item.name.replace(/\.json$/i, '').replace(/[^a-zA-Z0-9_]/g, '_');
                if (data.format === 'spark.tileset' || (data.tileWidth && (data.map || data.layers))) {
                    EditorState.scene.assets.tilesets[key] = { path: item.relPath, data };
                    EditorState.runtimeAssets.tilesets[key] = { data };
                }
                else if (data.sprites && typeof data.sprites === 'object') {
                    // Co-located Sprite Atlas JSON — attach to matching image key if present
                    if (EditorState.runtimeAssets.images[key]) {
                        EditorState.runtimeAssets.images[key].atlas = data;
                        EditorState.scene.assets.images[key].atlasJsonPath = item.relPath;
                    }
                }
                else if (data.maxParticleCount !== undefined || data.emitterType !== undefined) {
                    EditorState.scene.assets.particles[key] = { path: item.relPath, data };
                    EditorState.runtimeAssets.particles[key] = { data };
                }
            } catch (_) {}
        }

        // Load discovered scripts
        for (const item of foundScripts) {
            const code = await (await item.handle.getFile()).text();
            const fallback = item.name.replace(/\.js$/i, '');
            EditorScripts.SetScript(fallback, code, item.relPath);
        }

        EditorState.Emit('project-loaded');
    },

    async ReloadScriptsFromFolder() {
        if (!EditorState.folderHandle) return;
        let reloaded = 0;

        const walkScripts = async (dir, prefix = '') => {
            for await (const [name, handle] of dir.entries()) {
                if (name.startsWith('.')) continue;
                const relPath = prefix ? `${prefix}/${name}` : name;
                if (handle.kind === 'directory') {
                    await walkScripts(handle, relPath);
                }
                else if (handle.kind === 'file' && name.toLowerCase().endsWith('.js')) {
                    const code = await (await handle.getFile()).text();
                    EditorScripts.SetScript(name.replace(/\.js$/i, ''), code, relPath);
                    reloaded++;
                }
            }
        };

        await walkScripts(EditorState.folderHandle);
        EditorState.Emit('scripts');
        SceneEditorUI.ShowToast(`Reloaded ${reloaded} script(s) from "${EditorState.folderName}"`);
    },

    async WriteScriptToFolder(relPath, code) {
        if (!EditorState.folderHandle) return;
        try {
            const parts = relPath.split('/').filter(Boolean);
            let dir = EditorState.folderHandle;
            for (let i = 0; i < parts.length - 1; i++) {
                dir = await dir.getDirectoryHandle(parts[i], { create: true });
            }
            const fileHandle = await dir.getFileHandle(parts[parts.length - 1], { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(code);
            await writable.close();
        }
        catch (err) {
            console.warn('WriteScriptToFolder failed:', err);
        }
    },

    async SaveToFolder() {
        if (!EditorState.folderHandle) return;
        try {
            const cleanScene = this.BuildCleanSceneJSON();
            const fileHandle = await EditorState.folderHandle.getFileHandle('scene.json', { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(cleanScene, null, 2));
            await writable.close();

            for (const script of Object.values(EditorState.scripts)) {
                await this.WriteScriptToFolder(script.path || `scripts/${script.id}.js`, script.code);
            }

            SceneEditorUI.ShowToast(`Saved scene.json & scripts to "${EditorState.folderName}"`);
        }
        catch (err) {
            console.error('SaveToFolder error:', err);
            SceneEditorUI.ShowToast(`Save failed: ${err.message}`);
        }
    },

    // ── Portable Asset Import (Images, JSONs, Scripts, Audio) ─

    async ImportFiles(fileList) {
        let count = 0;
        for (const file of fileList) {
            const lower = file.name.toLowerCase();
            const baseKey = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_');

            if (file.type.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif)$/.test(lower)) {
                const dataUrl = await this._readFileAsDataURL(file);
                EditorState.scene.assets.images[baseKey] = { path: `assets/${file.name}`, _dataUrl: dataUrl };
                await EditorState.LoadImageAsset(baseKey, dataUrl, null);
                count++;
            }
            else if (lower.endsWith('.js')) {
                const code = await file.text();
                EditorScripts.SetScript(baseKey, code, `scripts/${file.name}`);
                count++;
            }
            else if (lower.endsWith('.json')) {
                try {
                    const data = JSON.parse(await file.text());
                    if (data.format === 'spark.scene' || data.format === 'spark.project') {
                        await this.LoadProjectObject(data);
                        return;
                    }
                    else if (data.format === 'spark.tileset' || (data.tileWidth && (data.map || data.layers))) {
                        EditorState.scene.assets.tilesets[baseKey] = { path: `assets/${file.name}`, data };
                        EditorState.runtimeAssets.tilesets[baseKey] = { data };
                        count++;
                    }
                    else if (data.sprites && typeof data.sprites === 'object') {
                        // Sprite Atlas JSON — link to matching image key or first image
                        const targetKey = EditorState.runtimeAssets.images[baseKey]
                            ? baseKey
                            : Object.keys(EditorState.runtimeAssets.images)[0];
                        if (targetKey) {
                            EditorState.runtimeAssets.images[targetKey].atlas = data;
                            EditorState.scene.assets.images[targetKey].atlas = data;
                            EditorState.scene.assets.images[targetKey].atlasJsonPath = `assets/${file.name}`;
                            count++;
                        }
                    }
                    else if (data.maxParticleCount !== undefined || data.emitterType !== undefined) {
                        EditorState.scene.assets.particles[baseKey] = { path: `assets/${file.name}`, data };
                        EditorState.runtimeAssets.particles[baseKey] = { data };
                        count++;
                    }
                } catch (err) {
                    SceneEditorUI.ShowToast(`Invalid JSON in ${file.name}: ${err.message}`);
                }
            }
            else if (/\.(wav|mp3|ogg|m4a)$/.test(lower)) {
                const dataUrl = await this._readFileAsDataURL(file);
                EditorState.scene.assets.audio[baseKey] = { path: `assets/${file.name}`, _dataUrl: dataUrl };
                EditorState.runtimeAssets.audio[baseKey] = { url: dataUrl };
                count++;
            }
        }
        if (count > 0) {
            EditorState.Emit('assets');
            SceneEditorUI.ShowToast(`Imported ${count} asset(s)`);
        }
    },

    _readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    // ── Load / Export Scene JSON, Bundle & Playable HTML ─────

    async LoadProjectObject(data) {
        EditorState.ClearHistory();
        EditorState.selectedIds.clear();
        EditorState.runtimeAssets = { images: {}, tilesets: {}, particles: {}, audio: {} };
        EditorState.scripts = {};

        if (data.format === 'spark.project' && data.scene) {
            EditorState.scene = data.scene;
            if (data.scripts) {
                for (const [name, s] of Object.entries(data.scripts)) {
                    EditorScripts.SetScript(name, typeof s === 'string' ? s : s.code, s.path);
                }
            }
        }
        else if (data.format === 'spark.scene') {
            EditorState.scene = data;
        }
        else {
            SceneEditorUI.ShowToast('Unrecognized JSON format (expected spark.scene or spark.project).');
            return;
        }

        await EditorState.RefreshRuntimeAssets();
        EditorState.Emit('project-loaded');
        SceneEditorUI.ShowToast(`Loaded "${EditorState.scene.meta?.name || 'Scene'}"`);
    },

    BuildCleanSceneJSON() {
        const clone = JSON.parse(JSON.stringify(EditorState.scene));
        // Strip internal editor-only `_dataUrl` fields from clean scene.json export
        if (clone.assets?.images) {
            for (const entry of Object.values(clone.assets.images)) {
                if (entry) delete entry._dataUrl;
            }
        }
        if (clone.assets?.audio) {
            for (const entry of Object.values(clone.assets.audio)) {
                if (entry) delete entry._dataUrl;
            }
        }
        return clone;
    },

    ExportSceneJSON() {
        const slug = (EditorState.scene.meta?.name || 'scene').toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
        this.DownloadText(`${slug}.scene.json`, JSON.stringify(this.BuildCleanSceneJSON(), null, 2), 'application/json');
        SceneEditorUI.ShowToast(`Exported ${slug}.scene.json`);
    },

    ExportProjectBundle() {
        const slug = (EditorState.scene.meta?.name || 'project').toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
        const bundle = {
            format: 'spark.project',
            version: 1,
            scene: EditorState.scene,
            scripts: Object.fromEntries(
                Object.entries(EditorState.scripts).map(([k, s]) => [k, { path: s.path, code: s.code }])
            )
        };
        this.DownloadText(`${slug}.spark-project.json`, JSON.stringify(bundle, null, 2), 'application/json');
        SceneEditorUI.ShowToast(`Saved ${slug}.spark-project.json`);
    },

    ExportPlayableHTML() {
        const slug = (EditorState.scene.meta?.name || 'spark_game').toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
        const html = EditorPlaytest.BuildRunnerHTML({ standaloneExport: true });
        this.DownloadText(`${slug}.html`, html, 'text/html');
        SceneEditorUI.ShowToast(`Exported standalone playable ${slug}.html`);
    },

    DownloadText(filename, text, mime = 'text/plain') {
        const blob = new Blob([text], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
};
