# Tileset Example - Tiled Map Loader

This example demonstrates how to use the **Tiled Map Editor** with the spark.js engine.

## Current Demo: Forest

The example now uses the **forest** map from Tiled's official examples - a simple platformer level.

### Features:
- 40×16 tile map (640×256 pixels with 16px tiles)
- 1 layer (platforms)
- Scaled 2x for visibility
- Camera follows player box
- Arrow keys / WASD to move

## What's New

This example uses the `TiledLoader` utility to load maps created in Tiled Map Editor, eliminating the need to manually define tile coordinates.

## Files

- `assets/forest/` — Forest example from Tiled
  - `forest.tmx` — Tiled source (edit here)
  - `forest.json` — **USED** - Tiled export with embedded tilesets
  - `forest.tsx` — Tileset source (not used; included in forest.json)
  - `squirrel.png` — 1024×1024 tileset image
- `assets/simple-map.json` — Basic 5×5 demo
- `tileset.js` — Game implementation

## How It Works

### Before (Manual Tile Definition)
```javascript
const tilesetConfig = {
    1: { rect: new Rect(0, 0, 16, 16) },
    2: { rect: new Rect(16, 0, 16, 16) },
    // ... tedious manual entries for every tile
};
const tilesetMap = [
    [1, 2, 3, 0, 0, 0, ...],
    [4, 5, 6, 0, 0, 0, ...],
];
```

### After (Tiled Integration)
```javascript
// 1. Declare assets in constructor
this.tiledAssets = {
    forestMap: { path: "assets/forest/forest.json", data: null }
};
this.graphicAssets = {
    squirrel: { path: "assets/forest/squirrel.png", img: null }
};

// 2. Parse and create tilesets in Start()
const mapData = TiledLoader.Parse(
    this.tiledAssets.forestMap.data, 
    this.graphicAssets
);
this.tilesets = TiledLoader.CreateTilesets(mapData, new Vector2(0, 0), 2);

// 3. Add to game objects
this.tilesets.forEach(tileset => this.AddGameObject(tileset));
```

## Switching Maps

To use the **simple-map** example instead:

```javascript
// In tileset.js constructor:
this.tiledAssets = {
    simpleMap: { path: "src/examples/tileset/assets/simple-map.json", data: null }
};
this.graphicAssets = {
    ground_tiles: { path: "src/examples/tileset/assets/.../FDR_Ground_Tiles.png", img: null }
};
Export and Use Your Own Maps

### Step 1: Export from Tiled

1. Open/create your `.tmx` file in [Tiled](https://www.mapeditor.org/)
2. Design your map (paint tiles, add layers, etc.)
3. **Map → Map Properties** — Set **Tile Layer Format** to **CSV** (required)
4. **File → Export As...** (Ctrl+Shift+E)
   - Format: **JSON map files (*.json)**
   - ⚠️ **IMPORTANT: Check "Embed tilesets"** in the export dialog
   - Save to your assets folder
5. This creates a single `.json` file with all tileset data embedded

### Step 2: Use in Your Game

```javascript
this.tiledAssets = {
    myMap: { path: "assets/mymap/mymap.json", data: null }
};
this.graphicAssets = {
    myTileset: { path: "assets/mymap/tileset.png", img: null }
};

// In Start():
const mapData = TiledLoader.Parse(this.tiledAssets.myMap.data, this.graphicAssets);
this.tilesets = TiledLoader.CreateTilesets(mapData, new Vector2(0, 0), 1);
```

**Requirements:**
- ✅ Export with "Embed tilesets" **checked** (required)
- ✅ Tileset images must be in your `graphicAssets`
- ✅ Matched by filename (e.g., `tileset.png`)

## Controls

- **Arrow Keys / WASD** — Move the player box
- Camera automatically follows the player

## TiledLoader Features

✅ Automatic tile coordinate calculation from tileset images  
✅ Support for multiple tile layers (with visibility and opacity)  
✅ Support for multiple tilesets in one map  
✅ Object layer extraction for spawn points and entities  
✅ Grid-based and Collection of Images tileset formats  
✅ Handles tile spacing and margins automatically  
✅ Requires embedded tilesets (check "Embed tilesets" on export)  

## See Also

- Full documentation: [docs/tiled-integration.md](../../docs/tiled-integration.md)
- Tiled official docs: https://doc.mapeditor.org/
