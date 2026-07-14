# UI & Menus

The engine uses two complementary approaches for UI:

- **HTML + CSS overlays** — standard web elements (divs, buttons, animations) positioned on top of the canvas. Best for menus, HUDs, and any UI that benefits from CSS transitions, layouts, or accessibility. Managed through the `HTMLMenu` helper class (`engine/htmlmenu.js`).
- **In-canvas drawing** — `TextLabel` and direct renderer calls drawn during `Draw()`. Best for score counters, health bars, and anything that needs to move with the game world.

---

## HTML Overlay Approach

### HTML structure

The canvas sits inside a **relative-positioned container**. Menu divs are absolutely positioned siblings of the canvas so they overlay it exactly:

```html
<div id="container">
    <canvas id="myCanvas" width="640" height="480"></canvas>

    <!-- Main menu — covers the canvas -->
    <div id="mainMenu">
        <h1>My Game</h1>
        <div class="menuButton" id="menuStart">Start</div>
        <div class="menuButton" id="menuCredits">Credits</div>
    </div>

    <!-- In-game UI panel — shown/hidden during gameplay -->
    <div id="ingameUI" class="hidden">
        <button id="upgrade1">Upgrade 1</button>
        <button id="upgrade2">Upgrade 2</button>
    </div>
</div>
```

### CSS structure

```css
#container {
    position: relative;  /* required — overlays use position: absolute inside this */
    /* do NOT add overflow: hidden here — it clips absolutely-positioned overlays */
}

#mainMenu {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background-color: rgba(0, 0, 50, 0.9);
    transition: left 0.5s;  /* slide in/out transition */
}

.hidden {
    display: none;
}
```

### The `HTMLMenu` class

`HTMLMenu` (`engine/htmlmenu.js`) is a thin helper that wires CSS selectors to DOM elements and attaches click callbacks. Extend it for each menu in your game.

**Constructor**

```javascript
new HTMLMenu(game, menuContainerSelector, canvasContainerSelector, canvas, coverCanvas, syncWithCanvas, clipToCanvasContainer)
```

| Parameter | Default | Description |
|---|---|---|
| `game` | — | Reference to your `Game` instance (gives menu access to game state) |
| `menuContainerSelector` | — | CSS selector for the menu `<div>` (e.g. `"#mainMenu"`) |
| `canvasContainerSelector` | — | CSS selector for the wrapper `<div>` (e.g. `"#container"`) |
| `canvas` | — | The `canvas` DOM element |
| `coverCanvas` | `true` | When `true`, positions the overlay directly above the canvas at the same logical size. Works in both normal-flow and `fillWindow` modes — see below. This flag controls layout behavior, not visibility priority. |
| `syncWithCanvas` | `false` | When `true`, re-syncs the overlay position/transform every time the window resizes (via `game.WindowResized`). Required when `fillWindow` is active so the overlay scales identically with the canvas. Safe to combine with `coverCanvas`. |
| `clipToCanvasContainer` | `false` | When `true` and `fillWindow` is active, syncs the canvas container to the canvas transform and places the menu as absolute inside it. Use this when you want `overflow: hidden` on the canvas container to clip menu slide transitions. |

> Menus are always layered above the canvas by default. `coverCanvas` changes how the menu is laid out/synced, but does not decide whether it appears in front of the canvas.

**Key methods**

| Method | Description |
|---|---|
| `Start()` | Call once (from your `Game.Start()`). Applies `coverCanvas` and/or `syncWithCanvas` positioning. |
| `SetupElements(selectors[])` | Registers DOM elements by CSS selector for later access via `this.elements["#id"]` and automatically enables `pointer-events: auto` on those elements. |
| `SetupButtons([ {selector, callback} ])` | Registers click listeners; callbacks are bound to your class methods; button elements automatically get `pointer-events: auto`. |
| `SetContainerStyle(styleString)` | Applies the given style declarations to the container (for example `top`, `left`, `opacity`) without removing engine-managed layout styles |
| `SetupFillWindowOverlay()` | Called automatically by `Start()` when `syncWithCanvas` is `true`. Can also be called manually. |

> The menu container itself may use `pointer-events: none` for canvas passthrough. You normally should **not** add manual CSS rules like `pointer-events: auto` to every panel/button anymore — registered elements/buttons are made interactable automatically.

---

### Overlay positioning: `coverCanvas` and `syncWithCanvas`

How the overlay is positioned depends on two flags and whether `fillWindow` is active:

| `coverCanvas` | `syncWithCanvas` | `fillWindow` | Result |
|---|---|---|---|
| `true` | `false` | `false` | `position:absolute` over the canvas — same size, no scaling |
| `true` | `false` | `true` | `position:fixed` + z-index above the canvas — visible on top, no scaling |
| `false` | `true` | `true` | `position:fixed` + matches canvas CSS transform — content **scales** with canvas on resize |
| `true` | `true` | `true` | Same as above — overlay covers the canvas **and** scales with it |

> **`fillWindow` detection** is automatic: `_syncStyles()` checks whether `canvas.style.position === 'fixed'` (which the renderer sets when fill-window mode is active) and chooses the correct positioning strategy.

> **Avoid `overflow: hidden`** on the canvas container div. It clips absolutely-positioned overlays in normal-flow mode and can hide fixed overlays in certain browser configurations.

#### Overlay for `fillWindow` games — example

When the game uses `fillWindow: true`, pass `syncWithCanvas: true` so the overlay scales with the canvas on every window resize:

```javascript
class GameHUD extends HTMLMenu {
    constructor(game, canvas) {
        // coverCanvas=true  → overlay covers the canvas
        // syncWithCanvas=true → re-syncs on resize so content scales with the canvas
        super(game, '#hud', '#canvas-container', canvas, true, true);
    }

    Start() {
        super.Start(); // applies positioning automatically
        this.SetupElements(['#score', '#lives']);
    }

    UpdateHUD() {
        this.elements['#score'].textContent = this.game.score;
        this.elements['#lives'].textContent = this.game.lives;
    }
}
```

And in the `Game` class:

```javascript
Start() {
    super.Start(); // renderer applies fillWindow CSS before this line returns

    this.hud = new GameHUD(this, canvas);
    this.hud.Start(); // positioning is set up here, after the canvas is already fixed
    this.hud.SetupElements(['#score']);
}
```

The HTML structure for a `fillWindow` game:

```html
<body>
    <div id="canvas-container">
        <canvas id="myCanvas" width="720" height="1280"></canvas>
    </div>
    <!-- HUD overlay — positioned and scaled by HTMLMenu.Start() -->
    <div id="hud">
        <span id="score">0</span>
        <span id="lives">3</span>
    </div>
</body>
```

> `#hud` is placed **outside** `#canvas-container` when using `fillWindow`, because in fill-window mode the canvas has `position:fixed` and the container collapses to zero height — the overlay is positioned programmatically anyway.

---

### Example: a sliding main menu

This is the pattern used in the [menu example](https://maxi-jp.github.io/spark.js/menu.html):

**JS — subclass `HTMLMenu`**

```javascript
class MainMenu extends HTMLMenu {
    constructor(game, canvas) {
        // "#mainMenu" is the menu div, "#container" is the canvas wrapper
        super(game, "#mainMenu", "#container", canvas, true);
    }

    Start() {
        super.Start();

        // Register elements and button callbacks
        this.SetupElements(["#menuStart", "#menuCredits", "#credits"]);
        this.SetupButtons([
            { selector: "#menuStart",   callback: this.OnStartButton.bind(this) },
            { selector: "#menuCredits", callback: this.OnCreditsButton.bind(this) },
        ]);
    }

    // Slide the menu off-screen to the left
    OnStartButton() {
        this.SetContainerStyle("left: -100%");
        this.game.OnMenuStart();        // notify the Game class
    }

    // Slide the menu back on-screen
    ShowMenu() {
        this.SetContainerStyle("left: 0%");
    }
}
```

**JS — `Game` class wiring**

```javascript
class MyGame extends Game {
    constructor(renderer) {
        super(renderer);
        this.mainMenu = null;
        this.onMenu = true;
    }

    Start() {
        super.Start();

        this.mainMenu = new MainMenu(this, canvas);
        this.mainMenu.Start();
        this.onMenu = true;

        // Re-open the menu with Escape
    }

    Update(deltaTime) {
        super.Update(deltaTime);

        if (Input.IsKeyUp(KEY_ESCAPE)) {
            this.mainMenu.ShowMenu();
            this.onMenu = true;
        }
    }

    // Called by MainMenu when the Start button is clicked
    OnMenuStart() {
        this.onMenu = false;
    }
}
```

---

### Example: an in-game UI panel

This is the pattern used in the [menu-and-ui example](https://maxi-jp.github.io/spark.js/menu-and-ui.html) — an upgrade panel that can be toggled during gameplay:

```javascript
class UIMenu extends HTMLMenu {
    constructor(game, canvas) {
        // coverCanvas=false — this panel does NOT need to fill the whole canvas
        super(game, "#ingameUI", "#container", canvas, false);
    }

    Start() {
        super.Start();

        this.SetupElements(["#ingameUI", "#upgrade1", "#upgrade2", "#upgrade3"]);
        this.SetupButtons([
            { selector: "#upgrade1", callback: this.UpgradeButton.bind(this, 1) },
            { selector: "#upgrade2", callback: this.UpgradeButton.bind(this, 2) },
            { selector: "#upgrade3", callback: this.UpgradeButton.bind(this, 3) },
        ]);
    }

    Show() { this.elements["#ingameUI"].classList.remove("hidden"); }
    Hide() { this.elements["#ingameUI"].classList.add("hidden"); }

    UpgradeButton(id) {
        this.game.OnUpgradeClick(id);
    }

    // Update a button's displayed value from game code
    UpdateButtonCost(id, newCost) {
        this.elements["#upgrade" + id].querySelector("p").innerText = newCost + "€";
    }
}
```

Toggle it from the `Game`:

```javascript
if (Input.IsKeyDown(KEY_SPACE)) {
    this.onUpgradeMenu ? this.uiMenu.Hide() : this.uiMenu.Show();
    this.onUpgradeMenu = !this.onUpgradeMenu;
}
```

---

## In-Canvas UI with `TextLabel`

For score displays, timers, and HUD text drawn directly on the canvas, use `TextLabel`:

```javascript
// Create labels (typically in Start())
this.scoreLabel   = new TextLabel("Score: 0", new Vector2(8, 8), "18px Arial", "white", "left", "top");
this.centerLabel  = new TextLabel("PAUSED", new Vector2(320, 240), "36px Arial", "yellow", "center", "middle");

// Update text at any time
this.scoreLabel.text = `Score: ${this.score}`;

// Draw them in Draw() — they render on top of gameObjects
Draw() {
    super.Draw();
    this.scoreLabel.Draw(this.renderer);
    if (this.paused)
        this.centerLabel.Draw(this.renderer);
}
```

**`TextLabel` constructor:**

```javascript
new TextLabel(text, position, font, color, align, baseline, visible)
```

| Parameter | Default | Description |
|---|---|---|
| `text` | — | Initial string |
| `position` | — | `Vector2` — screen position |
| `font` | — | CSS font string, e.g. `"18px Arial"` |
| `color` | — | CSS color string or engine `Color` |
| `align` | `"left"` | `"left"` \| `"center"` \| `"right"` |
| `baseline` | `"top"` | `"top"` \| `"middle"` \| `"bottom"` |
| `visible` | `true` | Toggle without removing the object |

---

## Live demos

- [HTML + CSS main menu](https://maxi-jp.github.io/spark.js/menu.html) — sliding menu with credits scroll
- [HTML + CSS menu and in-game UI](https://maxi-jp.github.io/spark.js/menu-and-ui.html) — toggling upgrade panel with two-way data binding between HTML and canvas
- [Rumble Test (HTML UI)](https://maxi-jp.github.io/spark.js/rumble-test-html.html) — HUD overlay built with `coverCanvas=true`; HTML controls float over the canvas while the canvas runs a pure animation layer underneath
