// =====================================================================
// Death Rally — Final Circuit (Option A / inline)
//
// The "Gauntlet": a complex multi-section circuit that uses most
// of the 2400×1800 world.
//
// Route (clockwise from S/F at bottom-left):
//  1. Long bottom straight heading EAST
//  2. Sharp 180° hairpin at bottom-right
//  3. Short return straight heading WEST (inner lower level)
//  4. Left turn heading NORTH up the right-centre
//  5. Chicane section at mid-height with two barrel obstacles
//  6. Continue NORTH to the top straight
//  7. Long top straight heading WEST
//  8. Sweeping 180° at top-left
//  9. Head SOUTH along the left outer wall
// 10. Bottom-left hairpin returns to S/F
//
// The circuit has three distinct surface bands:
//  - Asphalt on the main straights and hairpins
//  - Gravel on the chicane section  (mid-right)
//  - Dirt on the left straight (outer left section)
// =====================================================================

const FINAL_CIRCUIT = {
    name: 'Final Circuit',
    laps: 3,

    // Checkpoints (ordered 1→2→3→0)
    // CP0 (S/F): at the bottom-left, horizontal gate
    // CP1: bottom-right hairpin
    // CP2: top-left area, past long straight
    // CP3: right side, mid-height (after chicane)
    checkpoints: [
        { id:0, x: 500, y:1580, w:200, h: 35 },  // S/F — horizontal gate, bottom-left
        { id:1, x:2050, y:1300, w: 35, h:250 },  // CP1 — bottom-right, vertical gate
        { id:2, x: 600, y: 330, w:200, h: 35 },  // CP2 — top-left, horizontal gate
        { id:3, x:1800, y: 760, w: 35, h:200 },  // CP3 — right-side chicane, vertical gate
    ],

    spawns: [
        { x: 430, y:1540, rotation: -Math.PI * 0.5 }, // player  — heading east
        { x: 430, y:1610, rotation: -Math.PI * 0.5 },
        { x: 550, y:1540, rotation: -Math.PI * 0.5 },
        { x: 550, y:1610, rotation: -Math.PI * 0.5 },
    ],

    // AI racing line — 22 waypoints tracing the full route
    waypoints: [
        { x: 430, y:1570 },   //  0 S/F, heading east
        { x: 900, y:1570 },   //  1 bottom straight
        { x:1400, y:1570 },   //  2 bottom straight
        { x:1900, y:1570 },   //  3 approaching hairpin
        { x:2130, y:1420 },   //  4 entering bottom-right hairpin
        { x:2200, y:1180 },   //  5 hairpin apex  (CP1 zone)
        { x:2100, y: 980 },   //  6 exiting hairpin heading west
        { x:1900, y: 900 },   //  7 inner lower straight heading west
        { x:1700, y: 820 },   //  8 heading to chicane
        { x:1800, y: 700 },   //  9 chicane (CP3 zone)
        { x:1700, y: 600 },   // 10 chicane exit
        { x:1500, y: 540 },   // 11 heading west toward top straight entry
        { x:1200, y: 450 },   // 12 top straight
        { x: 800, y: 380 },   // 13 top straight  (CP2 zone)
        { x: 400, y: 360 },   // 14 approaching top-left hairpin
        { x: 220, y: 460 },   // 15 top-left hairpin apex
        { x: 200, y: 680 },   // 16 exiting hairpin heading south
        { x: 200, y: 950 },   // 17 left outer straight
        { x: 200, y:1220 },   // 18 left outer straight (dirt area)
        { x: 220, y:1440 },   // 19 approaching bottom-left
        { x: 380, y:1580 },   // 20 bottom-left corner back to S/F
    ],

    surfaceZones: [
        // Asphalt base for the whole track bounds
        { x: 100, y: 270, w:2250, h:1410, surface:SURFACE.ASPHALT },

        // Grass fills the infield areas (overwritten on top of asphalt)
        { x: 350, y: 480, w:1500, h: 980, surface:SURFACE.GRASS  }, // large infield
        { x: 350, y: 480, w: 300, h: 980, surface:SURFACE.GRASS  }, // left inner gap (keep grass)

        // Dirt — left outer straight (punishes going wide on the long left section)
        { x: 100, y: 480, w: 260, h: 980, surface:SURFACE.DIRT   },

        // Gravel — chicane section (mid-right)
        { x:1600, y: 560, w: 650, h: 400, surface:SURFACE.GRAVEL },

        // Oil — on the bottom straight mid-section
        { x: 900, y:1530, w: 130, h:  60, surface:SURFACE.OIL   },

        // Oil — top straight (near top-left hairpin entry)
        { x: 350, y: 340, w: 120, h:  50, surface:SURFACE.OIL   },
    ],

    obstacles: [
        // ── Outer boundary ──────────────────────────────────────────
        { cx:1200, cy: 270, w:2250, h: 25, color:C_WALL_OVAL },   // top
        { cx:1200, cy:1680, w:2250, h: 25, color:C_WALL_OVAL },   // bottom
        { cx: 100, cy: 975, w:  25, h:1410, color:C_WALL_OVAL },  // left
        { cx:2350, cy: 975, w:  25, h:1410, color:C_WALL_OVAL },  // right

        // ── Inner infield walls ─────────────────────────────────────
        // Top inner wall
        { cx:1100, cy: 480, w:1550, h: 22, color:C_WALL_OVAL },
        // Bottom inner wall
        { cx:1100, cy:1460, w:1550, h: 22, color:C_WALL_OVAL },
        // Left inner wall
        { cx: 350, cy: 970, w:  22, h: 980, color:C_WALL_OVAL },
        // Right inner wall (separates main loop from bottom hairpin road)
        { cx:1950, cy:1090, w:  22, h: 720, color:C_WALL_OVAL },

        // ── Bottom-right hairpin walls ──────────────────────────────
        // These guide cars around the hairpin (right outer curve)
        { cx:2220, cy:1280, w: 280, h: 22, color:C_WALL_OVAL },  // hairpin top
        { cx:2220, cy:1500, w: 280, h: 22, color:C_WALL_OVAL },  // hairpin bottom? no, boundary is enough
        // Inner hairpin separator (creates the two hairpin lanes)
        { cx:2050, cy:1280, w:  22, h: 340, color:C_WALL_OVAL },

        // ── Top-left hairpin walls ──────────────────────────────────
        { cx: 170, cy: 380, w: 250, h: 22, color:C_WALL_OVAL },  // top
        { cx: 170, cy: 480, w: 250, h: 22, color:C_WALL_OVAL },  // bottom
        // Inner top-left separator
        { cx: 300, cy: 430, w:  22, h: 220, color:C_WALL_OVAL },

        // ── Chicane barriers ────────────────────────────────────────
        // Two offset walls that force an S-line through the chicane
        { cx:1740, cy: 680, w: 180, h: 22, color:C_WALL },   // chicane wall A (left-offset)
        { cx:1860, cy: 780, w: 180, h: 22, color:C_WALL },   // chicane wall B (right-offset)

        // ── Barrel obstacles ─────────────────────────────────────────
        { cx: 800, cy:1570, w:28, h:28, isBarrel:true, color:C_BARREL }, // bottom straight
        { cx:1600, cy:1570, w:28, h:28, isBarrel:true, color:C_BARREL }, // bottom straight
        { cx:1000, cy: 380, w:28, h:28, isBarrel:true, color:C_BARREL }, // top straight
        { cx:1500, cy: 380, w:28, h:28, isBarrel:true, color:C_BARREL }, // top straight
        { cx: 200, cy:1050, w:28, h:28, isBarrel:true, color:C_BARREL }, // left straight
    ],

    pickups: [
        { x:1200, y:1570, type:'weapon', data:'MACHINEGUN' }, // bottom straight mid
        { x:2150, y:1180, type:'weapon', data:'MISSILE'    }, // hairpin apex
        { x: 900, y: 380, type:'weapon', data:'MINE'       }, // top straight
        { x:1750, y: 730, type:'weapon', data:'MACHINEGUN' }, // chicane entry
        { x: 200, y: 900, type:'health', data: 35          }, // left straight
        { x:1200, y: 380, type:'health', data: 25          }, // top straight
        { x: 700, y:1570, type:'money',  data:150          }, // bottom straight
        { x:1200, y: 420, type:'money',  data:200          }, // top straight
        { x: 200, y:1200, type:'money',  data:100          }, // left straight
    ],
};
