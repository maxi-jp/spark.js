// =====================================================================
// Death Rally — Race Summary & Competition Summary menus
// Extends HTMLMenu. Shown after each circuit finishes.
// Requires: game_state.js, death_rally_defs.js
// =====================================================================

// #region ---- RACE SUMMARY ----

class RaceSummaryMenu extends HTMLMenu {
    constructor(game) {
        super(game, '#race-summary', '#canvasContainer', canvas, true, false);
        this.Start();
        this.SetupButtons([
            { selector: '#btn-race-summary-next', callback: () => game.OnRaceSummaryNext() },
        ]);
        this.Hide();
    }

    Show() { this.container.style.display = 'flex'; }
    Hide() { this.container.style.display = 'none'; }

    /**
     * @param {Array} rows  From GameState.circuitResults (last entry).
     * @param {string} circuitName
     */
    Populate(rows, circuitName) {
        const titleEl = document.getElementById('race-summary-title');
        if (titleEl) titleEl.textContent = `Race Summary — ${circuitName}`;

        const tbody = document.getElementById('race-summary-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        rows.forEach(row => {
            const hpLost = Math.max(0, row.raceStartHp - row.health);
            const tr = document.createElement('tr');
            tr.className = row.isPlayer ? 'summary-player-row' : '';
            tr.innerHTML = `
                <td class="pos-cell">${this._posStr(row.pos)}</td>
                <td>${row.label}</td>
                <td>${row.health}</td>
                <td class="${hpLost > 0 ? 'dmg-taken' : ''}">${hpLost > 0 ? '-' + hpLost : '—'}</td>
                <td class="${row.damageDealt > 0 ? 'dmg-dealt' : ''}">${row.damageDealt > 0 ? row.damageDealt : '—'}</td>
                <td class="money-cell">$${row.prize + row.moneyCollected}</td>`;
            tbody.appendChild(tr);
        });
    }

    _posStr(n) {
        const s = ['st','nd','rd'];
        return n + (s[n-1] ?? 'th');
    }
}

// #endregion

// #region ---- COMPETITION SUMMARY ----

class CompetitionSummaryMenu extends HTMLMenu {
    constructor(game) {
        super(game, '#competition-summary', '#canvasContainer', canvas, true, false);
        this.Start();
        this.SetupButtons([
            { selector: '#btn-competition-continue', callback: () => game.OnCompetitionContinue() },
        ]);
        this.Hide();
    }

    Show() { this.container.style.display = 'flex'; }
    Hide() { this.container.style.display = 'none'; }

    /**
     * @param {GameState} gs
     */
    Populate(gs) {
        const circuitNames = {
            OVAL_TRACK:    'Oval',
            FIGURE_EIGHT:  'Figure 8',
            FINAL_CIRCUIT: 'Final',
        };

        // Gather all participant labels
        const allLabels = new Set();
        gs.circuitResults.forEach(cr => cr.rows.forEach(r => allLabels.add(r.label)));

        // Build header row
        const thead = document.getElementById('comp-thead');
        if (thead) {
            const headers = ['Car', ...gs.circuitResults.map(cr => circuitNames[cr.circuitKey] ?? cr.circuitKey), 'Total'];
            thead.innerHTML = '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
        }

        // Build body
        const tbody = document.getElementById('comp-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        // Sort by total points descending
        const sortedLabels = [...allLabels].sort((a, b) =>
            (gs.totalPoints[b] ?? 0) - (gs.totalPoints[a] ?? 0)
        );

        sortedLabels.forEach(label => {
            const isPlayer = gs.circuitResults.some(cr => cr.rows.find(r => r.label === label && r.isPlayer));
            const tr = document.createElement('tr');
            tr.className = isPlayer ? 'summary-player-row' : '';
            const circuitCells = gs.circuitResults.map(cr => {
                const row = cr.rows.find(r => r.label === label);
                return row ? `<td>${row.pts}</td>` : '<td>—</td>';
            }).join('');
            tr.innerHTML = `<td>${label}</td>${circuitCells}<td class="total-pts">${gs.totalPoints[label] ?? 0}</td>`;
            tbody.appendChild(tr);
        });

        // Continue button label
        const continueBtn = document.getElementById('btn-competition-continue');
        if (continueBtn) {
            continueBtn.textContent = gs.campaignDone ? 'Finish Campaign' : 'Continue';
        }

        // Show next race info if campaign is not complete
        const nextInfoEl = document.getElementById('comp-next-info');
        if (nextInfoEl) {
            if (gs.nextCircuitKey) {
                const names = { OVAL_TRACK:'Oval Track', FIGURE_EIGHT:'Figure Eight', FINAL_CIRCUIT:'Final Circuit' };
                nextInfoEl.textContent = `Up next: ${names[gs.nextCircuitKey]}`;
            } else {
                nextInfoEl.textContent = 'Campaign complete! 🏆';
            }
        }
    }
}

// #endregion
