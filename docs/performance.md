# DoD Performance

# High-Performance Data Structure Guide

In high-performance C# (e.g., game engines, ECS), we categorize data based on how it interacts with memory and the Garbage Collector (GC).

To integrate the **Command Queue** concept into your "Key Concepts" guide, you should define it as the transactional mechanism that protects these packed memory structures from concurrent access.

Here is the updated section:

## 1. Key Concepts Explained

### Packed and Blittable

* **Blittable:** A type is "blittable" if it has the same representation in both managed (C# heap) and unmanaged (raw RAM) memory. Examples include `int`, `float`, `byte`, and structs composed entirely of these types. Because they don't require conversion, they can be copied to memory instantly.
* **Packed:** This refers to the physical memory layout. A struct is "packed" when its fields are placed side-by-side without "padding" (empty bytes the compiler usually adds to align data for the CPU).

### Fixed-Size Memory Blocks

These are arrays declared within a struct using the `fixed` keyword (e.g., `public fixed int Stats[10];`).

* **Theory:** Normally, an array is a reference to an object on the heap. A `fixed` buffer is **inlined** directly into the struct’s memory.
* **Performance:** This eliminates a pointer dereference and improves cache locality, as the data exists exactly where the struct exists in memory.

### Managed Types

These are types that the .NET Garbage Collector (GC) must track.

* **Examples:** `string`, `class`, `List<T>`, `object`.
* **Implication:** Because the GC needs to know where these are, you cannot put them in a memory-aligned "packed" struct or an `unsafe` block, as their location in memory might change (when the GC moves objects).

### Transactional Intent (Command Queue)

* **The Concept:** A sequential buffer of transactional "intent" objects that decouples the *request* for a state change from its *execution*.
* **Why it matters for Performance:** In an ECS, you never want logic systems to mutate packed memory buffers directly, as this causes cache thrashing and race conditions. By enqueuing a `GameCommand` struct, you store the *intent* to change data in a cache-friendly queue, allowing the `EngineDriver` to batch these mutations safely during a single, deterministic window in the frame tick.

### Data Categories

* **Logic/Metadata:** Data containing `string`, `class`, or `List`. It is managed and safe. It should not be forced into manual memory layouts.
* **Packed Structs:** Structs using `LayoutKind.Explicit` or `Sequential` designed for high-density, cache-friendly storage.
* `[StructLayout(LayoutKind.Sequential)]` ensures fields appear in memory in order.
* `[StructLayout(LayoutKind.Explicit)]` allows precise control using `[FieldOffset]`.
* **Performance Buffers:** Structs containing `fixed` buffers used for high-frequency operations (like combat math). These require the `unsafe` keyword.
* **Command Buffers:** Blittable structs stored in a contiguous `Queue<T>` that act as the single point of entry for state mutation, ensuring all memory modifications remain predictable and deterministic.


## 2. Decision Matrix

| Strategy | When to use | Keywords | Safety | Memory Control | Complexity |
| --- | --- | --- | --- | --- | --- |
| **Standard (Safe)** | Logic, Metadata, UI | `struct`, `record` | High | Compiler-Managed unordered | Low |
| **Sequential** | General packing | `LayoutKind.Sequential` | High | Compiler-Managed ordered | Medium |
| **Explicit (Packed)** | Blittable / Tightly packed structs | `LayoutKind.Explicit`, `[FieldOffset]` | High | Manual Offsets `[FieldOffset]` | Medium |
| **Unsafe (Fixed)** | Performance Buffers/Pointers | `unsafe`, `fixed` | Low (Manual) | Manual Memory | High |
| **Command Queue** | Transactional State Changes | `Queue<T>`, `struct` | High | Transactional | Low |

### Why the Command Queue is different:

Unlike the memory-layout strategies (Sequential, Explicit, Unsafe) which focus on **how data is stored**, the **Command Queue** focuses on **how data is modified**. It provides a "Gatekeeper" pattern where:

1. **Systems** enqueue *intent* as lightweight, blittable structs.
2. The **EngineDriver** processes these structs sequentially as a batch transaction.
3. **Performance** remains high because the mutation occurs in a single, predictable loop, preventing cache invalidation and race conditions during your high-speed system sweeps.


## 3. Implementation Patterns

### Pattern 1: The "Safe" Metadata Struct

Use this for non-performance-critical data.

```csharp
public struct MetadataComponent {
    public string Name; // Managed type
    public string WeaponName;
    public float Value;
}

```

### Pattern 2: The "Sequential" Struct

Use this for standard performance needs. It guarantees the field order, but allows the compiler to handle padding/alignment for optimal CPU access.

```csharp
[StructLayout(LayoutKind.Sequential, Pack = 4)]
public struct StatsComponent {
    public int Strength;
    public int Intelligence;
    public int Agility;
}

```

### Pattern 3: The "Explicitly Packed" Struct

Use this when you have only blittable types (ints/floats) and want to guarantee a specific size for performance.

```csharp
[StructLayout(LayoutKind.Explicit, Size = 12)]
public struct WeaponComponent {
    [FieldOffset(0)] public int EntityId;
    [FieldOffset(4)] public int WeaponId;
    [FieldOffset(8)] public int Damage;
}

```

### Pattern 4: The "Unsafe Performance Buffer"

Use this only when you need inlined arrays for extreme speed.

```csharp
public unsafe struct EntityStats {
    public int EntityId;
    public fixed int Stats[10]; // Inlined memory
}

```

### Pattern 5: The "Transactional Intent" (Command Queue)

Use this to decouple systems that *request* a state change from the systems that *process* it. By defining intents as simple, blittable structs, you can safely queue them to be processed by the engine’s `Tick` logic, ensuring thread safety and deterministic order without heap allocations.

```csharp
// Define the intent as a lightweight, blittable struct
public enum CommandType { EquipItem, AdjustHealth, SpawnEntity }

[StructLayout(LayoutKind.Sequential)]
public struct GameCommand {
    public CommandType Type;
    public int EntityId;
    public int Value;
}

// In the EngineDriver, process these transactions as a batch
public class CommandQueue {
    private readonly Queue<GameCommand> _queue = new();
    
    public void Enqueue(GameCommand cmd) => _queue.Enqueue(cmd);
    public bool HasCommands => _queue.Count > 0;
    public GameCommand Dequeue() => _queue.Dequeue();
}

```

#### Why this pattern is essential for performance

Unlike the other patterns that focus on **how memory is packed for reading**, the **Command Queue** pattern focuses on **how memory is modified for safety**.

* **Prevents Race Conditions:** By queueing intents, you ensure that no system is writing to `EntityStats` while another system is midway through a `Span<T>` sweep.
* **Batch Consistency:** All mutations are executed in a single, predictable loop during the `EngineDriver.Tick()`. This keeps the CPU cache consistent because the memory state only changes during a specific, known window of time.
* **Deterministic Replay:** Because your commands are now serialized in a queue, you can log every `GameCommand` to a file. This allows you to recreate any game state or debug complex combat interactions simply by "replaying" the command sequence.

## 4. Garbage Collection

To understand which strategies use Garbage Collection (GC), it is helpful to look at whether the memory is "Managed" (handled by the CLR) or "Unmanaged" (handled by you).

### Garbage Collection and Your Data Layouts

| Strategy | Uses Garbage Collection? | Explanation |
| --- | --- | --- |
| **Standard (Safe)** | **Yes** | Uses managed types (like `string` or `List`) that the GC must track and clean up. |
| **Sequential** | **Generally No** | GC ignores contents if types are blittable. |
| **Explicit (Packed)** | **No** | Treated as raw memory blocks. |
| **Unsafe (Fixed)** | **No** | Memory is managed manually. |
| **Command Queue** | **No** | Uses blittable structs; zero heap allocation during execution. |

### Detailed Breakdown

#### 1. Standard (Safe) — **Uses GC**

Whenever you include a `string`, `List<T>`, or `class` inside a struct or record, that struct is considered **"Managed."** * The Garbage Collector must traverse these objects to see if they are still being referenced by your code. If the GC is running, it "sees" these objects and may move them around in memory.

#### 2. Sequential & Explicit (Packed) — **GC-Ignored (if Blittable)**

If your struct contains *only* blittable types (types that don't need translation, like `int`, `long`, `float`, or other blittable structs), it is considered **"Blittable."**

* The GC is essentially "blind" to the internal contents of these structs. Even if the GC runs, it does not need to look inside the struct to track object references.
* This is why these patterns are so efficient for high-performance ECS systems—they reduce the amount of work the GC has to perform during its "Mark and Sweep" cycles.

#### 3. Unsafe (Fixed) — **GC-Ignored**

When you use `unsafe` and `fixed` buffers (like in your `EntityStats`), you are explicitly taking responsibility for that memory.

* The GC does not track the content of `fixed` arrays.
* **Critical Warning:** Because the GC is not tracking this, you must ensure that your `unsafe` code does not access memory that has been deallocated or is being reused. You are essentially stepping outside the "safety net" that the GC provides.

#### 4. Command Queue — **GC-Ignored (if Blittable)**

By defining your `GameCommand` as a `struct` consisting only of blittable types (e.g., `enum`, `int`), you ensure that enqueuing and dequeuing operations create **zero garbage**.

* **Performance:** Because the queue stores structs contiguously, the CPU can iterate through pending commands without triggering cache misses or forcing the GC to perform "Mark and Sweep" cycles on the intent list.
* **Why it matters:** In a high-performance ECS, you want your state mutations to be as "silent" to the GC as your component updates. Using a struct-based `CommandQueue` ensures that even during high-frequency combat or intense state changes, the memory footprint remains perfectly flat and predictable.

### Why this matters for your ECS

Your current architecture for `EntityStats` and `WeaponComponent` is **GC-friendly**. By keeping these structs packed and blittable (or using `unsafe` for buffers), you are preventing the GC from having to check thousands of individual components every frame. This is the single biggest performance win for an ECS with 5,000+ NPCs.

**In summary:** If your struct contains `string` or `class`, the GC is involved. If your struct is made of `int`, `float`, `bool`, or `fixed` arrays, you have successfully moved that data into a layout where the GC has little to no work to do.


## 5. Summary Theory

* **Why `LayoutKind.Explicit`?** It tells the compiler to stop guessing alignment. It is great for ensuring a struct occupies exactly as much memory as its data requires.
* **Why `unsafe`?** It is an "opt-in" for direct memory access. It is not about "bad" code; it is about taking control away from the GC. When you use `fixed` or pointers, you are effectively acting as your own memory manager.
* **The "Managed" Constraint:** You cannot use `FieldOffset` or `unsafe` with managed types (`string`/`class`) because the GC needs to move them around. If you force an `Explicit` layout on a `string`, you will corrupt memory and crash the application.

**Design Rule:** Always build your logic with **Safe Structs** first. Only escalate to **Explicit Layout** or **Unsafe Fixed Buffers** when you have measured a performance bottleneck and proven that better memory alignment or cache locality is required.


* * *


# Performance Analysis

Even when shifting focus entirely toward flexibility, maintainability, and text-file composition (`JSON`), this architecture handles 5,000 entities seamlessly. It is specifically designed to bypass the two massive bottlenecks that typically cripple traditional engines: **Memory Indirection Loops** (caused by pointer-chasing and heap-allocated objects) and **Algorithmic Cascades** (caused by O(N²) proximity checks and per-entity script overhead).

Here is how the concepts we established—**blittable structs, cache-friendly sieves, and arithmetic tokenization**—make handling 5,000 entities trivial.

#### 1. Simple Stream Operations: Movement and Attacks (O(N))

* **The Flexibility:** Behaviors are defined via data-driven tags in `npcs.json`.
* **The Execution:** By utilizing **Structure of Arrays (SoA)** patterns in our `EntitySieve`, we avoid loading unnecessary metadata into the CPU cache. The `MovementSystem` performs linear, contiguous sweeps across component arrays. Because these are packed, blittable types, the CPU pre-fetcher can pull data into L1 cache with near-zero latency, processing 5,000 entities in **under 0.05ms**.

#### 2. The Filter Advantage: Sparse Index Caching (O(K))

When implementing status effects like "Frozen," we avoid the "Naive Engine" trap of iterating all 5,000 entities to check for a status flag.

* **The Execution:** We utilize the **Entity Sieve** to maintain a packed, contiguous array of only those `EntityIds` currently affected by the status. The system processes only the active `K` entities (e.g., 40 frozen units), skipping the other 4,960 without executing a single conditional branch.

#### 3. Dynamic Combat Math: Tokenized Arithmetic

To keep balance formulas flexible via JSON, we avoid string-parsing at runtime, which would be prohibitively slow.

* **The Execution:** At bootstrap, your engine parses combat formulas (e.g., `"BaseDamage + (Str * 1.5)"`) into an **Arithmetic Execution Tree**. During the simulation tick, the `FormulaProcessor` performs direct memory lookups against our `EntityStats` pools, feeding raw values into pre-compiled math trees, allowing for high-frequency combat calculations without string overhead.

#### 4. Spatial Grid Matrix & Structural Command Buffers

We prevent frame spikes during pathfinding and target scanning using two architectural buffers:

* **Spatial Grid Matrix:** Instead of O(N²) target scanning, entities register their coordinates into a lightweight grid map. Scans are limited to immediate grid neighbors, reducing complexity to nearly O(1) per scan.
* **Command Buffer (Time-Slicing):** Heavy operations like long-range A* pathfinding are pushed into a `Structural Command Buffer`. The engine slices these operations, capping their execution time per frame (e.g., 2ms) to ensure the simulation loop remains consistent regardless of total pathfinding demand.

---

### Summary Frame Budget Distribution (5,000 Entities)

| Simulation Subroutine | Complexity | Estimated CPU Time | Underlying Paradigm |
| --- | --- | --- | --- |
| **1. Pipeline Sorting** | O(1) | ~0.02 ms | Manifest-driven system ordering |
| **2. Spatial Grid Registration** | O(N) | ~0.25 ms | Contiguous memory grid map |
| **3. Proximity Target Scanning** | O(N log N) | ~0.50 ms | Neighborhood-based grid lookup |
| **4. Combat Formula Eval** | O(K) | ~0.30 ms | Tokenized mathematical trees |
| **5. Time-Sliced Pathfinding** | Constant | ~2.00 ms | Command Buffer queue management |
| **6. Linear Physics/Movement** | O(N) | ~0.05 ms | Blittable struct stream processing |
| **7. Deferred Lifecycle Flush** | O(C) | ~0.15 ms | Array-based state synchronization |
| **Total Simulation Cost** | — | **~3.27 ms** | **Uses <10% of a 33.33ms (30Hz) frame.** |

<br>

### Architectural Roadmap: Moving Toward Production-Ready ECS

The current implementation uses Array-of-Structs (AoS) pattern. While it leverages `[StructLayout(LayoutKind.Explicit)]`, `Span<T>`, and `unsafe` buffers to achieve high performance, the following shifts will move you from "fast" to "ECS-native" scale:

1. **Transition to SoA (Structure of Arrays):** Instead of storing chunky structs in one array, split `CharacterStats` into individual component arrays. This prevents loading unused fields (like `Mana`) when the CPU only needs to process `Health`.
2. **Eliminate Search Logic:** Replace linear searches in `EntityRegistry` with direct indexing using `EntityId`. In an ideal ECS, `EntityId` *is* the index into all component pools.
3. **Replace Dictionaries with Arrays:** Move metadata (names/weapons) from `Dictionary<int, string>` to direct-indexed `string[]`. This replaces expensive hash-map lookups with O(1) memory address calculations.
4. **Bitmasking for Existence:** Replace `bool[]` existence arrays in `EntitySieve` with `BitArray` or `long[]` bitmasks. This dramatically increases cache density by reducing the memory footprint of status checks to 1 bit per entity.

By shifting from an **Array-of-Structs (AoS)** model to a **Structure-of-Arrays (SoA)** model and eliminating dictionary lookups, you will achieve an engine architecture that is not only highly flexible for JSON-based design but capable of scaling to tens of thousands of entities.

* * *

# AoS vs SoA

Array-of-Structs (AoS) pattern is the less complicated "bridge" between Object-Oriented Programming and Data-Oriented Design.

When transitioning to a high-performance architecture, AoS is often the first step because it is more intuitive, easier to debug, and drastically more efficient than the "Object-Oriented" way of doing things, even if it is not the *theoretical* maximum performance of a pure ECS.

Here is the breakdown of why we started with AoS and why SoA is the "next level" for your engine.

### 1. The Progression of Performance

When you move from `class` objects to `struct` arrays, you achieve the biggest performance gains immediately:

* **GC Pressure:** Dropping from thousands of individual objects to contiguous memory arrays (AoS) eliminates almost all GC thrashing.
* **Cache Locality:** Even in AoS, if your structs are "blittable" (like your `WeaponComponent`), they are packed side-by-side. When the CPU loads one `WeaponComponent` into the cache, it often pulls the next 3–4 components into the same cache line automatically.

AoS is **"Good Enough"** for most game logic because it provides the majority of the cache benefits while remaining very easy to read and maintain.

### 2. Array-of-Structures (AoS)

AoS keeps "related data" together in a single conceptual bucket.

* **Ease of Use:** If you want to check an entity's status, you grab one struct: `EntityStats data = registry[id];`. It feels like working with a singular object.
* **Complexity:** Implementing SoA requires splitting that struct into five different arrays (`int[] healths`, `int[] strengths`, `bool[] isDirtys`, etc.). This adds significant boilerplate code to your `EntityRegistry` and `EntitySieve` because you now have to synchronize the indices of five arrays instead of just one.

In AoS, you bundle fields into a single `MovementComponent` struct and store them in one continuous array (e.g., `MovementComponent[]`).

* **The Advantage (Maintainability & "Bulk" Processing):** When `MovementSystem` needs to calculate a new position, it fetches the entire `MovementComponent` struct in one operation. This is highly efficient for complex movement logic where the CPU needs `Velocity`, `Speed`, `Acceleration`, and `Friction` simultaneously. Because all these fields are bundled together in memory, the CPU can pre-fetch the data for the next entity before the loop even requests it.
* **The Scalability Limit (Cache Pollution):** If you iterate through 5,000 entities but a specific pass of your `MovementSystem` *only* needs to update the `Transform`, you are still loading the `Acceleration` and `Friction` bytes into the cache anyway. If your struct grows too large (e.g., exceeding 64 bytes), you may inadvertently fetch "garbage" data that displaces other useful information, eventually leading to increased cache misses.

    ```csharp
    using System.Runtime.InteropServices;
    using System.Numerics;
    using Source.Core.Math;

    namespace Source.Engine;

    [StructLayout(LayoutKind.Explicit, Size = 32)] // Total size: 32 bytes
    public struct MovementComponent
    {
        [FieldOffset(0)]  public Transform2D Transform; // Transform2D (Assuming 8 bytes for Origin)
        [FieldOffset(8)]  public Vector2 Velocity; // Vector2 Velocity (8 bytes)
        [FieldOffset(16)] public Vector2 LastPosition; // Vector2 LastPosition (8 bytes)
        [FieldOffset(24)] public float Speed; // float Speed (4 bytes)
        [FieldOffset(28)] public bool Active; // bool Active (1 byte)
        [FieldOffset(29)] public bool HasLastPosition; // bool HasLastPosition (1 byte)
    }
    ```

    ```csharp
    namespace Source.Engine;

    public class MovementBuffers
    {
        // The AoS (Array of Structures) buffer
        public MovementComponent[] Components = new MovementComponent[EngineConfig.MaxEntities];
    }
    ```

    ```csharp
    using System;
    using Source.Engine;

    namespace Source.Systems.Movement;

    public static class MovementSystem
    {
        public static void Update(Span<MovementComponent> components, float deltaTime)
        {
            for (int i = 0; i < components.Length; i++)
            {
                // Accessing the component by ref allows us to modify the data in-place
                ref var comp = ref components[i];

                if (!comp.Active)
                    continue;

                // Simple, readable access to bundled properties
                comp.Transform.Origin += comp.Velocity * comp.Speed * deltaTime;
            }
        }
    }
    ```
    ```csharp
    // EngineDriver.cs
    MovementSystem.Update(_moveBuffers.Components, deltaTime);
    ```

### 3. Structure-of-Arrays (SoA)

SoA becomes the "better" choice only when your systems become highly specialized.

* **The "Partial Data" Problem:** If your `CombatSystem` only needs `Damage` and `Strength`, but your `EntityStats` struct also contains `Mana`, `EquippedItemIds`, and `IsDirty`, your CPU is loading "dead weight" into the cache line.
* **The SoA Solution:** By using SoA, you split those fields into separate arrays. The `CombatSystem` only loads the `Damage[]` and `Strength[]` arrays. Because there is no "dead weight," you can fit many more entities into a single L1 cache line, which is why SoA is the standard for high-performance ECS libraries (like Unity's DOTS or Flecs).

In SoA, you store each field in its own continuous array (e.g., `Velocities[]`, `Speeds[]`).

* **The Advantage (Cache Efficiency):** When `MovementSystem` runs, it primarily requires the `Transform2D` and `Velocity` data to update positions. Because your data is partitioned into separate arrays, the CPU loads only the relevant vectors into the cache lines. You avoid "cache pollution" by not loading unused properties (like `LastPositions` or `Active` status) that the `MovementSystem` loop might not need for every iteration.
* **The Scalability Limit:** As your movement logic becomes more complex (e.g., adding `Friction`, `Acceleration`, or `Gravity` coefficients), your `EngineDriver` must pass an ever-increasing number of individual arrays into the `MovementSystem`. This increases "register pressure" and makes it difficult for the CPU to efficiently manage the dozens of disparate memory pointers required to perform a single update.

    ```csharp
    using Source.Core.Math;
    using System.Numerics;

    namespace Source.Engine;

    public class MovementBuffers
    {
        // The SoA (Structure of Arrays) buffers
        public Transform2D[] Transforms = new Transform2D[EngineConfig.MaxEntities];
        public Vector2[] Velocities = new Vector2[EngineConfig.MaxEntities];
        public Vector2[] LastPositions = new Vector2[EngineConfig.MaxEntities];
        public float[] Speeds = new float[EngineConfig.MaxEntities];
        public bool[] Active = new bool[EngineConfig.MaxEntities];
        public bool[] HasLastPosition = new bool[EngineConfig.MaxEntities];
    }
    ```

    ```csharp
    using System;
    using System.Numerics;
    using Source.Core.Math;

    namespace Source.Systems.Movement;

    public static class MovementSystem
    {
        public static void Update(
            Span<Transform2D> transforms,
            Span<Vector2> velocities,
            Span<float> speeds,
            ReadOnlySpan<bool> activeMask,
            float deltaTime)
        {
            // Move everybody
            for (int i = 0; i < transforms.Length; i++)
            {
                if (!activeMask[i])
                    continue;

                transforms[i].Origin += velocities[i] * speeds[i] * deltaTime;
            }
        }
    }
    ```

    ```csharp
    // EngineDriver.cs
    MovementSystem.Update(_moveBuffers.Transforms, _moveBuffers.Velocities, _moveBuffers.Speeds, _moveBuffers.Active, deltaTime);
    ```

### Performance Comparison Table (5,000 Entities)

| Metric | AoS (MovementComponent) | SoA (Current) |
| --- | --- | --- |
| **Cache Usage** | Good (General Purpose) | Optimal (High Precision) |
| **Complexity** | Low (Single bundled object) | High (Managing many arrays) |
| **System Flexibility** | High (Easier to add features) | Rigid |
| **Memory Throughput** | Best for general simulation | Best for specialized loops |

### Summary: Was I wrong to suggest AoS?

Not at all. You have successfully implemented a **Data-Oriented** architecture by moving to structs and manual layout control, which is the hardest part.

* **Think of AoS as "DOD-Lite":** It gets you 90% of the performance gains of a professional engine with 10% of the architectural complexity.
* **Think of SoA as "DOD-Pro":** It is the optimization you pull out when you have reached your entity limit and need to squeeze out that final 10% of performance.

**My recommendation:** Stay with your current AoS implementation while you build your features. Only refactor to SoA if you find that a specific system (like the Combat Processor) is causing a cache-miss bottleneck that prevents you from reaching your entity count goals.

---

### Use Case: 5000 Entities

When scaling to 5,000 entities, the performance difference between your current **Structure-of-Arrays (SoA)** and the proposed **Array-of-Structures (AoS)** (`MovementComponent`) is primarily a trade-off between **Cache Locality** and **Data-Processing Efficiency**.

Here is how they compare at scale:

### The Verdict for 5,000 Entities

For a game engine with 5,000 entities, **the bottleneck is rarely the raw layout (SoA vs AoS), but rather the total amount of memory being touched per frame.**

* **Stay with SoA if:** Your primary goal is maximum FPS and you are willing to manage the complexity of keeping many arrays in sync. This is the "high-performance" choice used in games like *Factorio* or *RimWorld*.
* **Move to AoS (`MovementComponent`) if:** You want to evolve your engine’s feature set (steering, pathfinding, combat). The productivity gain from having cleaner code far outweighs the minor cache efficiency cost at 5,000 entities. Modern CPUs are excellent at pre-fetching memory; as long as you iterate linearly (`for` loop), the performance difference between SoA and AoS will be negligible at this scale.

### 1. What are you using right now (SoA)?

Based on `MovementBuffers.cs` and `MovementSystem.cs`, your movement logic currently relies on these specific variables:

* **`Transforms` (`Transform2D[]`)**: Your primary position data (The "Where").
* **`Velocities` (`Vector2[]`)**: The direction and magnitude of movement (The "Intent").
* **`Speeds` (`float[]`)**: A multiplier for velocity (The "Constraint").
* **`Active` (`bool[]`)**: The participation mask for your loops.
* **`LastPositions`** / **`HasLastPosition`**: Used for collision resolution to revert invalid moves.

Your `MovementSystem.Update` currently pulls these as separate `Span<T>` buffers.

### 2. Is AoS (`MovementComponent`) worth it?

#### The "Yes" (Why AoS wins on Architecture):

* **Reduced Complexity**: Your `EngineDriver.Tick()` loop currently passes 5+ separate buffers into `MovementSystem` and `CollisionSystem`. A `MovementComponent` would turn these into a single `Span<MovementComponent>`, cleaning up your driver significantly.
* **Feature Expansion**: You mentioned wanting to implement steering behaviors. If you add `Acceleration` and `Friction` to a `MovementComponent`, those variables will always be bundled with the entity's velocity. In your current SoA setup, you would have to create *two new global arrays* (`Accelerations[]`, `Frictions[]`) and update every system to pass them around.

#### The "No" (Why your current SoA is strong):

* **Cache Locality**: You are currently operating at a scale where cache efficiency is king. Your `MovementSystem` is incredibly fast because it *only* loads the `Transform`, `Velocity`, and `Speed` memory into the CPU cache. It doesn't waste bandwidth loading variables it doesn't need for that specific pass.
* **Zero-Overhead**: Your code is already working and highly optimized for your current tick loop.

### 3. My Recommendation

* Use **SoA** if performance is your absolute #1 priority.
* If you are feeling the pain of "Argument Sprawl" (where every function signature has 7+ parameters), **implement the AoS `MovementComponent`**. The loss in minor cache efficiency at 5,000 entities is almost always worth the massive gain in code readability and the ability to easily add new movement features like friction or acceleration.
 * Refactor to the `MovementComponent` struct. At 5,000 entities, your CPU can easily handle the minor cache footprint of the struct, and the resulting code will be vastly easier to debug and extend as you add more complex systems.
* **If you want the best of both worlds**: You can keep your `Transform2D` in its own array (because *every* system needs it), but bundle your **per-entity movement stats** (`Velocity`, `Speed`, `Acceleration`, `Friction`) into a `MovementComponent` struct.


### How to decide based on your roadmap:

If your next step is **Steering Behaviors** (as mentioned in your `movement.md`), **definitely move to the `MovementComponent` AoS**. Steering behaviors require constant access to `Acceleration`, `MaxSpeed`, and `Friction` simultaneously. If you keep these in separate arrays, your code will become extremely difficult to manage as those systems grow in complexity.

**Does your current `EngineDriver` feel bloated with the current parameter passing, or is it still manageable for you to add one or two more arrays to the system?**

* * *

# `for` over `foreach`

For high performance requirements, like calculating movement or combat every frame, use `for` loops over `foreach` loops.
