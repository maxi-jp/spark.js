// Native JS Level Data (Adapted from levels.xml)
// Scene limits are 1200x640. Spawns are placed slightly off-screen 
// (e.g., -50 or 1250) so they enter naturally.
const LEVEL_1_DATA = [
    {
        // Wave 1: Introduction. Two slow enemies from top and bottom.
        time: 2,
        enemies: [
            { x: 600, y: -50, type: ENEMY_TYPE.NORMAL },
            { x: 600, y: 690, type: ENEMY_TYPE.NORMAL }
        ]
    },
    {
        // Wave 2: Corners attack. Teaches diagonal movement.
        time: 8,
        enemies: [
            { x: -50, y: -50, type: ENEMY_TYPE.NORMAL },
            { x: 1250, y: -50, type: ENEMY_TYPE.NORMAL },
            { x: -50, y: 690, type: ENEMY_TYPE.NORMAL },
            { x: 1250, y: 690, type: ENEMY_TYPE.NORMAL }
        ]
    },
    {
        // Wave 3: Introduce Kamikaze. Fast lateral attack to force vertical dodging.
        time: 15, 
        enemies: [
            { x: -50, y: 320, type: ENEMY_TYPE.KAMIKAZE },
            { x: 1250, y: 320, type: ENEMY_TYPE.KAMIKAZE }
        ]
    },
    {
        // Wave 4: Introduce Asteroids + Normal cleanup.
        time: 22,
        enemies: [
            { x: 300, y: -50, type: ENEMY_TYPE.ASTEROID },
            { x: 900, y: -50, type: ENEMY_TYPE.ASTEROID },
            { x: 300, y: 690, type: ENEMY_TYPE.NORMAL },
            { x: 900, y: 690, type: ENEMY_TYPE.NORMAL }
        ]
    },
    {
        // Wave 5: Pincer cross. Asteroids from sides, Kamikazes from top/bottom.
        time: 28,
        enemies: [
            { x: -50, y: 100, type: ENEMY_TYPE.ASTEROID },
            { x: 1250, y: 540, type: ENEMY_TYPE.ASTEROID },
            { x: 600, y: -50, type: ENEMY_TYPE.KAMIKAZE },
            { x: 600, y: 690, type: ENEMY_TYPE.KAMIKAZE }
        ]
    },
    {
        // Wave 6: The Swarm. Encircle the player with Normal enemies.
        time: 36,
        enemies: [
            { x: 600, y: -50, type: ENEMY_TYPE.NORMAL },
            { x: 1250, y: 320, type: ENEMY_TYPE.NORMAL },
            { x: 600, y: 690, type: ENEMY_TYPE.NORMAL },
            { x: -50, y: 320, type: ENEMY_TYPE.NORMAL },
            { x: -50, y: -50, type: ENEMY_TYPE.NORMAL },
            { x: 1250, y: 690, type: ENEMY_TYPE.NORMAL }
        ]
    },
    {
        // Wave 7: Chaos. Everything at once!
        time: 46,
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
        // Wave 8: Asteroid Rain. A wall of asteroids from the top, normals from the bottom.
        time: 55,
        enemies: [
            { x: 200, y: -50, type: ENEMY_TYPE.ASTEROID },
            { x: 400, y: -50, type: ENEMY_TYPE.ASTEROID },
            { x: 600, y: -50, type: ENEMY_TYPE.ASTEROID },
            { x: 800, y: -50, type: ENEMY_TYPE.ASTEROID },
            { x: 1000, y: -50, type: ENEMY_TYPE.ASTEROID },
            { x: 200, y: 690, type: ENEMY_TYPE.NORMAL },
            { x: 400, y: 690, type: ENEMY_TYPE.NORMAL },
            { x: 600, y: 690, type: ENEMY_TYPE.NORMAL },
            { x: 800, y: 690, type: ENEMY_TYPE.NORMAL },
            { x: 1000, y: 690, type: ENEMY_TYPE.NORMAL }
        ]
    },
    {
        // Wave 9: Kamikaze Crossfire. Fast moving lines from the sides.
        time: 66,
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
        // Wave 10: Mixed Assault. Asteroids on corners, Kamikazes on sides, Normals top/bottom.
        time: 75,
        enemies: [
            { x: -50, y: -50, type: ENEMY_TYPE.ASTEROID },
            { x: 1250, y: -50, type: ENEMY_TYPE.ASTEROID },
            { x: -50, y: 690, type: ENEMY_TYPE.ASTEROID },
            { x: 1250, y: 690, type: ENEMY_TYPE.ASTEROID },
            { x: 600, y: -50, type: ENEMY_TYPE.NORMAL },
            { x: 600, y: 690, type: ENEMY_TYPE.NORMAL },
            { x: -50, y: 320, type: ENEMY_TYPE.KAMIKAZE },
            { x: 1250, y: 320, type: ENEMY_TYPE.KAMIKAZE },
            { x: 300, y: -50, type: ENEMY_TYPE.NORMAL },
            { x: 900, y: -50, type: ENEMY_TYPE.NORMAL }
        ]
    },
    {
        // Wave 11: The Grand Swarm. Normal enemies boxing the player in from all borders.
        time: 85,
        enemies: [
            { x: 100, y: -50, type: ENEMY_TYPE.NORMAL },
            { x: 300, y: -50, type: ENEMY_TYPE.NORMAL },
            { x: 500, y: -50, type: ENEMY_TYPE.NORMAL },
            { x: 700, y: -50, type: ENEMY_TYPE.NORMAL },
            { x: 900, y: -50, type: ENEMY_TYPE.NORMAL },
            { x: 1100, y: -50, type: ENEMY_TYPE.NORMAL },
            { x: 100, y: 690, type: ENEMY_TYPE.NORMAL },
            { x: 300, y: 690, type: ENEMY_TYPE.NORMAL },
            { x: 500, y: 690, type: ENEMY_TYPE.NORMAL },
            { x: 700, y: 690, type: ENEMY_TYPE.NORMAL },
            { x: 900, y: 690, type: ENEMY_TYPE.NORMAL },
            { x: 1100, y: 690, type: ENEMY_TYPE.NORMAL },
            { x: -50, y: 320, type: ENEMY_TYPE.NORMAL },
            { x: 1250, y: 320, type: ENEMY_TYPE.NORMAL }
        ]
    },
    {
        // Wave 12: Total Anarchy. If they survive this, they're a pro.
        time: 100,
        enemies: [
            { x: -50, y: -50, type: ENEMY_TYPE.KAMIKAZE },
            { x: 1250, y: -50, type: ENEMY_TYPE.KAMIKAZE },
            { x: -50, y: 690, type: ENEMY_TYPE.KAMIKAZE },
            { x: 1250, y: 690, type: ENEMY_TYPE.KAMIKAZE },
            { x: -50, y: 320, type: ENEMY_TYPE.KAMIKAZE },
            { x: 1250, y: 320, type: ENEMY_TYPE.KAMIKAZE },
            { x: 300, y: -50, type: ENEMY_TYPE.ASTEROID },
            { x: 900, y: -50, type: ENEMY_TYPE.ASTEROID },
            { x: 300, y: 690, type: ENEMY_TYPE.ASTEROID },
            { x: 900, y: 690, type: ENEMY_TYPE.ASTEROID },
            { x: -50, y: 160, type: ENEMY_TYPE.ASTEROID },
            { x: -50, y: 480, type: ENEMY_TYPE.ASTEROID },
            { x: 1250, y: 160, type: ENEMY_TYPE.ASTEROID },
            { x: 1250, y: 480, type: ENEMY_TYPE.ASTEROID }
        ]
    }
];