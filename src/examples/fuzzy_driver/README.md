# Fuzzy Logic Demo 2 — Autonomous Steering & Obstacle Avoidance

**[▶ Run Live Demo](../../fuzzy-driver.html)**

This example demonstrates **continuous control systems** in games using Fuzzy Logic, contrasting a **Fuzzy AI Cruiser (Cyan)** directly against a **Crisp Threshold AI Car (Orange)** on the same circuit track.

---

## Why Crisp Controllers Oscillate ("Bang-Bang" Control)

When steering is implemented with crisp `if/else` conditions (e.g., `if (angle < -7) steer = -75; else if (angle > 7) steer = +75;`), the vehicle snaps abruptly between hard left, straight, and hard right across the threshold boundary, producing unnatural fishtailing along straightaways and corners.

By partitioning **`TargetAngle`** ($-90^\circ \dots +90^\circ$) and **`ObstacleBias`** ($-100 \dots +100$) into overlapping fuzzy sets (`HardL`, `SlightL`, `Ahead`, `SlightR`, `HardR`), multiple rules fire simultaneously with partial Degrees of Membership and blend smoothly during defuzzification into proportional **`Steering`** and **`Throttle`** commands.

---

## Interactive Controls

| Input | Action |
|---|---|
| **Left-Click / Drag on Track** | Reposition the red Hazard Pylon in front of the cars to test live obstacle avoidance |
| **`[C]`** | Toggle the orange **Crisp Comparison Car** on/off |
| **`[F]`** | Toggle forward sensor feeler rays and waypoint indicators |
| **`[M]`** | Toggle Defuzzification method between **`MaxAv`** and **`Centroid`** |

