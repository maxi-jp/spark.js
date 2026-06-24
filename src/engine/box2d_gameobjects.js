class Box2DGameObject extends GameObject {
    constructor(position, physicsWorld, type, bodyOptions) {
        super(position);

        this.world = physicsWorld;

        // Create the Box2D body
        this.body = CreatePhysicsObject(physicsWorld, type, position.x / physicsWorld.scale, (canvas.height - position.y) / physicsWorld.scale, bodyOptions);
        this.body.SetUserData(this);

        this.hasContact = false; // true if the body has colide with another object
        this.contactUserData = null; // the user data of the object that has colide with this object
        this.lastContactData = null; // information of the last contact detected
        this.hasContactEnded = false; // true if the body has end the collision with another object
        this.contactEndedUserData = null; // the user data of the object that has ended a collision with this object

        this.objectsColliding = []; // TODO insert colliding objects into this array when colliding and removing when contactEnded
    }

    get position() {
        // const pos = this.body.GetPosition();
        // this.position.Set(pos.x, pos.y);
        return this._position;
    }

    set position(value) {
        this.body.SetPosition(new b2Vec2(value.x / this.world.scale, (canvas.height - value.y) / this.world.scale));
    }

    get rotation() {
        return -this.body.GetAngle();
    }

    set rotation(value) {
        this.body.SetAngle(-value);
    }

    Start() {
        this.objectsColliding = [];
    }

    Update(deltaTime) {
        // Sync the GameObject's position and rotation with the Box2D body
        const pos = this.body.GetPosition();
        this._position.Set(pos.x * this.world.scale, canvas.height - (pos.y * this.world.scale));
        this._rotation = -this.body.GetAngle();

        // consume Box2D collision events
        if (this.hasContact) {
            // Consume the contact
            this.hasContact = false;
            this.OnContactDetected(this.contactUserData, this.lastContactData);
        }

        if (this.hasContactEnded) {
            // Consume the contact ended
            this.hasContactEnded = false;
            this.OnContactDetectEnded(this.contactEndedUserData);
        }
    }

    // DO NOT OVERRIDE: Used internally by Box2D contact system
    OnContactDetectedBox2D(other, contactPoint) {
        if (this.hasContact)
            return; // already detected a contact

        this.contactUserData = other;
        this.lastContactData = contactPoint;
        this.hasContact = true;
    }

    // DO NOT OVERRIDE: Used internally by Box2D contact system
    OnEndContactDetectedBox2D(other) {
        if (this.hasContactEnded)
            return;

        this.contactEndedUserData = other;
        this.hasContactEnded = true;
    }

    OnContactDetected(other, contactPoint) { }
    OnContactDetectEnded(other) { }

    /**
     * Sets the linear velocity of the body.
     * @param {number} x The x component of the velocity in meters/sec.
     * @param {number} y The y component of the velocity in meters/sec.
     */
    SetLinearVelocity(x, y) {
        this.body.SetLinearVelocity(new b2Vec2(x, y));
    }

    /**
     * Gets the linear velocity of the body.
     * @returns {b2Vec2} The linear velocity as a b2Vec2.
     */
    GetLinearVelocity() {
        return this.body.GetLinearVelocity();
    }

    /**
     * Sets the angular velocity of the body.
     * @param {number} omega The angular velocity in radians/sec.
     */
    SetAngularVelocity(omega) {
        this.body.SetAngularVelocity(omega);
    }

    /**
     * Gets the angular velocity of the body.
     * @returns {number} The angular velocity in radians/sec.
     */
    GetAngularVelocity() {
        return this.body ? this.body.GetAngularVelocity() : 0;
    }

    /**
     * Applies a force to a point on the body.
     * @param {number} forceX The x component of the world force vector.
     * @param {number} forceY The y component of the world force vector.
     * @param {number} [pointX] The x component of the world position to apply the force. Defaults to body's center.
     * @param {number} [pointY] The y component of the world position to apply the force. Defaults to body's center.
     */
    ApplyForce(forceX, forceY, pointX, pointY) {
        const force = new b2Vec2(forceX, forceY);
        const point = (pointX !== undefined && pointY !== undefined)
            ? new b2Vec2(pointX, pointY)
            : this.body.GetWorldCenter();
        this.body.ApplyForce(force, point);
    }

    /**
     * Applies an impulse to a point on the body.
     * @param {number} impulseX The x component of the world impulse vector.
     * @param {number} impulseY The y component of the world impulse vector.
     * @param {number} [pointX] The x component of the world position to apply the impulse. Defaults to body's center.
     * @param {number} [pointY] The y component of the world position to apply the impulse. Defaults to body's center.
     */
    ApplyImpulse(impulseX, impulseY, pointX, pointY) {
        const impulse = new b2Vec2(impulseX, impulseY);
        const point = (pointX !== undefined && pointY !== undefined)
            ? new b2Vec2(pointX, pointY)
            : this.body.GetWorldCenter();
        this.body.ApplyImpulse(impulse, point);
    }

    /**
     * Sets whether the body should have a fixed rotation.
     * @param {boolean} fixed True to prevent rotation.
     */
    SetFixedRotation(fixed) {
        this.body.SetFixedRotation(fixed);
    }

    /**
     * Sets the body's fixture(s) as a sensor.
     * @param {boolean} isSensor True to make the fixture a sensor.
     */
    SetSensor(isSensor) {
        for (let f = this.body.GetFixtureList(); f; f = f.GetNext()) {
            f.SetSensor(isSensor);
        }
    }

    /**
     * Sets the collision category bits for the body's fixture(s).
     * @param {number} bits The category bits.
     */
    SetCategoryBits(bits) {
        for (let f = this.body.GetFixtureList(); f; f = f.GetNext()) {
            const filter = f.GetFilterData();
            filter.categoryBits = bits;
            f.SetFilterData(filter);
        }
    }

    /**
     * Sets the collision mask bits for the body's fixture(s).
     * @param {number} bits The mask bits.
     */
    SetMaskBits(bits) {
        for (let f = this.body.GetFixtureList(); f; f = f.GetNext()) {
            const filter = f.GetFilterData();
            filter.maskBits = bits;
            f.SetFilterData(filter);
        }
    }

    Destroy() {
        this.world.DestroyBody(this.body);
        this.body = null;
    }
}

class Box2DRectangleGO extends Box2DGameObject {
    constructor(position, physicsWorld, type, bodyOptions, width, height, color = "red") {
        super(position, physicsWorld, type, bodyOptions);

        this.width = width;
        this.height = height;
        this.halfWidth = width / 2;
        this.halfHeight = height / 2;
        this.color = color;
    }

    Draw(renderer) {
        // TODO get the scale
        renderer.DrawFillRectangle(this.position.x * 100, this.position.y * 100, this.width * 100, this.height * 100, Color.black, this.rotation);
    }
}

class Box2DSpriteObject extends Box2DGameObject {
    constructor(position, rotation, scale, img, type, physicsWorld, bodyOptions) {
        super(position, physicsWorld, type, bodyOptions);

        this.rotation = rotation;
        
        this.sprite = new Sprite(img, this.position, this.rotation, scale);
    }

    get scale() {
        return this.sprite.scale;
    }
    set scale(value) {
        this.sprite.scale = value;
    }

    Update(deltaTime) {
        super.Update(deltaTime);
        this.sprite.position = this.position;
        this.sprite.rotation = this.rotation;
    }

    Draw(renderer) {
        this.sprite.Draw(renderer);
    }

    DrawSection(renderer, sx, sy, sw, sh) {
        this.sprite.DrawSection(renderer, sx, sy, sw, sh);
    }
}

class Box2DSSAnimationObjectBasic extends Box2DGameObject {
    constructor(position, rotation, scale, img, frameWidth, frameHeight, frameCount, framesDuration, type, physicsWorld, bodyOptions) {
        super(position, physicsWorld, type, bodyOptions);

        this.animation = new SSAnimationObjectBasic(
            this.position,
            rotation,
            scale,
            img,
            frameWidth,
            frameHeight,
            frameCount,
            framesDuration
        );
    }

    get scale() {
        return this.animation.scale;
    }
    set scale(value) {
        this.animation.scale = value;
    }

    Update(deltaTime) {
        super.Update(deltaTime);
        this.animation.position = this.position;
        this.animation.rotation = this.rotation;
        this.animation.Update(deltaTime);
    }

    Draw(renderer) {
        this.animation.Draw(renderer);
    }

    PlayAnimationLoop(animationId, resetToFrame0=true) {
        this.animation.PlayAnimationLoop(animationId, resetToFrame0);
    }
}

class Box2DSSAnimationObjectComplex extends Box2DGameObject {
    constructor(position, rotation, scale, img, animationsRectangles, framesDuration, type, physicsWorld, bodyOptions) {
        super(position, physicsWorld, type, bodyOptions);

        this.animation = new SSAnimationObjectComplex(
            this.position,
            rotation,
            scale,
            img,
            animationsRectangles,
            framesDuration
        );
    }

    get scale() {
        return this.animation.scale;
    }
    set scale(value) {
        this.animation.scale = value;
    }

    Update(deltaTime) {
        super.Update(deltaTime);
        this.animation.position = this.position;
        this.animation.rotation = this.rotation;
        this.animation.Update(deltaTime);
    }

    Draw(renderer) {
        this.animation.Draw(renderer);
    }

    PlayAnimationLoop(animationId, resetToFrame0=true) {
        this.animation.PlayAnimationLoop(animationId, resetToFrame0);
    }
}