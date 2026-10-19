// =====================================================================
// Death Rally — Campaign state
// Globals: OwnedCar, AIOpponentData, GameState
// Requires: death_rally_defs.js
// =====================================================================

// #region ---- OWNED CAR ----

class OwnedCar {
    /** @param {string} vehicleKey */
    constructor(vehicleKey) {
        this.vehicleKey = vehicleKey;
        this.health     = VEHICLE_DEFS[vehicleKey].health;
        this.upgrades   = { engine: 0, tyres: 0, armour: 0, bumper: 0 };
    }

    get baseMaxHealth() { return VEHICLE_DEFS[this.vehicleKey].health; }

    /** @returns {number} Cost to fully repair this car. */
    get repairCost() {
        return Math.max(0, this.baseMaxHealth - this.health) * REPAIR_COST_PER_HP;
    }

    /**
     * Returns a plain def object with all upgrade bonuses applied.
     * Pass this as `upgradedDef` to the Car constructor.
     */
    getEffectiveDef() {
        const base = VEHICLE_DEFS[this.vehicleKey];
        const def  = { ...base };

        const eu = this.upgrades.engine;
        if (eu > 0) {
            const ug = UPGRADE_DEFS.ENGINE.levels[eu - 1];
            def.topSpeed      += ug.topSpeedBonus;
            def.acceleration  += ug.accelerationBonus;
        }

        const tu = this.upgrades.tyres;
        if (tu > 0) {
            def.lateralFrictionMult += UPGRADE_DEFS.TYRES.levels[tu - 1].lateralFrictionBonus;
        }

        return def;
    }

    /** Flat armour value from the armour upgrade (0 if no upgrade). */
    get armourValue() {
        const au = this.upgrades.armour;
        return au > 0 ? UPGRADE_DEFS.ARMOUR.levels[au - 1].armourValue : 0;
    }

    /** Collision damage multiplier from the bumper upgrade (1.0 if no upgrade). */
    get bumperMult() {
        const bu = this.upgrades.bumper;
        return bu > 0 ? UPGRADE_DEFS.BUMPER.levels[bu - 1].collisionDamageMult : 1.0;
    }

    /**
     * @param {'engine'|'tyres'|'armour'|'bumper'} upgradeKey
     * @returns {{ cost:number }|null}  Def for next level, or null if already max.
     */
    nextUpgrade(upgradeKey) {
        const key    = upgradeKey.toUpperCase();
        const def    = UPGRADE_DEFS[key];
        const curLvl = this.upgrades[upgradeKey];
        if (curLvl >= def.maxLevel) return null;
        return def.levels[curLvl];
    }
}

// #endregion

// #region ---- AI OPPONENT DATA ----

class AIOpponentData {
    constructor(vehicleKey) {
        this.vehicleKey = vehicleKey;
        this.money      = AI_STARTING_MONEY;
        this.health     = VEHICLE_DEFS[vehicleKey].health;
        this.upgrades   = { engine: 0, tyres: 0, armour: 0, bumper: 0 };
    }

    get armourValue() {
        const au = this.upgrades.armour;
        return au > 0 ? UPGRADE_DEFS.ARMOUR.levels[au - 1].armourValue : 0;
    }
    get bumperMult() {
        const bu = this.upgrades.bumper;
        return bu > 0 ? UPGRADE_DEFS.BUMPER.levels[bu - 1].collisionDamageMult : 1.0;
    }

    getEffectiveDef() {
        const base = VEHICLE_DEFS[this.vehicleKey];
        const def  = { ...base };
        const eu = this.upgrades.engine;
        if (eu > 0) {
            const ug = UPGRADE_DEFS.ENGINE.levels[eu - 1];
            def.topSpeed     += ug.topSpeedBonus;
            def.acceleration += ug.accelerationBonus;
        }
        const tu = this.upgrades.tyres;
        if (tu > 0) def.lateralFrictionMult += UPGRADE_DEFS.TYRES.levels[tu - 1].lateralFrictionBonus;
        return def;
    }

    /** Greedy spend: Engine → Tyres → Armour → Bumper, cycling until funds run out. */
    spendOnUpgrades() {
        const priority = ['engine', 'tyres', 'armour', 'bumper'];
        let changed = true;
        while (changed) {
            changed = false;
            for (const key of priority) {
                const curLvl  = this.upgrades[key];
                const ugDef   = UPGRADE_DEFS[key.toUpperCase()];
                if (curLvl >= ugDef.maxLevel) continue;
                const cost = ugDef.levels[curLvl].cost;
                if (this.money >= cost) {
                    this.money -= cost;
                    this.upgrades[key]++;
                    changed = true;
                }
            }
        }
    }
}

// #endregion

// #region ---- CAMPAIGN STATE ----

/**
 * Top-level campaign state.
 * Created once on "Start Game" and mutated throughout the campaign.
 */
class GameState {
    constructor() {
        /** @type {number} Player's current funds. */
        this.money  = 1000;

        /** @type {OwnedCar[]} Cars the player owns. */
        this.ownedCars = [];

        /** Index into ownedCars of the car the player has selected for the next race. */
        this.selectedCarIndex = -1;

        /** Index into CAMPAIGN_CIRCUIT_KEYS of the next circuit to race. */
        this.circuitIndex = 0;

        /** Whether the player has completed the full campaign at least once. */
        this.campaignCompleted = false;

        /** @type {AIOpponentData[]} */
        this.opponents = AI_OPPONENT_DEFS.map(d => new AIOpponentData(d.vehicleKey));

        /**
         * Per-circuit results for STANDINGS display.
         * Each entry: { circuitKey, playerPos, rows:[{label, pos, pts, money}] }
         */
        this.circuitResults = [];

        /** Accumulated championship points per racer label (player label = 'YOU'). */
        this.totalPoints = {};
    }

    get selectedCar()  { return this.ownedCars[this.selectedCarIndex] ?? null; }
    get isRaceReady()  { return this.selectedCar !== null; }
    get campaignDone() { return this.circuitIndex >= CAMPAIGN_CIRCUIT_KEYS.length; }
    get nextCircuitKey() {
        return CAMPAIGN_CIRCUIT_KEYS[this.circuitIndex] ?? null;
    }

    /** Buy a car. Returns false if insufficient funds or already owned. */
    buyCar(vehicleKey) {
        const def = DEALERSHIP_DEFS[vehicleKey];
        if (!def || this.money < def.price) return false;
        if (this.ownedCars.some(c => c.vehicleKey === vehicleKey)) return false;
        this.money -= def.price;
        const car = new OwnedCar(vehicleKey);
        this.ownedCars.push(car);
        if (this.selectedCarIndex < 0) this.selectedCarIndex = 0;
        return true;
    }

    /** Repair the selected car. Returns false if insufficient funds. */
    repairSelectedCar() {
        const car  = this.selectedCar;
        if (!car) return false;
        const cost = car.repairCost;
        if (this.money < cost) return false;
        this.money    -= cost;
        car.health     = car.baseMaxHealth;
        return true;
    }

    /**
     * Buy an upgrade for the selected car.
     * @param {'engine'|'tyres'|'armour'|'bumper'} upgradeKey
     */
    buyUpgrade(upgradeKey) {
        const car  = this.selectedCar;
        if (!car) return false;
        const next = car.nextUpgrade(upgradeKey);
        if (!next || this.money < next.cost) return false;
        this.money -= next.cost;
        car.upgrades[upgradeKey]++;
        return true;
    }

    /**
     * Called after a race ends.
     * Records results, awards money, advances to next circuit.
     * Enemies auto-spend between circuits.
     *
     * @param {Array<{label:string, isCar:boolean, car:Car|null, opponentData:AIOpponentData|null}>} raceEntries
     *   Ordered array from last to first finishing position (RaceManager.GetPositions reversed → position order).
     *   Each entry has a human-readable `label`, plus runtime car ref and data ref.
     * @param {string} circuitKey
     */
    recordRaceResult(positionedEntries, circuitKey) {
        const rows = [];
        positionedEntries.forEach((entry, idx) => {
            const pos   = idx + 1;
            const pts   = POSITION_POINTS[Math.min(idx, POSITION_POINTS.length - 1)];
            const prize = POSITION_MONEY[Math.min(idx, POSITION_MONEY.length - 1)];

            // Award money
            if (entry.isPlayer) {
                this.money += prize + (entry.car?.moneyCollected ?? 0);
                // Save car health back
                if (this.selectedCar) {
                    this.selectedCar.health = Math.max(1, entry.car?.health ?? 1);
                }
            } else if (entry.opponentData) {
                entry.opponentData.money  += prize + (entry.car?.moneyCollected ?? 0);
                entry.opponentData.health  = Math.max(1, entry.car?.health ?? 1);
            }

            // Accumulate points
            const label = entry.label;
            this.totalPoints[label] = (this.totalPoints[label] ?? 0) + pts;

            rows.push({
                label,
                isPlayer:     entry.isPlayer,
                pos,
                pts,
                prize,
                health:       entry.car?.health       ?? 0,
                raceStartHp:  entry.car?.raceStartHealth ?? entry.car?.maxHealth ?? 0,
                damageDealt:  Math.round(entry.car?.damageDealt ?? 0),
                moneyCollected: entry.car?.moneyCollected ?? 0,
            });
        });

        this.circuitResults.push({ circuitKey, rows });
        this.circuitIndex++;

        if (this.circuitIndex >= CAMPAIGN_CIRCUIT_KEYS.length) {
            this.campaignCompleted = true;
        }

        // AI spends earnings between circuits
        for (const opp of this.opponents) opp.spendOnUpgrades();
    }
}

// #endregion
