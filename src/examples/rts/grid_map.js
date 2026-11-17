class GridMap {
    constructor(width, height, cellSize = 32) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        this.cells = [];

        for (let row = 0; row < height; row++) {
            const rowCells = [];
            for (let col = 0; col < width; col++) {
                rowCells.push({
                    walkable: true,
                    buildable: true,
                    occupied: false,
                    occupant: null,
                    terrainType: "grass"
                });
            }
            this.cells.push(rowCells);
        }
    }

    IsInBounds(col, row) {
        return col >= 0 && col < this.width && row >= 0 && row < this.height;
    }

    GetCell(col, row) {
        if (!this.IsInBounds(col, row)) {
            return null;
        }

        return this.cells[row][col];
    }

    WorldToGrid(worldPos) {
        return {
            col: Math.floor(worldPos.x / this.cellSize),
            row: Math.floor(worldPos.y / this.cellSize)
        };
    }

    GridToWorld(col, row) {
        return new Vector2(
            (col + 0.5) * this.cellSize,
            (row + 0.5) * this.cellSize
        );
    }

    IsWalkable(col, row) {
        const cell = this.GetCell(col, row);
        return !!cell && cell.walkable && !cell.occupied;
    }

    IsBuildable(col, row) {
        const cell = this.GetCell(col, row);
        return !!cell && cell.buildable && !cell.occupied;
    }

    SetOccupied(col, row, occupied, occupant = null) {
        const cell = this.GetCell(col, row);
        if (!cell) {
            return false;
        }

        cell.occupied = occupied;
        cell.occupant = occupied ? occupant : null;
        return true;
    }

    ClearOccupancy(col, row) {
        return this.SetOccupied(col, row, false, null);
    }

    SetTerrain(col, row, terrainType) {
        const cell = this.GetCell(col, row);
        if (!cell) {
            return false;
        }

        cell.terrainType = terrainType;
        cell.walkable = terrainType === "grass";
        cell.buildable = terrainType === "grass";
        return true;
    }

    PopulateFromLayer(layerData, walkableGids = [3]) {
        const walkableSet = new Set(walkableGids);

        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const gidRaw = (layerData[row] && layerData[row][col]) || 0;
                const gid = gidRaw & 0x1FFFFFFF;

                let terrainType = "water";
                if (walkableSet.has(gid)) {
                    terrainType = "grass";
                }
                else if (gid === 2) {
                    terrainType = "shore";
                }

                this.SetTerrain(col, row, terrainType);
                this.ClearOccupancy(col, row);
            }
        }
    }

    static FromTiledMap(mapData, options = {}) {
        const layerName = options.layerName || null;
        const layer = layerName
            ? mapData.layers.find((l) => l.name === layerName)
            : mapData.layers[0];

        if (!layer || !layer.data) {
            throw new Error("GridMap.FromTiledMap: Could not find a valid tile layer.");
        }

        const grid = new GridMap(
            mapData.width,
            mapData.height,
            options.cellSize || mapData.tileWidth || 32
        );

        grid.PopulateFromLayer(layer.data, options.walkableGids || [3]);
        return grid;
    }

    /**
     * Builds a `GridMap` from a `Tileset` instance or JSON data exported by the spark.js Tileset Editor.
     * Uses each tile's `walkable` and `terrainType` metadata when defined.
     * @param {Tileset|Object} tilesetOrData - A `Tileset` instance or raw Tileset Editor JSON object.
     * @param {Object} [options={}]
     * @returns {GridMap}
     */
    static FromTileset(tilesetOrData, options = {}) {
        const isInstance = typeof Tileset !== "undefined" && tilesetOrData instanceof Tileset;
        const scaleX = isInstance && tilesetOrData.sprite && tilesetOrData.sprite.scale ? tilesetOrData.sprite.scale.x : 1;
        const parsed = isInstance
            ? {
                width: tilesetOrData.mapWidth || (tilesetOrData.tilesetMap[0] ? tilesetOrData.tilesetMap[0].length : 0),
                height: tilesetOrData.mapHeight || tilesetOrData.tilesetMap.length,
                tileWidth: tilesetOrData.tileWidth * scaleX,
                tilesetConfig: tilesetOrData.tilesetConfig,
                layers: tilesetOrData.layers || [{ name: tilesetOrData.layerName || "Ground", data: tilesetOrData.tilesetMap }]
            }
            : Tileset.Parse(tilesetOrData);

        const layerName = options.layerName || null;
        const layer = layerName
            ? parsed.layers.find((l) => l.name === layerName)
            : parsed.layers[0];

        if (!layer || !layer.data) {
            throw new Error("GridMap.FromTileset: Could not find a valid tile layer.");
        }

        const grid = new GridMap(
            parsed.width,
            parsed.height,
            options.cellSize || parsed.tileWidth || 32
        );

        const walkableSet = options.walkableGids ? new Set(options.walkableGids) : null;

        for (let row = 0; row < grid.height; row++) {
            for (let col = 0; col < grid.width; col++) {
                const tileId = (layer.data[row] && layer.data[row][col]) || 0;
                const tileCfg = parsed.tilesetConfig[tileId];

                let terrainType = "water";
                let walkable = false;

                if (tileCfg) {
                    if (tileCfg.terrainType) {
                        terrainType = tileCfg.terrainType;
                    }
                    else if (walkableSet ? walkableSet.has(tileId) : tileCfg.walkable !== false) {
                        terrainType = "grass";
                    }
                    walkable = walkableSet ? walkableSet.has(tileId) : (tileCfg.walkable !== undefined ? Boolean(tileCfg.walkable) : terrainType === "grass");
                }

                const cell = grid.GetCell(col, row);
                if (cell) {
                    cell.terrainType = terrainType;
                    cell.walkable = walkable;
                    cell.buildable = walkable;
                    cell.occupied = false;
                    cell.occupant = null;
                }
            }
        }

        return grid;
    }
}
