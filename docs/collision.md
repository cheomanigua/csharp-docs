# Collision System

Godot Documentation: [PhysicsServer2D](https://docs.godotengine.org/en/stable/classes/class_physicsserver2d.html)

Your decision to maintain a **"Godot-as-a-Service"** architecture is the gold standard for high-performance C# simulation. By using the `RenderingServer` and `PhysicsServer`, you are essentially building a custom game engine that happens to be hosted inside Godot.

Regarding your fear of implementing collision: **It is completely valid.** Writing robust physics from scratch is a significant undertaking.

### The "Hybrid" Physics Approach

You do not need to choose between "manual math" and "Godot Nodes." Since you already plan to use `PhysicsServer2D` for static geometry (walls/floors), you can use it for your horde as well, **without using Nodes.**

#### Using PhysicsServer2D as a "Service"

The `PhysicsServer2D` is not just for Nodes; it is a direct interface for the physics engine. You can create "Physics Shapes" as raw data (RIDs) and query them.

```csharp
// Inside EngineDriver.cs (Initialization)
RID shape = PhysicsServer2D.CircleShapeCreate();
PhysicsServer2D.ShapeSetData(shape, 2.0f); // Set radius

// Inside MovementSystem.cs (Per entity)
// You can perform a 'ShapeCast' using the server directly:
var parameters = new PhysicsShapeQueryParameters2D();
parameters.ShapeRid = shape;
parameters.Transform = new Transform2D(0, position);

// This query returns a list of bodies/areas without needing any Nodes!
var results = PhysicsServer2D.SpaceGetDirectState(_spaceRid).IntersectShape(parameters);

```

### Why this solves your collision struggle:

1. **Industrial Strength:** You get the benefit of Godot’s collision detection (which handles edge cases, tunnels, and complex shapes) without ever instantiating a `Node` or `CharacterBody2D`.
2. **Performance:** `PhysicsServer2D` is written in C++ and highly optimized for space partitioning. It is often faster than a manual C# implementation for complex scenarios.
3. **No Node Dependency:** You are still passing `RID`s (integers) and `Transform2D` structs. Your logic remains entirely data-driven and independent of the `SceneTree`.

### My Recommendation

If you feel the math is getting too complex, **do not write your own physics solver** and **do not import Raylib**. Instead, master the `PhysicsServer2D` API.

It is the "middleware" that bridges the gap between your simulation and the engine's capabilities. It allows you to:

* **Keep your logic pure:** You are still just passing data around.
* **Avoid "Physics-from-Scratch":** You use Godot's existing, battle-tested solver.
* **Keep the Horde performant:** You can use `SpaceGetDirectState` to query collisions in parallel or via high-speed batching.

* * *
* * *
* * *

# Implementation

Would you like to explore how to set up the `PhysicsServer2D` to perform these "node-less" collision queries for your horde?


This is the "pro-level" move for your engine. By using `PhysicsServer2D` as a headless service, you get all the power of Godot's C++ collision engine (broadphase, collision shapes, tunneling detection) while keeping your code 100% data-driven and node-less.

Here is the blueprint for setting up your "Node-less Physics Service."

### 1. The Physics Service Setup

In your `EngineDriver` constructor, you need to create a **Physics Space**. A "Space" is the container where Godot manages physics objects.

```csharp
// Inside EngineDriver.cs
private RID _physicsSpace;

private void InitializePhysics()
{
    // Create an independent physics space
    _physicsSpace = PhysicsServer2D.SpaceCreate();
    PhysicsServer2D.SpaceSetActive(_physicsSpace, true);
    
    // Set up the physics world properties
    PhysicsServer2D.AreaSetParam(PhysicsServer2D.SpaceGetDirectState(_physicsSpace), 
        PhysicsServer2D.AreaParameter.Gravity, 0);
}

```

### 2. Creating "Colliders" (RIDs)

You don't add nodes. Instead, you create a "Body" RID for every entity. This RID is just an integer that points to the data inside the `PhysicsServer2D`.

```csharp
// Helper to create a collider for an entity
public RID CreateEntityCollider(float radius)
{
    RID body = PhysicsServer2D.BodyCreate();
    PhysicsServer2D.BodySetSpace(body, _physicsSpace);
    
    RID shape = PhysicsServer2D.CircleShapeCreate();
    PhysicsServer2D.ShapeSetData(shape, radius);
    
    PhysicsServer2D.BodyAddShape(body, shape);
    PhysicsServer2D.BodySetMode(body, PhysicsServer2D.BodyMode.Kinematic);
    
    return body;
}

```

### 3. The "Node-less" Query (The Narrowphase)

Inside your `MovementSystem.update` loop, instead of your manual AABB math, you query the server directly for each entity.

```csharp
// Inside MovementSystem.cs -> Update()
// 1. Prepare the query parameters
var query = new PhysicsShapeQueryParameters2D();
query.ShapeRid = entityShapeRid; // The RID you created earlier
query.Transform = new Transform2D(0, transforms[i].Origin);

// 2. Perform the direct check against the physics space
var spaceState = PhysicsServer2D.SpaceGetDirectState(_physicsSpace);
var collisions = spaceState.IntersectShape(query);

// 3. Resolve
if (collisions.Count > 0)
{
    // The PhysicsServer returns contact points and normal vectors
    // which you use to "nudge" your Transform2D position.
}

```

### Why this is the ultimate solution:

1. **Massive Scale:** Because the `PhysicsServer2D` is written in C++ and highly optimized, it will handle your horde significantly faster than any manual AABB loop in C#.
2. **Geometry Flexibility:** You mentioned wanting to support different shapes later. With this setup, you simply swap `CircleShapeCreate()` for `RectangleShapeCreate()` or `ConvexPolygonShapeCreate()`. The rest of your code remains identical.
3. **Zero Nodes:** Your horde remains a collection of RIDs and math structs. No nodes are created, no scene tree is traversed, and no signals are fired.

### Important "Gotcha": Synchronization

The `PhysicsServer2D` needs to know where your entities are to perform these queries. At the start of every `Tick()`, you must update the bodies:

```csharp
// Update the physics engine with your current simulation positions
PhysicsServer2D.BodySetState(entityRid, PhysicsServer2D.BodyState.Transform, new Transform2D(0, entityPosition));

```

**Would you like to see how to integrate this "Body Sync" into your `EngineDriver.cs` loop so your simulation and the Physics Server stay perfectly in sync?**

* * *
* * *
* * *

# Algorithms

Absolutely. There are **several families of collision/crowd algorithms**, and they produce very different behaviors.

For your use case (**hundreds or thousands of NPCs chasing the player**), this taxonomy is especially useful:

| Algorithm               | Behavior                       | Good For                 |    Scale |
| ----------------------- | ------------------------------ | ------------------------ | -------: |
| Circle Collision        | Solid balls pushing each other | RTS units, simple crowds |     10k+ |
| AABB Collision          | Box-shaped objects             | Tile games, platformers  |     10k+ |
| Boids                   | Bird/fish flocking             | Swarms, birds, fish      |   1k–10k |
| Separation Steering     | Soft repulsion                 | Zombie hordes, crowds    |     10k+ |
| Social Forces           | Human crowds                   | Cities, pedestrians      |   1k–50k |
| ORCA / RVO              | Intelligent avoidance          | Agents navigating crowds |  100–10k |
| Physics Bodies          | Real rigid bodies              | Crates, vehicles         | 100–1000 |
| Position Based Dynamics | Soft/stable physics            | Cloth, crowds, particles |  1k–100k |

---

# 1. Circle Collision

This is what you currently have.

```text
 O   O

touch

= collision
```

Resolution:

```text
OO

↓

O O
```

Characteristics:

* Very easy
* Stable
* Fast
* Physical

Bad at:

* Dense crowds
* Natural flow

---

# 2. AABB Collision

```text
+---+
| A |
+---+

   +---+
   | B |
   +---+
```

Rectangular hitboxes.

Used in:

* Platformers
* Tile games
* RTS

Examples:

* Terraria
* Minecraft
* Factorio

---

# 3. Boids

Invented by Craig Reynolds.

Three rules:

```text
Separation
Alignment
Cohesion
```

Result:

```text
<<<<<<
 <<<<<
<<<<<<
```

Beautiful flocking.

Used in:

* Birds
* Fish
* Insects
* Alien swarms

Examples:

* Flocks in many games
* Fish schools

---

# 4. Separation Steering

This is VERY popular for hordes.

NPC wants:

```text
Go toward player
```

But:

```text
Move away from nearby NPCs
```

So:

```text
FinalVelocity =

PlayerForce

+

SeparationForce
```

Result:

```text
oooooo

↓

     @


oo o oo
 ooooo
oo o oo
```

Very natural.

Examples:

* Zombie hordes
* Vampire Survivors-like enemies
* RTS crowds

---

# 5. Social Force Model

NPCs behave like particles with invisible forces.

```text
Player attracts

NPCs repel

Walls repel
```

Result:

```text
Crowds form lanes

People avoid collisions

Groups emerge naturally
```

Used in:

* Crowd simulators
* Cities
* Evacuation simulations

---

# 6. RVO / ORCA

Probably the most famous crowd avoidance algorithm.

Full names:

* Reciprocal Velocity Obstacles
* Optimal Reciprocal Collision Avoidance

Idea:

```text
Predict future collisions

↓

Adjust velocity

↓

Avoid collision BEFORE it happens
```

Result:

```text
ooooooo

↓

     @

↓

oo   oo
 ooooo
oo   oo
```

Very smooth.

Used in:

* RTS games
* Large crowds
* Robot navigation

Examples:

* Many modern RTS engines
* Crowd simulations

---

# 7. Position Based Dynamics (PBD)

Very modern.

Instead of:

```text
Velocity

↓

Position
```

It does:

```text
Move

↓

Fix overlaps

↓

Repeat
```

Very stable.

Used for:

* Soft bodies
* Crowds
* Fluids
* Particles

---

# For YOUR game

You said:

* ECS
* No nodes
* Spatial Grid
* 300–5000 NPCs
* Horde chasing player

I would rank:

### Option 1 (My favorite)

```text
Spatial Grid

↓

Separation Steering

↓

Player Attraction

↓

Move
```

This creates:

```text
ooooooo

↓

      @


oo oo oo
 ooooo
oo oo oo
```

Smooth.

---

### Option 2

```text
Spatial Grid

↓

Circle Collision

↓

Push apart
```

This is your current system.

Works.

But dense swarms may jam.

---

### Option 3

```text
Spatial Grid

↓

Boids

↓

Player Attraction
```

This creates:

```text
<<<<<<

   @

<<<<<<
 <<<<<
```

Very organic.

---

## If your goal is:

> "300 enemies tightly packed, moving smoothly around each other while chasing the player"

Then I would honestly recommend:

```text
Boids
+
Separation Steering
+
Player Attraction
```

This combination is used by many swarm and horde games because it produces that beautiful "living fluid" behavior people associate with birds, fish schools, insect swarms, and intelligent enemy hordes.

# Algorithm Difficulty

Some are **surprisingly easy**, and some are entire research fields.

For your ECS + Spatial Grid architecture, here's how I would rank them:

| Algorithm           |      Difficulty | Lines of Code | Suitable for 5000 NPCs |
| ------------------- | --------------: | ------------: | ---------------------: |
| Circle Collision    |          ⭐ Easy |         20–50 |                  ⭐⭐⭐⭐⭐ |
| Separation Steering |          ⭐ Easy |         20–40 |                  ⭐⭐⭐⭐⭐ |
| AABB                |          ⭐ Easy |         20–50 |                  ⭐⭐⭐⭐⭐ |
| Boids               |     ⭐⭐ Moderate |        50–100 |                   ⭐⭐⭐⭐ |
| Social Forces       |    ⭐⭐⭐ Moderate |       100–200 |                   ⭐⭐⭐⭐ |
| ORCA / RVO          |       ⭐⭐⭐⭐ Hard |          500+ |                  ⭐⭐⭐⭐⭐ |
| Full Physics Engine | ⭐⭐⭐⭐⭐ Very Hard |     Thousands |                     ⭐⭐ |

---

# 1. Circle Collision — Very easy

You already implemented almost all of it.

```csharp
delta = b - a;

if (delta.LengthSquared() < r*r)
{
    collide;
}
```

That's basically the entire detection.

---

# 2. Separation Steering — Also very easy

This is honestly my favorite for hordes.

For every nearby NPC:

```csharp
away = me - neighbor;

force += Normalize(away) / distance;
```

Then:

```csharp
velocity =
    playerDirection
    +
    separationForce;
```

That's it.

---

Example:

```text
Before:

oooooooooo

↓

       @


After:

oo oo oo
 ooooo
oo oo oo

      @
```

Very natural.

---

# 3. Boids — Surprisingly small

Classic Boids is:

```text
velocity =

separation

+

alignment

+

cohesion
```

Where:

### Separation

```text
Don't overlap neighbors
```

### Alignment

```text
Match neighbors direction
```

### Cohesion

```text
Move toward group center
```

---

The actual code is often:

```csharp
velocity += separation * 2f;

velocity += alignment * 1f;

velocity += cohesion * 0.5f;
```

Not very complicated.

---

# 4. Social Forces

A little more math.

Imagine invisible forces:

```text
Player attracts

NPCs repel

Walls repel
```

So:

```csharp
force =
    playerForce
    +
    crowdRepulsion
    +
    wallRepulsion;
```

This produces:

```text
People naturally create lanes

Crowds split

Crowds merge
```

---

# 5. ORCA / RVO

This is where things become painful.

It predicts:

```text
Where will I be?

Where will neighbors be?

Will we collide?

What velocity avoids that?
```

This involves:

* Half-planes
* Linear programming
* Velocity obstacles
* Constraints

---

I would not implement ORCA first.

---

# For your current engine...

You already have:

```text
Spatial Grid

↓

Nearby NPCs
```

That is literally:

**80% of Boids done already.**

Because Boids requires:

```text
Find neighbors

↓

Average positions

Average velocities

Repulsion
```

which your grid gives you.

---

# The easiest upgrade from your current code

Right now:

```text
Move

↓

Collide

↓

Push apart
```

I would replace that with:

```text
Find neighbors

↓

Compute separation force

↓

Add force toward player

↓

Move
```

No collision solver.

No pushing.

No jitter.

---

# Difficulty ranking for YOU specifically

Because you already have:

* ECS ✅
* Spatial Grid ✅
* Neighbor search ✅
* Transform arrays ✅

I would rate:

```text
Circle Collision      1/10

Separation Steering   2/10

Boids                 4/10

Social Forces         5/10

ORCA                  9/10
```

---

## My recommendation

For:

```text
300 compact enemies

↓

Flow naturally

↓

Chase player

↓

No nodes

↓

5000 NPC scalability
```

I would actually skip hard collisions altogether and implement:

```text
Player Attraction

+

Separation Steering

+

(optional) Alignment
```

That's about **30-50 lines of code**, and it often looks dramatically better than rigid collisions for swarm enemies.

## Algorithms Use Cases

Yes, absolutely.

In fact, **most game engines use different collision algorithms for different gameplay systems**. Trying to use one algorithm for everything is often slower and more complicated.

A typical setup for your architecture would be:

| System             | Collision Method                        |
| ------------------ | --------------------------------------- |
| NPC vs NPC         | Separation Steering or Circle Collision |
| Projectile vs NPC  | Circle Collision                        |
| Projectile vs Wall | Raycast or Circle vs Static Geometry    |
| Player vs Wall     | Circle or Capsule Collision             |
| Pickups            | Radius Trigger                          |
| Vision / Shooting  | Raycast                                 |
| Huge Boss          | Circle or Custom Shape                  |

---

## Projectile vs NPC

This is interesting:

You asked:

> Is it better for an entity to detect a projectile or a projectile to detect an entity?

For:

```text
5000 NPCs
100 projectiles
```

I would do:

```text
Projectile detects NPCs
```

---

## Why?

Imagine:

### Bad approach

Every NPC:

```text
for npc:

    find nearby projectiles
```

That's:

```text
5000 searches
```

every frame.

---

### Better approach

Every projectile:

```text
for projectile:

    find nearby NPCs
```

That's:

```text
100 searches
```

every frame.

Much cheaper.

---

## This is how many games do it

```text
ProjectileSystem

for projectile:

    grid.GetNearbyEntities()

    for each NPC:

        CircleCollision()

        if hit:

            Damage()

            Destroy projectile
```

---

## Circle collision for projectiles is perfect

```csharp
Vector2 delta = npcPos - projectilePos;

float r = npcRadius + projectileRadius;

if (delta.LengthSquared() <= r * r)
{
    Hit();
}
```

No AABB.

No PhysicsServer.

No Nodes.

---

## For example

Imagine:

```text
5000 NPCs

200 bullets
```

You do:

```text
NPC Grid

↓

Bullet 0

    nearby NPCs

Bullet 1

    nearby NPCs

Bullet 2

    nearby NPCs
```

This scales beautifully.

---

## Melee attacks are similar

Suppose:

```text
Sword swing
```

You don't check:

```text
NPC -> Is player sword hitting me?
```

Instead:

```text
Sword attack

↓

Query nearby NPCs

↓

Circle collision

↓

Apply damage
```

The attacking thing detects hits.

---

## General rule I personally use

```text
Static World

    detects nothing


NPCs

    separation only


Projectiles

    detect NPCs


Weapons

    detect targets


Vision

    raycast


Pickups

    trigger radius
```

---

## For your ECS horde game

If I were designing it:

```text
NPC System

    Separation Steering


Projectile System

    Circle Collision


Wall System

    Static obstacles


Vision System

    Raycast


Pickup System

    Radius Trigger
```

Each system gets the simplest algorithm that solves its problem.

And honestly, for **projectiles**, I would choose **Circle Collision every single time**. It is probably the easiest collision algorithm in game development, and it can comfortably handle **tens of thousands of bullets per frame** when combined with your Spatial Grid.

