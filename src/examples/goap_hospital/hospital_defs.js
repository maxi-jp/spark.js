// ============================================================================
// spark.js — GOAP Demo 4: Hospital Definitions, Floorplan & Navigation Grid
//   - HOSPITAL_DEPARTMENTS, PATIENT_AILMENTS, PATIENT_NAMES
//   - HospitalNavGrid (implements AStarPathfinder grid contract from ai.js)
//   - BuildHospitalFloorplan() (constructs room geometry, queues, restrooms,
//     and registers perimeter walls & doorway openings in the A* grid)
// ============================================================================

// ============================================================================
// 1. HOSPITAL AILMENTS & MEDICAL DEPARTMENTS CATALOG
// ============================================================================

const HOSPITAL_DEPARTMENTS = {
    general: {
        id: 'general',
        name: 'General Medicine',
        shortName: 'General Med',
        doctorName: 'Dr. Gregory',
        icon: '🩺',
        accentHex: '#2dd4bf',
        bgTint: new Color(0.18, 0.83, 0.75, 0.10),
        borderCol: Color.FromHex('#14b8a6')
    },
    ophthalmology: {
        id: 'ophthalmology',
        name: 'Ophthalmology',
        shortName: 'Ophthalmology',
        doctorName: 'Dr. Iris',
        icon: '👁️',
        accentHex: '#38bdf8',
        bgTint: new Color(0.22, 0.74, 0.97, 0.10),
        borderCol: Color.FromHex('#0284c7')
    },
    orthopedics: {
        id: 'orthopedics',
        name: 'Orthopedics',
        shortName: 'Orthopedics',
        doctorName: 'Dr. Bones',
        icon: '🦴',
        accentHex: '#fb923c',
        bgTint: new Color(0.98, 0.57, 0.24, 0.10),
        borderCol: Color.FromHex('#ea580c')
    },
    maternity: {
        id: 'maternity',
        name: 'Maternity & OB',
        shortName: 'Maternity',
        doctorName: 'Dr. Clara',
        icon: '🤰',
        accentHex: '#f472b6',
        bgTint: new Color(0.96, 0.45, 0.71, 0.10),
        borderCol: Color.FromHex('#db2777')
    }
};

const PATIENT_AILMENTS = [
    {
        name: 'Common Cold',
        department: 'general',
        needsXRay: false,
        treatmentDuration: 2.3,
        symptomIcon: '🤧',
        colorHex: '#2dd4bf'
    },
    {
        name: 'Chest Congestion',
        department: 'general',
        needsXRay: true,
        treatmentDuration: 2.9,
        symptomIcon: '🫁',
        colorHex: '#5eead4'
    },
    {
        name: 'Blurred Vision',
        department: 'ophthalmology',
        needsXRay: false,
        treatmentDuration: 2.6,
        symptomIcon: '👓',
        colorHex: '#38bdf8'
    },
    {
        name: 'Corneal Irritation',
        department: 'ophthalmology',
        needsXRay: false,
        treatmentDuration: 3.1,
        symptomIcon: '👁️',
        colorHex: '#7dd3fc'
    },
    {
        name: 'Sprained Wrist',
        department: 'orthopedics',
        needsXRay: false,
        treatmentDuration: 2.7,
        symptomIcon: '🤕',
        colorHex: '#fb923c'
    },
    {
        name: 'Radius Fracture',
        department: 'orthopedics',
        needsXRay: true,
        treatmentDuration: 3.7,
        symptomIcon: '🦴',
        colorHex: '#fdba74'
    },
    {
        name: 'Prenatal Checkup',
        department: 'maternity',
        needsXRay: false,
        treatmentDuration: 2.8,
        symptomIcon: '🤰',
        colorHex: '#f472b6'
    },
    {
        name: 'Fetal Ultrasound',
        department: 'maternity',
        needsXRay: false,
        treatmentDuration: 3.4,
        symptomIcon: '👶',
        colorHex: '#f9a8d4'
    }
];

const PATIENT_NAMES = [
    'Alex', 'Elena', 'Marco', 'Sofia', 'Lucas', 'Nadia', 'Hugo', 'Clara',
    'Mateo', 'Valeria', 'Leo', 'Irene', 'Gael', 'Paula', 'Bruno', 'Diana',
    'Oscar', 'Carmen', 'Julian', 'Noa', 'Elendil', 'Alba', 'Dario', 'Lola'
];

// ============================================================================
// 2. HOSPITAL NAVIGATION GRID (Compatible with src/engine/ai.js AStarPathfinder)
// ============================================================================

/**
 * Self-contained 2D tile grid implementing the interface expected by `AStarPathfinder`
 * (`width`, `height`, `IsWalkable`, `IsInBounds`, `WorldToGrid`, `GridToWorld`).
 * Zero changes required in `src/engine/ai.js`.
 */
class HospitalNavGrid {
    constructor(originX, originY, cellSize, cols, rows) {
        this.originX = originX;
        this.originY = originY;
        this.cellSize = cellSize;
        this.width = cols;
        this.height = rows;

        // true = walkable floor/corridor, false = wall or solid furniture
        this.walkable = [];
        for (let r = 0; r < rows; r++) {
            this.walkable.push(new Array(cols).fill(true));
        }
    }

    IsInBounds(col, row) {
        return col >= 0 && col < this.width && row >= 0 && row < this.height;
    }

    IsWalkable(col, row) {
        if (!this.IsInBounds(col, row))
            return false;
        return this.walkable[row][col];
    }

    WorldToGrid(pos) {
        const col = Math.max(0, Math.min(this.width - 1, Math.floor((pos.x - this.originX) / this.cellSize)));
        const row = Math.max(0, Math.min(this.height - 1, Math.floor((pos.y - this.originY) / this.cellSize)));
        return { col, row };
    }

    GridToWorld(col, row) {
        return new Vector2(
            this.originX + (col + 0.5) * this.cellSize,
            this.originY + (row + 0.5) * this.cellSize
        );
    }

    /** Block or unblock a world-space rectangle in the navigation grid. */
    SetRectWalkable(worldX, worldY, worldW, worldH, isWalkable) {
        const c0 = Math.max(0, Math.floor((worldX - this.originX) / this.cellSize));
        const r0 = Math.max(0, Math.floor((worldY - this.originY) / this.cellSize));
        const c1 = Math.min(this.width - 1, Math.floor((worldX + worldW - 1 - this.originX) / this.cellSize));
        const r1 = Math.min(this.height - 1, Math.floor((worldY + worldH - 1 - this.originY) / this.cellSize));

        for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
                this.walkable[r][c] = isWalkable;
            }
        }
    }

    /** Block the 4 perimeter walls of a room in the grid, then punch doorway openings. */
    AddRoomWalls(x, y, w, h, doorways = []) {
        const wallThickness = 12;
        this.SetRectWalkable(x, y, w, wallThickness, false);                     // Top wall
        this.SetRectWalkable(x, y + h - wallThickness, w, wallThickness, false); // Bottom wall
        this.SetRectWalkable(x, y, wallThickness, h, false);                     // Left wall
        this.SetRectWalkable(x + w - wallThickness, y, wallThickness, h, false); // Right wall

        for (let i = 0; i < doorways.length; i++) {
            const d = doorways[i];
            this.SetRectWalkable(d.x - d.w / 2, d.y - d.h / 2, d.w, d.h, true);
        }
    }
}

// ============================================================================
// 3. FLOORPLAN LAYOUT BUILDER
// ============================================================================

function CreateNorthDeptLayout(id, x, y) {
    // Total section: 276w x 240h (Waiting room on left: 116w, Consult room on right: 160w)
    const waitRect = { x: x, y: y, w: 116, h: 240 };
    const consultRect = { x: x + 116, y: y, w: 160, h: 240 };
    const innerDoor = { x: x + 116, y: y + 156, w: 32, h: 48 };
    const waitCorridorDoor = { x: x + 58, y: y + 240, w: 52, h: 28 };
    const consultCorridorDoor = { x: x + 196, y: y + 240, w: 52, h: 28 };

    return {
        id,
        rect: { x, y, w: 276, h: 240 },
        waitRect,
        consultRect,
        waitDoorways: [waitCorridorDoor, innerDoor],
        consultDoorways: [consultCorridorDoor, innerDoor],
        queueSlots: [
            new Vector2(x + 42, y + 104),
            new Vector2(x + 82, y + 104),
            new Vector2(x + 42, y + 144),
            new Vector2(x + 82, y + 144),
            new Vector2(x + 42, y + 184),
            new Vector2(x + 82, y + 184)
        ],
        examBedRect: { x: x + 196, y: y + 84, w: 64, h: 36 },
        patientExamPos: new Vector2(x + 228, y + 102),
        doctorExamPos: new Vector2(x + 174, y + 102),
        pcDeskRect: { x: x + 138, y: y + 188, w: 58, h: 28 },
        doctorPCPos: new Vector2(x + 167, y + 174)
    };
}

function CreateSouthDeptLayout(id, x, y) {
    // Total section: 276w x 284h (Waiting room on left: 116w, Consult room on right: 160w)
    const waitRect = { x: x, y: y, w: 116, h: 284 };
    const consultRect = { x: x + 116, y: y, w: 160, h: 284 };
    const innerDoor = { x: x + 116, y: y + 124, w: 32, h: 48 };
    const waitCorridorDoor = { x: x + 58, y: y, w: 52, h: 28 };
    const consultCorridorDoor = { x: x + 196, y: y, w: 52, h: 28 };

    return {
        id,
        rect: { x, y, w: 276, h: 284 },
        waitRect,
        consultRect,
        waitDoorways: [waitCorridorDoor, innerDoor],
        consultDoorways: [consultCorridorDoor, innerDoor],
        queueSlots: [
            new Vector2(x + 42, y + 110),
            new Vector2(x + 82, y + 110),
            new Vector2(x + 42, y + 154),
            new Vector2(x + 82, y + 154),
            new Vector2(x + 42, y + 198),
            new Vector2(x + 82, y + 198)
        ],
        examBedRect: { x: x + 196, y: y + 190, w: 64, h: 36 },
        patientExamPos: new Vector2(x + 228, y + 208),
        doctorExamPos: new Vector2(x + 174, y + 208),
        pcDeskRect: { x: x + 138, y: y + 72, w: 58, h: 28 },
        doctorPCPos: new Vector2(x + 167, y + 112)
    };
}

/**
 * Builds the hospital floorplan layout, restroom stall registry, and `HospitalNavGrid`
 * paired with an `AStarPathfinder` instance.
 */
function BuildHospitalFloorplan() {
    // Hospital building spans x: 12..900, y: 52..704
    const navGrid = new HospitalNavGrid(12, 52, 16, 56, 41);

    const layout = {
        entrancePos: new Vector2(36, 344),
        exitPos: new Vector2(28, 372),

        reception: {
            rect: { x: 16, y: 56, w: 232, h: 240 },
            deskRect: { x: 42, y: 92, w: 100, h: 34 },
            staffPos: new Vector2(92, 76),
            queueSlots: [
                new Vector2(92, 144),  // Slot 0: right in front of triage window
                new Vector2(92, 174),
                new Vector2(92, 204),
                new Vector2(142, 204),
                new Vector2(142, 174),
                new Vector2(192, 174),
                new Vector2(192, 204),
                new Vector2(192, 234)
            ],
            doorways: [
                { x: 148, y: 296, w: 56, h: 28 }
            ]
        },

        xrayRoom: {
            rect: { x: 16, y: 416, w: 232, h: 152 },
            scannerRect: { x: 34, y: 454, w: 94, h: 52 },
            scannerPos: new Vector2(81, 480),
            queueSlots: [
                new Vector2(182, 464),
                new Vector2(182, 496),
                new Vector2(182, 528),
                new Vector2(216, 496)
            ],
            doorways: [
                { x: 164, y: 416, w: 56, h: 28 }
            ]
        },

        departments: {
            general: CreateNorthDeptLayout('general', 260, 56),
            ophthalmology: CreateNorthDeptLayout('ophthalmology', 548, 56),
            orthopedics: CreateSouthDeptLayout('orthopedics', 260, 416),
            maternity: CreateSouthDeptLayout('maternity', 548, 416)
        },

        restrooms: [
            {
                id: 'west',
                name: 'West Lobby WC',
                rect: { x: 16, y: 576, w: 232, h: 124 },
                waitPos: new Vector2(204, 636),
                doorways: [{ x: 204, y: 576, w: 52, h: 28 }],
                stalls: [
                    { id: 'W1', restroomId: 'west', restroomName: 'West WC', label: 'West WC #1', pos: new Vector2(68, 646), rect: { x: 36, y: 616, w: 64, h: 62 }, occupant: null },
                    { id: 'W2', restroomId: 'west', restroomName: 'West WC', label: 'West WC #2', pos: new Vector2(142, 646), rect: { x: 110, y: 616, w: 64, h: 62 }, occupant: null }
                ]
            },
            {
                id: 'north',
                name: 'North Wing WC',
                rect: { x: 832, y: 56, w: 68, h: 240 },
                waitPos: new Vector2(866, 268),
                doorways: [{ x: 866, y: 296, w: 46, h: 28 }],
                stalls: [
                    { id: 'N1', restroomId: 'north', restroomName: 'North WC', label: 'North WC #1', pos: new Vector2(866, 112), rect: { x: 840, y: 82, w: 52, h: 58 }, occupant: null },
                    { id: 'N2', restroomId: 'north', restroomName: 'North WC', label: 'North WC #2', pos: new Vector2(866, 192), rect: { x: 840, y: 162, w: 52, h: 58 }, occupant: null }
                ]
            },
            {
                id: 'south',
                name: 'South Wing WC',
                rect: { x: 832, y: 416, w: 68, h: 284 },
                waitPos: new Vector2(866, 444),
                doorways: [{ x: 866, y: 416, w: 46, h: 28 }],
                stalls: [
                    { id: 'S1', restroomId: 'south', restroomName: 'South WC', label: 'South WC #1', pos: new Vector2(866, 534), rect: { x: 840, y: 504, w: 52, h: 60 }, occupant: null },
                    { id: 'S2', restroomId: 'south', restroomName: 'South WC', label: 'South WC #2', pos: new Vector2(866, 624), rect: { x: 840, y: 594, w: 52, h: 60 }, occupant: null }
                ]
            }
        ]
    };

    // Flatten all restroom stalls for quick lookup
    const allRestroomStalls = [];
    for (let i = 0; i < layout.restrooms.length; i++) {
        const rr = layout.restrooms[i];
        for (let j = 0; j < rr.stalls.length; j++) {
            allRestroomStalls.push(rr.stalls[j]);
        }
    }

    // Register room perimeter walls & doorways in the A* Navigation Grid
    navGrid.AddRoomWalls(
        layout.reception.rect.x,
        layout.reception.rect.y,
        layout.reception.rect.w,
        layout.reception.rect.h,
        layout.reception.doorways
    );
    // Block reception desk counter
    navGrid.SetRectWalkable(42, 94, 100, 30, false);

    // X-Ray room walls & doorway
    navGrid.AddRoomWalls(
        layout.xrayRoom.rect.x,
        layout.xrayRoom.rect.y,
        layout.xrayRoom.rect.w,
        layout.xrayRoom.rect.h,
        [
            ...layout.xrayRoom.doorways,
            { x: 204, y: 568, w: 52, h: 28 } // passage to West Restroom
        ]
    );

    // Department waiting rooms & consultation rooms
    const deptKeys = Object.keys(layout.departments);
    for (let i = 0; i < deptKeys.length; i++) {
        const d = layout.departments[deptKeys[i]];
        navGrid.AddRoomWalls(d.waitRect.x, d.waitRect.y, d.waitRect.w, d.waitRect.h, d.waitDoorways);
        navGrid.AddRoomWalls(d.consultRect.x, d.consultRect.y, d.consultRect.w, d.consultRect.h, d.consultDoorways);
    }

    // Restroom walls
    for (let i = 0; i < layout.restrooms.length; i++) {
        const rr = layout.restrooms[i];
        navGrid.AddRoomWalls(rr.rect.x, rr.rect.y, rr.rect.w, rr.rect.h, rr.doorways);
    }

    // Initialize A* Pathfinder from src/engine/ai.js
    const pathfinder = new AStarPathfinder(navGrid, {
        allowDiagonals: true,
        smoothPath: true
    });

    return {
        navGrid,
        layout,
        allRestroomStalls,
        pathfinder
    };
}

