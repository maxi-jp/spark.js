// =====================================================================
// Death Rally — Shared constants and color cache
// Load order: first (after circuit.js, before game_objects.js)
// =====================================================================

const WORLD_W  = 2400;
const WORLD_H  = 1800;
const SCREEN_W = 1024;
const SCREEN_H = 768;

// Surface types — lateralFriction: fraction of sideways velocity removed per second
const SURFACE = {
    GRASS:   { id:'GRASS',   name:'Grass',     lateralFriction:0.55, topSpeedMult:0.65, color:Color.FromRGB( 50, 80, 35) },
    ASPHALT: { id:'ASPHALT', name:'Asphalt',   lateralFriction:0.88, topSpeedMult:1.00, color:Color.FromRGB( 65, 65, 70) },
    GRAVEL:  { id:'GRAVEL',  name:'Gravel',    lateralFriction:0.60, topSpeedMult:0.84, color:Color.FromRGB(145,130,100) },
    DIRT:    { id:'DIRT',    name:'Dirt',      lateralFriction:0.46, topSpeedMult:0.73, color:Color.FromRGB(120, 85, 50) },
    OIL:     { id:'OIL',     name:'Oil Slick', lateralFriction:0.10, topSpeedMult:0.96, color:Color.FromRGB( 22, 22, 38) },
};

const VEHICLE_DEFS = {
    SPORTS:   { name:'Sports Car',  topSpeed:500, acceleration:460, braking:560, steerSpeed:2.8, mass:1.0, lateralFrictionMult:1.00, width:24, height:44, health:100, color:Color.FromRGB(220, 60, 60) },
    MUSCLE:   { name:'Muscle Car',  topSpeed:440, acceleration:400, braking:480, steerSpeed:2.3, mass:1.5, lateralFrictionMult:0.95, width:28, height:50, health:150, color:Color.FromRGB( 60,100,220) },
    TRUCK:    { name:'Heavy Truck', topSpeed:300, acceleration:260, braking:380, steerSpeed:1.8, mass:2.5, lateralFrictionMult:0.88, width:36, height:60, health:240, color:Color.FromRGB( 60,160, 60) },
    BUGGY:    { name:'Buggy',       topSpeed:470, acceleration:500, braking:540, steerSpeed:3.2, mass:0.8, lateralFrictionMult:0.82, width:22, height:38, health: 80, color:Color.FromRGB(220,180, 40) },
    SUPERCAR: { name:'Supercar',    topSpeed:680, acceleration:620, braking:700, steerSpeed:3.1, mass:0.85,lateralFrictionMult:1.08, width:22, height:46, health: 90, color:Color.FromRGB(180,  0,255) },
};

// fireRate: minimum seconds between shots
const WEAPON_DEFS = {
    NONE:       { key:'NONE',       name:'None',        ammo: 0, damage: 0,  fireRate:0,    speed:  0, radius: 0, color:null },
    MACHINEGUN: { key:'MACHINEGUN', name:'Machine Gun', ammo:10, damage:10,  fireRate:0.12, speed:700, radius: 4, color:Color.FromRGB(255,255,100) },
    MISSILE:    { key:'MISSILE',    name:'Missile',     ammo: 1, damage:65,  fireRate:1.50, speed:480, radius: 8, color:Color.FromRGB(255, 80, 20) },
    MINE:       { key:'MINE',       name:'Mine',        ammo: 3, damage:45,  fireRate:0.40, speed:  0, radius:13, color:Color.FromRGB( 60, 60, 60) },
};

// ── Upgrade system ────────────────────────────────────────────────────
/** Each level entry holds the CUMULATIVE bonus (not delta) and the cost to reach that level. */
const UPGRADE_DEFS = {
    ENGINE: {
        name: 'Engine',
        maxLevel: 3,
        levels: [
            { topSpeedBonus: 40,  accelerationBonus:  50, cost: 200 },
            { topSpeedBonus: 80,  accelerationBonus: 100, cost: 400 },
            { topSpeedBonus: 130, accelerationBonus: 160, cost: 800 },
        ],
    },
    TYRES: {
        name: 'Tyres',
        maxLevel: 3,
        levels: [
            { lateralFrictionBonus: 0.05, cost: 200 },
            { lateralFrictionBonus: 0.10, cost: 400 },
            { lateralFrictionBonus: 0.15, cost: 800 },
        ],
    },
    ARMOUR: {
        name: 'Armour',
        maxLevel: 3,
        levels: [
            { armourValue: 25, cost: 200 },  // flat damage reduction per hit
            { armourValue: 50, cost: 400 },
            { armourValue: 75, cost: 800 },
        ],
    },
    BUMPER: {
        name: 'Spiked Bumper',
        maxLevel: 3,
        levels: [
            { collisionDamageMult: 1.5, cost: 200 },  // multiplier on collision damage OTHER cars take from hitting this car
            { collisionDamageMult: 2.0, cost: 400 },
            { collisionDamageMult: 2.5, cost: 800 },
        ],
    },
};

/** Repair cost per 1 HP of missing health. */
const REPAIR_COST_PER_HP = 3;

// ── Dealership ─────────────────────────────────────────────────────────
const DEALERSHIP_DEFS = {
    SPORTS:   { price:  300, lockedUntilWin: false },
    MUSCLE:   { price:  700, lockedUntilWin: false },
    TRUCK:    { price:  900, lockedUntilWin: false },
    BUGGY:    { price:  500, lockedUntilWin: false },
    SUPERCAR: { price: 1500, lockedUntilWin: true  },
};

// ── Campaign / competition ─────────────────────────────────────────────
/** Ordered circuit keys — the full campaign sequence. */
const CAMPAIGN_CIRCUIT_KEYS = ['OVAL_TRACK', 'FIGURE_EIGHT', 'FINAL_CIRCUIT'];

/** Championship points per finishing position (index 0 = 1st place). */
const POSITION_POINTS = [10, 6, 3, 1];

/** Prize money per finishing position (index 0 = 1st place). */
const POSITION_MONEY  = [800, 500, 300, 100];

/** Starting money for AI opponents at campaign start. */
const AI_STARTING_MONEY = 200;

/** AI opponent vehicle+starting config (3 opponents). */
const AI_OPPONENT_DEFS = [
    { vehicleKey: 'MUSCLE' },
    { vehicleKey: 'BUGGY'  },
    { vehicleKey: 'TRUCK'  },
];

// ── Color constants (keep Draw() hot-paths allocation-free) ──────────
const C_WHITE     = new Color(1,  1,  1,  1  );
const C_BLACK     = new Color(0,  0,  0,  1  );
const C_HALFBLACK = new Color(0,  0,  0,  0.5);
const C_DARKROAD  = Color.FromRGB( 40, 40, 45);
const C_WALL      = Color.FromRGB( 80, 70, 60);
const C_WALL_OVAL = Color.FromRGB(200,200,210);
const C_BARREL    = Color.FromRGB(190, 80, 20);
const C_HP_BG     = Color.FromRGB( 40, 40, 40);
const C_HP_HIGH   = Color.FromRGB( 50,200, 50);
const C_HP_MED    = Color.FromRGB(220,180,  0);
const C_HP_LOW    = Color.FromRGB(220, 40, 40);
const C_ARMOUR    = Color.FromRGB( 80,150,255);
const C_HEADLIGHT = Color.FromRGB(255,255,200);
const C_MINE_BODY = Color.FromRGB( 50, 50, 55);
const C_MINE_RIM  = Color.FromRGB(100,100,100);
const C_MINE_LED  = Color.FromRGB(255, 50, 50);
const C_PICK_HP   = Color.FromRGB( 50,200, 80);
const C_PICK_COIN = Color.FromRGB(255,210,  0);
const C_PICK_MG   = Color.FromRGB(255,220, 50);
const C_PICK_MSL  = Color.FromRGB(255,100, 30);
const C_PICK_MINE = Color.FromRGB(100,100,100);
const C_COIN_TEXT = Color.FromRGB(130, 90,  0);
const C_WRECKED   = Color.FromRGB(255, 50, 50);
