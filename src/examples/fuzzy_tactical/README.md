# Fuzzy Logic Demo 3 — Tactical Threat Assessment & Hybrid AI

**[▶ Run Live Demo](../../fuzzy-tactical.html)**

This example demonstrates how **Fuzzy Logic solves combinatorial explosion in tactical RPG and action-game AI** by combining multiple continuous battlefield inputs into a unified **`Aggression`** utility score ($0\text{–}100$).

---

## Multi-Variable Tactical Inference

Instead of writing dozens of nested `if/else` branches for every combination of health, threat, and squad size, the AI Commander evaluates three Fuzzy Linguistic Variables:
1. **`OwnHealth`** ($0\text{–}100\%$): `Critical`, `Wounded`, `Healthy`
2. **`EnemyThreat`** ($0\text{–}100$): `Low`, `Mod`, `Extreme` (derived from player proximity + Overcharge Aura)
3. **`AllySupport`** ($0\text{–}4$ drones): `Isolated`, `Supported`, `Squad`

And defuzzifies a single continuous output:
4. **`Aggression`** ($0\text{–}100$): `Retreat`, `Defend`, `Engage`, `Berserk`

### Hybrid Control Output
The defuzzified `Aggression` score smoothly drives both discrete posture labels and continuous parameters:
- **$< 30$ (`RETREAT TO SHRINE`)**: Withdraws to the top-left Healing Shrine to regenerate HP and raises its Aegis shield.
- **$30\text{–}100$ (`DEFEND` $\rightarrow$ `ENGAGE` $\rightarrow$ `BERSERK`)**: Continuously interpolates desired standoff distance ($220\text{ px} \rightarrow 85\text{ px}$), movement speed, shield opacity, and weapon fire rate.

---

## Interactive Controls

| Input | Action |
|---|---|
| **WASD / Arrow Keys** or **Mouse Drag** | Move the Player Hero around the arena |
| **`[1]` / `[2]`** | Damage ($-15\%$) or Heal ($+15\%$) the AI Commander |
| **`[3]` / `[4]`** | Remove or Add Allied Squad Drones ($0\text{–}4$) |
| **`[E]`** | Toggle Player **Overcharge Aura** (spikes `EnemyThreat`) |
| **`[M]`** | Toggle Defuzzification method between **`MaxAv`** and **`Centroid`** |

