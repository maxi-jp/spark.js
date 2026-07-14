// Box2D lib shortcuts
var b2Vec2 = Box2D.Common.Math.b2Vec2
    ,   b2AABB = Box2D.Collision.b2AABB
    ,   b2BodyDef = Box2D.Dynamics.b2BodyDef
    ,   b2Body = Box2D.Dynamics.b2Body
    ,   b2FixtureDef = Box2D.Dynamics.b2FixtureDef
    ,   b2Fixture = Box2D.Dynamics.b2Fixture
    ,   b2World = Box2D.Dynamics.b2World
    ,   b2Shape = Box2D.Collision.Shapes.b2Shape
    ,   b2WorldManifold = Box2D.Collision.b2WorldManifold
    ,   b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
    ,   b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
    ,   b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
    ,   b2EdgeShape = Box2D.Collision.Shapes.b2EdgeShape
    ,   b2DebugDraw = Box2D.Dynamics.b2DebugDraw
    ,   b2MouseJointDef =  Box2D.Dynamics.Joints.b2MouseJointDef
    ,   b2RevoluteJointDef = Box2D.Dynamics.Joints.b2RevoluteJointDef
    ,   b2Joint = Box2D.Dynamics.Joints.b2Joint
    ,   b2PrismaticJointDef = Box2D.Dynamics.Joints.b2PrismaticJointDef
    ,   b2DistanceJointDef = Box2D.Dynamics.Joints.b2DistanceJointDef
    ,   b2PulleyJointDef = Box2D.Dynamics.Joints.b2PulleyJointDef
    ,   b2GearJointDef = Box2D.Dynamics.Joints.b2GearJointDef
    ;

const PhysicsObjectType = {
    Box: 0,
    Circle: 1,
    Edge: 2
}

var webglDebugDraw = null;

function AsignDefaultValues(options) {
    // default values
    let defaultOptions = {
        density : 1.0,
        friction: 1.0,
        restitution : 0.5,
        isSensor: false,
 
        linearDamping : 0.0,
        angularDamping: 0.1,
        fixedRotation : false,
 
        type : b2Body.b2_dynamicBody
    }
    return Object.assign(defaultOptions, options);
}

function CreateFixtureDefinition(options) {
    // Fixture: defines physics properties (density, friction, restitution)
    const fixtDef = new b2FixtureDef();

    fixtDef.density = options.density;
    fixtDef.friction = options.friction;
    fixtDef.restitution = options.restitution;
    fixtDef.isSensor = options.isSensor;

    return fixtDef;
}

function CreateBodyDefinition(options, x, y) {
    // Body: linear & angular damping, type, userData & other flags
    const bodyDef = new b2BodyDef();
    bodyDef.position.Set(x, y);

    bodyDef.linearDamping = options.linearDamping;
    bodyDef.angularDamping = options.angularDamping;

    bodyDef.fixedRotation = options.fixedRotation;
    bodyDef.type = options.type;
    bodyDef.userData = options.userData;

    return bodyDef;
}

function CreateBody(world, options, x, y, fixDef) {
    // Body: position of the object and its type (dynamic, static o kinetic)
    const bodyDef = CreateBodyDefinition(options, x, y);
    const body = world.CreateBody(bodyDef);
    body.CreateFixture(fixDef);

    return body;
}

function CreateBox(world, x, y, options) {
    options = AsignDefaultValues(options);

    // fixture
    const fixtDef = CreateFixtureDefinition(options);

    // set the box shape
    fixtDef.shape = new b2PolygonShape();
    if (options.offset) {
        fixtDef.shape.SetAsOrientedBox(options.width / 2, options.height / 2, new b2Vec2(options.offset.x, options.offset.y));
    }        
    else {
        fixtDef.shape.SetAsBox(options.width / 2, options.height / 2);
    }        
        

    const body = CreateBody(world, options, x, y, fixtDef);

    return body;
}

function CreateCircle(world, x, y, options) {
    options = AsignDefaultValues(options);

    // fixture
    const fixtDef = CreateFixtureDefinition(options);

    // set the box shape
    fixtDef.shape = new b2CircleShape(options.radius);
    
    if (options.offset) {
        fixtDef.shape.SetLocalPosition(new b2Vec2(options.offset.x, options.offset.y));
    }

    const body = CreateBody(world, options, x, y, fixtDef);

    return body;
}

function CreateEdge(world, x, y, options) {
    options = AsignDefaultValues(options);

    // fixture
    const fixtDef = CreateFixtureDefinition(options);

    // Shape: 2d geometry
    // fixtDef.shape = new b2EdgeShape(new b2Vec2(options.p1x, options.p1y), new b2Vec2(options.p2x, options.p2y));
    // b2EdgeShape is not fully implemented in the current state of the box2d library, use b2PolygonShape instead
    fixtDef.shape = new b2PolygonShape();
    fixtDef.shape.SetAsEdge(new b2Vec2(options.p1x, options.p1y), new b2Vec2(options.p2x, options.p2y));

    const body = CreateBody(world, options, x, y, fixtDef);

    return body;
}

function CreatePolygon(world, x, y, options) {
    options = AsignDefaultValues(options);

    // fixture
    const fixtDef = CreateFixtureDefinition(options);

    // Shape: 2d geometry
    fixtDef.shape = new b2PolygonShape();

    // The vertices should be counterclockwise to work
    const verts = options.vertices.map(v => new b2Vec2(v.x, v.y));

    fixtDef.shape.SetAsArray(verts, verts.length);

    const body = CreateBody(world, options, x, y, fixtDef);

    return body;
}

function CreatePhysicsObject(world, type, x, y, options) {
    switch (type) {
        case PhysicsObjectType.Box:
            return CreateBox(world, x, y, options);
        case PhysicsObjectType.Circle:
            return CreateCircle(world, x, y, options);
        case PhysicsObjectType.Edge:
            return CreateEdge(world, x, y, options);
        default:
            console.error("Unknown physics object type: " + type);
            return null;
    }
}

function RemoveBody(world, body) {
    world.DestroyBody(body);
}

// Create a Box2D world object
function CreateBox2DWorld(renderer, gravity, doSleep, scale) {
    const grav = new b2Vec2(gravity.x, gravity.y);
    const world = new b2World(grav, doSleep);
    world.scale = scale;

    if (renderer.ctx) {
        let debugDraw = new b2DebugDraw();
        debugDraw.SetSprite(renderer.ctx);
        debugDraw.SetDrawScale(scale);
        debugDraw.SetFillAlpha(0.5);
        debugDraw.SetLineThickness(1.0);
        debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);

        world.SetDebugDraw(debugDraw);
    }
    else if (renderer instanceof WebGLRenderer) {
        webglDebugDraw = new WebGLDebugDraw(renderer, world);
    }

    // prepare the collision event function
    Box2D.Dynamics.b2ContactListener.prototype.BeginContact = OnContactDetected;
    Box2D.Dynamics.b2ContactListener.prototype.EndContact = OnEndContactDetected;

    return world;
}

function DrawWorldDebug(renderer, world) {
    if (renderer.ctx) {
        const ctx = renderer.ctx;

        ctx.save();
        ctx.translate(0, canvas.height);
        ctx.scale(1, -1);
        world.DrawDebugData();
        ctx.restore();
    }
    else if (renderer instanceof WebGLRenderer) {
        webglDebugDraw.DrawDebugData();
    }
}

function OnContactDetected(contact) {
    const userDataA = contact.GetFixtureA().GetBody().GetUserData();
    const userDataB = contact.GetFixtureB().GetBody().GetUserData();

    // console.log("collision between " + userDataA + " and " + userDataB);
    // Extract the contact points in world space
    const worldManifold = new b2WorldManifold();
    contact.GetWorldManifold(worldManifold);
    const contactPoint = worldManifold.m_points[0];

    if (userDataA?.OnContactDetectedBox2D) {
        userDataA.OnContactDetectedBox2D(userDataB, contactPoint);
    }
    if (userDataB?.OnContactDetectedBox2D) {
        userDataB.OnContactDetectedBox2D(userDataA, contactPoint);
    }
}

function OnEndContactDetected(contact) {
    const userDataA = contact.GetFixtureA().GetBody().GetUserData();
    const userDataB = contact.GetFixtureB().GetBody().GetUserData();

    if (userDataA?.OnEndContactDetectedBox2D) {
        userDataA.OnEndContactDetectedBox2D(userDataB);
    }
    if (userDataB?.OnEndContactDetectedBox2D) {
        userDataB.OnEndContactDetectedBox2D(userDataA);
    }
}

function CanvasToBox2DPosition(canvas, canvasPos, scale) {
    return new b2Vec2(canvasPos.x / scale, (canvas.height - canvasPos.y) / scale);
}

function Box2DToCanvasPosition(canvas, box2DPos, scale) {
    return new Vector2(box2DPos.x * scale, canvas.height - (box2DPos.y * scale));
}

// WebGLDebugDraw: Implements Box2D debug draw using WebGLRenderer
class WebGLDebugDraw {
    constructor(renderer, world) {
        this.renderer = renderer;
        this.world = world;
        this.scale = world.scale;

        this.color = new Color(0.5, 0.9, 0.5, 0.5); // Default debug color
        this.sensorColor = new Color(1, 1, 0, 1); // Sensor color

        this.inactiveColor = new Color(0.6, 0.6, 0.6, 0.5);

        this.staticColor = new Color(0.5, 0.9, 0.5, 0.5);
        this.kinematicColor = new Color(0.5, 0.5, 0.9, 0.5);
        this.dynamicColor = new Color(0.9, 0.7, 0.7, 0.5);

        this.otherColor = new Color(0.2, 0.2, 0.2, 0.75);

        this.colors = [this.staticColor, this.kinematicColor, this.dynamicColor]
    }

    DrawDebugData() {
        for (let body = this.world.GetBodyList(); body; body = body.GetNext()) {
            const transform = body.GetTransform();
            for (let fixture = body.GetFixtureList(); fixture; fixture = fixture.GetNext()) {
                const shape = fixture.GetShape();
                const type = body.GetType();

                let color = this.colors[type];
                if (type == b2Body.b2_dynamicBody && !body.IsAwake())
                    color = this.inactiveColor;

                if (shape instanceof b2PolygonShape) {
                    const vertexCount = shape.GetVertexCount();
                    const vertices = [];

                    for (let i = 0; i < vertexCount; i++) {
                        const v = shape.GetVertices()[i];
                        // Transform to world coordinates
                        const worldV = body.GetWorldPoint(v);
                        vertices.push({ x: worldV.x * this.scale, y: canvas.height - worldV.y * this.scale });
                    }

                    if (fixture.IsSensor()) {
                        this.renderer.DrawPolygon(vertices, this.sensorColor, 1, false, this.sensorColor);
                    }
                    else {
                        this.renderer.DrawPolygon(vertices, color, 1, true, color);
                    }
                }
                else if (shape instanceof b2CircleShape) {
                    const center = body.GetWorldPoint(shape.GetLocalPosition());
                    const radius = shape.GetRadius();
                    if (fixture.IsSensor()) {
                        this.renderer.DrawCircle(center.x * this.scale, center.y * this.scale, radius * this.scale, color, true, 1);
                    }
                    else {
                        this.renderer.DrawCircle(center.x * this.scale, canvas.height - center.y * this.scale, radius * this.scale, color, false, 1);
                        
                        const axis = { x: transform.R.col1.x, y: transform.R.col1.y };
                        this.renderer.DrawLine(
                            center.x * this.scale,
                            canvas.height - center.y * this.scale,
                            (center.x + axis.x * radius) * this.scale,
                            canvas.height - (center.y + axis.y * radius) * this.scale,
                            color, 1
                        );
                    }
                }
                else if (shape instanceof b2EdgeShape) {
                    const v1 = body.GetWorldPoint(shape.GetVertex1());
                    const v2 = body.GetWorldPoint(shape.GetVertex2());

                    this.renderer.DrawLine(v1.x * this.scale, canvas.height - v1.y * this.scale, v2.x * this.scale, canvas.height - v2.y * this.scale, color, 1);
                }
            }
            // Draw transform for each body
            //this.DrawTransform(transform);
        }
    }

    DrawTransform(xf) {
        // Draw transform axes (red for x, green for y)
        const p = xf.position;
        const scale = this.scale;
        this.renderer.DrawLine(p.x * scale, canvas.height - p.y * scale,
            (p.x + xf.R.col1.x * 0.5) * scale, canvas.height - (p.y + xf.R.col1.y * 0.5) * scale,
            Color.red,
            2
        );
        this.renderer.DrawLine(p.x * scale, canvas.height - p.y * scale,
            (p.x + xf.R.col2.x * 0.5) * scale, canvas.height - (p.y + xf.R.col2.y * 0.5) * scale,
            Color.green,
            2
        );
    }
}
