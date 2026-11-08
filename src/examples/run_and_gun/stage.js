// #region Stage Manager, Platforms, Spawners & Parallax

class StagePlatform {
    /**
     * @param {number} x - Left edge
     * @param {number} y - Top edge
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {boolean} isOneWay - If true, player can jump through from below and drop down with Down+Jump
     * @param {string} type - 'ground', 'girder', 'hazard'
     */
    constructor(x, y, w, h, isOneWay = true, type = 'girder') {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.isOneWay = isOneWay;
        this.type = type;
    }

    Draw(renderer) {
        const tileW = 48;
        const count = Math.ceil(this.w / tileW);

        for (let i = 0; i < count; i++) {
            const tx = this.x + i * tileW;
            const drawW = Math.min(tileW, this.x + this.w - tx);

            let sprite = ArcadeSprites.tiles.girder;
            if (this.type === 'ground')
                sprite = ArcadeSprites.tiles.ground;
            else if (this.type === 'hazard')
                sprite = ArcadeSprites.tiles.hazard;

            if (sprite) {
                renderer.DrawImageBasic(sprite, tx, this.y, drawW, this.h);
            }
            else {
                const color = (this.type === 'ground') ? Color.darkGrey : Color.grey;
                renderer.DrawFillBasicRectangle(tx, this.y, drawW, this.h, color);
            }
        }
    }
}

class Stage {
    constructor(game) {
        this.game = game;
        this.levelWidth = 4200;
        this.levelHeight = 720;
        this.groundY = 600;

        this.platforms = [];
        this.spawners = [];
        this.bossTriggered = false;
        this.bossArenaStartX = 3200;

        this._buildLevelGeometry();
        this._setupSpawnTriggers();
    }

    _buildLevelGeometry() {
        // ── Main Floor Sections (with pits) ───────────────────
        // Section 1: 0 -> 1600
        this.platforms.push(new StagePlatform(0, this.groundY, 1600, 120, false, 'ground'));
        // Pit gap: 1600 -> 1760
        // Section 2: 1760 -> 2900
        this.platforms.push(new StagePlatform(1760, this.groundY, 1140, 120, false, 'ground'));
        // Pit gap: 2900 -> 3050
        // Section 3 (Boss Arena): 3050 -> 4200
        this.platforms.push(new StagePlatform(3050, this.groundY, 1150, 120, false, 'ground'));

        // ── Elevated Platforms & Catwalks ─────────────────────
        // Tier 1 platforms (~y = 485)
        this.platforms.push(new StagePlatform(250, 485, 240, 24, true, 'girder'));
        this.platforms.push(new StagePlatform(580, 485, 260, 24, true, 'hazard'));
        this.platforms.push(new StagePlatform(960, 460, 300, 24, true, 'girder'));

        // Tier 2 high vantage catwalks (~y = 370)
        this.platforms.push(new StagePlatform(420, 370, 200, 24, true, 'girder'));
        this.platforms.push(new StagePlatform(1050, 330, 220, 24, true, 'hazard'));

        // Bridge over Pit 1
        this.platforms.push(new StagePlatform(1560, 490, 240, 24, true, 'hazard'));

        // Mid-stage complex
        this.platforms.push(new StagePlatform(1860, 485, 220, 24, true, 'girder'));
        this.platforms.push(new StagePlatform(2160, 370, 280, 24, true, 'girder'));
        this.platforms.push(new StagePlatform(2520, 485, 250, 24, true, 'hazard'));

        // Bridge over Pit 2 into boss arena
        this.platforms.push(new StagePlatform(2860, 490, 230, 24, true, 'hazard'));

        // Boss arena platforms
        this.platforms.push(new StagePlatform(3200, 460, 200, 24, true, 'girder'));
        this.platforms.push(new StagePlatform(3485, 350, 200, 24, true, 'hazard'));
        this.platforms.push(new StagePlatform(3750, 460, 200, 24, true, 'girder'));

        // ── Pre-placed Static Defenses & Hazards ───────────────
        // Catwalk 1 Turret (on platform 960, 460)
        this.game.AddGameObject(new SniperTurret(new Vector2(1150, 443)));
        // Ground barrels near Catwalk 1
        this.game.AddGameObject(new ExplosiveBarrel(new Vector2(1000, this.groundY - 21)));
        this.game.AddGameObject(new ExplosiveBarrel(new Vector2(1045, this.groundY - 21)));

        // Barrels before Pit 1
        this.game.AddGameObject(new ExplosiveBarrel(new Vector2(1480, this.groundY - 21)));
        this.game.AddGameObject(new ExplosiveBarrel(new Vector2(1525, this.groundY - 21)));

        // Mid-stage Outpost Turret (on platform 2160, 370)
        this.game.AddGameObject(new SniperTurret(new Vector2(2300, 353)));
        // Barrels on mid catwalk and ground
        this.game.AddGameObject(new ExplosiveBarrel(new Vector2(2220, 370 - 21)));
        this.game.AddGameObject(new ExplosiveBarrel(new Vector2(2760, this.groundY - 21)));
        this.game.AddGameObject(new ExplosiveBarrel(new Vector2(2805, this.groundY - 21)));
    }

    SpawnGruntOffscreen(offsetExtra = 0, fromLeft = false) {
        const cam = this.game.camera;
        const viewW = this.game.renderer ? this.game.renderer.width : 1280;
        const camLeft = cam ? cam.position.x : 0;
        const camRight = camLeft + viewW;

        let targetX;
        if (fromLeft) {
            targetX = Math.max(30, camLeft - 80 - offsetExtra);
        } else {
            targetX = camRight + 80 + offsetExtra;
            // Pit gaps avoidance:
            // Pit 1: 1600 -> 1760
            // Pit 2: 2900 -> 3050
            if (targetX >= 1580 && targetX <= 1780) {
                targetX = 1820 + offsetExtra;
            } else if (targetX >= 2880 && targetX <= 3070) {
                targetX = 3100 + offsetExtra;
            }
        }

        const grunt = new GruntSoldier(new Vector2(targetX, this.groundY - 30));
        this.game.AddGameObject(grunt);
        return grunt;
    }

    SpawnDroneOffscreen(y = 200, offsetExtra = 0) {
        const cam = this.game.camera;
        const viewW = this.game.renderer ? this.game.renderer.width : 1280;
        const camRight = (cam ? cam.position.x : 0) + viewW;
        const drone = new FlyingDrone(new Vector2(camRight + 90 + offsetExtra, y));
        this.game.AddGameObject(drone);
        return drone;
    }

    SpawnItemBlimp(type = 'S', y = 180) {
        const cam = this.game.camera;
        const camLeft = cam ? cam.position.x : 0;
        // Enters from off-screen left and flies over the player towards the right
        const blimp = new ItemCarrierBlimp(new Vector2(camLeft - 80, y), type);
        blimp.speedX = 150;
        this.game.AddGameObject(blimp);
        return blimp;
    }

    _setupSpawnTriggers() {
        this.spawners = [
            // Wave 1: First skirmish
            { triggerX: 350, spawned: false, action: () => {
                this.SpawnGruntOffscreen(0);
                this.SpawnGruntOffscreen(100);
            }},
            // Item Pod 1: Spread Gun
            { triggerX: 600, spawned: false, action: () => {
                this.SpawnItemBlimp('S', 180);
            }},
            // Wave 2: Catwalk 1 assault
            { triggerX: 950, spawned: false, action: () => {
                this.SpawnDroneOffscreen(210);
                this.SpawnGruntOffscreen(60);
            }},
            // Item Pod 2: Machine Gun
            { triggerX: 1300, spawned: false, action: () => {
                this.SpawnItemBlimp('M', 200);
                this.SpawnGruntOffscreen(0);
            }},
            // Wave 3: Pit 1 approach
            { triggerX: 1550, spawned: false, action: () => {
                this.SpawnDroneOffscreen(190, 0);
                this.SpawnDroneOffscreen(260, 110);
            }},
            // Item Pod 3: Piercing Laser
            { triggerX: 1850, spawned: false, action: () => {
                this.SpawnItemBlimp('L', 180);
                this.SpawnGruntOffscreen(0);
                this.SpawnGruntOffscreen(80);
            }},
            // Wave 4: Outpost Fortress
            { triggerX: 2150, spawned: false, action: () => {
                this.SpawnDroneOffscreen(220);
                this.SpawnGruntOffscreen(0);
                this.SpawnGruntOffscreen(100);
            }},
            // Item Pod 4: Grenade / Rocket Launcher
            { triggerX: 2500, spawned: false, action: () => {
                this.SpawnItemBlimp('G', 180);
                this.SpawnDroneOffscreen(200);
            }},
            // Wave 5: Pre-boss rush (Flank from left + assault from right)
            { triggerX: 2750, spawned: false, action: () => {
                this.SpawnDroneOffscreen(210, 0);
                this.SpawnDroneOffscreen(270, 90);
                this.SpawnGruntOffscreen(0, true);
            }},
            // Item Pod 5: Barrier Shield before boss
            { triggerX: 2980, spawned: false, action: () => {
                this.SpawnItemBlimp('B', 180);
                this.SpawnGruntOffscreen(40);
            }}
        ];
    }

    Update(deltaTime) {
        const player = this.game.player;
        if (!player) return;

        // Check enemy spawner triggers
        for (let i = 0; i < this.spawners.length; i++) {
            const spawner = this.spawners[i];
            if (!spawner.spawned && player.position.x >= spawner.triggerX) {
                spawner.spawned = true;
                spawner.action();
            }
        }

        // Check Boss Arena trigger
        if (!this.bossTriggered && player.position.x >= this.bossArenaStartX) {
            this.bossTriggered = true;
            this.game.TriggerBossEncounter();
        }
    }

    ResolvePlayerCollision(player) {
        player.isGrounded = false;
        const pLeft = player.position.x - player.width / 2;
        const pRight = player.position.x + player.width / 2;
        const pBottom = player.position.y + player.height / 2;
        const prevBottom = pBottom - player.velocity.y * targetDT;

        for (let i = 0; i < this.platforms.length; i++) {
            const plat = this.platforms[i];

            // Horizontal overlap check
            if (pRight > plat.x && pLeft < plat.x + plat.w) {
                if (plat.isOneWay) {
                    // Only land if falling downward and feet were above/near platform top
                    if (player.velocity.y >= 0 && player.dropThroughTimer <= 0) {
                        if (pBottom >= plat.y && prevBottom <= plat.y + 18) {
                            player.position.y = plat.y - player.height / 2;
                            player.velocity.y = 0;
                            player.isGrounded = true;
                            break;
                        }
                    }
                } else {
                    // Solid ground
                    if (player.velocity.y >= 0) {
                        if (pBottom >= plat.y && prevBottom <= plat.y + 20) {
                            player.position.y = plat.y - player.height / 2;
                            player.velocity.y = 0;
                            player.isGrounded = true;
                            break;
                        }
                    }
                }
            }
        }
    }

    ResolveEnemyCollision(enemy) {
        enemy.isGrounded = false;
        const eLeft = enemy.position.x - enemy.width / 2;
        const eRight = enemy.position.x + enemy.width / 2;
        const eBottom = enemy.position.y + enemy.height / 2;

        for (let i = 0; i < this.platforms.length; i++) {
            const plat = this.platforms[i];
            if (eRight > plat.x && eLeft < plat.x + plat.w) {
                if (enemy.velocity.y >= 0) {
                    if (eBottom >= plat.y && eBottom <= plat.y + 20) {
                        enemy.position.y = plat.y - enemy.height / 2;
                        enemy.velocity.y = 0;
                        enemy.isGrounded = true;
                        break;
                    }
                }
            }
        }
    }

    DrawBackground(renderer, camera) {
        const camX = camera ? camera.position.x : 0;
        const w = renderer.width || 1280;
        const h = renderer.height || 720;

        // 1. Sky Background (Deep midnight cyberpunk purple to navy)
        renderer.DrawFillBasicRectangle(0, 0, w, h, new Color(0.04, 0.05, 0.12, 1));

        // Moon (very slow parallax)
        const moonX = w * 0.75 - ((camX * 0.03) % w);
        const moonY = 110;
        renderer.DrawFillCircle(moonX, moonY, 52, new Color(0.9, 0.95, 1.0, 0.9));
        renderer.DrawFillCircle(moonX - 11, moonY - 6, 46, new Color(0.04, 0.05, 0.12, 1)); // Crescent mask

        // 2. Far Layer: Cyberpunk Distant Skyline (Parallax factor: 0.15)
        const farScroll = camX * 0.15;
        this._drawFarSkyline(renderer, w, h, farScroll);

        // 3. Mid Layer: Industrial Warehouses & Pipes (Parallax factor: 0.45)
        const midScroll = camX * 0.45;
        this._drawMidIndustrial(renderer, w, h, midScroll);
    }

    _drawFarSkyline(renderer, w, h, scrollX) {
        const buildings = [
            { x: 0, w: 120, h: 320, winCol: '#ff0055' },
            { x: 140, w: 160, h: 420, winCol: '#00f5d4' },
            { x: 320, w: 110, h: 260, winCol: '#ffcc00' },
            { x: 450, w: 150, h: 380, winCol: '#3a86ff' },
            { x: 620, w: 120, h: 300, winCol: '#ff0055' },
            { x: 760, w: 180, h: 450, winCol: '#00f5d4' },
            { x: 960, w: 130, h: 310, winCol: '#ffcc00' },
            { x: 1110, w: 150, h: 390, winCol: '#3a86ff' }
        ];

        const patternW = 1280;
        const startX = -(scrollX % patternW);

        for (let offset = startX - patternW; offset < w + patternW; offset += patternW) {
            for (let b of buildings) {
                const bx = offset + b.x;
                const by = h - b.h;

                if (bx + b.w < 0 || bx > w) continue;

                // Building silhouette
                renderer.DrawFillBasicRectangle(bx, by, b.w, b.h, new Color(0.08, 0.1, 0.2, 0.95));

                // Glowing neon window strips
                const winColor = Color.FromHex ? Color.FromHex(b.winCol) : Color.cyan;
                for (let wy = by + 26; wy < by + b.h - 40; wy += 38) {
                    renderer.DrawFillBasicRectangle(bx + 16, wy, b.w - 32, 4, winColor);
                }
            }
        }
    }

    _drawMidIndustrial(renderer, w, h, scrollX) {
        const midObjects = [
            { x: 50, w: 200, h: 240 },
            { x: 300, w: 250, h: 190 },
            { x: 600, w: 230, h: 260 },
            { x: 890, w: 270, h: 210 }
        ];

        const patternW = 1200;
        const startX = -(scrollX % patternW);

        for (let offset = startX - patternW; offset < w + patternW; offset += patternW) {
            for (let obj of midObjects) {
                const ox = offset + obj.x;
                const oy = h - obj.h;

                if (ox + obj.w < 0 || ox > w) continue;

                // Industrial warehouse silhouette
                renderer.DrawFillBasicRectangle(ox, oy, obj.w, obj.h, new Color(0.12, 0.15, 0.25, 0.98));

                // Smokestack pipe
                renderer.DrawFillBasicRectangle(ox + 28, oy - 65, 24, 70, new Color(0.15, 0.18, 0.28, 1));
                // Warning beacon on smokestack
                const blink = Math.sin(totalTime * 6) > 0;
                if (blink) {
                    renderer.DrawFillCircle(ox + 40, oy - 70, 4, Color.red);
                }
            }
        }
    }

    DrawPlatforms(renderer) {
        for (let i = 0; i < this.platforms.length; i++) {
            this.platforms[i].Draw(renderer);
        }
    }
}

// #endregion
