// #region Procedural 16-Bit Retro Arcade Sprite Generator (High-Res 720p Crisp Textures)

const ArcadeSprites = {
    player: {
        idle: null,
        run: [],
        jump: null,
        duck: null,
        aimUp: null,
        aimDiagUp: null,
        aimDiagDown: null
    },
    grunt: {
        idle: null,
        run: [],
        shoot: null,
        die: null
    },
    drone: null,
    turretBase: null,
    turretBarrel: null,
    boss: {
        body: null,
        core: null,
        launcher: null,
        cannon: null
    },
    bullets: {
        rifle: null,
        spread: null,
        laser: null,
        rocket: null,
        enemy: null,
        mortar: null
    },
    powerups: {
        S: null,
        M: null,
        L: null,
        G: null,
        R: null,
        B: null
    },
    itemPod: null,
    barrel: null,
    tiles: {
        ground: null,
        girder: null,
        hazard: null
    },
    muzzleFlash: null
};

function CreatePixelCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.halfWidth = w / 2;
    c.halfHeight = h / 2;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return { canvas: c, ctx: ctx };
}

function GenerateArcadeSprites() {
    function drawMatrix(ctx, matrix, colorMap, scale = 3, offsetX = 0, offsetY = 0) {
        for (let y = 0; y < matrix.length; y++) {
            const row = matrix[y];
            for (let x = 0; x < row.length; x++) {
                const char = row[x];
                if (char !== '.' && colorMap[char]) {
                    ctx.fillStyle = colorMap[char];
                    ctx.fillRect(offsetX + x * scale, offsetY + y * scale, scale, scale);
                }
            }
        }
    }

    // ── PALETTES ──────────────────────────────────────────────
    const P_PLAYER = {
        '#': '#0a0d14', // outline
        'S': '#ffd8a8', // skin
        's': '#c68853', // skin shadow
        'B': '#1a6ee8', // suit bright blue
        'b': '#0d3882', // suit dark blue
        'R': '#ff2233', // headband red
        'r': '#990011', // headband shadow
        'G': '#7a8288', // gun metal
        'g': '#3d4347', // gun dark
        'W': '#ffffff', // eye/spark white
        'Y': '#ffcc00'  // belt/buckle gold
    };

    const P_GRUNT = {
        '#': '#0a0d14',
        'R': '#e63946', // crimson armor
        'r': '#85101a', // armor shadow
        'D': '#2b2d42', // dark undersuit
        'V': '#00f5d4', // cyber visor cyan
        'G': '#6c757d', // gun
        'g': '#343a40',
        'W': '#ffffff'
    };

    // ── 1. PLAYER SPRITES (Scale 3 for crisp 720p arcade look) ──
    const playerIdleMat = [
        "......######.......",
        ".....#RRRRRR#......",
        ".....#RRRRRRR#.....",
        ".....#ssSSSSW#.....",
        ".....#sSSSSS##.....",
        "......#sSSs#.......",
        ".....#BBBBBB#......",
        "....#BBBBBBBB#GGG..",
        "....#bBBBBBBb#GWWG.",
        "...#bBBBYYBBBb#GGG.",
        "...#BBBBBBBBBB#....",
        "....#b######b#.....",
        "....#bb#..#bb#.....",
        "....#bb#..#bb#.....",
        "....#bb#..#bb#.....",
        "...#ggg#..#ggg#...."
    ];

    const pRun1 = [
        "......######.......",
        ".....#RRRRRR#......",
        ".....#RRRRRRR#.....",
        ".....#ssSSSSW#.....",
        ".....#sSSSSS##.GG..",
        "......#sSSs#..GWWG.",
        ".....#BBBBBB#..GG..",
        "....#BBBBBBBB#.....",
        "....#bBBBYYBb#.....",
        "...#bbBBBBBBbb#....",
        "....#b######b#.....",
        "....#bb#...#bb#....",
        "...#bb#.....#bb#...",
        "..#ggg#......#ggg#.",
        "..................."
    ];

    const pRun2 = [
        "......######.......",
        ".....#RRRRRR#......",
        ".....#RRRRRRR#.....",
        ".....#ssSSSSW#.....",
        ".....#sSSSSS##.....",
        "......#sSSs#..GGG..",
        ".....#BBBBBB#GWWG..",
        "....#BBBBBBBB#GGG..",
        "....#bBBBYYBb#.....",
        "...#bbBBBBBBbb#....",
        "....#b######b#.....",
        ".....#bb##bb#......",
        ".....#bb##bb#......",
        "....#ggg##ggg#.....",
        "..................."
    ];

    const pRun3 = [
        "......######.......",
        ".....#RRRRRR#......",
        ".....#RRRRRRR#.....",
        ".....#ssSSSSW#.....",
        ".....#sSSSSS##.GG..",
        "......#sSSs#..GWWG.",
        ".....#BBBBBB#..GG..",
        "....#BBBBBBBB#.....",
        "....#bBBBYYBb#.....",
        "...#bbBBBBBBbb#....",
        "....#b######b#.....",
        "...#bb#.....#bb#...",
        "..#bb#.......#bb#..",
        "..#ggg#.....#ggg#..",
        "..................."
    ];

    const pDuck = [
        "...................",
        "...................",
        "......######.......",
        ".....#RRRRRR#......",
        ".....#RRRRRRR#.....",
        ".....#ssSSSSW#GGGG.",
        ".....#sSSSSS##GWWG.",
        "....#BBBBBBBB##GG..",
        "...#bBBBYYBBBb#....",
        "..#bbbbbbbbbbbb#...",
        "...#gggg##gggg#...."
    ];

    const pAimUp = [
        ".........GG........",
        "........GWWG.......",
        ".........GG........",
        "......######.......",
        ".....#RRRRRR#......",
        ".....#RRRRRRR#.....",
        ".....#ssSSSSW#.....",
        ".....#sSSSSS##.....",
        "......#sSSs#.......",
        ".....#BBBBBB#......",
        "....#BBBBBBBB#.....",
        "....#bBBBYYBb#.....",
        "....#b######b#.....",
        "....#bb#..#bb#.....",
        "....#bb#..#bb#.....",
        "...#ggg#..#ggg#...."
    ];

    const pAimDiagUp = [
        "...........GG......",
        "..........GWWG.....",
        ".........GG........",
        "......######.......",
        ".....#RRRRRR#......",
        ".....#RRRRRRR#.....",
        ".....#ssSSSSW#.....",
        ".....#sSSSSS##.....",
        "......#sSSs#.......",
        ".....#BBBBBB#......",
        "....#BBBBBBBB#.....",
        "....#bBBBYYBb#.....",
        "....#b######b#.....",
        "....#bb#..#bb#.....",
        "....#bb#..#bb#.....",
        "...#ggg#..#ggg#...."
    ];

    const pAimDiagDown = [
        "......######.......",
        ".....#RRRRRR#......",
        ".....#RRRRRRR#.....",
        ".....#ssSSSSW#.....",
        ".....#sSSSSS##.....",
        "......#sSSs#.......",
        ".....#BBBBBB#......",
        "....#BBBBBBBB#.....",
        "....#bBBBYYBb#GG...",
        "....#b######b#GWWG.",
        ".....#bb##bb#..GG..",
        "....#bb#..#bb#.....",
        "...#ggg#..#ggg#...."
    ];

    function renderMatToCanvas(mat, palette, scale = 3) {
        const h = mat.length;
        const w = mat[0].length;
        const c = CreatePixelCanvas(w * scale, h * scale);
        drawMatrix(c.ctx, mat, palette, scale);
        return c.canvas;
    }

    ArcadeSprites.player.idle = renderMatToCanvas(playerIdleMat, P_PLAYER, 3);
    ArcadeSprites.player.run = [
        renderMatToCanvas(pRun1, P_PLAYER, 3),
        renderMatToCanvas(pRun2, P_PLAYER, 3),
        renderMatToCanvas(pRun3, P_PLAYER, 3),
        renderMatToCanvas(pRun2, P_PLAYER, 3)
    ];
    ArcadeSprites.player.jump = renderMatToCanvas(pRun3, P_PLAYER, 3);
    ArcadeSprites.player.duck = renderMatToCanvas(pDuck, P_PLAYER, 3);
    ArcadeSprites.player.aimUp = renderMatToCanvas(pAimUp, P_PLAYER, 3);
    ArcadeSprites.player.aimDiagUp = renderMatToCanvas(pAimDiagUp, P_PLAYER, 3);
    ArcadeSprites.player.aimDiagDown = renderMatToCanvas(pAimDiagDown, P_PLAYER, 3);

    // ── 2. GRUNT SOLDIER SPRITES (Scale 3) ────────────────────
    const gruntIdleMat = [
        ".....######........",
        "....#RRRRRR#.......",
        "....#RRVVVWR#......",
        "....#RRRRRRR#......",
        ".....#rRRRr#.......",
        "....#DDDDDD#.......",
        "...#rRRRRRRr#GG....",
        "...#rRRRRRRr#GgG...",
        "...#rDDDDDD#..GG...",
        "....#r####r#.......",
        "....#rr#..#rr#.....",
        "....#rr#..#rr#.....",
        "...#ggg#..#ggg#...."
    ];

    const gruntRun1 = [
        ".....######........",
        "....#RRRRRR#.......",
        "....#RRVVVWR#......",
        "....#RRRRRRR#......",
        ".....#rRRRr#..GG...",
        "....#DDDDDD#..GgG..",
        "...#rRRRRRRr#..GG..",
        "...#rDDDDDD#.......",
        "....#r####r#.......",
        "...#rr#...#rr#.....",
        "..#rr#.....#rr#....",
        "..#gg#......#gg#..."
    ];

    const gruntRun2 = [
        ".....######........",
        "....#RRRRRR#.......",
        "....#RRVVVWR#......",
        "....#RRRRRRR#......",
        ".....#rRRRr#..GG...",
        "....#DDDDDD#..GgG..",
        "...#rRRRRRRr#..GG..",
        "...#rDDDDDD#.......",
        "....#r####r#.......",
        "....#rr#..#rr#.....",
        "....#rr#..#rr#.....",
        "...#ggg#..#ggg#...."
    ];

    const gruntDieMat = [
        "...................",
        "...................",
        ".....######........",
        "....#rRRRRr#.......",
        "...#rRRVVVWR#......",
        "...#rDDDDDD#.......",
        "..#rrrrrrrr#.......",
        ".#gggg#.#gggg#....."
    ];

    ArcadeSprites.grunt.idle = renderMatToCanvas(gruntIdleMat, P_GRUNT, 3);
    ArcadeSprites.grunt.run = [
        renderMatToCanvas(gruntRun1, P_GRUNT, 3),
        renderMatToCanvas(gruntRun2, P_GRUNT, 3)
    ];
    ArcadeSprites.grunt.shoot = renderMatToCanvas(gruntIdleMat, P_GRUNT, 3);
    ArcadeSprites.grunt.die = renderMatToCanvas(gruntDieMat, P_GRUNT, 3);

    // ── 3. FLYING DRONE (54 x 36 px) ──────────────────────────
    const droneC = CreatePixelCanvas(54, 36);
    const dctx = droneC.ctx;
    dctx.fillStyle = '#495057';
    dctx.beginPath();
    dctx.ellipse(27, 18, 24, 12, 0, 0, Math.PI * 2);
    dctx.fill();
    dctx.strokeStyle = '#212529';
    dctx.lineWidth = 3;
    dctx.stroke();

    dctx.fillStyle = '#adb5bd';
    dctx.beginPath();
    dctx.arc(27, 15, 12, Math.PI, 0);
    dctx.fill();

    dctx.fillStyle = '#ff0055';
    dctx.beginPath();
    dctx.arc(27, 18, 5, 0, Math.PI * 2);
    dctx.fill();
    dctx.fillStyle = '#ffffff';
    dctx.fillRect(25, 16, 3, 3);

    dctx.fillStyle = '#00f5d4';
    dctx.fillRect(22, 28, 10, 5);
    ArcadeSprites.drone = droneC.canvas;

    // ── 4. TURRET BASE & BARREL ───────────────────────────────
    const tbC = CreatePixelCanvas(48, 36);
    const tbCtx = tbC.ctx;
    tbCtx.fillStyle = '#212529';
    tbCtx.fillRect(0, 18, 48, 18);
    tbCtx.fillStyle = '#495057';
    tbCtx.fillRect(6, 6, 36, 24);
    tbCtx.fillStyle = '#ffcc00';
    tbCtx.fillRect(12, 24, 6, 6);
    tbCtx.fillRect(30, 24, 6, 6);
    ArcadeSprites.turretBase = tbC.canvas;

    const tbarC = CreatePixelCanvas(42, 18);
    const tbarCtx = tbarC.ctx;
    tbarCtx.fillStyle = '#343a40';
    tbarCtx.fillRect(0, 3, 38, 12);
    tbarCtx.fillStyle = '#6c757d';
    tbarCtx.fillRect(30, 0, 12, 18);
    tbarCtx.fillStyle = '#ff0055';
    tbarCtx.fillRect(6, 6, 6, 6);
    ArcadeSprites.turretBarrel = tbarC.canvas;

    // ── 5. WEAPON POWER-UP CAPSULES (36 x 36 px) ──────────────
    const powerupTypes = [
        { key: 'S', color: '#ff0055', bg: '#ffe5ec' },
        { key: 'M', color: '#ffaa00', bg: '#fff4cc' },
        { key: 'L', color: '#00f5d4', bg: '#ccfbf1' },
        { key: 'G', color: '#9d4edd', bg: '#f3e8ff' },
        { key: 'R', color: '#38b000', bg: '#dcfce7' },
        { key: 'B', color: '#3a86ff', bg: '#dbeafe' }
    ];

    powerupTypes.forEach(p => {
        const pc = CreatePixelCanvas(38, 38);
        const pctx = pc.ctx;

        pctx.fillStyle = '#0f172a';
        pctx.beginPath();
        pctx.arc(19, 19, 18, 0, Math.PI * 2);
        pctx.fill();

        pctx.fillStyle = p.bg;
        pctx.beginPath();
        pctx.arc(19, 19, 15, 0, Math.PI * 2);
        pctx.fill();

        pctx.lineWidth = 3.5;
        pctx.strokeStyle = p.color;
        pctx.stroke();

        pctx.fillStyle = p.color;
        pctx.font = 'bold 20px "Courier New", monospace, sans-serif';
        pctx.textAlign = 'center';
        pctx.textBaseline = 'middle';
        pctx.fillText(p.key, 19, 21);

        ArcadeSprites.powerups[p.key] = pc.canvas;
    });

    // Item Carrier Blimp (56 x 32 px)
    const ipC = CreatePixelCanvas(56, 32);
    const ipCtx = ipC.ctx;
    ipCtx.fillStyle = '#e2e8f0';
    ipCtx.beginPath();
    ipCtx.ellipse(28, 16, 25, 13, 0, 0, Math.PI * 2);
    ipCtx.fill();
    ipCtx.strokeStyle = '#334155';
    ipCtx.lineWidth = 3;
    ipCtx.stroke();
    ipCtx.fillStyle = '#ef4444';
    ipCtx.fillRect(14, 12, 28, 7);
    ipCtx.fillStyle = '#0f172a';
    ipCtx.fillRect(20, 0, 16, 4);
    ArcadeSprites.itemPod = ipC.canvas;

    // ── 6. EXPLOSIVE BARREL (34 x 42 px) ──────────────────────
    const barC = CreatePixelCanvas(34, 42);
    const bctx = barC.ctx;
    bctx.fillStyle = '#d90429';
    bctx.fillRect(3, 3, 28, 36);
    bctx.strokeStyle = '#590d22';
    bctx.lineWidth = 3;
    bctx.strokeRect(3, 3, 28, 36);
    bctx.fillStyle = '#1e293b';
    bctx.fillRect(3, 10, 28, 5);
    bctx.fillRect(3, 27, 28, 5);
    bctx.fillStyle = '#ffbe0b';
    bctx.font = 'bold 12px sans-serif';
    bctx.textAlign = 'center';
    bctx.fillText('TNT', 17, 24);
    ArcadeSprites.barrel = barC.canvas;

    // ── 7. BULLETS & PROJECTILES ──────────────────────────────
    // Rifle bullet
    const rbC = CreatePixelCanvas(16, 8);
    rbC.ctx.fillStyle = '#ffd166';
    rbC.ctx.fillRect(0, 1, 14, 6);
    rbC.ctx.fillStyle = '#ffffff';
    rbC.ctx.fillRect(4, 2, 10, 4);
    ArcadeSprites.bullets.rifle = rbC.canvas;

    // Spread bullet (pulsing turquoise orb)
    const sbC = CreatePixelCanvas(18, 18);
    const sbCtx = sbC.ctx;
    sbCtx.fillStyle = '#06d6a0';
    sbCtx.beginPath();
    sbCtx.arc(9, 9, 8, 0, Math.PI * 2);
    sbCtx.fill();
    sbCtx.fillStyle = '#ffffff';
    sbCtx.beginPath();
    sbCtx.arc(9, 9, 4, 0, Math.PI * 2);
    sbCtx.fill();
    ArcadeSprites.bullets.spread = sbC.canvas;

    // Laser beam
    const lbC = CreatePixelCanvas(34, 12);
    const lbCtx = lbC.ctx;
    lbCtx.fillStyle = '#00b4d8';
    lbCtx.fillRect(0, 1, 34, 10);
    lbCtx.fillStyle = '#caf0f8';
    lbCtx.fillRect(3, 2, 28, 8);
    lbCtx.fillStyle = '#ffffff';
    lbCtx.fillRect(6, 4, 22, 4);
    ArcadeSprites.bullets.laser = lbC.canvas;

    // Rocket
    const rkC = CreatePixelCanvas(30, 14);
    const rkCtx = rkC.ctx;
    rkCtx.fillStyle = '#4a5568';
    rkCtx.fillRect(6, 3, 18, 8);
    rkCtx.fillStyle = '#e53e3e';
    rkCtx.beginPath();
    rkCtx.moveTo(24, 3);
    rkCtx.lineTo(30, 7);
    rkCtx.lineTo(24, 11);
    rkCtx.fill();
    rkCtx.fillStyle = '#1a202c';
    rkCtx.fillRect(3, 0, 6, 14);
    rkCtx.fillStyle = '#f6ad55';
    rkCtx.fillRect(0, 4, 4, 6);
    ArcadeSprites.bullets.rocket = rkC.canvas;

    // Enemy Plasma Bullet
    const ebC = CreatePixelCanvas(16, 16);
    const ebCtx = ebC.ctx;
    ebCtx.fillStyle = '#e63946';
    ebCtx.beginPath();
    ebCtx.arc(8, 8, 7, 0, Math.PI * 2);
    ebCtx.fill();
    ebCtx.fillStyle = '#ffccd5';
    ebCtx.beginPath();
    ebCtx.arc(8, 8, 3.5, 0, Math.PI * 2);
    ebCtx.fill();
    ArcadeSprites.bullets.enemy = ebC.canvas;

    // Boss Mortar Bomb
    const mbC = CreatePixelCanvas(22, 22);
    const mbCtx = mbC.ctx;
    mbCtx.fillStyle = '#1e293b';
    mbCtx.beginPath();
    mbCtx.arc(11, 11, 10, 0, Math.PI * 2);
    mbCtx.fill();
    mbCtx.fillStyle = '#ef4444';
    mbCtx.beginPath();
    mbCtx.arc(11, 11, 6, 0, Math.PI * 2);
    mbCtx.fill();
    mbCtx.fillStyle = '#ffbe0b';
    mbCtx.fillRect(9, 9, 4, 4);
    ArcadeSprites.bullets.mortar = mbC.canvas;

    // ── 8. BOSS "MECHA-COLOSSUS MK-IV" (Massive 155 x 115 px) ──
    const bBodyC = CreatePixelCanvas(155, 115);
    const bbCtx = bBodyC.ctx;
    bbCtx.fillStyle = '#1e293b';
    bbCtx.fillRect(15, 15, 125, 85);
    bbCtx.strokeStyle = '#0a0d14';
    bbCtx.lineWidth = 4;
    bbCtx.strokeRect(15, 15, 125, 85);

    bbCtx.fillStyle = '#334155';
    bbCtx.fillRect(24, 24, 107, 67);

    // Hazard stripes along bottom
    bbCtx.fillStyle = '#ffcc00';
    bbCtx.fillRect(15, 90, 125, 10);
    bbCtx.fillStyle = '#000000';
    for (let i = 18; i < 135; i += 16) {
        bbCtx.beginPath();
        bbCtx.moveTo(i, 100);
        bbCtx.lineTo(i + 8, 90);
        bbCtx.lineTo(i + 14, 90);
        bbCtx.lineTo(i + 6, 100);
        bbCtx.fill();
    }
    ArcadeSprites.boss.body = bBodyC.canvas;

    // Boss Core (50 x 50 px)
    const bCoreC = CreatePixelCanvas(50, 50);
    const bcCtx = bCoreC.ctx;
    bcCtx.fillStyle = '#03071e';
    bcCtx.beginPath();
    bcCtx.arc(25, 25, 22, 0, Math.PI * 2);
    bcCtx.fill();
    bcCtx.fillStyle = '#dc2f02';
    bcCtx.beginPath();
    bcCtx.arc(25, 25, 16, 0, Math.PI * 2);
    bcCtx.fill();
    bcCtx.fillStyle = '#ffba08';
    bcCtx.beginPath();
    bcCtx.arc(25, 25, 8, 0, Math.PI * 2);
    bcCtx.fill();
    bcCtx.fillStyle = '#ffffff';
    bcCtx.fillRect(22, 22, 6, 6);
    ArcadeSprites.boss.core = bCoreC.canvas;

    // Boss Launcher (56 x 34 px)
    const bLaunchC = CreatePixelCanvas(56, 34);
    const blCtx = bLaunchC.ctx;
    blCtx.fillStyle = '#334155';
    blCtx.fillRect(0, 0, 56, 34);
    blCtx.fillStyle = '#0f172a';
    blCtx.fillRect(8, 6, 11, 22);
    blCtx.fillRect(23, 6, 11, 22);
    blCtx.fillRect(38, 6, 11, 22);
    blCtx.fillStyle = '#ef4444';
    blCtx.fillRect(10, 8, 7, 7);
    blCtx.fillRect(25, 8, 7, 7);
    blCtx.fillRect(40, 8, 7, 7);
    ArcadeSprites.boss.launcher = bLaunchC.canvas;

    // Boss Cannon (68 x 28 px)
    const bCanC = CreatePixelCanvas(68, 28);
    const bcanCtx = bCanC.ctx;
    bcanCtx.fillStyle = '#475569';
    bcanCtx.fillRect(0, 5, 62, 18);
    bcanCtx.fillStyle = '#0f172a';
    bcanCtx.fillRect(56, 2, 12, 24);
    bcanCtx.fillStyle = '#00f5d4';
    bcanCtx.fillRect(14, 9, 34, 10);
    ArcadeSprites.boss.cannon = bCanC.canvas;

    // ── 9. ENVIRONMENT TILES (48 x 48 / 48 x 24 px) ───────────
    const gC = CreatePixelCanvas(48, 48);
    const gctx = gC.ctx;
    gctx.fillStyle = '#1e293b';
    gctx.fillRect(0, 0, 48, 48);
    gctx.fillStyle = '#334155';
    gctx.fillRect(0, 0, 48, 6);
    gctx.fillStyle = '#0f172a';
    gctx.fillRect(0, 44, 48, 4);
    gctx.fillStyle = '#64748b';
    gctx.fillRect(4, 9, 3, 3);
    gctx.fillRect(41, 9, 3, 3);
    ArcadeSprites.tiles.ground = gC.canvas;

    const mC = CreatePixelCanvas(48, 24);
    const mctx = mC.ctx;
    mctx.fillStyle = '#334155';
    mctx.fillRect(0, 0, 48, 8);
    mctx.fillStyle = '#64748b';
    mctx.fillRect(0, 0, 48, 3);
    mctx.fillStyle = '#1e293b';
    mctx.fillRect(6, 8, 6, 16);
    mctx.fillRect(36, 8, 6, 16);
    ArcadeSprites.tiles.girder = mC.canvas;

    const hC = CreatePixelCanvas(48, 24);
    const hctx = hC.ctx;
    hctx.fillStyle = '#ffcc00';
    hctx.fillRect(0, 0, 48, 8);
    hctx.fillStyle = '#000000';
    for (let i = 0; i < 48; i += 12) {
        hctx.beginPath();
        hctx.moveTo(i, 8);
        hctx.lineTo(i + 6, 0);
        hctx.lineTo(i + 9, 0);
        hctx.lineTo(i + 3, 8);
        hctx.fill();
    }
    hctx.fillStyle = '#1e293b';
    hctx.fillRect(0, 8, 48, 16);
    ArcadeSprites.tiles.hazard = hC.canvas;

    // ── 10. MUZZLE FLASH ──────────────────────────────────────
    const mfC = CreatePixelCanvas(28, 28);
    const mfCtx = mfC.ctx;
    mfCtx.fillStyle = '#fff3b0';
    mfCtx.beginPath();
    mfCtx.arc(14, 14, 11, 0, Math.PI * 2);
    mfCtx.fill();
    mfCtx.fillStyle = '#e09f3e';
    mfCtx.fillRect(2, 12, 24, 4);
    mfCtx.fillRect(12, 2, 4, 24);
    mfCtx.fillStyle = '#ffffff';
    mfCtx.fillRect(11, 11, 6, 6);
    ArcadeSprites.muzzleFlash = mfC.canvas;
}

// #endregion
