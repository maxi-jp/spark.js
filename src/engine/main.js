
var canvas = /** @type {HTMLCanvasElement} */(null);
var requestAnimationFrameID = -1;

/** @type {Renderer} The active Renderer instance. Set by the engine at startup and available globally throughout the game's lifetime. */
var renderer = null

var targetDT = 1/60; // 60fps
var globalDT;
var time = 0,
    fps = 0,
    framesAcum = 0,
    acumDelta = 0;
var totalTime = 0.0; // acumulator of the time

var drawStats = true;
var debugMode = false;

/** @type {Game} The active Game instance. Set by the engine at startup and available globally throughout the game's lifetime. */
var game = null;

/** @type {AudioPlayer} The global AudioPlayer instance. Manages all audio playback, volume, and the optional audio analyser. */
var audioPlayer = null;

/**
 * True when the device's primary pointer is coarse (finger/touch), meaning the game is
 * running on a phone or tablet. Hybrid laptops with a touchscreen but a mouse as their
 * primary pointer will be false. Can be used in Game.Start() to decide whether to show
 * virtual controls.
 * @type {boolean}
 */
var mobileWithTouchScreen = navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches;

function LoadImages(assets, onloaded) {
    if (assets === null || Object.keys(assets).length === 0) {
        onloaded();
        return;
    }

    // Count every image AND every co-located atlas JSON that needs fetching.
    let pendingCount = 0;

    const done = () => {
        if (--pendingCount === 0)
            onloaded();
    };

    for (let assetKey in assets) {
        if (!assets.hasOwnProperty(assetKey))
            continue;

        const entry = assets[assetKey];

        // ── Image ──────────────────────────────────────────────
        pendingCount++;
        const img = entry.img = new Image();
        img.src = entry.path;
        img.onload = () => {
            let result = entry.img;
            if (entry.bgColor) {
                result = ApplyColorKey(entry.img, entry.bgColor);
                entry.img = result;
            }
            result.halfWidth  = result.width  / 2;
            result.halfHeight = result.height / 2;
            done();
        };

        // ── Co-located atlas JSON (optional) ───────────────────
        if (entry.atlasJsonPath) {
            pendingCount++;
            fetch(entry.atlasJsonPath)
                .then(r => {
                    if (!r.ok)
                        throw new Error(`HTTP ${r.status}: ${r.statusText}`);
                    return r.json();
                })
                .then(data => {
                    entry.atlas = data;
                    done();
                })
                .catch(err => {
                    console.error(`Failed to load atlas JSON for "${assetKey}" (${entry.atlasJsonPath}):`, err);
                    done();
                });
        }
    }
}

/**
 * Load JSON assets (e.g., Tiled maps) from the game's tiledAssets object.
 * @param {Object} assets - Object with entries like { mapName: { path: "...", data: null } }
 * @param {Function} onloaded - Callback when all JSON files are loaded
 */
function LoadJSON(assets, onloaded) {
    if (assets === null || Object.keys(assets).length === 0) {
        onloaded();
        return;
    }
    
    let jsonToLoad = Object.keys(assets).length;
    let loadedCount = 0;

    const onload = function(assetKey, data) {
        assets[assetKey].data = data;
        loadedCount++;
        if (loadedCount === jsonToLoad) {
            onloaded();
        }
    };

    const onerror = function(assetKey, error) {
        console.error(`Failed to load JSON asset "${assetKey}":`, error);
        loadedCount++;
        if (loadedCount === jsonToLoad) {
            onloaded();
        }
    };

    // Load each JSON file
    for (let assetKey in assets) {
        if (assets.hasOwnProperty(assetKey)) {
            const entry = assets[assetKey];
            fetch(entry.path)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => onload(assetKey, data))
                .catch(error => onerror(assetKey, error));
        }
    }
}

/**
 * Initialize the game engine with a specific game class.
 * @param {Function} GameClass - The game class to instantiate (extends Game)
 * @param {string} [canvasId=null] - Optional canvas element ID. If not provided:
 *   - First looks for any canvas element in the DOM
 *   - If no canvas found, creates one dynamically and appends to body
 */
function Init(GameClass, canvasId = null) {
    // Resolve canvas element
    if (canvasId) {
        // Use specified canvas ID
        canvas = /** @type {HTMLCanvasElement} */ (document.getElementById(canvasId));
        if (!canvas) {
            console.warn(`Canvas with ID "${canvasId}" not found. Creating a new canvas.`);
        }
    }
    
    if (!canvas) {
        // Try to find the first canvas in the DOM
        const canvasElements = document.getElementsByTagName("canvas");
        if (canvasElements.length > 0) {
            canvas = canvasElements[0];
        }
    }
    
    if (!canvas) {
        // No canvas found, create one dynamically
        console.log("No canvas element found in DOM. Creating one dynamically.");
        canvas = document.createElement("canvas");
        canvas.id = "generatedCanvas";
        canvas.width = 640;  // default width
        canvas.height = 480; // default height
        canvas.style.display = "block";
        canvas.style.margin = "0 auto";
        document.body.appendChild(canvas);
        console.log("Canvas created and appended to body with default size 640x480");
    }

    if (window.location.search.includes("webgl")) {
        let gl = canvas.getContext("webgl2");
        if (!gl) {
            // fallback to webgl 1
            gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        }
        renderer = gl ? new WebGLRenderer(canvas, gl) : new Canvas2DRenderer(canvas);
        if (gl)
            SetupStatsHTMLElements();
    }
    else {
        renderer = new Canvas2DRenderer(canvas);
    }

    // input setup
    Input.SetupKeyboardEvents();
    Input.SetupMouseEvents(canvas);
    Input.SetupGamepadEvents();
    Input.ClearMappings();

    if (!game) {
        game = new GameClass(renderer);
    }

    LoadImages(game.graphicAssets, () => {
        console.log(`All image files loaded.`);
        
        LoadJSON(game.tiledAssets, () => {
            console.log(`All Tiled JSON files loaded.`);

            if (game.config.audioAnalyzer) {
                audioPlayer = new AudioPlayer(true, game.config.analyzerfftSize, game.config.analyzerSmoothing);
            }
            else {
                audioPlayer = new AudioPlayer();
            }
            
            audioPlayer.LoadAudio(game.audioAssets, () => {
                console.log("All audio files loaded.");
                console.log("Starting the game...");
                Start();
                Loop();
            });
        });
    });
}

function Start() {
    time = performance.now();

    game.Start();
}

function Loop() {
    requestAnimationFrameID = requestAnimationFrame(Loop);

    // compute FPS
    let now = performance.now();
    let deltaTime = (now - time) / 1000;
    globalDT = deltaTime;

    time = now;

    framesAcum++;
    acumDelta += deltaTime;

    if (acumDelta >= 1) {
        fps = framesAcum;
        framesAcum = 0;
        acumDelta -= 1;
    }

    if (deltaTime > 1)
        return;

    totalTime += deltaTime;

    // Resume audio context and request fullscreen on first user interaction.
    // Fullscreen hides the browser navigation bar on mobile (e.g. Android Chrome),
    // which would otherwise consume ~25% of screen height in landscape.
    if (Input.keyboard.anyKeyPressed || Input.mouse.pressed || Input.touch.any) {
        ResumeAudioContext();
        if (mobileWithTouchScreen && game.config.autoFullscreen && !document.fullscreenElement) {
            document.documentElement.requestFullscreen?.().catch(() => {
                console.warn("Failed to request fullscreen.");
            });
        }
    }
    
    // Process virtual controls first so bindings reflect the current touch state
    // when game.Update() reads them
    Input.UpdateVirtualControls();

    // Game logic ---------
    Update(deltaTime);
    
    // Draw the game ------
    Draw();

    // reset input data ---
    Input.PostUpdate();
}

function Update(deltaTime) {
    // update the game's logic
    game.Update(deltaTime);
}

function Draw() {
    renderer.Clear();

    // draw the game
    game.Draw();

    // draw stats
    if (drawStats)
        DrawStats();
}

function DrawStats() {
    if (renderer instanceof WebGLRenderer) {
        this.statsElements.fps.innerText = `FPS: ${fps.toFixed(1)}`;
        this.statsElements.fpsdt.innerText = `FPS (dt): ${(1 / globalDT).toFixed(2)}`;
        this.statsElements.dt.innerText = `Delta: ${(globalDT * 1000).toFixed(2)} ms`;
    }
    else {
        const ctx = renderer.ctx;

        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(2, 2, 132, 54);

        ctx.fillStyle = "white";
        ctx.textAlign = "start";
        ctx.textBaseline = "bottom"
        ctx.font = "12px Comic Sans MS regular";

        ctx.fillText("FPS: " + fps, 6, 16);
        ctx.fillText("FPS (dt): " + (1 / globalDT).toFixed(2), 6, 34);
        ctx.fillText("deltaTime (ms): " + (globalDT * 1000).toFixed(2), 6, 52);
    }
}

function SetupStatsHTMLElements() {
    if (this.statsElements)
        return;

    this.statsElements = {};

    // Container
    const container = document.createElement('div');
    container.id = 'engine-stats-container';
    container.style.position = 'absolute';
    container.style.top = '8px';
    container.style.left = '8px';
    container.style.background = 'rgba(0,0,0,0.6)';
    container.style.color = '#fff';
    container.style.font = '12px monospace';
    container.style.padding = '4px 8px';
    container.style.borderRadius = '4px';
    container.style.textAlign = 'left';
    container.style.zIndex = 1000;

    // FPS
    const fpsElem = document.createElement('div');
    fpsElem.id = 'engine-stats-fps';
    container.appendChild(fpsElem);

    // FPS (dt)
    const fpsDTElem = document.createElement('div');
    fpsDTElem.id = 'engine-stats-fpsdt';
    container.appendChild(fpsDTElem);

    // DeltaTime
    const dtElem = document.createElement('div');
    dtElem.id = 'engine-stats-dt';
    container.appendChild(dtElem);

    document.body.appendChild(container);

    // Save references
    this.statsElements.parent = container;
    this.statsElements.fps = fpsElem;
    this.statsElements.fpsdt = fpsDTElem;
    this.statsElements.dt = dtElem;
}

function ResumeAudioContext() {
    if (audioPlayer.audioContext.state === "suspended") {
        audioPlayer.audioContext.resume().then(() => {
            console.log("Audio context resumed.");
        }).catch((err) => {
            console.error("Failed to resume AudioContext:", err);
        });
    }
}

// window.onload = Init;
