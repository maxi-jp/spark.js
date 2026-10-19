// =====================================================================
// Death Rally — Main game class
// Globals: DeathRallyGame
// Requires: circuit.js, death_rally_defs.js, game_objects.js, cars.js
// Circuit data loaded after this file: circuits/*.js
// =====================================================================

class DeathRallyGame extends Game {
    constructor(r) {
        super(r);
        this.Configure({ screenWidth: SCREEN_W, screenHeight: SCREEN_H, imageSmoothingEnabled: false });

        // ── Option B (Tiled) ──────────────────────────────────────────
        // Uncomment to load a circuit from a Tiled .tmj file.
        // The map must export with CSV tile format + embedded tilesets.
        // Object layers required: checkpoints, waypoints, spawns.
        // ─────────────────────────────────────────────────────────────
        // this.tiledAssets = {
        //     circuit: { path: 'src/examples/death_rally/circuits/oval_track.tmj', data: null }
        // };
    }

    Start() {
        super.Start();

        // Input
        Input.RegisterAxis('throttle', [
            { type:'key', positive:KEY_UP,    negative:KEY_DOWN },
            { type:'key', positive:KEY_W,     negative:KEY_S    },
        ]);
        Input.RegisterAxis('steer', [
            { type:'key', positive:KEY_RIGHT, negative:KEY_LEFT },
            { type:'key', positive:KEY_D,     negative:KEY_A    },
        ]);
        Input.RegisterAction('fire', [
            { type:'key', code:KEY_SPACE }, { type:'key', code:KEY_LCTRL },
        ]);
        Input.RegisterAction('debugToggle', [
            { type:'key', code:KEY_TAB },
        ]);

        this.raceManager  = new RaceManager();
        this.timer        = 0;
        this.msgText      = '';
        this.msgTimer     = 0;
        this.debugVisible = false;

        // Option B when tiledAssets.circuit.data is available, otherwise Option A
        const circuitDef = (this.tiledAssets?.circuit?.data)
            ? CircuitLoader.FromTiled(this.tiledAssets.circuit.data, DR_TILE_TO_SURFACE)
            : CircuitLoader.FromInline(PLAYGROUND_CIRCUIT);

        this._loadCircuit(circuitDef);
        this._setupHUD();
    }

    // ── Circuit loading ─────────────────────────────────────────────

    /**
     * Builds the scene from a normalised CircuitData object.
     * Safe to call at any time: existing GameObjects are already handled
     * by the caller (_switchCircuit destroys them first).
     */
    _loadCircuit(circuitData) {
        this.raceManager.LoadCircuit(circuitData);

        for (const cp of circuitData.checkpoints) {
            this.AddGameObject(new CheckpointZone(cp));
        }
        for (const ob of circuitData.obstacles) {
            this.AddGameObject(new Obstacle(ob.cx, ob.cy, ob.w, ob.h, ob.color ?? C_WALL, ob.isBarrel ?? false));
        }
        for (const pk of circuitData.pickups) {
            this.AddGameObject(new Pickup(pk.x, pk.y, pk.type, pk.data));
        }

        const s0 = circuitData.spawns[0];
        this.playerCar = this.AddGameObject(new PlayerCar(new Vector2(s0.x, s0.y), 'SPORTS'));
        this.playerCar._rotation = s0.rotation;
        this.raceManager.RegisterCar(this.playerCar);

        this.enemies = [];
        const enemySlots = [
            { slotIdx:1, vehicleKey:'MUSCLE', wpStart: Math.floor(circuitData.waypoints.length * 0.30) },
            { slotIdx:2, vehicleKey:'BUGGY',  wpStart: Math.floor(circuitData.waypoints.length * 0.65) },
        ];
        for (const ed of enemySlots) {
            const s = circuitData.spawns[Math.min(ed.slotIdx, circuitData.spawns.length - 1)];
            const e = this._addEnemy(new Vector2(s.x, s.y), ed.vehicleKey, ed.wpStart);
            e._rotation = s.rotation;
        }

        this.camera = new FollowCamera(
            Vector2.Zero(), this.playerCar,
            0, WORLD_W - SCREEN_W, 0, WORLD_H - SCREEN_H, 6
        );
        this.camera.Start();

        this.raceManager.StartRace();
    }

    /**
     * Switch to a different circuit at runtime.
     * Destroys all current GameObjects, re-runs _loadCircuit with new data.
     */
    _switchCircuit(circuitDef) {
        this.DestroyAllGameObjects();
        this._loadCircuit(CircuitLoader.FromInline(circuitDef));
        this.timer    = 0;
        this.msgTimer = 0;
    }

    // ── HUD setup ───────────────────────────────────────────────────

    _setupHUD() {
        this.hud = new HTMLMenu(this, '#hud', '#canvasContainer', canvas, true, false);
        this.hud.Start();
        this.hud.SetupElements([
            '#hud-hp-fill', '#hud-weapon-name', '#hud-ammo',
            '#hud-money', '#hud-surface', '#hud-speed', '#hud-time',
            '#hud-lap', '#hud-position',
        ]);

        this.debugMenu = new HTMLMenu(this, '#debug-overlay', '#canvasContainer', canvas, true, false);
        this.debugMenu.Start();
        this.debugMenu.SetupButtons([
            // Vehicle
            { selector:'#dbg-sports',    callback: () => this.playerCar.SwapVehicle('SPORTS')     },
            { selector:'#dbg-muscle',    callback: () => this.playerCar.SwapVehicle('MUSCLE')     },
            { selector:'#dbg-truck',     callback: () => this.playerCar.SwapVehicle('TRUCK')      },
            { selector:'#dbg-buggy',     callback: () => this.playerCar.SwapVehicle('BUGGY')      },
            // Weapons
            { selector:'#dbg-give-mg',   callback: () => this.playerCar.EquipWeapon('MACHINEGUN') },
            { selector:'#dbg-give-msl',  callback: () => this.playerCar.EquipWeapon('MISSILE')    },
            { selector:'#dbg-give-mine', callback: () => this.playerCar.EquipWeapon('MINE')       },
            // Misc
            { selector:'#dbg-heal',      callback: () => { this.playerCar.health = this.playerCar.maxHealth; this.playerCar.isDead = false; } },
            { selector:'#dbg-money',     callback: () => this.playerCar.money += 500              },
            { selector:'#dbg-spawn',     callback: () => this._spawnRandomEnemy()                 },
            // Race
            { selector:'#dbg-restart',   callback: () => this.raceManager.RestartRace()           },
            // Track selector
            { selector:'#dbg-track-playground', callback: () => this._switchCircuit(PLAYGROUND_CIRCUIT) },
            { selector:'#dbg-track-oval',       callback: () => this._switchCircuit(OVAL_TRACK)         },
            // View
            { selector:'#dbg-colliders', callback: () => { this.config.drawColliders = !this.config.drawColliders; } },
            { selector:'#dbg-debug',     callback: () => { debugMode = !debugMode; }                               },
        ]);
        document.getElementById('debug-overlay').style.display = 'none';
    }

    // ── Enemy helpers ───────────────────────────────────────────────

    _addEnemy(pos, vehicleKey, wpStartIndex = 0) {
        const e = this.AddGameObject(new EnemyCar(pos, vehicleKey, wpStartIndex));
        e.aiTarget = this.playerCar;
        e.EquipWeapon('MACHINEGUN');
        this.raceManager.RegisterCar(e);
        this.enemies.push(e);
        return e;
    }

    _spawnRandomEnemy() {
        const keys = ['SPORTS','MUSCLE','TRUCK','BUGGY'];
        const wps  = this.raceManager?.circuit?.waypoints;
        this._addEnemy(
            new Vector2(RandomBetweenFloat(200, WORLD_W - 200), RandomBetweenFloat(200, WORLD_H - 200)),
            keys[RandomBetweenInt(0, keys.length - 1)],
            wps ? RandomBetweenInt(0, wps.length - 1) : 0
        );
    }

    // ── Queries ─────────────────────────────────────────────────────

    GetSurfaceAt(x, y) {
        const zones = this.raceManager?.circuit?.surfaceZones ?? [];
        for (let i = zones.length - 1; i >= 0; i--) {
            const z = zones[i];
            if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) return z.surface;
        }
        return SURFACE.GRASS;
    }

    SpawnExplosion(x, y, large) { this.AddGameObject(new Explosion(x, y, large)); }

    ShowPickupMessage(pickup) {
        if (pickup.type === 'weapon')      this.msgText = `+ ${WEAPON_DEFS[pickup.data].name}`;
        else if (pickup.type === 'health') this.msgText = `+ ${pickup.data} HP`;
        else                              this.msgText = `+ $${pickup.data}`;
        this.msgTimer = 2.0;
    }

    // ── Update ──────────────────────────────────────────────────────

    Update(dt) {
        super.Update(dt);
        this.timer += dt;
        if (this.msgTimer > 0) this.msgTimer -= dt;

        this.raceManager.Update(dt);
        this.camera.Update(dt);

        this.playerCar.inputDisabled = this.raceManager.inputLocked;

        if (this.raceManager.state === RACE_STATE.RACING) {
            const prog = this.raceManager.progress.get(this.playerCar);
            if (prog?.finished) this.raceManager.state = RACE_STATE.RESULTS;
        }

        if (Input.GetActionDown('debugToggle')) {
            this.debugVisible = !this.debugVisible;
            document.getElementById('debug-overlay').style.display = this.debugVisible ? 'block' : 'none';
        }

        this._updateHUD();
    }

    _updateHUD() {
        const p    = this.playerCar;
        const rm   = this.raceManager;
        const prog = rm.progress.get(p);

        const fill = document.getElementById('hud-hp-fill');
        if (fill) {
            const pct = (p.health / p.maxHealth) * 100;
            fill.style.width      = pct + '%';
            fill.style.background = pct > 50 ? '#4caf50' : (pct > 25 ? '#ff9800' : '#f44336');
        }
        const wName = document.getElementById('hud-weapon-name');
        if (wName) wName.textContent = WEAPON_DEFS[p.currentWeapon].name;
        const ammoEl = document.getElementById('hud-ammo');
        if (ammoEl) ammoEl.textContent = p.ammo > 0 ? '\u00d7' + p.ammo : '';
        const moneyEl = document.getElementById('hud-money');
        if (moneyEl) moneyEl.textContent = '$' + p.money;
        const surfEl = document.getElementById('hud-surface');
        if (surfEl) surfEl.textContent = p.surfaceType?.name ?? '';
        const spdEl = document.getElementById('hud-speed');
        if (spdEl) spdEl.textContent = Math.round(p.speed * 0.1) + ' km/h';
        const timeEl = document.getElementById('hud-time');
        if (timeEl) {
            const m = Math.floor(this.timer / 60);
            const s = Math.floor(this.timer % 60).toString().padStart(2, '0');
            timeEl.textContent = `${m}:${s}`;
        }
        const lapEl = document.getElementById('hud-lap');
        if (lapEl && prog && rm.circuit) {
            const lap = Math.min(prog.currentLap + 1, rm.circuit.laps);
            lapEl.textContent = rm.state === RACE_STATE.RESULTS
                ? 'Finished!'
                : `Lap ${lap} / ${rm.circuit.laps}`;
        }
        const posEl = document.getElementById('hud-position');
        if (posEl && rm.state === RACE_STATE.RACING) {
            const idx = rm.GetPositions().findIndex(e => e.car === p);
            posEl.textContent = idx !== -1 ? `P${idx + 1}` : '';
        } else if (posEl) {
            posEl.textContent = '';
        }
    }

    // ── Draw ────────────────────────────────────────────────────────

    Draw() {
        this.camera.PreDraw(renderer);

        renderer.DrawFillBasicRectangle(0, 0, WORLD_W, WORLD_H, SURFACE.GRASS.color);

        const zones = this.raceManager?.circuit?.surfaceZones ?? [];
        for (const z of zones) {
            renderer.DrawFillBasicRectangle(z.x, z.y, z.w, z.h, z.surface.color);
        }

        this._drawStartFinishLine();

        if (debugMode) {
            this._drawDebugWaypoints();
            const name = this.raceManager?.circuit?.name ?? '';
            renderer.DrawFillText(name, WORLD_W * 0.5, 50, '14px Arial', new Color(1,1,1,0.35), 'center');
        }

        super.Draw();
        this.camera.PostDraw(renderer);
        this._drawScreenOverlay();
    }

    _drawStartFinishLine() {
        const sf = this.raceManager?.circuit?.checkpoints?.[0];
        if (!sf) return;
        const sqW = 22, sqH = sf.h;
        const count = Math.ceil(sf.w / sqW);
        for (let i = 0; i < count; i++) {
            renderer.DrawFillBasicRectangle(
                sf.x - sf.w * 0.5 + i * sqW, sf.y - sf.h * 0.5,
                sqW, sqH,
                i % 2 === 0 ? C_WHITE : C_BLACK
            );
        }
    }

    _drawDebugWaypoints() {
        const wps = this.raceManager?.circuit?.waypoints;
        if (!wps) return;
        const col  = new Color(1, 0.6, 0, 0.7);
        const line = new Color(1, 0.6, 0, 0.25);
        for (let i = 0; i < wps.length; i++) {
            const a = wps[i], b = wps[(i + 1) % wps.length];
            renderer.DrawLine(a.x, a.y, b.x, b.y, line, 2);
            renderer.DrawFillCircle(a.x, a.y, 7, col);
            renderer.DrawFillText(String(i), a.x, a.y - 13, '10px Arial', C_WHITE, 'center');
        }
    }

    _drawScreenOverlay() {
        if (this.msgTimer > 0) {
            const a = Math.min(1.0, this.msgTimer);
            renderer.DrawFillText(this.msgText, SCREEN_W / 2, SCREEN_H / 2 - 70,
                'bold 22px Arial', new Color(1, 1, 0, a), 'center');
        }

        const rm = this.raceManager;
        if (rm.state === RACE_STATE.GRID) {
            const step = rm.countdownStep;
            const text = step > 0 ? String(step) : 'GO!';
            const col  = step > 0 ? new Color(1, 0.25, 0.2, 1) : new Color(0.2, 1, 0.3, 1);
            const pulse = 1 + Clamp(rm.countdownTimer - 0.5, 0, 0.5) * 0.6;
            renderer.DrawFillText(text, SCREEN_W / 2, SCREEN_H / 2,
                `bold ${Math.round(90 * pulse)}px Arial`, col, 'center', 'middle');
        }

        if (rm.state === RACE_STATE.RESULTS) {
            const positions = rm.GetPositions();
            const playerIdx = positions.findIndex(e => e.car === this.playerCar);
            const prog      = rm.progress.get(this.playerCar);
            renderer.DrawFillText('RACE FINISHED', SCREEN_W / 2, SCREEN_H / 2 - 60,
                'bold 42px Arial', Color.FromRGB(255,220,50), 'center', 'middle');
            renderer.DrawFillText(`Your position: P${playerIdx + 1}`, SCREEN_W / 2, SCREEN_H / 2,
                'bold 26px Arial', C_WHITE, 'center', 'middle');
            if (prog?.bestLapTime > 0) {
                renderer.DrawFillText(`Best lap: ${prog.bestLapTime.toFixed(2)} s`, SCREEN_W / 2, SCREEN_H / 2 + 38,
                    '18px Arial', new Color(0.8, 0.8, 0.8, 1), 'center', 'middle');
            }
            renderer.DrawFillText('Tab → Debug → Restart Race', SCREEN_W / 2, SCREEN_H / 2 + 72,
                '14px Arial', new Color(0.7, 0.7, 0.7, 0.8), 'center', 'middle');
        }

        if (this.playerCar.isDead && rm.state === RACE_STATE.RACING) {
            renderer.DrawFillText('WRECKED', SCREEN_W / 2, SCREEN_H / 2,
                'bold 52px Arial', C_WRECKED, 'center');
            renderer.DrawFillText('Tab → Debug → Heal to respawn',
                SCREEN_W / 2, SCREEN_H / 2 + 48, '15px Arial', new Color(1, 0.6, 0.6, 0.9), 'center');
        }

        if (this.timer < 6) {
            const a = Clamp(6 - this.timer, 0, 1);
            renderer.DrawFillText(
                'W/S \u2191\u2193 = Throttle   A/D \u2190\u2192 = Steer   Space = Fire   Tab = Debug',
                SCREEN_W / 2, SCREEN_H - 20, '13px Arial', new Color(1, 1, 1, a), 'center');
        }
    }
}

window.onload = () => { Init(DeathRallyGame); };
