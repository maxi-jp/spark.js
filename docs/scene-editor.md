# Scene Editor & Behavior Scripting (`scene.js`)

`spark.js` includes a visual, browser-based **Scene Editor** ([scene-editor.html](../scene-editor.html ':ignore :target=_blank')) and a companion data-driven runtime (`src/engine/scene.js`) that lets you visually assemble 2D scenes, attach reusable `Behavior` scripts to `GameObject`s, configure `Game` settings, Input Actions/Axes, `BackgroundLayers`, Cameras, and Box2D physics, and playtest live in the browser.

---

## Writing a `Behavior` Script

Attachable scripts **must extend `Behavior`** (defined in `src/engine/scene.js` — `gameObject.AddScript()` and `ScriptRegistry.Register()` reject plain objects or classes that do not inherit from `Behavior`). Subclasses may also declare a `static inspector` schema so the Scene Editor can auto-generate Inspector controls and serialize custom values:

```javascript
class PatrolEnemy extends Behavior {
    static inspector = {
        speed:    { type: "number",  default: 140, min: 10, max: 500 },
        distance: { type: "number",  default: 120, min: 10, max: 600 },
        axis:     { type: "select",  default: "x", options: ["x", "y"] }
    };

    Start() {
        this.originX = this.x;
        this.originY = this.y;
        this.dir = 1;
    }

    Update(dt) {
        if (this.axis === "x") {
            this.x += this.speed * this.dir * dt;
            if (Math.abs(this.x - this.originX) >= this.distance)
                this.dir *= -1;
        }
        else {
            this.y += this.speed * this.dir * dt;
            if (Math.abs(this.y - this.originY) >= this.distance)
                this.dir *= -1;
        }
    }
}

ScriptRegistry.Register("PatrolEnemy", PatrolEnemy);
```

### Supported `static inspector` Field Types
| `type` | Inspector Control |
|---|---|
| `number` | Numeric input (`min`, `max`, `step`, `default`) |
| `string` | Text input |
| `boolean` | Checkbox |
| `color` | Color picker (hex string) |
| `select` | Dropdown (`options: [...]`) |
| `entityRef` | Dropdown of scene entities (auto-resolved to `GameObject` at runtime) |
| `prefabId` | Dropdown of scene prefabs (for `this.game.SpawnPrefab(...)`) |
| `imageKey` | Dropdown of scene graphic assets |

### Lifecycle Hooks on `Behavior`
- `Awake()` — called immediately when attached via `go.AddScript(script)`
- `Start()` — called once when the GameObject starts
- `Update(dt)` — called every frame while `enabled` and `go.active` are true
- `Draw(renderer)` — optional overlay draw called after `go.Draw(renderer)`
- `OnCollisionEnter(myCol, otherCol)` / `OnCollisionExit(myCol, otherCol)` / `OnClick()` — standard colliders
- `OnContactDetected(other, contactPoint)` / `OnContactDetectEnded(other)` — Box2D physics bodies
- `Destroy()` — called when the script is removed or the GameObject is destroyed

---

## Running an Exported Scene with `SceneGame`

Export `level1.scene.json` from the Scene Editor, include `src/engine/scene.js` (after `game.js` and before `main.js`) plus your script files, and boot with `SceneGame`:

```javascript
class MyGame extends SceneGame {
    constructor(renderer) {
        super(renderer, "assets/level1.scene.json");
    }
}

window.onload = () => Init(MyGame, "myCanvas");
```

See [scene-demo.html](../scene-demo.html ':ignore :target=_blank') for a complete standalone example.

---

## Scene Editor Workflows

- **Local Folder Mode (Chrome/Edge):** Click **📁 Open Folder** to work directly against a local project directory. Edit `.js` scripts in VS Code (or in the built-in Script Editor modal), hit **Save** (`Ctrl+S`) to write `scene.json` back to disk, and click **▶ Play** (`F5`) — external script edits are automatically reloaded before Play Mode starts.
- **Portable Mode (All Browsers / GitHub Pages):** Import images, sprite atlases, tileset maps, particle JSONs, audio, and `.js` scripts directly into the browser. Save/reload a self-contained `.spark-project.json` bundle, export a clean `.scene.json`, or click **Export HTML ↓** for a single-file playable HTML build.
- **Sandboxed Play-in-Editor:** Clicking **▶ Play** launches your scene inside an isolated `<iframe>` with **Pause**, **Step Frame**, **Restart**, live **Draw Colliders** toggle, and a **Console** drawer capturing runtime logs and errors.
