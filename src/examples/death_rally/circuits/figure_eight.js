// =====================================================================
// Death Rally — Figure-Eight circuit (Option A / inline)
//
// Layout: Two rectangular loops connected at the center.
// Direction: Counterclockwise overall.
//   - Start at crossing center going NORTH
//   - Curve RIGHT into the right loop (clockwise sub-loop)
//   - Return south through crossing
//   - Curve LEFT into the left loop (counterclockwise sub-loop)
//   - Return north to S/F
//
// Crossing zone: x=1050→1350, full height — no inner barriers.
// Left inner island:  x=300→1050,  y=560→1240
// Right inner island: x=1350→2100, y=560→1240
// =====================================================================

const FIGURE_EIGHT = {
    name: 'Figure Eight',
    laps: 3,

    // CP0 (S/F): vertical gate at crossing center — hit going north at lap end
    // CP1: far right of right loop
    // CP2: far left of left loop
    // Order to complete a lap: CP1 → CP2 → CP0
    checkpoints: [
        { id:0, x:1200, y: 900, w: 40, h:500 },  // S/F — vertical gate at crossing
        { id:1, x:2140, y: 900, w: 40, h:500 },  // Right loop far side
        { id:2, x: 260, y: 900, w: 40, h:500 },  // Left loop far side
    ],

    // Spawn slots at crossing center heading NORTH (rotation=0 = forward=up)
    spawns: [
        { x:1175, y:1320, rotation: 0 },
        { x:1225, y:1320, rotation: 0 },
        { x:1175, y:1380, rotation: 0 },
        { x:1225, y:1380, rotation: 0 },
    ],

    // AI racing line — traces the full figure-eight, 16 waypoints
    // Starting heading NORTH through crossing, then clockwise into right loop,
    // south back through crossing, then counterclockwise into left loop.
    waypoints: [
        { x:1200, y:1300 },   //  0 crossing bottom, heading north (near S/F)
        { x:1200, y: 900 },   //  1 crossing center
        { x:1200, y: 480 },   //  2 crossing top → about to enter right loop
        { x:1500, y: 400 },   //  3 top of right loop heading east
        { x:1900, y: 450 },   //  4 top-right corner
        { x:2150, y: 750 },   //  5 right side heading south  (CP1 area)
        { x:2150, y:1050 },   //  6 right side heading south
        { x:1900, y:1350 },   //  7 bottom-right corner
        { x:1500, y:1400 },   //  8 bottom of right loop heading west
        { x:1200, y:1300 },   //  9 re-entering crossing from right heading SOUTH
        { x:1200, y: 900 },   // 10 crossing center heading south
        { x:1200, y: 480 },   // 11 crossing top heading west (← left loop entry)
        { x: 900, y: 400 },   // 12 top of left loop heading west
        { x: 500, y: 450 },   // 13 top-left corner
        { x: 250, y: 750 },   // 14 left side heading south  (CP2 area)
        { x: 250, y:1050 },   // 15 left side heading south
        { x: 500, y:1350 },   // 16 bottom-left corner
        { x: 900, y:1400 },   // 17 bottom of left loop heading east
    ],

    // Surface zones
    surfaceZones: [
        // Asphalt fills the full track area
        { x: 100, y: 300, w:2200, h:1200, surface:SURFACE.ASPHALT },
        // Grass infield for left island
        { x: 300, y: 560, w: 750, h: 680, surface:SURFACE.GRASS  },
        // Grass infield for right island
        { x:1350, y: 560, w: 750, h: 680, surface:SURFACE.GRASS  },
        // Gravel — bottom-right corner, punishes missing the apex
        { x:1900, y:1250, w: 350, h: 250, surface:SURFACE.GRAVEL },
        // Gravel — top-left corner
        { x: 100, y: 300, w: 300, h: 300, surface:SURFACE.GRAVEL },
        // Oil slick — at the crossing (danger zone!)
        { x:1100, y: 840, w: 200, h:  60, surface:SURFACE.OIL   },
    ],

    // Obstacles
    obstacles: [
        // ── Outer boundary ────────────────────────────────────────
        { cx:1200, cy: 300, w:2200, h: 25, color:C_WALL_OVAL },   // top
        { cx:1200, cy:1500, w:2200, h: 25, color:C_WALL_OVAL },   // bottom
        { cx: 100, cy: 900, w:  25, h:1200, color:C_WALL_OVAL },  // left
        { cx:2300, cy: 900, w:  25, h:1200, color:C_WALL_OVAL },  // right

        // ── Left inner island ─────────────────────────────────────
        { cx: 675, cy: 560, w: 750, h: 22, color:C_WALL_OVAL },   // top
        { cx: 675, cy:1240, w: 750, h: 22, color:C_WALL_OVAL },   // bottom
        { cx: 300, cy: 900, w:  22, h: 680, color:C_WALL_OVAL },  // left
        { cx:1050, cy: 900, w:  22, h: 680, color:C_WALL_OVAL },  // right (left crossing wall)

        // ── Right inner island ────────────────────────────────────
        { cx:1725, cy: 560, w: 750, h: 22, color:C_WALL_OVAL },   // top
        { cx:1725, cy:1240, w: 750, h: 22, color:C_WALL_OVAL },   // bottom
        { cx:1350, cy: 900, w:  22, h: 680, color:C_WALL_OVAL },  // left  (right crossing wall)
        { cx:2100, cy: 900, w:  22, h: 680, color:C_WALL_OVAL },  // right

        // ── Crossing center marker barrels ───────────────────────
        // Two small barrels at the top and bottom of the crossing nudge
        // fast cars into one side; they add to the figure-8 danger feel.
        { cx:1200, cy: 560, w:24, h:24, isBarrel:true, color:C_BARREL },
        { cx:1200, cy:1240, w:24, h:24, isBarrel:true, color:C_BARREL },

        // ── Barrel clusters at key corners ───────────────────────
        { cx: 480, cy: 460, w:28, h:28, isBarrel:true, color:C_BARREL },
        { cx: 520, cy: 430, w:28, h:28, isBarrel:true, color:C_BARREL },
        { cx:1900, cy:1340, w:28, h:28, isBarrel:true, color:C_BARREL },
        { cx:1950, cy:1310, w:28, h:28, isBarrel:true, color:C_BARREL },
    ],

    pickups: [
        { x: 700, y: 400, type:'weapon', data:'MACHINEGUN' }, // top of left loop
        { x:1700, y: 400, type:'weapon', data:'MISSILE'    }, // top of right loop
        { x: 250, y: 900, type:'weapon', data:'MINE'       }, // left far side (near CP2)
        { x: 250, y:1150, type:'health', data: 30          }, // left side
        { x:2150, y: 900, type:'health', data: 25          }, // right far side (near CP1)
        { x:1200, y: 920, type:'money',  data:200          }, // crossing (high risk/reward)
        { x: 700, y:1400, type:'money',  data:100          }, // bottom of left loop
        { x:1700, y:1400, type:'money',  data:100          }, // bottom of right loop
    ],
};
