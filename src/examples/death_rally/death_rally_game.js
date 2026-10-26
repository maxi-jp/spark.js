// =====================================================================
// Death Rally — Main game class
// Globals: DeathRallyGame
// Screen flow: MAIN_MENU → HUB → RACE → RACE_SUMMARY → COMPETITION_SUMMARY → HUB
//                       ↘ PLAYGROUND (direct, no campaign)
// Requires: circuit.js, death_rally_defs.js, death_rally_gameobjects.js,
//           death_rally_cars.js, death_rally_gamestate.js, menus/*.js
// Circuit data loaded after this file: circuits/*.js
// =====================================================================

/** @enum {string} */
const GAME_SCREEN = Object.freeze({
    MAIN_MENU:           'MAIN_MENU',
    HUB:                 'HUB',
    RACE:                'RACE',
    PLAYGROUND:          'PLAYGROUND',
    RACE_SUMMARY:        'RACE_SUMMARY',
    COMPETITION_SUMMARY: 'COMPETITION_SUMMARY',
    CREDITS:             'CREDITS',
});

// Circuit key → inline definition map (populated once all circuit scripts load)
const CIRCUIT_MAP = {};

class DeathRallyGame extends Game {
    constructor(renderer) {
        super(renderer);

        this.Configure({
            screenWidth: SCREEN_W,
            screenHeight: SCREEN_H,
            fillWindow: true,
            imageSmoothingEnabled: false,
            drawColliders: true
        });

        this.graphicAssets = {
            sprites: {
                path: 'src/examples/death_rally/assets/death_rally.png',
                img: null,
                atlasJsonPath: 'src/examples/death_rally/assets/death_rally.json',
                atlas: null,
            }, 
            smoke: { path: "./src/examples/death_rally/assets/smoke.png", img: null },
        };

        this.spriteAtlas = null;
    }

    Start() {
        super.Start();

        this._setupInput();

        this.spriteAtlas = new SpriteAtlas(this.graphicAssets.sprites.atlas);

        this.raceManager  = new RaceManager();
        this.timer        = 0;
        this.msgText      = '';
        this.msgTimer     = 0;
        this.debugVisible = false;
        this.gameScreen   = GAME_SCREEN.MAIN_MENU;

        /** @type {GameState|null} */
        this.gameState    = null;

        // Runtime race entries used after a race to pass data to summary menus.
        this._lastRaceEntries = [];

        // Build circuit map after all circuit scripts have loaded
        this._buildCircuitMap();

        // Set up menus (constructed here — canvas global is available)
        this.mainMenu          = new MainMenu(this);
        this.creditsMenu       = new CreditsMenu(this);
        this.hubMenu           = new HubMenu(this);
        this.raceSummaryMenu   = new RaceSummaryMenu(this);
        this.compSummaryMenu   = new CompetitionSummaryMenu(this);
        this._setupHUD();

        // Transition to main menu
        this._showMainMenu();
    }

    _buildCircuitMap() {
        // Populated after circuit scripts load — these globals exist at this point.
        if (typeof OVAL_TRACK     !== 'undefined') CIRCUIT_MAP['OVAL_TRACK']    = OVAL_TRACK;
        if (typeof FIGURE_EIGHT   !== 'undefined') CIRCUIT_MAP['FIGURE_EIGHT']  = FIGURE_EIGHT;
        if (typeof FINAL_CIRCUIT  !== 'undefined') CIRCUIT_MAP['FINAL_CIRCUIT'] = FINAL_CIRCUIT;
        if (typeof PLAYGROUND_CIRCUIT !== 'undefined') CIRCUIT_MAP['PLAYGROUND'] = PLAYGROUND_CIRCUIT;
    }

    _setupInput() {
        Input.RegisterAxis('throttle', [
            { type:'key', positive:KEY_UP,    negative:KEY_DOWN },
            { type:'key', positive:KEY_W,     negative:KEY_S    },
        ]);
        Input.RegisterAxis('steer', [
            { type:'key', positive:KEY_RIGHT, negative:KEY_LEFT },
            { type:'key', positive:KEY_D,     negative:KEY_A    },
        ]);
        Input.RegisterAction('fire',        [{ type:'key', code:KEY_SPACE }, { type:'key', code:KEY_LCTRL }]);
        Input.RegisterAction('debugToggle', [{ type:'key', code:KEY_TAB }]);
    }

    // ── Screen transitions ───────────────────────────────────────────

    _hideAllMenus() {
        this.mainMenu.Hide();
        this.creditsMenu.Hide();
        this.hubMenu.Hide();
        this.raceSummaryMenu.Hide();
        this.compSummaryMenu.Hide();
        document.getElementById('hud').style.display          = 'none';
        document.getElementById('debug-overlay').style.display = 'none';
        this.debugVisible = false;
    }

    _showMainMenu() {
        this._hideAllMenus();
        this.gameScreen = GAME_SCREEN.MAIN_MENU;
        this.mainMenu.Show();
    }

    _showHub() {
        this._hideAllMenus();
        this.gameScreen = GAME_SCREEN.HUB;
        this.hubMenu.Populate(this.gameState);
        this.hubMenu.Show();
    }

    _showRaceSummary() {
        this._hideAllMenus();
        this.gameScreen = GAME_SCREEN.RACE_SUMMARY;
        const lastResult = this.gameState.circuitResults.at(-1);
        const names = { OVAL_TRACK:'Oval Track', FIGURE_EIGHT:'Figure Eight', FINAL_CIRCUIT:'Final Circuit', PLAYGROUND:'Playground Loop' };
        this.raceSummaryMenu.Populate(lastResult.rows, names[lastResult.circuitKey] ?? lastResult.circuitKey);
        this.raceSummaryMenu.Show();
    }

    _showCompetitionSummary() {
        this._hideAllMenus();
        this.gameScreen = GAME_SCREEN.COMPETITION_SUMMARY;
        this.compSummaryMenu.Populate(this.gameState);
        this.compSummaryMenu.Show();
    }

    // ── Button callbacks (called by menu classes) ────────────────────

    /** Main Menu → start campaign */
    OnStartGame() {
        this.gameState = new GameState();
        this._showHub();
    }

    /** Main Menu → credits */
    OnCredits() {
        this._hideAllMenus();
        this.gameScreen = GAME_SCREEN.CREDITS;
        this.creditsMenu.Show();
    }

    OnCreditsBack() {
        if (this.gameState) {
            this._showHub();
        }
        else {
            this._showMainMenu();
        }
    }

    /** Main Menu → playground (no campaign, loads PLAYGROUND_CIRCUIT) */
    OnPlayground() {
        this._hideAllMenus();
        this.gameState = null;
        this._startRaceWith(CircuitLoader.FromInline(PLAYGROUND_CIRCUIT), null, GAME_SCREEN.PLAYGROUND);
    }

    /** Hub → open dealership panel */
    OnOpenDealership() {
        this.hubMenu.OpenDealership();
    }

    /** Hub → start next campaign race */
    OnStartNextRace() {
        const gs  = this.gameState;
        if (!gs?.isRaceReady || gs.campaignDone)
            return;

        const key = gs.nextCircuitKey;
        const def = CIRCUIT_MAP[key];
        if (!def) {
            console.error(`Circuit not found: ${key}`);
            return;
        }

        const circuitData = CircuitLoader.FromInline(def);
        this._hideAllMenus();
        this._startRaceWith(circuitData, gs, GAME_SCREEN.RACE);
    }

    OnReturnToMainMenu() {
        this.DestroyAllGameObjects();
        this._showMainMenu();
    }

    /** Race Summary → view competition standings */
    OnRaceSummaryNext() {
        this._showCompetitionSummary();
    }

    /** Competition Summary → back to hub */
    OnCompetitionContinue() {
        if (this.gameState?.campaignDone) {
            // Unlock supercar and return to main menu for a new run
            this._showMainMenu();
        }
        else {
            this._showHub();
        }
    }

    // ── Race setup ───────────────────────────────────────────────────

    /**
     * Destroys all existing objects, loads the circuit, creates cars.
     * @param {object}     circuitData  Normalised CircuitData from CircuitLoader.
     * @param {GameState|null} gs       Campaign state (null for playground).
     * @param {string}     screen       GAME_SCREEN value.
     */
    _startRaceWith(circuitData, gs, screen) {
        this.DestroyAllGameObjects();
        this.raceManager = new RaceManager();
        this.timer   = 0;
        this.msgText = '';
        this.msgTimer = 0;
        this.gameScreen = screen;
        this.enemies = [];

        this.raceManager.LoadCircuit(circuitData);

        // Checkpoints
        for (const cp of circuitData.checkpoints)
            this.AddGameObject(new CheckpointZone(cp));
        
        // Obstacles
        for (const ob of circuitData.obstacles)
            this.AddGameObject(new Obstacle(ob.cx, ob.cy, ob.w, ob.h, ob.color ?? C_WALL, ob.isBarrel ?? false, ob.rotation ?? 0));
        
        // Pickups
        for (const pk of circuitData.pickups) {
            switch (pk.type) {
                case 'money':
                    this.AddGameObject(new PickupMoney(pk.x, pk.y, pk.data, this.graphicAssets.sprites.img));
                    break;
                case 'health':
                    this.AddGameObject(new PickupHealth(pk.x, pk.y, pk.data, this.graphicAssets.sprites.img));
                    break;
                case 'weapon':
                    this.AddGameObject(new PickupWeapon(pk.x, pk.y, this.graphicAssets.sprites.img, pk.data));
                    break;
                default:
                    console.warn(`Unable to load pickup (unknown type ${pk.type}).`);
                    break;
            }
        }

        if (gs) {
            // Campaign race — use player's selected car with upgrades
            this._createCampaignCars(circuitData, gs);
        }
        else {
            // Playground — default cars
            this._createPlaygroundCars(circuitData);
        }

        this.camera = new FollowCamera(
            Vector2.Zero(), this.playerCar,
            0, WORLD_W - SCREEN_W, 0, WORLD_H - SCREEN_H, 6
        );
        this.camera.Start();

        this.raceManager.StartRace();

        // Show HUD
        document.getElementById('hud').style.display = 'flex';
        this._updateHUD();
    }

    _createCampaignCars(circuitData, gs) {
        const ownedCar = gs.selectedCar;
        const s0       = circuitData.spawns[0];
        const effDef   = ownedCar.getEffectiveDef();

        this.playerCar = this.AddGameObject(new PlayerCar(new Vector2(s0.x, s0.y), ownedCar.vehicleKey, effDef));
        this.playerCar._rotation           = s0.rotation;
        this.playerCar.health              = ownedCar.health;
        this.playerCar.maxHealth           = ownedCar.baseMaxHealth;
        this.playerCar.armour              = ownedCar.armourValue;
        this.playerCar.collisionDamageMultiplier = ownedCar.bumperMult;
        this.playerCar.raceStartHealth     = ownedCar.health;
        this.playerCar.moneyCollected      = 0;
        this.playerCar.damageDealt         = 0;
        this.raceManager.RegisterCar(this.playerCar);

        gs.opponents.forEach((opp, i) => {
            const slotIdx = Math.min(i + 1, circuitData.spawns.length - 1);
            const s       = circuitData.spawns[slotIdx];
            const wpStart = Math.floor(circuitData.waypoints.length * ((i + 1) / (gs.opponents.length + 1)));
            const e = this.AddGameObject(new EnemyCar(new Vector2(s.x, s.y), opp.vehicleKey, wpStart, opp.getEffectiveDef()));
            e._rotation                  = s.rotation;
            e.health                     = opp.health;
            e.maxHealth                  = VEHICLE_DEFS[opp.vehicleKey].health;
            e.armour                     = opp.armourValue;
            e.collisionDamageMultiplier  = opp.bumperMult;
            e.raceStartHealth            = opp.health;
            e.moneyCollected             = 0;
            e.damageDealt                = 0;
            e.aiTarget                   = this.playerCar;
            e.EquipWeapon('MACHINEGUN');
            this.raceManager.RegisterCar(e);
            this.enemies.push(e);
        });
    }

    _createPlaygroundCars(circuitData) {
        const s0 = circuitData.spawns[0];
        this.playerCar = this.AddGameObject(new PlayerCar(new Vector2(s0.x, s0.y), 'SPORTS'));
        this.playerCar._rotation = s0.rotation;
        this.raceManager.RegisterCar(this.playerCar);

        const enemyDefs = [
            { slotIdx:1, vehicleKey:'MUSCLE', wpStart: Math.floor(circuitData.waypoints.length * 0.30) },
            { slotIdx:2, vehicleKey:'BUGGY',  wpStart: Math.floor(circuitData.waypoints.length * 0.65) },
        ];
        for (const ed of enemyDefs) {
            const s = circuitData.spawns[Math.min(ed.slotIdx, circuitData.spawns.length - 1)];
            const e = this.AddGameObject(new EnemyCar(new Vector2(s.x, s.y), ed.vehicleKey, ed.wpStart));
            e._rotation = s.rotation;
            e.aiTarget  = this.playerCar;
            e.EquipWeapon('MACHINEGUN');
            this.raceManager.RegisterCar(e);
            this.enemies.push(e);
        }
    }

    // ── Race end / campaign ──────────────────────────────────────────

    _onRaceComplete() {
        if (!this.gameState) {
            // Playground — just show canvas overlay, no campaign state
            return;
        }

        const positions = this.raceManager.GetPositions(); // sorted best→worst
        const gs        = this.gameState;

        // Build positioned entries for GameState.recordRaceResult
        const entries = positions.map((p, idx) => {
            const isPlayer = (p.car === this.playerCar);
            const oppData  = isPlayer ? null : gs.opponents.find(o => o.vehicleKey === p.car.vehicleKey);
            return {
                label:       isPlayer ? `YOU (${VEHICLE_DEFS[p.car.vehicleKey].name})` : VEHICLE_DEFS[p.car.vehicleKey].name,
                isPlayer,
                car:         p.car,
                opponentData: oppData,
            };
        });

        gs.recordRaceResult(entries, CAMPAIGN_CIRCUIT_KEYS[gs.circuitIndex - 1] ?? 'UNKNOWN');
        this._showRaceSummary();
    }

    // ── Debug helpers ────────────────────────────────────────────────

    _switchCircuit(circuitDef) {
        this._startRaceWith(CircuitLoader.FromInline(circuitDef), null, GAME_SCREEN.PLAYGROUND);
        document.getElementById('hud').style.display = 'flex';
    }

    _spawnRandomEnemy() {
        if (!this.playerCar) return;
        const keys = ['SPORTS','MUSCLE','TRUCK','BUGGY'];
        const wps  = this.raceManager?.circuit?.waypoints;
        const e = this.AddGameObject(new EnemyCar(
            new Vector2(RandomBetweenFloat(200, WORLD_W - 200), RandomBetweenFloat(200, WORLD_H - 200)),
            keys[RandomBetweenInt(0, keys.length - 1)],
            wps ? RandomBetweenInt(0, wps.length - 1) : 0
        ));
        e.aiTarget = this.playerCar;
        e.EquipWeapon('MACHINEGUN');
        this.raceManager.RegisterCar(e);
        this.enemies.push(e);
    }

    // ── HUD ─────────────────────────────────────────────────────────

    _setupHUD() {
        this.hud = new HTMLMenu(this, '#hud', '#canvasContainer', canvas, true, false);
        this.hud.Start();

        this.debugMenu = new HTMLMenu(this, '#debug-overlay', '#canvasContainer', canvas, true, false);
        this.debugMenu.Start();
        this.debugMenu.SetupButtons([
            { selector:'#dbg-sports',    callback: () => this.playerCar?.SwapVehicle('SPORTS')     },
            { selector:'#dbg-muscle',    callback: () => this.playerCar?.SwapVehicle('MUSCLE')     },
            { selector:'#dbg-truck',     callback: () => this.playerCar?.SwapVehicle('TRUCK')      },
            { selector:'#dbg-buggy',     callback: () => this.playerCar?.SwapVehicle('BUGGY')      },
            { selector:'#dbg-give-mg',   callback: () => this.playerCar?.EquipWeapon('MACHINEGUN') },
            { selector:'#dbg-give-msl',  callback: () => this.playerCar?.EquipWeapon('MISSILE')    },
            { selector:'#dbg-give-mine', callback: () => this.playerCar?.EquipWeapon('MINE')       },
            { selector:'#dbg-heal',      callback: () => { if (this.playerCar) { this.playerCar.health = this.playerCar.maxHealth; this.playerCar.isDead = false; } } },
            { selector:'#dbg-money',     callback: () => { if (this.gameState) this.gameState.money += 500; } },
            { selector:'#dbg-spawn',     callback: () => this._spawnRandomEnemy()                  },
            { selector:'#dbg-restart',   callback: () => this.raceManager.RestartRace()            },
            { selector:'#dbg-track-playground', callback: () => this._switchCircuit(PLAYGROUND_CIRCUIT)  },
            { selector:'#dbg-track-oval',       callback: () => this._switchCircuit(OVAL_TRACK)          },
            { selector:'#dbg-track-figure8',    callback: () => this._switchCircuit(FIGURE_EIGHT)        },
            { selector:'#dbg-track-final',      callback: () => this._switchCircuit(FINAL_CIRCUIT)       },
            { selector:'#dbg-colliders', callback: () => { this.config.drawColliders = !this.config.drawColliders; } },
            { selector:'#dbg-debug',     callback: () => { debugMode = !debugMode; } },
        ]);
    }

    // ── Queries ─────────────────────────────────────────────────────

    GetSurfaceAt(x, y) {
        const zones = this.raceManager?.circuit?.surfaceZones ?? [];
        for (let i = zones.length - 1; i >= 0; i--) {
            const z = zones[i];
            if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h)
                return z.surface;
        }
        return SURFACE.GRASS;
    }

    SpawnExplosion(x, y, large) {
        this.AddGameObject(new Explosion(x, y, large));
    }

    ShowPickupMessage(message) {
        this.msgText = message;
        this.msgTimer = 2.0;
    }

    // ── Update ──────────────────────────────────────────────────────

    Update(dt) {
        const racing = this.gameScreen === GAME_SCREEN.RACE || this.gameScreen === GAME_SCREEN.PLAYGROUND;

        if (racing) {
            super.Update(dt);
            this.timer += dt;
            if (this.msgTimer > 0) this.msgTimer -= dt;

            this.raceManager.Update(dt);
            this.camera.Update(dt);

            this.playerCar.inputDisabled = this.raceManager.inputLocked;

            // Check race completion
            if (this.raceManager.state === RACE_STATE.RACING) {
                const prog = this.raceManager.progress.get(this.playerCar);
                if (prog?.finished && this.gameScreen === GAME_SCREEN.RACE) {
                    this.raceManager.state = RACE_STATE.RESULTS;
                    this._onRaceComplete();
                    return;
                } else if (prog?.finished) {
                    this.raceManager.state = RACE_STATE.RESULTS;
                }
            }
        }

        if (Input.GetActionDown('debugToggle') && racing) {
            this.debugVisible = !this.debugVisible;
            document.getElementById('debug-overlay').style.display = this.debugVisible ? 'block' : 'none';
        }

        if (racing) this._updateHUD();
    }

    _updateHUD() {
        const p   = this.playerCar;
        const rm  = this.raceManager;
        const prog = rm.progress.get(p);

        const fill = document.getElementById('hud-hp-fill');
        if (fill) {
            const pct = (p.health / p.maxHealth) * 100;
            fill.style.width      = pct + '%';
            fill.style.background = pct > 50 ? '#4caf50' : (pct > 25 ? '#ff9800' : '#f44336');
        }
        const wName = document.getElementById('hud-weapon-name');
        if (wName)
            wName.textContent = WEAPON_DEFS[p.currentWeapon].name;

        const ammoEl = document.getElementById('hud-ammo');
        if (ammoEl)
            ammoEl.textContent = p.ammo > 0 ? '\u00d7' + p.ammo : '';

        const moneyEl = document.getElementById('hud-money');
        if (moneyEl)
            moneyEl.textContent = '$' + p.moneyCollected;

        const surfEl = document.getElementById('hud-surface');
        if (surfEl)
            surfEl.textContent = p.surfaceType?.name ?? '';

        const spdEl = document.getElementById('hud-speed');
        if (spdEl)
            spdEl.textContent = Math.round(p.speed * 0.1) + ' km/h';

        const timeEl = document.getElementById('hud-time');
        if (timeEl) {
            const m = Math.floor(this.timer / 60);
            const s = Math.floor(this.timer % 60).toString().padStart(2, '0');
            timeEl.textContent = `${m}:${s}`;
        }
        const lapEl = document.getElementById('hud-lap');
        if (lapEl && prog && rm.circuit) {
            lapEl.textContent = rm.state === RACE_STATE.RESULTS
                ? 'Finished!'
                : `Lap ${Math.min(prog.currentLap + 1, rm.circuit.laps)} / ${rm.circuit.laps}`;
        }
        const posEl = document.getElementById('hud-position');
        if (posEl && rm.state === RACE_STATE.RACING) {
            const idx = rm.GetPositions().findIndex(e => e.car === p);
            posEl.textContent = idx !== -1 ? `P${idx + 1}` : '';
        }
        else if (posEl) {
            posEl.textContent = '';
        }
    }

    // ── Draw ────────────────────────────────────────────────────────

    Draw() {
        const racing = this.gameScreen === GAME_SCREEN.RACE || this.gameScreen === GAME_SCREEN.PLAYGROUND;

        if (!racing) {
            // Atmospheric background behind menu overlays
            renderer.DrawFillBasicRectangle(0, 0, SCREEN_W, SCREEN_H, C_DARKROAD);
            // Subtle grid pattern
            const gridCol = new Color(1, 1, 1, 0.03);
            for (let x = 0; x < SCREEN_W; x += 48) renderer.DrawLine(x, 0, x, SCREEN_H, gridCol, 1);
            for (let y = 0; y < SCREEN_H; y += 48) renderer.DrawLine(0, y, SCREEN_W, y, gridCol, 1);
            return;
        }

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
                sqW, sqH, i % 2 === 0 ? C_WHITE : C_BLACK
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
            const step  = rm.countdownStep;
            const text  = step > 0 ? String(step) : 'GO!';
            const col   = step > 0 ? new Color(1, 0.25, 0.2, 1) : new Color(0.2, 1, 0.3, 1);
            const pulse = 1 + Clamp(rm.countdownTimer - 0.5, 0, 0.5) * 0.6;
            renderer.DrawFillText(text, SCREEN_W / 2, SCREEN_H / 2,
                `bold ${Math.round(90 * pulse)}px Arial`, col, 'center', 'middle');
        }

        // Playground-only finish overlay (campaign uses race summary menu)
        if (rm.state === RACE_STATE.RESULTS && this.gameScreen === GAME_SCREEN.PLAYGROUND) {
            renderer.DrawFillText('FINISHED', SCREEN_W / 2, SCREEN_H / 2,
                'bold 52px Arial', Color.FromRGB(255,220,50), 'center');
            renderer.DrawFillText('Tab → Debug → Restart', SCREEN_W / 2, SCREEN_H / 2 + 56,
                '15px Arial', new Color(1,1,1,0.8), 'center');
        }

        if (this.playerCar?.isDead && rm.state === RACE_STATE.RACING) {
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
