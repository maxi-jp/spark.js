// =====================================================================
// Death Rally — Oval Track circuit definition (Option A / inline)
//
// Layout: counterclockwise rectangular circuit with concrete barrier walls
// and a clearly visible infield. Track width ≈ 300 px throughout.
//
//   Outer walls:  x=310–2090  ×  y=270–1530  (1780×1260 px)
//   Inner walls:  x=660–1740  ×  y=600–1200  (1080×600 px)
//   Track width:  ≈ 300 px on all sides
//   Direction:    counterclockwise (left turns)
//
// Load order: AFTER death_rally_defs.js (references SURFACE, C_WALL_OVAL, etc.)
// =====================================================================

// Tile-ID → SURFACE mapping for Option B (Tiled)
// (same mapping as playground — reuse if you create a Tiled map)
// const DR_TILE_TO_SURFACE = { ... };  already defined in playground.js

const OVAL_TRACK = {
    name: 'Oval Track',
    laps: 3,

    // ── Checkpoints (counterclockwise order) ──────────────────────
    //   id=0  Start/Finish  — bottom straight, cars heading WEST
    //   id=1  Left straight — cars heading NORTH
    //   id=2  Top straight  — cars heading EAST
    checkpoints: [
        { id:0, x:1200, y:1365, w: 40, h:300 },   // S/F  (vertical gate, cars pass heading west)
        { id:1, x: 485, y: 900, w:300, h: 40 },   // CP1  (horizontal gate, cars pass heading north)
        { id:2, x:1200, y: 435, w: 40, h:300 },   // CP2  (vertical gate, cars pass heading east)
    ],

    // ── Spawn grid (bottom straight, facing west = rotation −π/2) ─
    spawns: [
        { x:1700, y:1340, rotation: -Math.PI * 0.5 },  // player
        { x:1700, y:1420, rotation: -Math.PI * 0.5 },  // enemy 1
        { x:1580, y:1340, rotation: -Math.PI * 0.5 },  // enemy 2
        { x:1580, y:1420, rotation: -Math.PI * 0.5 },  // enemy 3
    ],

    // ── AI racing line — 16 waypoints, counterclockwise ───────────
    //   Bottom straight → left turn → left straight → left turn →
    //   top straight   → left turn → right straight → left turn → repeat
    waypoints: [
        { x:1650, y:1365 },  //  0  bottom straight heading west
        { x:1200, y:1365 },  //  1
        { x: 700, y:1365 },  //  2  approaching bottom-left
        { x: 420, y:1280 },  //  3  bottom-left corner (turning north)
        { x: 400, y:1100 },  //  4  left straight
        { x: 400, y: 900 },  //  5  left straight (CP1)
        { x: 400, y: 700 },  //  6  left straight
        { x: 420, y: 510 },  //  7  top-left corner (turning east)
        { x: 680, y: 420 },  //  8  top straight
        { x:1200, y: 420 },  //  9  top straight (CP2)
        { x:1720, y: 420 },  // 10  top straight
        { x:1980, y: 510 },  // 11  top-right corner (turning south)
        { x:2000, y: 700 },  // 12  right straight
        { x:2000, y: 900 },  // 13  right straight
        { x:2000, y:1100 },  // 14  right straight
        { x:1980, y:1280 },  // 15  bottom-right corner (turning west)
    ],

    // ── Surface zones ─────────────────────────────────────────────
    surfaceZones: [
        // Asphalt: the full interior of the outer walls (track + infield)
        { x: 310, y: 270, w:1780, h:1260, surface:SURFACE.ASPHALT },
        // Grass infield: overwrites centre back to grass
        { x: 660, y: 600, w:1080, h: 600, surface:SURFACE.GRASS   },
        // Gravel patch — bottom-left corner (a punishing off-line area)
        { x: 310, y:1200, w: 360, h: 330, surface:SURFACE.GRAVEL  },
        // Oil slick — top straight (tricky braking zone)
        { x:1050, y: 470, w: 130, h:  45, surface:SURFACE.OIL     },
    ],

    // ── Obstacles ─────────────────────────────────────────────────
    obstacles: [
        // ── Outer boundary walls ────────────────────────────────
        { cx:1200, cy: 270, w:1780, h: 22, color:C_WALL_OVAL },  // top
        { cx:1200, cy:1530, w:1780, h: 22, color:C_WALL_OVAL },  // bottom
        { cx: 310, cy: 900, w:  22, h:1260, color:C_WALL_OVAL }, // left
        { cx:2090, cy: 900, w:  22, h:1260, color:C_WALL_OVAL }, // right

        // Outer corner reinforcements — short perpendicular stubs that
        // prevent cars hugging the corner at 90°, encouraging a racing line
        { cx: 360, cy: 310, w:100, h: 22, color:C_WALL_OVAL },   // top-left H
        { cx: 310, cy: 360, w:  22, h:100, color:C_WALL_OVAL },  // top-left V
        { cx:2040, cy: 310, w:100, h: 22, color:C_WALL_OVAL },   // top-right H
        { cx:2090, cy: 360, w:  22, h:100, color:C_WALL_OVAL },  // top-right V
        { cx: 360, cy:1490, w:100, h: 22, color:C_WALL_OVAL },   // bottom-left H
        { cx: 310, cy:1440, w:  22, h:100, color:C_WALL_OVAL },  // bottom-left V
        { cx:2040, cy:1490, w:100, h: 22, color:C_WALL_OVAL },   // bottom-right H
        { cx:2090, cy:1440, w:  22, h:100, color:C_WALL_OVAL },  // bottom-right V

        // ── Inner boundary walls (infield) ───────────────────────
        { cx:1200, cy: 600, w:1080, h: 22, color:C_WALL_OVAL },  // top inner
        { cx:1200, cy:1200, w:1080, h: 22, color:C_WALL_OVAL },  // bottom inner
        { cx: 660, cy: 900, w:  22, h: 600, color:C_WALL_OVAL }, // left inner
        { cx:1740, cy: 900, w:  22, h: 600, color:C_WALL_OVAL }, // right inner

        // Inner corner reinforcements — guide cars into the racing line
        { cx: 700, cy: 640, w: 80, h: 22, color:C_WALL_OVAL },   // top-left inner H
        { cx: 660, cy: 680, w: 22, h: 80, color:C_WALL_OVAL },   // top-left inner V
        { cx:1700, cy: 640, w: 80, h: 22, color:C_WALL_OVAL },   // top-right inner H
        { cx:1740, cy: 680, w: 22, h: 80, color:C_WALL_OVAL },   // top-right inner V
        { cx: 700, cy:1160, w: 80, h: 22, color:C_WALL_OVAL },   // bottom-left inner H
        { cx: 660, cy:1120, w: 22, h: 80, color:C_WALL_OVAL },   // bottom-left inner V
        { cx:1700, cy:1160, w: 80, h: 22, color:C_WALL_OVAL },   // bottom-right inner H
        { cx:1740, cy:1120, w: 22, h: 80, color:C_WALL_OVAL },   // bottom-right inner V
    ],

    // ── Pickups (on the racing line) ─────────────────────────────
    pickups: [
        { x:1200, y:1365, type:'weapon', data:'MACHINEGUN' }, // bottom straight
        { x: 400, y: 750, type:'weapon', data:'MISSILE'    }, // left straight
        { x: 800, y: 420, type:'weapon', data:'MINE'       }, // top straight
        { x: 400, y:1050, type:'health', data: 30           }, // left straight
        { x:1600, y: 420, type:'health', data: 25           }, // top straight
        { x:1200, y:1365, type:'money',  data:100           }, // (share S/F zone)
        { x:1900, y: 750, type:'money',  data:150           }, // right straight
    ],
};
