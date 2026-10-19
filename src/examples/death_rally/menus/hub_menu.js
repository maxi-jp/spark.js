// =====================================================================
// Death Rally — Hub Menu (Campaign Hub)
// Extends HTMLMenu. Shows funds, garage, dealership, and race controls.
// Requires: game_state.js, death_rally_defs.js
// =====================================================================

class HubMenu extends HTMLMenu {
    constructor(game) {
        super(game, '#hub-menu', '#canvasContainer', canvas, true, false);
        this.Start();

        /** @type {GameState} */
        this.gs = null; // set by Populate()

        // Top-level hub buttons
        this.SetupButtons([
            { selector: '#btn-dealership',    callback: () => game.OnOpenDealership()  },
            { selector: '#btn-start-race',    callback: () => game.OnStartNextRace()   },
            { selector: '#btn-hub-credits',   callback: () => game.OnCredits()         },
            { selector: '#btn-hub-main-menu', callback: () => game.OnReturnToMainMenu()},
        ]);

        this._dealershipPanel  = document.getElementById('dealership-panel');
        this._garageList       = document.getElementById('garage-car-list');
        this._carDetail        = document.getElementById('garage-car-detail');
        this._fundsEl          = document.getElementById('hub-funds');
        this._nextRaceEl       = document.getElementById('hub-next-race');
        this._startRaceBtn     = document.getElementById('btn-start-race');

        this.Hide();
        this._dealershipPanel.style.display = 'none';
    }

    Show() { this.container.style.display = 'flex'; }
    Hide() {
        this.container.style.display = 'none';
        this._dealershipPanel.style.display = 'none';
    }

    /** Refresh the entire hub from current GameState. */
    Populate(gs) {
        this.gs = gs;
        this._refreshHeader();
        this._refreshGarage();
        this._refreshCarDetail(gs.selectedCar);
        this._refreshStartButton();
    }

    _refreshHeader() {
        if (this._fundsEl)   this._fundsEl.textContent   = `$${this.gs.money}`;
        if (this._nextRaceEl) {
            const key = this.gs.nextCircuitKey;
            if (key) {
                const names = {
                    OVAL_TRACK:    'Oval Track',
                    FIGURE_EIGHT:  'Figure Eight',
                    FINAL_CIRCUIT: 'Final Circuit',
                };
                this._nextRaceEl.textContent = `Next Race: ${names[key] ?? key}`;
            } else {
                this._nextRaceEl.textContent = 'Campaign Complete!';
            }
        }
    }

    _refreshGarage() {
        if (!this._garageList) return;
        this._garageList.innerHTML = '';

        if (this.gs.ownedCars.length === 0) {
            this._garageList.innerHTML = '<p class="hub-empty-msg">No cars owned — visit the Dealership.</p>';
            return;
        }

        this.gs.ownedCars.forEach((ownedCar, idx) => {
            const def     = VEHICLE_DEFS[ownedCar.vehicleKey];
            const isSelected = idx === this.gs.selectedCarIndex;
            const hpPct   = (ownedCar.health / ownedCar.baseMaxHealth * 100).toFixed(0);
            const card    = document.createElement('div');
            card.className = 'garage-card' + (isSelected ? ' selected' : '');
            card.innerHTML = `
                <div class="gc-name">${def.name}</div>
                <div class="gc-hp-bar"><div class="gc-hp-fill" style="width:${hpPct}%"></div></div>
                <div class="gc-hp-label">${ownedCar.health}/${ownedCar.baseMaxHealth} HP</div>`;
            card.addEventListener('click', () => {
                this.gs.selectedCarIndex = idx;
                this._refreshGarage();
                this._refreshCarDetail(ownedCar);
                this._refreshStartButton();
            });
            this._garageList.appendChild(card);
        });
    }

    _refreshCarDetail(ownedCar) {
        if (!this._carDetail) return;
        if (!ownedCar) {
            this._carDetail.innerHTML = '<p class="hub-empty-msg">Select a car from your garage.</p>';
            return;
        }
        const def   = VEHICLE_DEFS[ownedCar.vehicleKey];
        const effDef = ownedCar.getEffectiveDef();
        const hpPct  = (ownedCar.health / ownedCar.baseMaxHealth * 100).toFixed(0);
        const repCost = ownedCar.repairCost;

        const upgradeRows = ['engine','tyres','armour','bumper'].map(key => {
            const ugDef  = UPGRADE_DEFS[key.toUpperCase()];
            const curLvl = ownedCar.upgrades[key];
            const next   = ownedCar.nextUpgrade(key);
            const levelStr = curLvl === 0 ? '—' : `L${curLvl}`;
            const btnHtml  = next
                ? `<button class="hub-upgrade-btn" data-key="${key}">Upgrade L${curLvl+1}: $${next.cost}</button>`
                : `<span class="upgrade-maxed">MAX</span>`;
            return `<tr><td>${ugDef.name}</td><td class="ug-level">${levelStr}</td><td>${btnHtml}</td></tr>`;
        }).join('');

        this._carDetail.innerHTML = `
            <div class="cd-title">${def.name}</div>
            <div class="cd-hp-row">
                <span>HP</span>
                <div class="cd-hp-bar"><div class="cd-hp-fill" style="width:${hpPct}%"></div></div>
                <span>${ownedCar.health}/${ownedCar.baseMaxHealth}</span>
            </div>
            ${ownedCar.armourValue > 0 ? `<div class="cd-armour">Armour: ${ownedCar.armourValue} pts</div>` : ''}
            <div class="cd-stats">
                <span>Top Speed: <b>${effDef.topSpeed}</b></span>
                <span>Accel: <b>${effDef.acceleration}</b></span>
                <span>Handling: <b>${effDef.steerSpeed.toFixed(1)}</b></span>
                <span>Mass: <b>${def.mass}</b></span>
            </div>
            <table class="cd-upgrades">${upgradeRows}</table>
            <div class="cd-repair">
                ${repCost > 0
                    ? `<button id="btn-repair-car">Repair ($${repCost})</button>`
                    : `<span class="upgrade-maxed">Full HP ✓</span>`}
            </div>`;

        // Wire up dynamically-created upgrade buttons
        this._carDetail.querySelectorAll('.hub-upgrade-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.key;
                if (this.game.gameState.buyUpgrade(key)) {
                    this._refreshHeader();
                    this._refreshCarDetail(this.gs.selectedCar);
                }
            });
        });

        const repairBtn = document.getElementById('btn-repair-car');
        if (repairBtn) {
            repairBtn.addEventListener('click', () => {
                if (this.game.gameState.repairSelectedCar()) {
                    this._refreshHeader();
                    this._refreshCarDetail(this.gs.selectedCar);
                    this._refreshGarage();
                }
            });
        }
    }

    _refreshStartButton() {
        if (!this._startRaceBtn) return;
        const ready = this.gs.isRaceReady && !this.gs.campaignDone;
        this._startRaceBtn.disabled = !ready;
        this._startRaceBtn.style.opacity = ready ? '1' : '0.4';
    }

    // ── Dealership ─────────────────────────────────────────────────

    OpenDealership() {
        this._refreshDealership();
        this._dealershipPanel.style.display = 'flex';
    }

    CloseDealership() {
        this._dealershipPanel.style.display = 'none';
    }

    _refreshDealership() {
        const list = document.getElementById('dealership-car-list');
        if (!list) return;
        list.innerHTML = '';

        Object.entries(DEALERSHIP_DEFS).forEach(([vKey, dealDef]) => {
            const vDef    = VEHICLE_DEFS[vKey];
            const owned   = this.gs.ownedCars.some(c => c.vehicleKey === vKey);
            const locked  = dealDef.lockedUntilWin && !this.gs.campaignCompleted;
            const canBuy  = !owned && !locked && this.gs.money >= dealDef.price;

            const card = document.createElement('div');
            card.className = 'dealer-card' + (owned ? ' owned' : '') + (locked ? ' locked' : '');

            let btnHtml;
            if (locked)      btnHtml = `<button disabled class="dealer-btn">🔒 Locked</button>`;
            else if (owned)  btnHtml = `<button disabled class="dealer-btn">Owned</button>`;
            else             btnHtml = `<button class="dealer-btn" ${canBuy ? '' : 'disabled'}>Buy $${dealDef.price}</button>`;

            card.innerHTML = `
                <div class="dc-name">${vDef.name}</div>
                <div class="dc-stats">
                    Spd ${vDef.topSpeed} · HP ${vDef.health} · Mass ${vDef.mass}
                </div>
                <div class="dc-price">$${locked ? '???' : dealDef.price}</div>
                ${btnHtml}`;

            const btn = card.querySelector('.dealer-btn');
            if (canBuy && btn) {
                btn.addEventListener('click', () => {
                    if (this.gs.buyCar(vKey)) {
                        this._refreshDealership();
                        this._refreshHeader();
                        this._refreshGarage();
                        this._refreshCarDetail(this.gs.selectedCar);
                        this._refreshStartButton();
                    }
                });
            }
            list.appendChild(card);
        });

        // Wire close button
        const closeBtn = document.getElementById('btn-dealership-close');
        if (closeBtn) closeBtn.onclick = () => this.CloseDealership();
    }
}
