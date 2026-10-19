// =====================================================================
// Death Rally — Playground Loop circuit definition (Option A / inline)
//
// Load order: AFTER death_rally.js (references SURFACE, C_WALL, C_BARREL, WORLD_W/H)
// To switch to Option B (Tiled), see the commented tiledAssets block in
// DeathRallyGame constructor and set DR_TILE_TO_SURFACE tile IDs to match
// your exported Tiled map.
// =====================================================================

// Tile-ID → SURFACE mapping for Option B (Tiled).
// Assign these tile IDs in your Tiled tileset to match the surface types.
const DR_TILE_TO_SURFACE = {
    1: SURFACE.ASPHALT,
    2: SURFACE.GRAVEL,
    3: SURFACE.DIRT,
    4: SURFACE.OIL,
    5: SURFACE.GRASS,
};

// ---- Circuit definition -----------------------------------------------
//
// Track layout — clockwise oval on the asphalt cross:
//
//            CP1 (top gate)
//          ┌────────────┐
//          │            │
//   (left) │  ASPHALT   │ (right) CP2
//          │   CROSS    ●──────────────►
//          │            │
//          └────────────┘
//          S/F (bottom)      ← spawns face north (up)
//
// Surfaces encountered on a lap (clockwise):
//   Asphalt vert. → Gravel top-right → Dirt/Gravel right side → Asphalt horiz. → repeat
//
// -----------------------------------------------------------------------

const PLAYGROUND_CIRCUIT = {
    name: 'Playground Loop',
    laps: 3,

    // Checkpoints — id=0 is Start/Finish; hit in order 1 → 2 → 0 to complete a lap.
    checkpoints: [
        { id:0, x:  900, y:1665, w:600, h: 40 },  // Start / Finish (horizontal gate)
        { id:1, x:  900, y: 205, w:600, h: 40 },  // Top straight   (horizontal gate)
        { id:2, x: 2080, y: 900, w: 40, h:600 },  // Right side     (vertical gate)
    ],

    // Starting grid — slot 0 = player; all face north (rotation=0 → forward = −Y)
    spawns: [
        { x:  850, y:1630, rotation: 0 },
        { x:  950, y:1630, rotation: 0 },
        { x:  850, y:1690, rotation: 0 },
        { x:  950, y:1690, rotation: 0 },
    ],

    // AI racing line — 13 ordered waypoints forming a clockwise oval
    waypoints: [
        { x:  900, y:1560 },   //  0  heading north off S/F line
        { x:  900, y:1150 },   //  1
        { x:  900, y: 750 },   //  2
        { x:  900, y: 380 },   //  3
        { x:  900, y: 200 },   //  4  top; CP1 gate
        { x: 1200, y: 200 },   //  5  turning right
        { x: 1600, y: 320 },   //  6  heading right-and-down
        { x: 1950, y: 560 },   //  7
        { x: 2100, y: 900 },   //  8  right side; CP2 gate
        { x: 1950, y:1240 },   //  9  heading left-and-down
        { x: 1600, y:1540 },   // 10
        { x: 1200, y:1700 },   // 11  bottom straight heading west
        { x:  900, y:1700 },   // 12  back near S/F
    ],

    // Surface zones — defined back-to-front (last entry wins in GetSurfaceAt)
    surfaceZones: [
        // Asphalt cross
        { x:    0, y:  500, w:WORLD_W, h:  800, surface:SURFACE.ASPHALT },
        { x:  380, y:    0, w: 1050,   h:WORLD_H, surface:SURFACE.ASPHALT },
        // Gravel corners
        { x:    0, y:    0, w:  430, h:  550, surface:SURFACE.GRAVEL },
        { x:    0, y: 1300, w:  430, h:  500, surface:SURFACE.GRAVEL },
        { x: 1500, y:    0, w:  900, h:  550, surface:SURFACE.GRAVEL },
        { x: 1500, y: 1300, w:  900, h:  500, surface:SURFACE.GRAVEL },
        // Dirt mid-sides
        { x:    0, y:  550, w:  380, h:  750, surface:SURFACE.DIRT },
        { x: 1430, y:  550, w:  970, h:  750, surface:SURFACE.DIRT },
        // Oil slicks on asphalt
        { x:  680, y:  220, w:  110, h:   70, surface:SURFACE.OIL },
        { x:  960, y: 1540, w:   90, h:   60, surface:SURFACE.OIL },
        { x:  790, y:  900, w:  100, h:   65, surface:SURFACE.OIL },
        { x:  500, y: 1260, w:   85, h:   58, surface:SURFACE.OIL },
    ],

    // Obstacles — { cx, cy, w, h, isBarrel?, color? }  (cx/cy = centre)
    obstacles: [
        // Interior barrier walls
        { cx:  595, cy:   95, w:190, h: 22 },
        { cx: 1065, cy:  455, w: 22, h:200 },
        { cx: 1310, cy: 1495, w:200, h: 22 },
        { cx:  700, cy: 1695, w: 22, h:160 },
        { cx:  200, cy:  250, w: 22, h:180 },
        { cx: 1620, cy:  800, w:160, h: 22 },
        // Barrel clusters
        { cx:  460, cy:  290, w:28, h:28, isBarrel:true, color:C_BARREL },
        { cx:  510, cy:  280, w:28, h:28, isBarrel:true, color:C_BARREL },
        { cx:  490, cy:  340, w:28, h:28, isBarrel:true, color:C_BARREL },
        { cx: 1400, cy:  200, w:28, h:28, isBarrel:true, color:C_BARREL },
        { cx: 1440, cy:  235, w:28, h:28, isBarrel:true, color:C_BARREL },
        { cx:  350, cy: 1510, w:28, h:28, isBarrel:true, color:C_BARREL },
        { cx:  395, cy: 1535, w:28, h:28, isBarrel:true, color:C_BARREL },
        { cx:  900, cy:  745, w:28, h:28, isBarrel:true, color:C_BARREL },
        { cx:  945, cy:  760, w:28, h:28, isBarrel:true, color:C_BARREL },
        { cx: 1110, cy: 1090, w:28, h:28, isBarrel:true, color:C_BARREL },
        { cx: 1150, cy: 1075, w:28, h:28, isBarrel:true, color:C_BARREL },
        { cx:  620, cy: 1595, w:28, h:28, isBarrel:true, color:C_BARREL },
        { cx:  660, cy: 1580, w:28, h:28, isBarrel:true, color:C_BARREL },
        { cx: 1510, cy:  910, w:28, h:28, isBarrel:true, color:C_BARREL },
        { cx: 1555, cy:  940, w:28, h:28, isBarrel:true, color:C_BARREL },
        { cx:  800, cy:  350, w:28, h:28, isBarrel:true, color:C_BARREL },
        { cx:  840, cy:  360, w:28, h:28, isBarrel:true, color:C_BARREL },
    ],

    // Pickups — { x, y, type:'weapon'|'health'|'money', data }
    pickups: [
        { x:  610, y:  310, type:'weapon', data:'MACHINEGUN' },
        { x:  910, y: 1200, type:'weapon', data:'MACHINEGUN' },
        { x: 1210, y:  395, type:'weapon', data:'MISSILE'    },
        { x:  510, y: 1460, type:'weapon', data:'MISSILE'    },
        { x:  710, y: 1600, type:'weapon', data:'MINE'       },
        { x: 1360, y:  710, type:'weapon', data:'MINE'       },
        { x:  455, y:  720, type:'health', data: 30 },
        { x: 1110, y:  920, type:'health', data: 25 },
        { x: 1610, y:  480, type:'health', data: 20 },
        { x:  810, y:  400, type:'money',  data:100 },
        { x:  960, y: 1510, type:'money',  data:150 },
        { x: 1310, y: 1200, type:'money',  data:200 },
        { x:  660, y:  860, type:'money',  data:100 },
    ],
};
