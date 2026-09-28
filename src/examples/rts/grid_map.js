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
}
