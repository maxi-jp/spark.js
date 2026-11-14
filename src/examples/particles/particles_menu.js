// ============================================================
// ParticlesShowcaseMenu
// HTML+CSS HUD & Sidebar overlay for the Particle System Showcase.
// Extends HTMLMenu so layout, pointer passthrough, and canvas
// resize/fillWindow syncing are handled by the engine.
// ============================================================

class ParticlesShowcaseMenu extends HTMLMenu {
    /**
     * @param {ParticlesShowcase} game
     * @param {HTMLCanvasElement} canvas
     */
    constructor(game, canvas) {
        super(game, "#particles-ui", "#canvas-container", canvas, true, true);

        this._sceneRows = [];
        this._presetRows = [];
        this._shapeBtns = [];
        this._autopilotBtn = null;
        this._scenesGroup = null;
        this._presetsGroup = null;

        this._lastLine1 = "";
        this._lastLine2 = "";
    }

    Start() {
        super.Start();

        this.SetupElements([
            "#ps-sidebar",
            "#ps-banner",
            "#ps-telemetry-1",
            "#ps-telemetry-2",
            "#ps-list",
            "#ps-banner-title",
            "#ps-banner-hint"
        ]);

        this.SetupButtons([
            {
                selector: "#ps-show-ui-btn",
                callback: () => {
                    this.game.showUI = true;
                    this.SyncState();
                }
            },
            {
                selector: "#ps-renderer-btn",
                callback: () => this.game._toggleRenderer()
            },
            {
                selector: "#ps-tab-scenes",
                callback: () => this.game._selectScene(this.game.sceneIndex)
            },
            {
                selector: "#ps-tab-presets",
                callback: () => this.game._selectPreset(this.game.presetIndex)
            }
        ]);

        const tabScenes = document.querySelector("#ps-tab-scenes");
        const tabPresets = document.querySelector("#ps-tab-presets");
        if (tabScenes)
            tabScenes.textContent = `🎬 Scenes (${SCENE_ITEMS.length})`;
        if (tabPresets)
            tabPresets.textContent = `✨ Presets (${PRESET_ITEMS.length})`;

        this._buildLists();
        this.SyncState();
    }

    /**
     * Re-binds the overlay to a newly created canvas when switching
     * live between Canvas2DRenderer and WebGLRenderer.
     * @param {HTMLCanvasElement} newCanvas
     */
    SetCanvas(newCanvas) {
        this.canvas = newCanvas;
        this._ensureAboveCanvas();
        this._syncStyles();
        this.SyncState();
    }

    /**
     * Builds the dynamic scene rows, preset rows, autopilot toggle, and
     * renderShape switcher inside `#ps-list`.
     * @private
     */
    _buildLists() {
        const list = this.elements["#ps-list"];
        if (!list)
            return;

        list.innerHTML = "";

        // ── Scenes group ──────────────────────────────────────────────────
        this._scenesGroup = document.createElement("div");
        this._sceneRows = SCENE_ITEMS.map((item, i) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "ps-scene-row";

            const top = document.createElement("div");
            top.className = "ps-scene-top";

            const title = document.createElement("span");
            title.className = "ps-scene-title";
            title.textContent = item.title;

            const badge = document.createElement("span");
            badge.className = "ps-scene-badge";
            badge.textContent = item.badge;

            top.appendChild(title);
            top.appendChild(badge);

            const desc = document.createElement("div");
            desc.className = "ps-scene-desc";
            desc.textContent = item.desc;

            btn.appendChild(top);
            btn.appendChild(desc);
            btn.addEventListener("click", () => this.game._selectScene(i));

            this._scenesGroup.appendChild(btn);
            return btn;
        });

        this._autopilotBtn = document.createElement("button");
        this._autopilotBtn.type = "button";
        this._autopilotBtn.id = "ps-autopilot-btn";
        this._autopilotBtn.addEventListener("click", () => {
            this.game._shipAutoPilot = !this.game._shipAutoPilot;
            this.SyncState();
        });
        this._scenesGroup.appendChild(this._autopilotBtn);
        list.appendChild(this._scenesGroup);

        // ── Presets group ─────────────────────────────────────────────────
        this._presetsGroup = document.createElement("div");
        this._presetRows = PRESET_ITEMS.map((item, i) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "ps-preset-row";
            btn.textContent = `[${item.keyLabel}] ${item.title}`;
            btn.addEventListener("click", () => this.game._selectPreset(i));

            this._presetsGroup.appendChild(btn);
            return btn;
        });

        const shapeRow = document.createElement("div");
        shapeRow.id = "ps-shape-row";
        const shapes = ["sprite", "circle", "rect", "line"];
        this._shapeBtns = shapes.map((shape, s) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "ps-shape-btn";
            btn.textContent = `${s + 1}:${shape}`;
            btn.dataset.shape = shape;
            btn.addEventListener("click", () => this.game._setPresetShape(shape));
            shapeRow.appendChild(btn);
            return btn;
        });
        this._presetsGroup.appendChild(shapeRow);
        list.appendChild(this._presetsGroup);
    }

    /**
     * Updates the two telemetry lines in the sidebar header only when changed.
     * @param {string} line1
     * @param {string} line2
     */
    UpdateTelemetry(line1, line2) {
        if (line1 !== this._lastLine1 && this.elements["#ps-telemetry-1"]) {
            this._lastLine1 = line1;
            this.elements["#ps-telemetry-1"].textContent = line1;
        }
        if (line2 !== this._lastLine2 && this.elements["#ps-telemetry-2"]) {
            this._lastLine2 = line2;
            this.elements["#ps-telemetry-2"].textContent = line2;
        }
    }

    /**
     * Synchronizes DOM visibility, active states, labels, and banner text
     * with the current state of `ParticlesShowcase`.
     */
    SyncState() {
        const g = this.game;

        if (g.showUI) {
            this.RemoveClassFromContainer("ui-hidden");
        }
        else {
            this.AddClassToContainer("ui-hidden");
        }

        const isWebGL = g.renderer instanceof WebGLRenderer;
        const rendererBtn = document.querySelector("#ps-renderer-btn");
        if (rendererBtn) {
            rendererBtn.textContent = isWebGL ? "[R] WebGL" : "[R] Canvas2D";
            rendererBtn.classList.toggle("active", isWebGL);
        }

        const isScenes = g.category === "scenes";
        const tabScenes = document.querySelector("#ps-tab-scenes");
        const tabPresets = document.querySelector("#ps-tab-presets");
        if (tabScenes)
            tabScenes.classList.toggle("active", isScenes);
        if (tabPresets)
            tabPresets.classList.toggle("active", !isScenes);

        if (this._scenesGroup)
            this._scenesGroup.style.display  = isScenes ? "block" : "none";
        if (this._presetsGroup)
            this._presetsGroup.style.display = isScenes ? "none"  : "block";

        if (isScenes) {
            for (let i = 0; i < this._sceneRows.length; i++) {
                this._sceneRows[i].classList.toggle("active", i === g.sceneIndex);
            }
            if (this._autopilotBtn) {
                const showAutopilot = (g._mode === "scene-spaceship");
                this._autopilotBtn.style.display = showAutopilot ? "block" : "none";
                if (showAutopilot) {
                    this._autopilotBtn.textContent = g._shipAutoPilot
                        ? "[M] Flight: Autopilot (Figure-8)"
                        : "[M] Flight: Mouse Steer";
                }
            }
        }
        else {
            for (let i = 0; i < this._presetRows.length; i++) {
                const item = PRESET_ITEMS[i];
                const active = (i === g.presetIndex);
                const row = this._presetRows[i];
                row.classList.toggle("active", active);

                let label = `[${item.keyLabel}] ${item.title}`;
                if (active && (item.id === "spritesheet-smoke" || item.id === "spritesheet-smoke-stream") && g._particleSystem) {
                    label += ` (${g._particleSystem.config.frameMode})`;
                }
                if (row.textContent !== label) {
                    row.textContent = label;
                }
            }

            const curShape = g._particleSystem ? (g._particleSystem.config.renderShape || "sprite") : "sprite";
            for (let i = 0; i < this._shapeBtns.length; i++) {
                this._shapeBtns[i].classList.toggle("active", this._shapeBtns[i].dataset.shape === curShape);
            }
        }

        // Bottom-right active effect banner
        const bannerTitle = this.elements["#ps-banner-title"];
        const bannerHint  = this.elements["#ps-banner-hint"];
        if (bannerTitle && bannerHint) {
            if (isScenes) {
                const sc = SCENE_ITEMS[g.sceneIndex];
                bannerTitle.textContent = `${sc.title}  —  ${sc.desc}`;
                bannerHint.textContent  = sc.hint;
            }
            else {
                const pr = PRESET_ITEMS[g.presetIndex];
                bannerTitle.textContent = `[${pr.keyLabel}] ${pr.title}  —  ${pr.desc}`;
                bannerHint.textContent  = "Click / Space: Pooled ParticleSystemGO Burst  |  Keys 1-4: Switch renderShape  |  Key R: Toggle WebGL";
            }
        }
    }
}
