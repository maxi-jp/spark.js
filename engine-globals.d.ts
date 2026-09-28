/**
 * Engine global variable and Input namespace type declarations.
 * This file is NOT loaded at runtime — it exists only for IDE IntelliSense.
 * Auto-included by VS Code because it sits at the project root.
 */

// ── Globals set by main.js ───────────────────────────────────────────────────

/** The active Renderer (Canvas2DRenderer or WebGLRenderer). Set at startup. */
declare var renderer: Renderer;
/** The active Game instance. Set at startup. */
declare var game: Game;
/** The global AudioPlayer instance. */
declare var audioPlayer: AudioPlayer;
/** Total elapsed seconds since game start. */
declare var totalTime: number;
/** True on touch-primary devices (phone/tablet). */
declare var mobileWithTouchScreen: boolean;
/** The game canvas element. */
declare var canvas: HTMLCanvasElement;
/** When true, shows the FPS/stats overlay. */
declare var drawStats: boolean;
/** When true, enables debug rendering. */
declare var debugMode: boolean;

/** Bootstraps the engine and starts the game. Call inside `window.onload`. */
declare function Init(gameClass: new (renderer: Renderer) => Game): void;

// ── Core value types (utils_math.js) ───────────────────────────────────────────

/**
 * 2D vector. x and y are mutable directly; mutating methods return `this` for chaining.
 * @example
 * const dir = Vector2.Copy(target.position);
 * dir.Sub(this.position);
 * dir.Normalize();
 * this.position.x += dir.x * speed * dt;
 */
declare class Vector2 {
    x: number;
    y: number;
    constructor(x: number, y: number);

    // Static factories
    static Zero(): Vector2;
    static Copy(v: Vector2): Vector2;
    static Random(): Vector2;

    // Static math
    /** Euclidean distance between two points (accepts any {x,y} object). */
    static Magnitude(v1: {x:number, y:number}, v2: {x:number, y:number}): number;
    /** Squared distance — faster than Magnitude when only comparing distances. */
    static SqrMagnitude(v1: {x:number, y:number}, v2: {x:number, y:number}): number;
    static Lerp(v1: Vector2, v2: Vector2, t: number): Vector2;

    // Instance methods (mutate in-place, return this for chaining where noted)
    Set(x: number, y: number): void;
    Length(): number;
    SqrLength(): number;
    IsZero(): boolean;
    /** Normalizes to unit length in-place. Returns this. */
    Normalize(): this;
    /** Adds other in-place. */
    Add(other: Vector2): void;
    /** Subtracts other in-place. */
    Sub(other: Vector2): void;
    /** Multiplies both components by scalar in-place. Returns this. */
    MultiplyScalar(scalar: number): this;
    DotProduct(other: Vector2): number;
    /** Angle of this vector in radians from the positive X axis. */
    Angle(): number;
    Interpolate(other: Vector2, t: number): void;
    Randomize(): void;
    RandomNormalized(): void;
}

/**
 * RGBA colour with components in the 0–1 range.
 * Use Color.FromRGB() for 0–255 inputs.
 * @example
 * new Color(1, 0, 0)          // red
 * Color.FromRGB(255, 128, 0)  // orange
 * Color.lime                  // static preset
 */
declare class Color {
    r: number; g: number; b: number; a: number;
    constructor(r: number, g: number, b: number, a?: number);
    static FromRGB(r: number, g: number, b: number, a?: number): Color;
    static Copy(c: Color): Color;

    // Named presets
    static black: Color;  static white: Color;  static red: Color;
    static green: Color;  static lime: Color;   static blue: Color;
    static cyan: Color;   static aqua: Color;   static yellow: Color;
    static orange: Color; static pink: Color;   static purple: Color;
    static grey: Color;   static transparent: Color;
}

/** Axis-aligned rectangle. Top-left origin. */
declare class Rect {
    x: number; y: number; w: number; h: number;
    width: number; height: number;
    halfWidth: number; halfHeight: number;
    constructor(x: number, y: number, width: number, height: number);
}

// ── Free utility functions (utils_math.js) ─────────────────────────────────────

/** Clamps value to [min, max]. */
declare function Clamp(value: number, min: number, max: number): number;
/** Linear interpolation between start and end. */
declare function Lerp(start: number, end: number, t: number): number;
/** Linearly interpolates an angle, always taking the shortest arc. */
declare function LerpRotation(current: number, target: number, t: number): number;
/** Steps current toward target by at most `speed` radians, shortest arc. */
declare function SmoothRotation(current: number, target: number, speed: number): number;
/** Normalizes an angle to (-π, π]. */
declare function NormalizeAngle(angle: number): number;
/** Random integer in [min, max] inclusive. */
declare function RandomBetweenInt(min: number, max: number): number;
/** Random float in [min, max). */
declare function RandomBetweenFloat(min: number, max: number): number;
/** Magnitude of a 2D vector given its components. */
declare function Length(x: number, y: number): number;
/** Squared magnitude (avoids sqrt — use for comparisons). */
declare function SqrLength(dx: number, dy: number): number;
/** Squared distance between two points (scalar inputs). */
declare function DistanceSquaredPointToPoint(p1x: number, p1y: number, p2x: number, p2y: number): number;

// ── Input namespace ──────────────────────────────────────────────────────────

declare namespace Input {
    // Keyboard
    /** True on the single frame the key was first pressed. */
    function IsKeyDown(keycode: number): boolean;
    /** True on the single frame the key was released. */
    function IsKeyUp(keycode: number): boolean;
    /** True every frame the key is held down. */
    function IsKeyPressed(keycode: number): boolean;

    // Mouse
    /** True every frame the mouse button is held. 0=left, 1=right, 2=middle. */
    function IsMousePressed(button?: 0 | 1 | 2): boolean;
    /** True on the single frame the mouse button was first pressed. */
    function IsMouseDown(button?: 0 | 1 | 2): boolean;
    /** True on the single frame the mouse button was released. */
    function IsMouseUp(button?: 0 | 1 | 2): boolean;
    /** Returns the current mouse position in canvas space. */
    function GetMousePosition(): { x: number; y: number };

    // Abstract actions
    function RegisterAction(name: string, bindings: object[]): void;
    function UnregisterAction(name: string): void;
    /** True every frame the action binding is held. */
    function GetAction(name: string): boolean;
    /** True on the single frame the action binding was first triggered. */
    function GetActionDown(name: string): boolean;
    /** True on the single frame the action binding was released. */
    function GetActionUp(name: string): boolean;

    // Abstract axes — returns −1…1
    function RegisterAxis(name: string, bindings: object[]): void;
    function UnregisterAxis(name: string): void;
    function GetAxis(name: string): number;

    // Gamepad
    function GetGamepad(index: number): Gamepad | null;
    function IsGamepadButtonDown(gamepadIndex: number, button: string): boolean;
    function IsAnyGamepadButtonDown(): boolean;
    function IsAnyGamepadFaceButtonDown(): boolean;

    // Rumble
    function RegisterRumble(name: string, strong?: number, weak?: number, duration?: number, delay?: number): void;
    function UnregisterRumble(name: string): void;
    function ExecuteRumble(id: string, gamepadIndex?: number): void;

    // Virtual controls
    function RegisterVirtualJoystick(id: string, x: number, y: number, radius: number): void;
    function RemoveVirtualJoystick(id: string): void;
    function RegisterVirtualDPad(id: string, x: number, y: number, size: number): void;

    // Convenience
    /** True if any keyboard key, mouse button, touch, or gamepad button was triggered this frame. */
    function Anything(): boolean;
}

// ── Collider classes ─────────────────────────────────────────────────────────

/**
 * Base collider class for non-physics collision detection.
 * Register with game.AddCollider(collider) to participate in collision detection.
 */
declare class Collider {
    /** Unique collider ID assigned by the engine. */
    id: number;
    /** World position of the collider. */
    position: Vector2;
    /** Bounding radius for broad-phase collision detection. */
    boundingRadius: number;
    /** True if this collider is currently overlapping another. */
    isColliding: boolean;
    /** When false, this collider is skipped in collision detection and click events. */
    enabled: boolean;
    /** The GameObject this collider is attached to (if any). */
    go: GameObject | null;
    /** Callback fired when collision starts. */
    onCollisionEnterCallback: ((otherCollider: Collider) => void) | null;
    /** Callback fired when collision ends. */
    onCollisionExitCallback: ((otherCollider: Collider) => void) | null;
    /** Callback fired when the collider is clicked. */
    onClickCallback: (() => void) | null;

    /** Update collider position to match attached GameObject. */
    UpdateFromGO(): void;
    /** Update collider position manually. */
    UpdatePosition(newPosition: Vector2): void;
    /** Check if a point is inside this collider. */
    IsPointInside(x: number, y: number): boolean;
}

/** Axis-aligned rectangular collider. Position is the center. */
declare class RectangleCollider extends Collider {
    rect: Rect;
    width: number;
    height: number;
    constructor(position: Vector2, width: number, height: number, gameObject?: GameObject);
}

/** Circular collider. */
declare class CircleCollider extends Collider {
    radius: number;
    constructor(position: Vector2, radius: number, gameObject?: GameObject);
}

/** Convex polygon collider with rotation support. */
declare class PolygonCollider extends Collider {
    rotation: number;
    points: {x: number, y: number}[];
    transformedPoints: Vector2[];
    constructor(position: Vector2, rotation: number, points: {x: number, y: number}[], gameObject?: GameObject);
    UpdatePositionAndRotation(newPosition: Vector2, newRotation: number): void;
}

// ── Timer class ──────────────────────────────────────────────────────────────

/**
 * Represents a game timer. Created via game.Invoke() or gameObject.Invoke().
 * Timers run on game time and are automatically paused when the game loses focus.
 */
declare class Timer {
    /** Unique timer ID. */
    id: number;
    /** The callback function to execute. */
    callback: Function;
    /** Delay or interval in seconds. */
    delay: number;
    /** Interval for repeating timers (0 for one-shot). */
    interval: number;
    /** Time elapsed since last execution. */
    elapsed: number;
    /** Whether this timer repeats. */
    repeating: boolean;
    /** GameObject that owns this timer (if any). */
    owner: GameObject | null;
    /** Whether this timer is active. */
    active: boolean;
    
    /** Cancels this timer. */
    Cancel(): void;
}

// ── Renderer class ───────────────────────────────────────────────────────────

/**
 * Base renderer class. Canvas2DRenderer and WebGLRenderer share this API.
 * Available globally as `renderer` and within Game as `this.renderer`.
 */
declare class Renderer {
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
    halfWidth: number;
    halfHeight: number;
    imageSmoothingEnabled: boolean;
    fillScreen: boolean;
    fillScreenMatchNativeResolution: boolean;
    fillScreenUseDevicePixelRatio: boolean;
    fillScreenPreserveAspectRatio: boolean;

    // Core methods
    Clear(): void;
    SetScreenSize(width: number, height: number): void;
    SetCanvasFillWindow(matchNativeResolution?: boolean, useDevicePixelRatio?: boolean, preserveAspectRatio?: boolean): void;
    RestoreCanvasOriginalSize(): void;

    // Camera
    ApplyCameraTransform(camera: any): void;
    RestoreCameraTransform(): void;

    // Primitives
    DrawLine(x1: number, y1: number, x2: number, y2: number, color?: Color, lineWidth?: number): void;
    DrawPolygon(points: {x: number, y: number}[], strokeColor?: Color, lineWidth?: number, fill?: boolean, fillColor?: Color): void;
    
    // Rectangles
    DrawRectangle(x: number, y: number, w: number, h: number, color?: Color, stroke?: boolean, lineWidth?: number, rot?: number, pivot?: {x: number, y: number}): void;
    DrawStrokeRectangle(x: number, y: number, w: number, h: number, color?: Color, lineWidth?: number, rot?: number, pivot?: {x: number, y: number}): void;
    DrawFillRectangle(x: number, y: number, w: number, h: number, color?: Color, rot?: number, pivot?: {x: number, y: number}): void;
    DrawBasicRectangle(x: number, y: number, w: number, h: number, color?: Color, stroke?: boolean, lineWidth?: number): void;
    DrawStrokeBasicRectangle(x: number, y: number, w: number, h: number, color?: Color, lineWidth?: number): void;
    DrawFillBasicRectangle(x: number, y: number, w: number, h: number, color?: Color): void;

    // Circles
    DrawCircle(x: number, y: number, radius: number, color?: Color, stroke?: boolean, lineWidth?: number): void;
    DrawFillCircle(x: number, y: number, radius: number, color?: Color): void;
    DrawStrokeCircle(x: number, y: number, radius: number, color?: Color, lineWidth?: number): void;
    
    // Text
    DrawText(text: string, x: number, y: number, font: string, color?: Color, align?: "left" | "center" | "right", baseline?: "top" | "middle" | "alphabetic" | "bottom", stroke?: boolean, lineWidth?: number): void;
    DrawFillText(text: string, x: number, y: number, font: string, color?: Color, align?: "left" | "center" | "right", baseline?: "top" | "middle" | "alphabetic" | "bottom"): void;
    DrawStrokeText(text: string, x: number, y: number, font: string, color?: Color, align?: "left" | "center" | "right", baseline?: "top" | "middle" | "alphabetic" | "bottom", lineWidth?: number): void;
    
    // Images
    DrawImage(img: HTMLImageElement, x: number, y: number, scaleX: number, scaleY: number, rot?: number, pivot?: {x: number, y: number}, alpha?: number): void;
    DrawImageBasic(img: HTMLImageElement, x: number, y: number, w?: number, h?: number, alpha?: number): void;
    DrawImageSection(img: HTMLImageElement, x: number, y: number, sx: number, sy: number, sw: number, sh: number, scaleX: number, scaleY: number, rot?: number, pivot?: {x: number, y: number}, alpha?: number): void;
    DrawImageSectionBasic(img: HTMLImageElement, x: number, y: number, sx: number, sy: number, sw: number, sh: number, scaleX: number, scaleY: number, alpha?: number): void;
    
    // Other
    DrawGradientRectangle(x: number, y: number, w: number, h: number, gradient: any): void;
}

// ── TiledLoader utility ──────────────────────────────────────────────────────

/**
 * Utility for loading and parsing Tiled Map Editor JSON exports.
 * Converts Tiled JSON format into engine-compatible Tileset data structures.
 * Requires tilesets to be embedded in the JSON export (check "Embed tilesets" when exporting from Tiled).
 */
declare class TiledLoader {
    // Parse a Tiled JSON map and convert it to engine format.
    static Parse(tiledJSON: any, graphicAssets: {[key: string]: {path: string, img: HTMLImageElement | null}}): any;
    
    // Load a Tiled JSON file asynchronously.
    static LoadJSON(url: string): Promise<any>;
    
    // Create Tileset game objects from parsed map data.
    static CreateTilesets(mapData: any, position: Vector2, scale?: number): Tileset[];
    
    // Get all object layers from the Tiled JSON.
    static GetObjectLayers(tiledJSON: any): any[];
    
    // Get objects from a specific layer by name.
    static GetObjectsByName(tiledJSON: any, name: string, layerName?: string): any[];
    
    // Get objects from a specific layer by type.
    static GetObjectsByType(tiledJSON: any, type: string, layerName?: string): any[];
    
    // Create SpriteObject instances from animated objects in object layers.
    static CreateSpriteObjects(tiledJSON: any, mapData: any, position: Vector2, scale?: number, layerName?: string): SpriteObject[];
    
    // Create a GameObjectsBackgroundLayer from an object layer with parallax support.
    static CreateGameObjectsBackgroundLayer(tiledJSON: any, mapData: any, layerName: string, position?: Vector2, scale?: number): GameObjectsBackgroundLayer;
}

// ── AStarPathfinder (ai.js) ──────────────────────────────────────────────────

/** Heuristic function signature: (col, row, endCol, endRow) → estimated cost. */
type HeuristicFn = (col: number, row: number, ec: number, er: number) => number;

/**
 * Duck-typed grid interface required by AStarPathfinder.
 * Any object implementing these members can be used as a pathfinding grid.
 */
interface PathfinderGrid {
    width: number;
    height: number;
    IsWalkable(col: number, row: number): boolean;
    IsInBounds(col: number, row: number): boolean;
    WorldToGrid(pos: Vector2): { col: number; row: number };
    GridToWorld(col: number, row: number): Vector2;
}

/**
 * General-purpose A* pathfinder. Load `src/engine/ai.js` to use it.
 *
 * @example
 * const pathfinder = new AStarPathfinder(gridMap);
 * const waypoints  = pathfinder.FindPath(unit.position, targetPos); // Vector2[]
 */
declare class AStarPathfinder {
    grid: PathfinderGrid;
    allowDiagonals: boolean;
    maxIterations: number;
    smoothPath: boolean;
    heuristic: HeuristicFn;

    /**
     * @param grid - Any object satisfying the PathfinderGrid interface.
     * @param options.allowDiagonals - Enable 8-directional movement (default: true).
     * @param options.maxIterations  - Safety cap to avoid runaway searches (default: 20000).
     * @param options.smoothPath     - Apply line-of-sight waypoint reduction (default: true).
     * @param options.heuristic      - Override the distance function. Auto-selects Octile (8-dir) or Manhattan (4-dir).
     */
    constructor(grid: PathfinderGrid, options?: {
        allowDiagonals?: boolean;
        maxIterations?: number;
        smoothPath?: boolean;
        heuristic?: HeuristicFn;
    });

    /** Find a world-space path. Returns [] if the start cell is fully isolated. */
    FindPath(startWorld: Vector2, endWorld: Vector2): Vector2[];

    /** Find a path in grid coordinates. Returns [] if unreachable. */
    FindPathGrid(sc: number, sr: number, ec: number, er: number): { col: number; row: number }[];

    /** Named heuristic presets. */
    static Heuristic: {
        /** Optimal for 4-directional grids. */
        Manhattan: HeuristicFn;
        /** Optimal for 8-directional grids with diagonal cost √2 (default). */
        Octile: HeuristicFn;
        /** Admissible for any movement cost model. */
        Euclidean: HeuristicFn;
    };
}

// ── FSM / HFSM (fsm.js) ──────────────────────────────────────────────────────

/**
 * Base class for all FSM states. Extend and override Enter(), Update(), Exit().
 * Register declarative transition guards with AddTransition() — they are evaluated
 * before Update() each frame (Millington & Funge "AI for Games" model).
 *
 * @example
 * class ChaseState extends FSMState {
 *   Enter(owner, prev)     { owner.speed = owner.chaseSpeed; }
 *   Update(dt, owner, fsm) { if (!owner.target) fsm.Transition('idle'); }
 *   Exit(owner, next)      { }
 * }
 */
declare class FSMState {
    /** @internal */
    _transitions: Array<{ target: string; condition: (owner: any) => boolean }>;

    /**
     * Register a declarative transition guard.
     * Checked each frame before Update(); first match fires the transition and skips Update().
     * @param targetStateName  Name of the target state.
     * @param condition        Returns true to trigger the transition.
     */
    AddTransition(targetStateName: string, condition: (owner: any) => boolean): this;

    /** Called once when entering this state. */
    Enter(owner: any, prevStateName: string | null): void;
    /** Called every frame while this state is active. */
    Update(dt: number, owner: any, fsm: FSM): void;
    /** Called once when exiting this state. */
    Exit(owner: any, nextStateName: string | null): void;
}

/**
 * A Finite State Machine.
 *
 * @example
 * this.fsm = new FSM(this, 'idle')
 *   .AddState('idle',  new IdleState())
 *   .AddState('chase', new ChaseState())
 *   .Start();
 *
 * // In Update():  this.fsm.Update(dt);
 * // In Draw():    this.fsm.DrawDebug(renderer, x, y - 20);
 */
declare class FSM {
    /** Name of the currently active state. */
    readonly currentStateName: string | null;
    /** Name of the previously active state. */
    readonly previousStateName: string | null;
    /** The active FSMState object. */
    readonly currentState: FSMState | null;

    /**
     * @param owner        Object passed as the first arg to all state callbacks.
     * @param initialState Name of the state to enter when Start() is called.
     */
    constructor(owner: any, initialState: string);

    /** Register a state. Returns this for chaining. */
    AddState(name: string, state: FSMState): this;
    /** Activate the FSM and enter the initial state. Returns this for chaining. */
    Start(): this;
    /** Deactivate the FSM, cleanly exiting the current state. */
    Stop(): void;

    /**
     * Request a transition to another state.
     * If called from within Update(), applied after Update() returns.
     */
    Transition(name: string): void;

    /**
     * Tick the FSM. Call from the owner's Update() every frame.
     * Declarative guards are evaluated first; if one fires, Update() is skipped.
     */
    Update(dt: number): void;

    /**
     * Draw the current state name near a world-space position.
     * Only renders when the global `debugMode` is true.
     */
    DrawDebug(renderer: Renderer, x: number, y: number, color?: Color): void;
}

/**
 * A state that wraps a nested FSM, enabling Hierarchical FSMs (HFSM).
 * Extend this and assign a configured FSM to `this.subFSM` in the constructor.
 * The sub-FSM is started on Enter(), ticked on Update(), and stopped on Exit().
 *
 * @example
 * class CombatState extends FSMCompositeState {
 *   constructor(owner: any) {
 *     super();
 *     this.subFSM = new FSM(owner, 'approach')
 *       .AddState('approach', new ApproachState())
 *       .AddState('attack',   new AttackState());
 *   }
 *   Enter(owner, prev) { super.Enter(owner, prev); }
 * }
 */
declare class FSMCompositeState extends FSMState {
    /** The nested FSM. Assign in the subclass constructor. */
    subFSM: FSM | null;
    constructor();
}
