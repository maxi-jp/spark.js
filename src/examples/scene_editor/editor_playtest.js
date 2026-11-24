// =====================================================================
// spark.js Scene Editor — Sandboxed <iframe> Play-in-Editor Runner
// Zero leaked globals, zero leaked rAF/Input listeners, live Console bridge
// =====================================================================

const EditorPlaytest = {
    iframe: null,
    _consoleBound: false,

    Init() {
        if (!this._consoleBound) {
            this._consoleBound = true;
            window.addEventListener('message', (ev) => {
                if (!ev.data || ev.data.type !== 'spark-console') return;
                SceneEditorUI.AppendConsole(ev.data.level || 'log', ev.data.text || '');
            });
        }
    },

    async Start() {
        // Auto-reload external VS Code edits when a local folder is open
        if (EditorState.folderHandle) {
            await EditorProjectIO.ReloadScriptsFromFolder();
        }

        this.Stop(false);

        const wrap = document.getElementById('playtest-wrap');
        const host = document.getElementById('playtest-frame-host');
        const cfg  = EditorState.scene.config || { screenWidth: 800, screenHeight: 500 };

        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
        iframe.width  = String((cfg.screenWidth  || 800) + 4);
        iframe.height = String((cfg.screenHeight || 500) + 4);
        iframe.srcdoc = this.BuildRunnerHTML({ standaloneExport: false });

        host.innerHTML = '';
        host.appendChild(iframe);
        this.iframe = iframe;

        wrap.style.display = 'flex';
        EditorState.playState = 'playing';

        const drawColChk = document.getElementById('chk-play-colliders');
        if (drawColChk) drawColChk.checked = Boolean(cfg.drawColliders);

        SceneEditorUI.UpdatePlayUI();
        SceneEditorUI.AppendConsole('log', `▶ Started Play Mode ("${EditorState.scene.meta?.name || 'Scene'}")`);

        iframe.addEventListener('load', () => {
            try { iframe.contentWindow.focus(); } catch (_) {}
        });
    },

    Pause() {
        if (!this.iframe || EditorState.playState !== 'playing') return;
        EditorState.playState = 'paused';
        this.iframe.contentWindow.postMessage({ type: 'spark-ctrl', cmd: 'pause' }, '*');
        SceneEditorUI.UpdatePlayUI();
    },

    Resume() {
        if (!this.iframe || EditorState.playState !== 'paused') return;
        EditorState.playState = 'playing';
        this.iframe.contentWindow.postMessage({ type: 'spark-ctrl', cmd: 'resume' }, '*');
        SceneEditorUI.UpdatePlayUI();
        try { this.iframe.contentWindow.focus(); } catch (_) {}
    },

    TogglePause() {
        if (!this.iframe || EditorState.playState === 'edit') return;
        if (EditorState.playState === 'playing') {
            this.Pause();
        }
        else {
            this.Resume();
        }
    },

    StepFrame() {
        if (!this.iframe || EditorState.playState !== 'paused') return;
        this.iframe.contentWindow.postMessage({ type: 'spark-ctrl', cmd: 'step' }, '*');
    },

    SetDrawColliders(enabled) {
        if (!this.iframe) return;
        this.iframe.contentWindow.postMessage({ type: 'spark-ctrl', cmd: 'drawColliders', value: Boolean(enabled) }, '*');
    },

    Stop(emitUI = true) {
        if (this.iframe) {
            this.iframe.remove();
            this.iframe = null;
        }
        const wrap = document.getElementById('playtest-wrap');
        if (wrap) wrap.style.display = 'none';
        EditorState.playState = 'edit';
        if (emitUI) {
            SceneEditorUI.UpdatePlayUI();
            SceneEditorUI.AppendConsole('log', '⏹ Stopped Play Mode.');
        }
    },

    /**
     * Generates a complete HTML document that boots `SceneGame` (or `Box2DSceneGame`)
     * with the current scene JSON, user scripts, and resolved asset URLs.
     * Used both for Play-in-Editor `srcdoc` AND "Export Playable HTML".
     */
    BuildRunnerHTML({ standaloneExport = false } = {}) {
        const sceneClone = JSON.parse(JSON.stringify(EditorState.scene));
        const useBox2D = Boolean(sceneClone.physics?.enabled);
        const useWebGL = !standaloneExport && EditorState.playRenderer === 'webgl';

        // Build URL override map for imported / local-folder assets
        const urlOverrides = { images: {}, audio: {} };
        for (const [k, entry] of Object.entries(sceneClone.assets?.images || {})) {
            if (entry._dataUrl) {
                urlOverrides.images[k] = entry._dataUrl;
                delete entry._dataUrl;
            }
            else if (EditorState.runtimeAssets.images[k]?.url && !standaloneExport) {
                urlOverrides.images[k] = EditorState.runtimeAssets.images[k].url;
            }
            if (EditorState.runtimeAssets.images[k]?.atlas && !entry.atlas) {
                entry.atlas = EditorState.runtimeAssets.images[k].atlas;
            }
        }
        for (const [k, entry] of Object.entries(sceneClone.assets?.audio || {})) {
            if (entry._dataUrl) {
                urlOverrides.audio[k] = entry._dataUrl;
                delete entry._dataUrl;
            }
        }

        const baseHref = standaloneExport ? '' : `<base href="${window.location.href.replace(/[^/]*$/, '')}">`;
        const box2dScripts = useBox2D ? `
    <script src="src/lib/Box2D.js"></script>
    <script src="src/engine/box2d_helper.js"></script>
    <script src="src/engine/box2d_game.js"></script>
    <script src="src/engine/box2d_gameobjects.js"></script>` : '';

        const userScriptsBlock = Object.values(EditorState.scripts)
            .map(s => `// --- ${s.id} ---\n${s.code}`)
            .join('\n\n')
            .replace(/<\/script>/gi, '<\\/script>');

        const safeSceneJson = JSON.stringify(sceneClone).replace(/<\/script>/gi, '<\\/script>');
        const safeOverrides = JSON.stringify(urlOverrides).replace(/<\/script>/gi, '<\\/script>');
        const gameBaseClass = useBox2D ? 'Box2DSceneGame' : 'SceneGame';

        const consoleBridge = standaloneExport ? '' : `
    <script>
        (function() {
            const forward = (level, args) => {
                try {
                    const text = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
                    window.parent.postMessage({ type: 'spark-console', level, text }, '*');
                } catch (_) {}
            };
            ['log', 'warn', 'error'].forEach(lvl => {
                const orig = console[lvl].bind(console);
                console[lvl] = (...args) => { orig(...args); forward(lvl, args); };
            });
            window.addEventListener('error', (e) => forward('error', [e.message + ' (line ' + e.lineno + ')']));
            window.addEventListener('unhandledrejection', (e) => forward('error', ['Unhandled Promise:', e.reason]));
        })();
    </script>`;

        const playtestControls = standaloneExport ? '' : `
        // Play / Pause / Step controller for Scene Editor
        let __paused = false;
        const __origUpdate = Update;
        Update = function(dt) {
            if (!__paused) __origUpdate(dt);
        };
        window.addEventListener('message', (ev) => {
            if (!ev.data || ev.data.type !== 'spark-ctrl') return;
            if (ev.data.cmd === 'pause')  __paused = true;
            if (ev.data.cmd === 'resume') __paused = false;
            if (ev.data.cmd === 'step')   { __origUpdate(1 / 60); Draw(); }
            if (ev.data.cmd === 'drawColliders' && game) { game.config.drawColliders = ev.data.value; }
        });`;

        const webglQueryHack = useWebGL
            ? `try { history.replaceState(null, '', '?webgl'); } catch (_) {}`
            : '';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${(sceneClone.meta?.name || 'spark.js Game').replace(/</g, '&lt;')}</title>
    ${baseHref}
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0e0e12; display: flex; align-items: center; justify-content: center; min-height: 100vh; overflow: hidden; }
        canvas { display: block; outline: none; }
    </style>
    ${consoleBridge}
    <script src="src/engine/utils_math.js"></script>
    <script src="src/engine/utils_classes.js"></script>
    <script src="src/engine/renderer.js"></script>
    <script src="src/engine/gameobjects.js"></script>
    <script src="src/engine/input.js"></script>
    <script src="src/engine/audioplayer.js"></script>
    <script src="src/engine/particlesystem.js"></script>
    <script src="src/engine/htmlmenu.js"></script>
    <script src="src/engine/virtualcontrols.js"></script>
    <script src="src/engine/game.js"></script>${box2dScripts}
    <script src="src/engine/scene.js"></script>
    <script src="src/engine/main.js"></script>
</head>
<body>
    <canvas id="gameCanvas" width="${sceneClone.config?.screenWidth || 800}" height="${sceneClone.config?.screenHeight || 500}"></canvas>
    <script>
        ${webglQueryHack}
        ${userScriptsBlock}

        const __SCENE_DATA = ${safeSceneJson};
        const __URL_OVERRIDES = ${safeOverrides};

        class ExportedSceneGame extends ${gameBaseClass} {
            constructor(renderer) {
                super(renderer, __SCENE_DATA, {
                    assetUrlResolver: (path, kind, key) => {
                        if (kind === 'image' && __URL_OVERRIDES.images[key]) return __URL_OVERRIDES.images[key];
                        if (kind === 'audio' && __URL_OVERRIDES.audio[key])  return __URL_OVERRIDES.audio[key];
                        return path;
                    }
                });
            }
        }
        ${playtestControls}
        window.onload = () => Init(ExportedSceneGame, 'gameCanvas');
    </script>
</body>
</html>`;
    }
};
