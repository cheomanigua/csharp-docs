# Collision System Architecture

The game utilizes a **Hybrid Physics Strategy**, balancing performance-critical high-throughput dynamics with high-fidelity engine-based constraints.

## 1. Physics Engine Architecture

* **Custom C# Collision System (Fast Path)**: A high-performance, data-oriented physics layer designed to handle thousands of entities per frame. It operates outside of the Godot SceneTree to eliminate object instantiation and node-traversal overhead.
* **Godot PhysicsServer2D (Reliable Path)**: Used for complex, edge-case interactions and static environment collisions. By interacting directly with the `PhysicsServer2D` API, we achieve precise geometric collision resolution without the memory overhead of instantiating `PhysicsBody` nodes or `Area2D` objects.

## 2. Custom C# System: Dynamics

The custom system is designed for massive scale, targeting objects that require simple collision volume checks rather than complex physical constraints:

* **Hordes**: Character units that need to maintain separation to prevent overlap.
* **Projectiles**: High-speed entities that require per-frame position checking and immediate removal upon impact.
* **Particles**: Short-lived entities that need to react to the environment or each other without triggering expensive engine callbacks.

For that , the math models use **Circle** collision and **AABB** collision.

## 3. Collision Math Models

To ensure throughput, we utilize two primary geometric primitives chosen for their computational efficiency:

* **Circle Collision**: The primary model for dynamic entities. Calculated via `Vector2.DistanceSquared` vs. `CombinedRadiusSquared`. It is the fastest collision detection method as it avoids square root calculations.
    1. If `Distance < RadiusA + RadiusB`: The circles are overlapping.
    2. If `Distance == RadiusA + RadiusB`: The circles are perfectly touching (kissing).
    3. If `Distance > RadiusA + RadiusB`: The circles are separated.
* **AABB (Axis-Aligned Bounding Box) Collision**: Utilized for static or non-rotating assets. It compares the minimum and maximum X/Y coordinates of two rectangles, offering extremely high performance for axis-aligned geometry.
    1. If the rectangles overlap on both the X axis and the Y axis: The AABBs are overlapping.
    2. If the rectangles touch exactly along an edge or corner: The AABBs are perfectly touching.
    3. If the rectangles are separated on either the X axis or the Y axis: The AABBs are separated.

### Code implementation

If we have this helper class with overloaded methods:

```csharp
using System.Numerics;
using System.Runtime.CompilerServices;

namespace Source.Core.Math;

public static class CollisionMath
{
    // Circle-Circle Test: Fast squared distance comparison
    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public static bool IsOverlapping(Vector2 posA, float radiusA, Vector2 posB, float radiusB)
    {
        float dx = posA.X - posB.X;
        float dy = posA.Y - posB.Y;
        float distanceSquared = dx * dx + dy * dy;
        float radiusSum = radiusA + radiusB;
        
        return distanceSquared < (radiusSum * radiusSum);
    }

    // AABB-AABB Test: Classic overlap check for rectangular bounds
    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public static bool IsOverlapping(Vector2 posA, Vector2 halfSizeA, Vector2 posB, Vector2 halfSizeB)
    {
        return
            MathF.Abs(posA.X - posB.X) < (halfSizeA.X + halfSizeB.X) &&
            MathF.Abs(posA.Y - posB.Y) < (halfSizeA.Y + halfSizeB.Y);
    }

    // Circle vs AABB Test
    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public static bool IsOverlapping(Vector2 circlePos, float radius, Vector2 boxPos, Vector2 halfSize)
    {
        float dx = MathF.Max(MathF.Abs(circlePos.X - boxPos.X) - halfSize.X, 0);
        float dy = MathF.Max(MathF.Abs(circlePos.Y - boxPos.Y) - halfSize.Y, 0);
    
        return dx * dx + dy * dy <= radius * radius;
    }
}
```

The implementation would be:

#### Circle vs Circle

```csharp
bool colliding = CollisionMath.IsOverlapping(
    transforms[i].Origin, Radius,
    transforms[j].Origin, Radius);
```

#### AABB vs AABB

```csharp
bool colliding = CollisionMath.IsOverlapping(
    transforms[i].Origin, halfSize,
    transforms[j].Origin, halfSize);
```

#### Circle vs AABB

```csharp
bool colliding = CollisionMath.IsOverlapping(
    transforms[i].Origin, Radius,
    transforms[j].Origin, halfSize);
```

The three implementations are not mutually exclusive. They can be used together at the same time.

### Collision Methodology Reference

| Method | Speed | Complexity | Use Case |
| --- | --- | --- | --- |
| **Circle Check** | Extremely Fast | Very Simple | High-performance dynamic objects, units, projectiles. |
| **AABB Check** | Extremely Fast | Very Simple | Static world geometry, simple trigger zones. |

## 4. Performance Optimization Techniques

The system leverages data-oriented design patterns to ensure the CPU remains cache-friendly and garbage-collector-free:

* **Spatial Grid**: A partitioning system that divides the world into a grid of cells. Entities register their position in cells, allowing each entity to query only the 8 adjacent cells for potential collisions, reducing complexity from O(N^2) to near O(N).
* **`Span<T>`** & **`ArrayPool<T>`**: We utilize stack-allocated `Span<T>` views and rented arrays from `ArrayPool` to avoid heap allocations. This ensures zero-allocation physics ticks, preventing GC spikes.
* **Active Masking (`activeMask`)**: A bitmask or boolean array used to flag entities as active or inactive. This allows the system to skip processing for despawned or idle entities, drastically reducing the number of loop iterations per frame.

## 5. Configuration and Tuning

To maintain system stability, the following balancing factors must be monitored:

* **Grid Granularity (Cell Size)**: Must be tuned according to the average density of entities. If cells are too large, the number of checks per cell becomes a bottleneck. If cells are too small, memory overhead increases.
* **Memory Reuse (Buffer Size)**: The `ArrayPool` rent size must be sufficient to hold the maximum density of entities found in any 9-cell neighborhood.
* **The "Power of Two" Rule**: Ideally, `CellSize` and the `ArrayPool` buffer size should be powers of two to align with memory allocation patterns, optimizing both hardware cache line utilization and memory alignment.

## 6. Synchronization Strategy

To ensure your hybrid system functions as a cohesive unit, you must manage the "handshake" between the Fast Path (C# Custom System) and the Reliable Path (PhysicsServer2D).

The bridge between your custom system and the engine's physics server should be **unidirectional for performance**:

1. **Fast Path Ownership:** Your custom system is the "Source of Truth" for dynamic entity positions during the frame.
2. **Server Update (The Bridge):** At the end of your custom physics tick, only entities that have interacted with the static world or complex assets need to be updated in the `PhysicsServer2D`.
3. **State Mapping:** Use the unique Entity ID as a key to map your C# `Transform2D` data to the engine's body handles.

### Implementing the Synchronization Flow

To keep the two systems integrated without introducing performance bottlenecks, follow this logic flow:

* **Step 1: Custom Resolution:** Run your `CollisionSystem.Update` loop first to resolve horde and projectile movement.
* **Step 2: World Interaction Check:** After internal collisions are settled, perform a simple raycast or shape-cast using the `PhysicsServer2D` for entities that moved into proximity of static environmental geometry.
* **Step 3: State Sync:** Only for those specific entities that triggered a complex interaction, call `PhysicsServer2D.BodySetState` to force the engine to acknowledge the new position. This prevents the "ghosting" issue where the C# system moves an entity but the engine’s static collision logic remains unaware.

### Architectural Best Practices

* **Batch Updates:** Do not update the `PhysicsServer2D` inside the `CollisionSystem` loop. Instead, collect a list of "Dirty Entities" during the collision loop and process the `PhysicsServer2D` updates in a single batch after the loop completes to minimize interop overhead.
* **Avoid Bi-directional Sync:** Never read back positions from `PhysicsServer2D` into your C# system unless absolutely necessary (e.g., an explosion pushes a character). Reading from the Physics Server is an expensive operation; treat your C# data as the master record.
* **Spatial Alignment:** Ensure your `SpatialGrid` cell dimensions align with or are multiples of any grid-based logic used by the static environment's collision shapes to minimize the number of lookups required when bridging the two systems.

By following this "Fast Path-first, bridge-later" approach, you keep the bulk of your 5000+ entities within the high-performance C# domain, only calling upon the engine's robust but heavier physics server when the complexity of the interaction demands it.

## 7. Entity Identification Policy

The system uses a **Direct Addressing (Index-based)** pattern for `EntityId`.

### ID Allocation and Partitioning

To ensure stability at scale, `EntityId` values must be generated via a central `IdGenerator` or `IDProvider` rather than hardcoded. IDs are partitioned using **Power-of-Two** ranges to improve cache alignment and simplify entity categorization:

| Category | ID Range | Hex Offset |
| --- | --- | --- |
| **Items** | 0 – 127 | `0x000` |
| **NPCs** | 128 – 255 | `0x080` |
| **Projectiles** | 256 – 1023 | `0x100` |

#### Why the `IDProvider`?

* **Separation of Concerns:** The `Controller` should focus on *game logic* (spawning, moving, interacting). The `IDProvider` focuses on *data integrity* (guaranteeing unique, valid indices).
* **Partition Enforcement:** By using an `IDProvider`, you can cleanly enforce the Power-of-Two boundaries we discussed. The `Controller` doesn't need to know *why* an NPC gets ID 256; it just requests `GetNextNpcId()`.
* **Testability:** You can easily swap an `IDProvider` with a "Mock" version for testing, making it easier to verify how your system handles high-density scenarios (like spawning 5,000 projectiles at once).

```csharp
public class IDProvider
{
    // Partitioning by Power of Two
    private int _itemPointer = 0;        // 0 to 127
    private int _npcPointer = 128;       // 128 to 255
    private int _projectilePointer = 256;// 256 to 1023

    public int GetNextItemId() => _itemPointer++;
    public int GetNextNpcId() => _npcPointer++;
    public int GetNextProjectileId() => _projectilePointer++;
}
```

#### Why Power-of-Two?

* **Bitwise Efficiency**: Modern CPUs and compilers are extremely fast with bitwise operations. If your partitions are **Powers-of-Two**, determining an entity's category becomes a simple bit-shift or bitwise AND operation rather than a range check (`if (id >= 256 && id < 512)`).
* **Memory Alignment & Cache Locality**: Your systems are built on `Span<T>` and fixed-size arrays (`1024`). In computer architecture, data structures that align with powers of two are easier for the CPU to map into **Cache Lines**. If your NPC data starts exactly at index 256 and your projectile data starts exactly at index 512, you ensure that your data blocks are memory-aligned.

#### Why this is a "High Performance" Choice:

* **O(1) Access**: Since `EntityId` acts as a direct index into fixed-size arrays (e.g., `_stats[entityId]`), access is instantaneous.
* **Type Partitioning**: By partitioning ranges, we avoid ID collisions between disparate systems (e.g., an Item accidentally overwriting an NPC's data) and allow for bitwise filtering of entity types.
* **Cache Locality**: Power-of-two alignment ensures that data segments stay aligned with CPU cache lines, minimizing cache misses during high-throughput iterations.

### How the ID system works:

In your architecture, the `int entityId` is **not a random UUID or unique database key**; it is a **direct index** into fixed-size arrays.

* **Fixed Capacity:** You have `EngineConfig.MaxEntities` (or `MaxEntityCapacity` = 1024).
* **Array Mapping:** Your systems use the `entityId` as a direct array index to access component data:
* `EntityRegistry._stats[entityId]`
* `MetadataRegistry._metadata[entityId]`
* `EntitySieve._data[entityId]`
* `TagGrid._entityMasks[entityId]`


### Why this is a "High Performance" Choice:

* **O(1) Access:** Accessing a component is as fast as `array[index]`. There is no dictionary hashing or key searching.
* **Cache Locality:** Because you are using dense arrays (`_stats`, `_metadata`), your data is likely packed together in memory. This is the foundation of a **Data-Oriented Design (DOD)**.
* **The Bridge to PhysicsServer2D:** Since you have a fixed range of IDs (0–1023), you can perfectly mirror these in Godot by creating an array of `RID` (Resource IDs) the same size as your `MaxEntityCapacity`.

### How to synchronize with Godot PhysicsServer2D

Since you have a predictable ID system, you don't need complex mapping logic. You can use your `entityId` as the key to your bridge:

1. **Allocate RIDs once:** When your engine starts, maintain an array `RID[] _entityToRid = new RID[1024];`.
2. **Create on Demand:** When a C# entity is "spawned" (e.g., via `NPCBlueprintDto`), create the corresponding Godot body and store the `RID` at the index matching its `entityId`.
```csharp
// Inside your Godot Service
public void RegisterEntity(int entityId, Vector2 position) {
    RID body = PhysicsServer2D.BodyCreate();
    PhysicsServer2D.BodySetState(body, PhysicsServer2D.BodyState.Position, position);
    _entityToRid[entityId] = body; 
}

```

3. **Sync:** When your `CollisionSystem` finishes its tick, you only need to iterate over the `activeEntities` and perform:
```csharp
// Sync only the moved entities
PhysicsServer2D.BodySetState(_entityToRid[entityId], PhysicsServer2D.BodyState.Position, transforms[entityId].Origin);

```

Since IDs are fixed-range indices, we maintain a mirroring array of `RID[]` (Resource IDs) the same size as `MaxEntityCapacity`. When an entity is spawned, the `IDProvider` assigns a unique index, and the `GodotService` allocates a corresponding `RID` at that same index. This eliminates the need for complex hash-map lookups during the physics synchronization phase.

*Note: The `SpatialGrid` is dynamic and sparse, but the total `EntityId` range must stay within `EngineConfig.MaxEntityCapacity` to prevent `IndexOutOfRangeException`.*

### ID Lifecycle Management

* **The Source of Truth**: The `IDProvider` service is the unique source for `EntityId` allocation. No manual assignment or hardcoded IDs are permitted.
* **Registry Handshake**: The `EntityRegistry` acts as the **Data Storage** for these IDs. Upon spawning, a system must:
   1. Request a valid ID from the `IDProvider`.
   2. Initialize the entity state (e.g., `EntityStats`) using that ID.
   3. Register the ID into the `EntityRegistry` to activate it for the next physics/combat tick.

### Important Structural Adjustment

In `EntityRegistry.cs`, your `ProcessCombat` loop iterates over `_activeCount`. By using the `IDProvider` partitioning, you can easily filter this loop in the future if you ever need to perform combat calculations *only* for NPCs:

```csharp
// Example: If you only want to process NPCs in combat
for (int i = 0; i < _activeCount; i++)
{
    int eid = _activeEntities[i];
    // Check if ID is in the NPC range (256-511)
    if (eid >= 256 && eid < 512) 
    {
        // Process NPC combat logic
    }
}

```

The `IDProvider` is the **Generator**, and the `EntityRegistry` is the **Consumer**.

### Important Warning for your Hybrid Strategy:

Since your C# system handles IDs up to `MaxEntityCapacity`, ensure that **no part of your code** accidentally assigns an `entityId` larger than 1023, or you will trigger an `IndexOutOfRangeException` across your entire architecture.

## 8. Godot Integration

We can use a combination of custom C# collision implementation and Godot `PhysicsServer2D` solution. There are three possibles architectures:

### 8.1. Custom Dynamic Collision + Physics Queries

Dynamic collisions are entirely owned by your C# simulation. `PhysicsServer2D` is used only for static-world queries.

Avoid using Godot's physics engine for dynamic entity collisions when simulating thousands of simple objects such as bullets or swarm agents. Instead, keep all dynamic collision detection and resolution inside your C# simulation, using `PhysicsServer2D` only for queries against the static world.

This approach maximizes performance by keeping your simulation fully data-oriented and avoiding any dynamic physics state inside Godot.

#### Dynamic-vs-Dynamic

Implement both the broadphase and narrowphase yourself:

* Use a **Spatial Grid** to partition entities.
* Perform collision checks using simple C# math (circle-circle, AABB-AABB, capsule overlap, etc.).
* Update gameplay state directly in your ECS/DOD model.

No `Area2D`, `RigidBody2D`, or dynamic `PhysicsServer2D` objects are required.

#### Dynamic-vs-Static

Use `PhysicsServer2D` only as a query system:

* Raycasts
* Shape intersection tests
* Terrain or wall queries

The static world remains inside Godot's physics engine, while dynamic entities remain pure C# data.

#### Hybrid Rule

| Collision Type     | Implementation                     |
| ------------------ | ---------------------------------- |
| Dynamic-vs-Dynamic | Spatial Grid + Custom C# Collision |
| Dynamic-vs-Static  | `PhysicsServer2D` Queries          |

#### Why use this?

* Maximum performance
* Cache-friendly DOD design
* Ideal for bullets, swarms, and simple hitboxes
* No synchronization overhead with physics objects


### 8.2. Spatial Grid Broadphase + PhysicsServer2D Narrowphase

Dynamic entities are still owned by your C# simulation, but `PhysicsServer2D` is used as the narrowphase collision engine for precise geometry tests.

When dynamic entities require more sophisticated collision geometry, keep entity ownership and broadphase culling inside your C# simulation, but delegate the precise collision tests to PhysicsServer2D.

In this architecture, Godot does not own or simulate your entities. It acts purely as a native geometry engine that performs the expensive collision math for the candidate pairs identified by your Spatial Grid.

#### Broadphase

Implement a **Spatial Grid** inside your C# model.

Each frame:

* Insert entities into grid cells.
* Find nearby candidate pairs.
* Discard entities that are obviously too far apart.

This keeps the complexity close to O(N).

#### Narrowphase

For the candidate pairs produced by the grid:

* Query `PhysicsServer2D`
* Perform exact shape intersection tests
* Retrieve overlap information, normals, or penetration depth
* Apply the results back to your C# transforms

You are not using Godot to manage physics objects, you are using it only as a high-performance native collision solver.

#### Hybrid Rule

| Collision Type     | Implementation                               |
| ------------------ | -------------------------------------------- |
| Dynamic-vs-Dynamic | Spatial Grid + `PhysicsServer2D` Narrowphase |
| Dynamic-vs-Static  | `PhysicsServer2D` Queries                    |

#### Why use this?

* Supports complex shapes
* Uses Godot's optimized C++ geometry code
* Keeps gameplay logic in C#
* Avoids thousands of physics nodes

### 8.3. Mixed Narrowphase (Custom + PhysicsServer2D)

Dynamic entities are owned entirely by your C# simulation, but the narrowphase collision system is chosen per entity type. Simple entities use custom collision math for maximum performance, while complex entities delegate precise geometry tests to `PhysicsServer2D`.

This architecture combines the strengths of **8.1** and **8.2**. It keeps the simulation data-oriented and cache-friendly while avoiding the complexity of implementing advanced collision algorithms for irregular shapes.

The goal is not to use a single collision system for everything, but to use the most appropriate collision solver for each class of entity.

#### Broadphase

Implement a single **Spatial Grid** inside your C# model.

Each frame:

* Insert all dynamic entities into the grid.
* Identify nearby candidate pairs.
* Discard obviously non-overlapping entities.

This broadphase remains identical regardless of the collision shape.

#### Narrowphase

Choose the collision solver according to the entity type:

#### Simple Shapes

Use custom C# collision code:

* Circle-vs-Circle
* Circle-vs-AABB
* AABB-vs-AABB
* Capsule-vs-Capsule (optional)

These tests are extremely fast and require no interaction with Godot.

#### Complex Shapes

Delegate collision checks to `PhysicsServer2D`:

* Convex polygons
* Rotated hitboxes
* Multi-shape enemies
* Boss hurtboxes
* Irregular collision geometry

Use `PhysicsServer2D` as a geometry service:

* Perform exact shape intersection tests
* Retrieve penetration depth and normals
* Apply the results back to your ECS/DOD data

Godot does not own or simulate these entities. It only performs the expensive geometry calculations.

#### Dynamic-vs-Static

Use `PhysicsServer2D` queries for:

* Terrain collisions
* Walls
* Obstacles
* Raycasts
* Static shape intersections

The static world remains inside Godot's physics engine, while all dynamic entities remain pure C# data.

#### Hybrid Rule

| Collision Type             | Implementation                               |
| -------------------------- | -------------------------------------------- |
| Simple Dynamic-vs-Dynamic  | Spatial Grid + Custom C# Collision           |
| Complex Dynamic-vs-Dynamic | Spatial Grid + `PhysicsServer2D` Narrowphase |
| Dynamic-vs-Static          | `PhysicsServer2D` Queries                    |

#### Example

| Entity        | Collision Strategy            |
| ------------- | ----------------------------- |
| Bullets       | Custom Circle Collision       |
| Swarm Enemies | Custom Circle Collision       |
| Pickups       | Custom AABB Collision         |
| Boss          | `PhysicsServer2D` Narrowphase |
| Shield        | `PhysicsServer2D` Narrowphase |
| Terrain       | `PhysicsServer2D` Queries     |

#### Why use this?

* Maximum performance for the majority of entities.
* Complex shapes require no custom SAT/GJK implementation.
* Keeps the ECS/DOD simulation pure and cache-friendly.
* Avoids thousands of `Area2D` or `RigidBody2D` nodes.
* Scales naturally as the game's collision requirements grow.


### Comparison

| Feature            |                 8.1 |                  8.2 |                                             8.3 |
| ------------------ | ------------------: | -------------------: | ----------------------------------------------: |
| Broadphase         |        Spatial Grid |         Spatial Grid |                                    Spatial Grid |
| Narrowphase        |           Custom C# |    `PhysicsServer2D` |                                           Mixed |
| Circle collisions  |           Excellent |            Excellent |                                       Excellent |
| Polygon collisions |           Difficult |            Excellent |                                       Excellent |
| Complex hitboxes   |           Difficult |            Excellent |                                       Excellent |
| Performance        |             Fastest |      Slightly slower |                                        Near 8.1 |
| Flexibility        |            Moderate |                 High |                                         Highest |
| Typical use        | Bullet hell, swarms | Complex enemy shapes | Mixed games with simple mobs and complex bosses |

### Cheatsheet: When to use each

| Architecture | Dynamic Collision                              | Static Collision |
| ------------ | ---------------------------------------------- | ---------------- |
| **8.1**      | All custom C#                                  | PhysicsServer2D  |
| **8.2**      | All PhysicsServer2D narrowphase                | PhysicsServer2D  |
| **8.3**      | Custom C# for simple (circle, AABB), PhysicsServer2D for complex | PhysicsServer2D  |

I would actually consider **8.3 the recommended default architecture for most ECS/DOD games**. Most entities (bullets, mobs, pickups) stay on the ultra-fast custom path, while only a handful of complex entities (bosses, shields, multipart enemies) use `PhysicsServer2D` for precise collision geometry. This gives you almost all the performance of **8.1** with much of the flexibility of **8.2**.
