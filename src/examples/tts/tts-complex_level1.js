// Native JS Level Data (Adapted from levels.xml)
// Scene limits are 1200x640. Spawns are placed slightly off-screen 
// (e.g., -50 or 1250) so they enter naturally.
const LEVEL_1_DATA = [
    {
        // Wave 1: Introduction. Two slow enemies from top and bottom.
        time: 0,
        enemies: [
            { x: 600, y: -50, type: ENEMY_TYPE.NORMAL },
            { x: 600, y: 690, type: ENEMY_TYPE.NORMAL }
        ]
    },
    {
        // Wave 2: Corners attack. Teaches diagonal movement.
        time: 6,
        enemies: [
            { x: -50, y: -50, type: ENEMY_TYPE.NORMAL },
            { x: 1250, y: -50, type: ENEMY_TYPE.NORMAL },
            { x: -50, y: 690, type: ENEMY_TYPE.NORMAL },
            { x: 1250, y: 690, type: ENEMY_TYPE.NORMAL }
        ]
    },
    {
        // Wave 3: Introduce Kamikaze. Fast lateral attack to force vertical dodging.
        time: 13, 
        enemies: [
            { x: -50, y: 320, type: ENEMY_TYPE.KAMIKAZE },
            { x: 1250, y: 320, type: ENEMY_TYPE.KAMIKAZE }
        ]
    },
    {
        // Wave 4: Introduce Asteroids + first Waver.
        time: 20,
        enemies: [
            { x: 300, y: -50, type: ENEMY_TYPE.ASTEROID },
            { x: 900, y: -50, type: ENEMY_TYPE.ASTEROID },
            { x: 300, y: 690, type: ENEMY_TYPE.WAVER },
            { x: 900, y: 690, type: ENEMY_TYPE.NORMAL }
        ]
    },
    {
        // Wave 5: Pincer cross. Asteroids from sides, Kamikazes from top/bottom.
        time: 26,
        enemies: [
            { x: -50, y: 100, type: ENEMY_TYPE.ASTEROID },
            { x: 1250, y: 540, type: ENEMY_TYPE.ASTEROID },
            { x: 600, y: -50, type: ENEMY_TYPE.KAMIKAZE },
            { x: 600, y: 690, type: ENEMY_TYPE.KAMIKAZE }
        ]
    },
    {
        // Wave 6: The Swarm + first Strafer.
        time: 34,
        enemies: [
            { x: 600, y: -50, type: ENEMY_TYPE.NORMAL },
            { x: 1250, y: 320, type: ENEMY_TYPE.STRAFER },
            { x: 600, y: 690, type: ENEMY_TYPE.NORMAL },
            { x: -50, y: 320, type: ENEMY_TYPE.NORMAL },
            { x: -50, y: -50, type: ENEMY_TYPE.NORMAL },
            { x: 1250, y: 690, type: ENEMY_TYPE.NORMAL }
        ]
    },
    {
        // Wave 7: Chaos. Everything at once!
        time: 44,
        enemies: [
            { x: -50, y: -50, type: ENEMY_TYPE.KAMIKAZE },
            { x: 1250, y: -50, type: ENEMY_TYPE.KAMIKAZE },
            { x: -50, y: 690, type: ENEMY_TYPE.KAMIKAZE },
            { x: 1250, y: 690, type: ENEMY_TYPE.KAMIKAZE },
            { x: 600, y: -50, type: ENEMY_TYPE.ASTEROID },
            { x: 600, y: 690, type: ENEMY_TYPE.ASTEROID },
            { x: -50, y: 320, type: ENEMY_TYPE.NORMAL },
            { x: 1250, y: 320, type: ENEMY_TYPE.NORMAL }
        ]
    },
    {
        // Wave 8: Asteroid Rain + first Tank from below.
        time: 53,
        enemies: [
            { x: 200, y: -50, type: ENEMY_TYPE.ASTEROID },
            { x: 400, y: -50, type: ENEMY_TYPE.ASTEROID },
            { x: 600, y: -50, type: ENEMY_TYPE.ASTEROID },
            { x: 800, y: -50, type: ENEMY_TYPE.ASTEROID },
            { x: 1000, y: -50, type: ENEMY_TYPE.ASTEROID },
            { x: 200, y: 690, type: ENEMY_TYPE.TANK },
            { x: 400, y: 690, type: ENEMY_TYPE.NORMAL },
            { x: 600, y: 690, type: ENEMY_TYPE.NORMAL },
            { x: 800, y: 690, type: ENEMY_TYPE.NORMAL },
            { x: 1000, y: 690, type: ENEMY_TYPE.NORMAL }
        ]
    },
    {
        // Wave 9: Kamikaze Crossfire. Fast moving lines from the sides.
        time: 64,
        enemies: [
            { x: -50, y: 100, type: ENEMY_TYPE.KAMIKAZE },
            { x: -50, y: 320, type: ENEMY_TYPE.KAMIKAZE },
            { x: -50, y: 540, type: ENEMY_TYPE.KAMIKAZE },
            { x: 1250, y: 100, type: ENEMY_TYPE.KAMIKAZE },
            { x: 1250, y: 320, type: ENEMY_TYPE.KAMIKAZE },
            { x: 1250, y: 540, type: ENEMY_TYPE.KAMIKAZE }
        ]
    },
    {
        // Wave 10: Mixed Assault. Adds Waver + Tank pressure.
        time: 73,
        enemies: [
            { x: -50, y: -50, type: ENEMY_TYPE.ASTEROID },
            { x: 1250, y: -50, type: ENEMY_TYPE.ASTEROID },
            { x: -50, y: 690, type: ENEMY_TYPE.ASTEROID },
            { x: 1250, y: 690, type: ENEMY_TYPE.ASTEROID },
            { x: 600, y: -50, type: ENEMY_TYPE.WAVER },
            { x: 600, y: 690, type: ENEMY_TYPE.TANK },
            { x: -50, y: 320, type: ENEMY_TYPE.KAMIKAZE },
            { x: 1250, y: 320, type: ENEMY_TYPE.KAMIKAZE },
            { x: 300, y: -50, type: ENEMY_TYPE.NORMAL },
            { x: 900, y: -50, type: ENEMY_TYPE.NORMAL }
        ]
    },
    {
        // Wave 11: The Grand Swarm. Mixed normals and strafers boxing the player in.
        time: 83,
        enemies: [
            { x: 100, y: -50, type: ENEMY_TYPE.NORMAL },
            { x: 300, y: -50, type: ENEMY_TYPE.NORMAL },
            { x: 500, y: -50, type: ENEMY_TYPE.STRAFER },
            { x: 700, y: -50, type: ENEMY_TYPE.NORMAL },
            { x: 900, y: -50, type: ENEMY_TYPE.NORMAL },
            { x: 1100, y: -50, type: ENEMY_TYPE.NORMAL },
            { x: 100, y: 690, type: ENEMY_TYPE.NORMAL },
            { x: 300, y: 690, type: ENEMY_TYPE.NORMAL },
            { x: 500, y: 690, type: ENEMY_TYPE.STRAFER },
            { x: 700, y: 690, type: ENEMY_TYPE.NORMAL },
            { x: 900, y: 690, type: ENEMY_TYPE.NORMAL },
            { x: 1100, y: 690, type: ENEMY_TYPE.NORMAL },
            { x: -50, y: 320, type: ENEMY_TYPE.NORMAL },
            { x: 1250, y: 320, type: ENEMY_TYPE.NORMAL }
        ]
    },
    {
        // Wave 12: Total Anarchy. Final mix of all archetypes.
        time: 98,
        enemies: [
            { x: -50, y: -50, type: ENEMY_TYPE.KAMIKAZE },
            { x: 1250, y: -50, type: ENEMY_TYPE.KAMIKAZE },
            { x: -50, y: 690, type: ENEMY_TYPE.KAMIKAZE },
            { x: 1250, y: 690, type: ENEMY_TYPE.KAMIKAZE },
            { x: -50, y: 320, type: ENEMY_TYPE.STRAFER },
            { x: 1250, y: 320, type: ENEMY_TYPE.STRAFER },
            { x: 300, y: -50, type: ENEMY_TYPE.ASTEROID },
            { x: 900, y: -50, type: ENEMY_TYPE.ASTEROID },
            { x: 300, y: 690, type: ENEMY_TYPE.WAVER },
            { x: 900, y: 690, type: ENEMY_TYPE.WAVER },
            { x: -50, y: 160, type: ENEMY_TYPE.ASTEROID },
            { x: -50, y: 480, type: ENEMY_TYPE.TANK },
            { x: 1250, y: 160, type: ENEMY_TYPE.ASTEROID },
            { x: 1250, y: 480, type: ENEMY_TYPE.TANK }
        ]
    },
    {
        // Wave 13: Spiral Siege. Strafers and wavers collapse from opposite sides.
        time: 110,
        enemies: [
            { x: -50, y: 120, type: ENEMY_TYPE.STRAFER },
            { x: -50, y: 520, type: ENEMY_TYPE.STRAFER },
            { x: 1250, y: 120, type: ENEMY_TYPE.STRAFER },
            { x: 1250, y: 520, type: ENEMY_TYPE.STRAFER },
            { x: 600, y: -50, type: ENEMY_TYPE.WAVER },
            { x: 600, y: 690, type: ENEMY_TYPE.WAVER },
            { x: 250, y: -50, type: ENEMY_TYPE.KAMIKAZE },
            { x: 950, y: -50, type: ENEMY_TYPE.KAMIKAZE }
        ]
    },
    {
        // Wave 14: Heavy Push. Tanks force space while fast units punish escapes.
        time: 122,
        enemies: [
            { x: 300, y: -50, type: ENEMY_TYPE.TANK },
            { x: 900, y: -50, type: ENEMY_TYPE.TANK },
            { x: 300, y: 690, type: ENEMY_TYPE.TANK },
            { x: 900, y: 690, type: ENEMY_TYPE.TANK },
            { x: -50, y: 320, type: ENEMY_TYPE.KAMIKAZE },
            { x: 1250, y: 320, type: ENEMY_TYPE.KAMIKAZE },
            { x: 600, y: -50, type: ENEMY_TYPE.ASTEROID },
            { x: 600, y: 690, type: ENEMY_TYPE.ASTEROID },
            { x: -50, y: 200, type: ENEMY_TYPE.WAVER },
            { x: 1250, y: 440, type: ENEMY_TYPE.WAVER }
        ]
    },
    {
        // Wave 15: Last Stand. Full mixed finale.
        time: 136,
        enemies: [
            { x: -50, y: -50, type: ENEMY_TYPE.KAMIKAZE },
            { x: 1250, y: -50, type: ENEMY_TYPE.KAMIKAZE },
            { x: -50, y: 690, type: ENEMY_TYPE.KAMIKAZE },
            { x: 1250, y: 690, type: ENEMY_TYPE.KAMIKAZE },
            { x: -50, y: 320, type: ENEMY_TYPE.STRAFER },
            { x: 1250, y: 320, type: ENEMY_TYPE.STRAFER },
            { x: 200, y: -50, type: ENEMY_TYPE.ASTEROID },
            { x: 1000, y: -50, type: ENEMY_TYPE.ASTEROID },
            { x: 200, y: 690, type: ENEMY_TYPE.ASTEROID },
            { x: 1000, y: 690, type: ENEMY_TYPE.ASTEROID },
            { x: 600, y: -50, type: ENEMY_TYPE.TANK },
            { x: 600, y: 690, type: ENEMY_TYPE.TANK },
            { x: 350, y: -50, type: ENEMY_TYPE.WAVER },
            { x: 850, y: 690, type: ENEMY_TYPE.WAVER }
        ]
    },
    {
        // Wave 16: Boss
        time: 150,
        enemies: [
            {x: 600, y: 360, type: ENEMY_TYPE.BOSS}
        ]
    }
];