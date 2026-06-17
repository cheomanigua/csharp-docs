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

## 3. Collision Math Models

To ensure throughput, we utilize two primary geometric primitives chosen for their computational efficiency:

* **Circle Collision**: The primary model for dynamic entities. Calculated via `Vector2.DistanceSquared` vs. `CombinedRadiusSquared`. It is the fastest collision detection method as it avoids square root calculations.
    1. If `Distance < RadiusA + RadiusB`: The circles are overlapping.
    2. If `Distance == RadiusA + RadiusB`: The circles are perfectly touching (kissing).
    3. If `Distance > RadiusA + RadiusB`: The circles are separated.
* **AABB (Axis-Aligned Bounding Box) Collision**: Utilized for static or non-rotating assets. It compares the minimum and maximum X/Y coordinates of two rectangles, offering extremely high performance for axis-aligned geometry.

### Collision Methodology Reference

| Method | Speed | Complexity | Use Case |
| --- | --- | --- | --- |
| **Circle Check** | Extremely Fast | Very Simple | High-performance dynamic objects, units, projectiles. |
| **AABB Check** | Extremely Fast | Very Simple | Static world geometry, simple trigger zones. |

## 4. Performance Optimization Techniques

The system leverages data-oriented design patterns to ensure the CPU remains cache-friendly and garbage-collector-free:

* **Spatial Grid**: A partitioning system that divides the world into a grid of cells. Entities register their position in cells, allowing each entity to query only the 8 adjacent cells for potential collisions, reducing complexity from $O(N^2)$ to near $O(N)$.
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

* **O(1) Access**: Since `EntityId` acts as a direct index into fixed-size arrays (e.g., `_hotData[entityId]`), access is instantaneous.
* **Type Partitioning**: By partitioning ranges, we avoid ID collisions between disparate systems (e.g., an Item accidentally overwriting an NPC's data) and allow for bitwise filtering of entity types.
* **Cache Locality**: Power-of-two alignment ensures that data segments stay aligned with CPU cache lines, minimizing cache misses during high-throughput iterations.

### How the ID system works:

In your architecture, the `int entityId` is **not a random UUID or unique database key**; it is a **direct index** into fixed-size arrays.

* **Fixed Capacity:** You have `EngineConfig.MaxEntities` (or `MaxEntityCapacity` = 1024).
* **Array Mapping:** Your systems use the `entityId` as a direct array index to access component data:
* `EntityRegistry._hotData[entityId]`
* `MetadataRegistry._metadata[entityId]`
* `EntitySieve._data[entityId]`
* `TagGrid._entityMasks[entityId]`


### Why this is a "High Performance" Choice:

* **O(1) Access:** Accessing a component is as fast as `array[index]`. There is no dictionary hashing or key searching.
* **Cache Locality:** Because you are using dense arrays (`_hotData`, `_metadata`), your data is likely packed together in memory. This is the foundation of a **Data-Oriented Design (DOD)**.
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

### Important Warning for your Hybrid Strategy:

Since your C# system handles IDs up to `MaxEntityCapacity`, ensure that **no part of your code** accidentally assigns an `entityId` larger than 1023, or you will trigger an `IndexOutOfRangeException` across your entire architecture.

### Synchronization with PhysicsServer2D

Since IDs are fixed-range indices, we maintain a mirroring array of `RID[]` (Resource IDs) the same size as `MaxEntityCapacity`. When an entity is spawned, the `IDProvider` assigns a unique index, and the `GodotService` allocates a corresponding `RID` at that same index. This eliminates the need for complex hash-map lookups during the physics synchronization phase.

*Note: The `SpatialGrid` is dynamic and sparse, but the total `EntityId` range must stay within `EngineConfig.MaxEntityCapacity` to prevent `IndexOutOfRangeException`.*
