# Behavior Tree Demo — Multiphase Arena Boss AI

**Entry point:** [`bt-boss.html`](../../../bt-boss.html)  
**Engine module:** [`src/engine/bt.js`](../../engine/bt.js)  
**Full API reference:** [`docs/ai.md`](../../../docs/ai.md#behavior-trees-btjs)

---

## What this example demonstrates

The player battles the **Titan Mech**, a multi-phase arena boss driven entirely by a reactive Behavior Tree. As the boss loses health, the Behavior Tree dynamically switches combat phases, unlocks new abilities, and alters movement patterns.

| Concept | Where to look |
|---|---|
| **Reactive Phase Transitions** | `BTReactiveSelector('TitanBossAI')` in `bt_boss.js` |
| **Ability Throttling & Cadence (`BTCooldown`)** | Decorators wrapping powerful special attacks (Slam, Laser Sweep, Charge Lunge) |
| **Telegraph Anticipation & Windups (`BTWait`)** | Multi-step combos: Telegraph warning → `BTWait` (windup) → Execute strike → `BTWait` (recovery) |
| **Fallback Movement Routines** | When all special cooldowns are active, the `BTSelector` falls back to approach, strafe, or chase |
| **Live Visual Tree Inspector (`DrawTreeInspector`)** | Real-time hierarchical HUD displaying live node states (`SUCCESS`, `FAILURE`, `RUNNING`, `IDLE`) and active cooldowns |

---

## Controls

| Input | Action |
|---|---|
| **W, A, S, D** or **Arrow Keys** | Move Hero |
| **Mouse Aim + Left Click / Space** | Aim & fire blaster bolts at the Boss |
| **[1] / [2] / [3]** | Instant Phase Jump keys (set Boss HP to 900, 500, or 220 to test phases directly) |
| **[R]** | Reset the boss battle |
| **[T]** | Toggle the live Behavior Tree Inspector panel on/off |

---

## The Boss Behavior Tree Hierarchy

```
BTReactiveSelector: TitanBossAI
├── 1. BTSequence: Phase3_Berserk (HP ≤ 30% / 300 HP)
│   ├── BTCondition: IsPhase3
│   └── BTSelector: BerserkBranch
│       ├── BTCooldown (3.2s) → BTSequence: GroundSlamCombo
│       │   ├── BTAction: TelegraphSlam (red warning zone)
│       │   ├── BTWait: SlamWindup (0.9s)
│       │   ├── BTAction: ReleaseShockwave (expanding blast ring)
│       │   └── BTWait: SlamRecovery (0.4s)
│       ├── BTCooldown (2.2s) → BTSequence: FrenzyBarrage
│       │   ├── BTAction: RadialBurst1 (8 projectiles)
│       │   ├── BTWait: BurstGap (0.35s)
│       │   └── BTAction: RadialBurst2 (10 projectiles)
│       └── BTAction: BerserkChase (high-speed pursuit)
│
├── 2. BTSequence: Phase2_Overdrive (30% < HP ≤ 65% / 650 HP)
│   ├── BTCondition: IsPhase2
│   └── BTSelector: OverdriveBranch
│       ├── BTCooldown (5.0s) → BTSequence: LaserSweepAttack
│       │   ├── BTAction: TelegraphLaser (aim line)
│       │   ├── BTWait: LaserWindup (0.8s)
│       │   └── BTAction: ChannelLaserSweep (sweeps plasma beam across 100°)
│       ├── BTCooldown (2.8s) → BTSequence: SpreadMissiles
│       │   ├── BTAction: FireSpread (5-shot spread)
│       │   └── BTWait: SpreadCooldown (0.5s)
│       └── BTAction: OverdriveStrafe (circles player)
│
└── 3. BTSequence: Phase1_Guardian (HP > 65% / > 650 HP)
    └── BTSelector: GuardianBranch
        ├── BTCooldown (4.2s) → BTSequence: ChargeLungeAttack
        │   ├── BTAction: TelegraphCharge (dash line)
        │   ├── BTWait: ChargeWindup (0.85s)
        │   ├── BTAction: ExecuteLunge (high-speed forward dash)
        │   └── BTWait: PostLungeStun (0.6s)
        ├── BTCooldown (2.2s) → BTSequence: PlasmaBolt
        │   ├── BTAction: FireBolt
        │   └── BTWait: BoltDelay (0.35s)
        └── BTAction: GuardianApproach (slowly tracks player)
```

---

## Key Educational Concept: `BTCooldown` & Attack Selectors

In action games, bosses must not spam their strongest abilities repeatedly:
1. **How `BTCooldown` works**:
   - `BTCooldown` is a **Decorator** that wraps an attack sequence.
   - When the attack finishes, `BTCooldown` starts an internal timer for $N$ seconds.
   - While on cooldown, it immediately returns `FAILURE` without ticking the attack sequence.
2. **Fallback Logic in `BTSelector`**:
   - Because the child returns `FAILURE`, the parent `BTSelector` automatically tries the next ability in priority order.
   - If all special abilities are currently on cooldown, the selector smoothly falls through to the bottom leaf (e.g. `GuardianApproach`, `OverdriveStrafe`, or `BerserkChase`).
   - As soon as the cooldown timer expires, the higher-priority ability becomes available again on the very next tick!
