// =====================================================================
// Death Rally — Figure-Eight circuit (Option A / inline)
//
// Shape: true ∞ (infinity symbol) formed by two rectangular ovals
// connected by a diagonal 45° crossing at the centre.
//
// Left oval  outer: x=150–1050, y=250–1550
// Right oval outer: x=1350–2250, y=250–1550
// Gap / crossing:   x=1050–1350  (300 px wide)
//
// The ∞ waist is created by four 45° walls at the crossing:
//   UL  (1050,500) → (1200,650) direction SE  rot= 3π/4
//   UR  (1350,500) → (1200,650) direction SW  rot=−3π/4
//   LL  (1050,1300)→ (1200,1150) direction NE  rot= π/4
//   LR  (1350,1300)→ (1200,1150) direction NW  rot=−π/4
// These walls leave a ~100 px gap at (1200,650) and (1200,1150);
// between them (y=650–1150) is the open DANGER ZONE where opposing
// traffic can meet.
//
// Direction of travel (CCW overall):
//   EAST across the TOP of both ovals → down the right side of the
//   right oval → WEST across the BOTTOM of both ovals → up the left
//   side of the left oval → back to start.
//   The car traverses the ∞ crossing twice per lap:
//     • heading EAST at the top (y≈380)
//     • heading WEST at the bottom (y≈1420)
//
// Checkpoint rule  (perpendicular to direction of travel):
//   Car heading E/W → gate must be VERTICAL   (w=small, h=large)
//   Car heading N/S → gate must be HORIZONTAL (w=large, h=small)
//
// CP order to complete a lap: 1 → 2 → 0
//   CP0 (S/F) : right side of right oval, car heading SOUTH  → horizontal gate
//   CP1       : top of left oval,         car heading EAST   → vertical gate
//   CP2       : top of right oval,        car heading EAST   → vertical gate
// =====================================================================

const FIGURE_EIGHT = {
    name: 'Figure Eight',
    laps: 3,

    // ── Checkpoints ─────────────────────────────────────────────────
    // Car heading EAST  → perpendicular = N-S → vertical gate (w:small, h:large)
    // Car heading SOUTH → perpendicular = E-W → horizontal gate (w:large, h:small)
    checkpoints: [
        { id:0, x:2200, y: 900, w:340, h: 35 },  // S/F – right side of right oval, car heading S
        { id:1, x: 600, y: 370, w: 35, h:260 },  // top of left oval,  car heading E
        { id:2, x:1800, y: 370, w: 35, h:260 },  // top of right oval, car heading E
    ],

    // ── Spawns (top of right oval, heading EAST = rotation π/2) ────
    spawns: [
        { x:1700, y:340, rotation: Math.PI * 0.5 },
        { x:1700, y:410, rotation: Math.PI * 0.5 },
        { x:1580, y:340, rotation: Math.PI * 0.5 },
        { x:1580, y:410, rotation: Math.PI * 0.5 },
    ],

    // ── AI racing line (CCW, 18 waypoints) ──────────────────────────
    // East across top → down right side → west across bottom → up left side
    waypoints: [
        { x:1800, y: 370 },  //  0  top of right oval heading E  (CP2 area)
        { x:2150, y: 420 },  //  1  approaching top-right corner
        { x:2250, y: 700 },  //  2  right side heading S
        { x:2250, y: 900 },  //  3  right side, CP0 area
        { x:2150, y:1180 },  //  4  lower-right corner
        { x:1800, y:1430 },  //  5  bottom of right oval heading W
        { x:1400, y:1520 },  //  6  bottom, approaching crossing
        { x:1200, y:1430 },  //  7  through lower crossing (DANGER ZONE south)
        { x:1000, y:1520 },  //  8  bottom of left oval heading W
        { x: 600, y:1430 },  //  9  bottom of left oval
        { x: 250, y:1180 },  // 10  lower-left corner
        { x: 150, y: 900 },  // 11  left side heading N
        { x: 250, y: 420 },  // 12  upper-left corner
        { x: 600, y: 370 },  // 13  top of left oval heading E (CP1 area)
        { x:1000, y: 280 },  // 14  through upper crossing (DANGER ZONE north)
        { x:1200, y: 370 },  // 15  centre of top crossing heading E
        { x:1400, y: 280 },  // 16  right side of upper crossing
        { x:1700, y: 370 },  // 17  entering top of right oval
    ],

    // ── Surface zones ────────────────────────────────────────────────
    surfaceZones: [
        // Asphalt covers both ovals and the full crossing zone
        { x: 150, y: 250, w:2100, h:1300, surface:SURFACE.ASPHALT },
        // Grass infields
        { x: 380, y: 510, w: 480, h: 820, surface:SURFACE.GRASS  },  // left island
        { x:1540, y: 510, w: 480, h: 820, surface:SURFACE.GRASS  },  // right island
        // Gravel – punishes wide entry into the crossing from either side
        { x:1050, y: 250, w: 300, h: 250, surface:SURFACE.GRAVEL },  // upper crossing
        { x:1050, y:1300, w: 300, h: 250, surface:SURFACE.GRAVEL },  // lower crossing
        // Oil slick – danger zone centre (creates extra sliding excitement)
        { x:1090, y: 800, w: 220, h: 200, surface:SURFACE.OIL    },
    ],

    // ── Obstacles ────────────────────────────────────────────────────
    //
    // Rotation convention (engine: rot=0 → h points North):
    //   rot = 3π/4  → h points SE  (wall runs NW → SE)
    //   rot = −3π/4 → h points SW  (wall runs NE → SW)
    //   rot =  π/4  → h points NE  (wall runs SW → NE)
    //   rot = −π/4  → h points NW  (wall runs SE → NW)
    //
    // Diagonal wall math: from point A to point B at 45°:
    //   centre = midpoint(A,B),  h = √((dx²+dy²)),  rotation as above.
    //   For 45°, dx=dy, so h = dx * √2.
    //
    obstacles: [
        // ── LEFT OVAL outer boundary ─────────────────────────────────
        { cx: 155, cy: 900, w:  22, h:1300, color:C_WALL_OVAL },  // left
        { cx: 600, cy: 250, w: 900, h:  22, color:C_WALL_OVAL },  // top  (x=155–1055)
        { cx: 600, cy:1550, w: 900, h:  22, color:C_WALL_OVAL },  // bottom
        // Right outer wall, upper section (y=250–500)
        { cx:1055, cy: 375, w:  22, h: 250, color:C_WALL_OVAL },
        // Right outer wall, lower section (y=1300–1550)
        { cx:1055, cy:1425, w:  22, h: 250, color:C_WALL_OVAL },

        // ── RIGHT OVAL outer boundary ────────────────────────────────
        { cx:2245, cy: 900, w:  22, h:1300, color:C_WALL_OVAL },  // right
        { cx:1800, cy: 250, w: 900, h:  22, color:C_WALL_OVAL },  // top  (x=1345–2245)
        { cx:1800, cy:1550, w: 900, h:  22, color:C_WALL_OVAL },  // bottom
        // Left outer wall, upper section (y=250–500)
        { cx:1345, cy: 375, w:  22, h: 250, color:C_WALL_OVAL },
        // Left outer wall, lower section (y=1300–1550)
        { cx:1345, cy:1425, w:  22, h: 250, color:C_WALL_OVAL },

        // ── ∞ WAIST — four 45° walls forming the crossing ────────────
        //
        // Upper-Left (UL): from (1055,500) SE to (1205,650)
        //   dx=150, dy=150, h=150√2≈212, centre=(1130,575), rot=3π/4
        { cx:1130, cy: 575, w:22, h:212, color:C_WALL_OVAL, rotation: Math.PI * 0.75  },
        // Upper-Right (UR): from (1345,500) SW to (1195,650)
        //   centre=(1270,575), rot=−3π/4
        { cx:1270, cy: 575, w:22, h:212, color:C_WALL_OVAL, rotation:-Math.PI * 0.75  },
        // Lower-Left (LL): from (1055,1300) NE to (1205,1150)
        //   centre=(1130,1225), rot=π/4
        { cx:1130, cy:1225, w:22, h:212, color:C_WALL_OVAL, rotation: Math.PI * 0.25  },
        // Lower-Right (LR): from (1345,1300) NW to (1195,1150)
        //   centre=(1270,1225), rot=−π/4
        { cx:1270, cy:1225, w:22, h:212, color:C_WALL_OVAL, rotation:-Math.PI * 0.25  },

        // ── LEFT OVAL inner island ───────────────────────────────────
        { cx: 600, cy: 510, w: 480, h:  22, color:C_WALL_OVAL },  // top
        { cx: 600, cy:1330, w: 480, h:  22, color:C_WALL_OVAL },  // bottom
        { cx: 380, cy: 920, w:  22, h: 820, color:C_WALL_OVAL },  // left
        { cx: 830, cy: 920, w:  22, h: 820, color:C_WALL_OVAL },  // right

        // ── RIGHT OVAL inner island ──────────────────────────────────
        { cx:1800, cy: 510, w: 480, h:  22, color:C_WALL_OVAL },
        { cx:1800, cy:1330, w: 480, h:  22, color:C_WALL_OVAL },
        { cx:1570, cy: 920, w:  22, h: 820, color:C_WALL_OVAL },
        { cx:2020, cy: 920, w:  22, h: 820, color:C_WALL_OVAL },

        // ── Corner chamfers (guide cars smoothly round oval corners) ─
        // Left oval – four corners at 45°, h≈85 (60×√2)
        { cx: 205, cy: 300, w:22, h:85, color:C_WALL_OVAL, rotation: Math.PI * 0.25  }, // top-left
        { cx: 205, cy:1500, w:22, h:85, color:C_WALL_OVAL, rotation:-Math.PI * 0.25  }, // bottom-left
        { cx: 995, cy: 300, w:22, h:85, color:C_WALL_OVAL, rotation:-Math.PI * 0.25  }, // top-right
        { cx: 995, cy:1500, w:22, h:85, color:C_WALL_OVAL, rotation: Math.PI * 0.25  }, // bottom-right
        // Right oval – four corners
        { cx:1405, cy: 300, w:22, h:85, color:C_WALL_OVAL, rotation: Math.PI * 0.25  },
        { cx:1405, cy:1500, w:22, h:85, color:C_WALL_OVAL, rotation:-Math.PI * 0.25  },
        { cx:2195, cy: 300, w:22, h:85, color:C_WALL_OVAL, rotation:-Math.PI * 0.25  },
        { cx:2195, cy:1500, w:22, h:85, color:C_WALL_OVAL, rotation: Math.PI * 0.25  },

        // ── Barrel clusters at key corners ───────────────────────────
        { cx: 240, cy: 410, w:28, h:28, isBarrel:true, color:C_BARREL },
        { cx: 260, cy: 380, w:28, h:28, isBarrel:true, color:C_BARREL },
        { cx:2150, cy: 410, w:28, h:28, isBarrel:true, color:C_BARREL },
        { cx:2130, cy: 380, w:28, h:28, isBarrel:true, color:C_BARREL },
        { cx: 240, cy:1390, w:28, h:28, isBarrel:true, color:C_BARREL },
        { cx:2150, cy:1390, w:28, h:28, isBarrel:true, color:C_BARREL },
    ],

    // ── Pickups ──────────────────────────────────────────────────────
    pickups: [
        { x: 600, y: 370, type:'weapon', data:'MACHINEGUN' }, // top left (CP1)
        { x:1800, y: 370, type:'weapon', data:'MISSILE'    }, // top right (CP2)
        { x: 600, y:1430, type:'weapon', data:'MINE'       }, // bottom left
        { x:1200, y: 900, type:'money',  data:250          }, // danger zone (high risk!)
        { x: 155, y: 900, type:'health', data: 30          }, // left side
        { x:2245, y: 900, type:'health', data: 25          }, // right side (CP0)
        { x:1800, y:1430, type:'money',  data:150          }, // bottom right
        { x: 600, y: 900, type:'money',  data:100          }, // left oval mid
    ],
};
