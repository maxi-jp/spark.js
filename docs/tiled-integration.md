# Tiled Map Editor Integration Guide

This guide shows you how to use the **Tiled Map Editor** with the spark.js engine using the `TiledLoader` utility.
> **See it in action:** Check out the [Tileset example](../tileset.html ':ignore :target=_blank') — a complete example project using Tiled maps. The source code is in [src/examples/tileset/tileset.js](../../src/examples/tileset/tileset.js ':ignore :target=_blank').

---

## Why Use Tiled?

**[Tiled](https://www.mapeditor.org/)** is the industry-standard, free, open-source map editor for 2D games. It provides:

✅ **Visual tile placement** — drag & drop instead of manual coordinate typing  
✅ **JSON/TMX export** — exports complete maps with all tile data  
✅ **Tileset management** — handles spacing, margins, and multiple tilesets automatically  
✅ **Layer system** — create background, foreground, collision, and decoration layers  
✅ **Object layers** — place spawn points, triggers, and game entities  
✅ **Terrain brushes** — auto-tiling for faster map creation  

### Understanding Tiled File Formats

**Native Format (Working Files):**
- `.tmx` (Tiled Map XML) — your map file, contains layers and tile placement
- `.tsx` (Tiled Tileset XML) — tileset definitions, contains tile rectangles and properties
- `.tiled-project` — project settings (optional)

**Export Format (For Games):**
- `.json` — exported map that combines `.tmx` + all `.tsx` files into one JSON file
- This is what `TiledLoader` reads in your game

**Why export to JSON?**
- Single file instead of multiple TMX/TSX files
- Easier to parse in JavaScript (no XML parser needed)
- Standard format for web games
- Tiled's official recommendation for game engines

**Before Tiled:** Manually defining tile coordinates:
```javascript
const tilesetConfig = {
    1: { rect: new Rect(0, 0, 16, 16) },
    2: { rect: new Rect(16, 0, 16, 16) },
    3: { rect: new Rect(32, 0, 16, 16) },
    // ... 200 more tiles ...
};
```

**With Tiled:** Just export and load:
```javascript
const mapData = TiledLoader.Parse(this.tiledAssets.myMap.data, this.graphicAssets);
this.tilesets = TiledLoader.CreateTilesets(mapData, new Vector2(0, 0), 1);
```

---

## Quick Start

### 1. Install Tiled

Download from: https://www.mapeditor.org/

### 2. Create a New Map

1. Open Tiled
2. **File → New → New Map**
3. Choose **Orthogonal** orientation
4. Set tile size (e.g., 16×16 pixels)
5. Set map size (e.g., 30×20 tiles)
6. ⚠️ **Important:** In **Map → Map Properties**, set **Tile Layer Format** to **CSV** (required for TiledLoader)

### 3. Import Your Tileset

1. **Map → New Tileset**
2. Choose "Based on Tileset Image"
3. Browse to your tileset PNG
4. Set tile width/height
5. Set spacing/margin if needed
6. Click **OK**

### 4. Paint Your Map

Use the **Stamp Brush** tool to paint tiles on the canvas.  
Use **Layers** panel to create multiple layers (ground, decorations, etc.).

### 5. Export as JSON

**Important:** TiledLoader requires tilesets to be **embedded** in the exported JSON.

1. **File → Export As...** (or Ctrl+Shift+E)
2. Choose **JSON map files (*.json)**
3. ⚠️ **Make sure "Embed tilesets" is checked**
4. Save to your `assets/` folder

**What happens during export:**
- Tiled combines `.tmx` (map data) and all `.tsx` files (tilesets) into a single JSON
- The JSON contains the complete tileset definitions (not references)
- `TiledLoader` reads this single file and renders everything


**Workflow:**
```
Create/Edit in Tiled → Save as .tmx (working copy)
                     ↓
                Export as .json with EMBEDDED tilesets
                     ↓
                Load in game with TiledLoader
```

---

## Integration with spark.js

### Step 1: Load the Tiled JSON in Your Game

```javascript
class MyGame extends Game {
    constructor(renderer) {
        super(renderer);

        // Your tileset image
        this.graphicAssets = {
            myTileset: {
                path: "assets/tileset.png",
                img: null
            }
        };

        // Your Tiled JSON map
        this.tiledAssets = {
            level1: {
                path: "assets/level1.json",
                data: null
            }
        };
    }

    Start() {
        super.Start();

        // Parse the Tiled map
        const mapData = TiledLoader.Parse(
            this.tiledAssets.level1.data,
            this.graphicAssets
        );

        // Create Tileset objects (one per layer)
        this.tilesets = TiledLoader.CreateTilesets(
            mapData,
            new Vector2(0, 0),  // World position
            1                   // Scale
        );

        // Add to game objects
        this.tilesets.forEach(tileset => {
            this.AddGameObject(tileset);
        });
    }

    Update(deltaTime) {
        super.Update(deltaTime);
        // Your game logic...
    }

    Draw() {
        // Draw the tilesets (handled by super.Draw())
        super.Draw();
    }
}
```

### Step 2: HTML Integration

Make sure `tiled_loader.js` is loaded in your HTML:

```html
<script src="src/engine/utils_classes.js"></script>
<script src="src/engine/gameobjects.js"></script>
<script src="src/engine/tiled_loader.js"></script>  <!-- Add this -->
<script src="src/examples/mygame/mygame.js"></script>
```

---

## TiledLoader API Reference

### `TiledLoader.Parse(tiledJSON, graphicAssets)`

Parses a Tiled JSON object and converts it to engine-compatible format. **Requires tilesets to be embedded in the JSON.**

**Parameters:**
- `tiledJSON` (Object) — The loaded JSON data from `this.tiledAssets.myMap.data` (must have tilesets embedded)
- `graphicAssets` (Object) — Your game's `graphicAssets` object for image lookup

**Example Usage:**
```javascript
const mapData = TiledLoader.Parse(tiledJSON, this.graphicAssets);
```

**Returns:**
```javascript
{
  width: 30,              // Map width in tiles
  height: 20,             // Map height in tiles
  tileWidth: 16,          // Tile width in pixels
  tileHeight: 16,         // Tile height in pixels
  orientation: "orthogonal",
  layers: [               // Array of layers
    {
      name: "Ground",
      data: [[...], [...]],  // 2D tile array
      visible: true,
      opacity: 1.0
    }
  ],
  tilesets: [...],        // Tileset metadata
  tilesetConfig: {...},   // Tile ID → Rect mapping
  image: HTMLImageElement // First tileset image
}
```

**Supports:**
- ✅ Embedded tilesets (required — check "Embed tilesets" when exporting)
- ✅ Grid-based tilesets (standard format)
- ✅ Collection of Images tilesets (custom tile dimensions per tile)
- ✅ Multiple tile layers with visibility and opacity
- ✅ Multiple tilesets in one map
- ✅ Tile spacing and margins

---

### `TiledLoader.CreateTilesets(mapData, position, scale)`

Creates `Tileset` GameObjects from parsed map data (one per layer).

**Parameters:**
- `mapData` (Object) — Result from `TiledLoader.Parse()`
- `position` (Vector2) — World position for the tilesets
- `scale` (number) — Scale factor (default: 1)

**Returns:**
- Array of `Tileset` objects

---

### `TiledLoader.GetObjectLayers(tiledJSON)`

Extracts object layers (spawn points, triggers, etc.) from Tiled JSON.

**Parameters:**
- `tiledJSON` (Object) — The raw Tiled JSON

**Returns:**
```javascript
[
  {
    name: "Entities",
    objects: [
      {
        id: 1,
        name: "player_spawn",
        x: 128,
        y: 96,
        properties: [...]
      }
    ]
  }
]
```

---

## Working with Multiple Layers

Tiled maps can have multiple tile layers. Each layer becomes a separate `Tileset` object:

```javascript
// In Start():
this.tilesets = TiledLoader.CreateTilesets(mapData, Vector2.Zero(), 1);

// Access individual layers:
const groundLayer = this.tilesets.find(t => t.layerName === "Ground");
const decorLayer = this.tilesets.find(t => t.layerName === "Decorations");

// Adjust layer properties:
decorLayer.position.y -= 10; // Offset decorations upward
```

---

## Using Object Layers for Spawn Points

Tiled's **Object Layers** are perfect for placing game entities:

```javascript
// In Start():
const objectLayers = TiledLoader.GetObjectLayers(this.tiledAssets.level1.data);

const entityLayer = objectLayers.find(layer => layer.name === "Entities");

entityLayer.objects.forEach(obj => {
    if (obj.name === "player_spawn") {
        this.player = new Player(new Vector2(obj.x, obj.y));
        this.AddGameObject(this.player);
    }
    else if (obj.name === "enemy") {
        const enemy = new Enemy(new Vector2(obj.x, obj.y));
        this.AddGameObject(enemy);
    }
});
```

---

## Tileset Image Matching

The `TiledLoader` automatically matches Tiled tileset images to your `graphicAssets` by **filename**:

**Tiled JSON:**
```json
"image": "forest/squirrel.png"
```

**Your Game:**
```javascript
this.graphicAssets = {
    squirrel: {
        path: "assets/forest/squirrel.png",  // Matches!
        img: null
    }
};
```

The loader uses the **filename** (e.g., `Ground_Tiles.png`) to find the matching asset.

---

## Example: RTS Game Map

For your RTS game (see `RTS_GDD.md`), you can use Tiled to:

1. **Create terrain layers** — grass, water, cliffs
2. **Mark buildable areas** — use object layers with rectangles
3. **Place resource nodes** — trees, gold mines, stone quarries
4. **Set spawn points** — player/enemy Town Center locations
5. **Define pathfinding grid** — use tile properties or a collision layer

```javascript
// Load the RTS map
const mapData = TiledLoader.Parse(this.tiledAssets.rtsMap.data, this.graphicAssets);

// Get terrain layers
this.terrainLayers = TiledLoader.CreateTilesets(mapData, Vector2.Zero(), 1);

// Get resource node positions
const objectLayers = TiledLoader.GetObjectLayers(this.tiledAssets.rtsMap.data);
const resourceLayer = objectLayers.find(l => l.name === "Resources");

resourceLayer.objects.forEach(obj => {
    if (obj.type === "tree") {
        const tree = new ResourceNode("wood", new Vector2(obj.x, obj.y), 500);
        this.AddGameObject(tree);
    }
});
```

---

## Tips & Best Practices

✅ **Use layers liberally** — separate ground, decorations, foreground, collision  
✅ **Name layers clearly** — "Ground", "Water", "Decorations", "Collision"  
✅ **Use object layers for entities** — don't hardcode spawn positions  
✅ **Set tile properties** — mark tiles as walkable/unwalkable in Tiled  
✅ **Export to JSON** — easier to parse than XML (TMX)  
✅ **Keep tileset images in assets/** — relative paths work best  

---

## Troubleshooting

**Q: I exported to JSON but TiledLoader says "Could not find image for tileset"**  
**A:** TiledLoader looks for tileset images by filename in your `graphicAssets`. Make sure the asset key's path ends with the same filename as in Tiled. For example, if Tiled has `"image":"forest/squirrel.png"`, your graphicAsset should include `squirrel.png` in its path.

**Q: TiledLoader says "External tileset detected. Please check 'Embed tilesets'"**  
**A:** `TiledLoader` only works with embedded tilesets. When exporting to JSON in Tiled, **you must check the "Embed tilesets" checkbox**. This combines all tileset data into a single JSON file.

**Q: Tiles are not rendering**  
**A:** Check the browser console for errors. Verify:
1. The JSON loaded correctly
2. Tileset images are in your graphicAssets
3. You exported with "Embed tilesets" checked

**Q: Wrong tiles are rendering**  
**A:** Tiled uses 1-based tile IDs (0 = empty). The loader handles this automatically.

**Q: Multiple tilesets in one map**  
**A:** Supported! Just make sure all tileset images are in your `graphicAssets`.

**Q: Do I need to export to JSON or can I use TMX directly?**  
**A:** You must export to JSON. The `TiledLoader` currently only supports JSON format because:
- JSON is easier to parse in JavaScript (native `JSON.parse()`)
- The exported JSON combines TMX + all TSX files into one file
- This is Tiled's recommended format for web/HTML5 games

**Q: I edited my map in Tiled but changes don't appear in the game**  
**A:** You must re-export to JSON after each edit:
1. Make changes in Tiled
2. Save the `.tmx` file
3. **File → Export As...** → JSON
4. Refresh your browser

**Q: Can I automate the export process?**  
**A:** Yes! Use Tiled's command-line interface:
```bash
tiled --export-map json mymap.tmx mymap.json
```
You can add this to your build script or file watcher.

---

## Further Reading

- Tiled Official Docs: https://doc.mapeditor.org/
- Tiled JSON Format: https://doc.mapeditor.org/en/stable/reference/json-map-format/
- Example Maps: https://github.com/mapeditor/tiled/tree/master/examples
