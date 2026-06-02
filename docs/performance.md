# Performance

## C, C++ and C# game tick comparison

Here is how a single frame lifecycle **"Tick"** executes across all three languages.

In a strategy game like *Harpoon*, a tick involves checking the **Command Queue** for incoming player or AI decisions, running the **ECS Systems** (Movement and Sensor Sweeps), and passing the updated state to the **View** for rendering.

To keep the comparison clean and realistic, these snippets assume the data has already been parsed from your JSON file into flat arrays or vectors.

### 1. In C (Raw Arrays & Index Loops)

In C, your game world is a collection of parallel arrays. A system is just a plain function that accepts pointers to those arrays and loops through them by integer indices.

```c
#include <stdio.h>

#define MAX_ENTITIES 3

// Components
typedef struct { float x; float y; } Position;
typedef struct { float heading; float speed; } Velocity;
typedef struct { float radar_range; } Sensors;

// Systems (The Logic)
void movement_system(Position* positions, const Velocity* velocities, int count, float dt) {
    for (int i = 0; i < count; i++) {
        // Simple vector projection (simplified for 2D grid)
        positions[i].x += velocities[i].speed * dt; 
    }
}

void sensor_system(const Position* positions, const Sensors* sensors, int count) {
    for (int i = 0; i < count; i++) {
        if (sensors[i].radar_range > 0.0f) {
            printf("Entity %d sweeping radar array: Range %.1f NM\n", i, sensors[i].radar_range);
        }
    }
}

// The Single Frame Tick
void game_tick_c(Position* positions, Velocity* velocities, Sensors* sensors, int count, float dt) {
    printf("--- [C TICK START] ---\n");
    
    // 1. Update Game Model (Logic Systems)
    movement_system(positions, velocities, count, dt);
    sensor_system(positions, sensors, count);
    
    // 2. View Render Phase (Simulated)
    printf("Render View: Entity 0 is at X: %.1f\n", positions[0].x);
}

int main() {
    Position positions[MAX_ENTITIES] = { {0,0}, {10,10}, {50,50} };
    Velocity velocities[MAX_ENTITIES] = { {90, 20}, {180, 500}, {0, 0} }; // Speed in knots
    Sensors  sensors[MAX_ENTITIES]    = { {160.0f}, {220.0f}, {0.0f} };

    // Simulate 1 frame tick with delta time of 1 second
    game_tick_c(positions, velocities, sensors, MAX_ENTITIES, 1.0f);
    return 0;
}

```

### 2. In C++ (Data-Oriented std::vector Pools)

C++ can group components into dynamic arrays (`std::vector`). We use a reference-based loop (`auto&`) to process entities, ensuring maximum CPU cache efficiency without copying the structs.

```cpp
#include <iostream>
#include <vector>

struct Position  { float X; float Y; };
struct Velocity  { float HeadingDegrees; float SpeedKnots; };
struct Sensors   { float RadarRangeNM; };

// Systems grouped into cleanly separated namespaces or static classes
namespace GameSystems {
    void UpdateMovement(std::vector<Position>& positions, const std::vector<Velocity>& velocities, float dt) {
        for (size_t i = 0; i < positions.size(); ++i) {
            positions[i].X += velocities[i].SpeedKnots * dt;
        }
    }

    void RunSensors(const std::vector<Position>& positions, const std::vector<Sensors>& sensors) {
        for (size_t i = 0; i < sensors.size(); ++i) {
            if (sensors[i].RadarRangeNM > 0.0f) {
                std::cout << "Entity " << i << " Radar active out to " << sensors[i].RadarRangeNM << " NM\n";
            }
        }
    }
}

// The Single Frame Tick
void GameTickCPP(std::vector<Position>& positions, const std::vector<Velocity>& velocities, const std::vector<Sensors>& sensors, float dt) {
    std::cout << "--- [C++ TICK START] ---\n";

    // 1. Model Logic Update
    GameSystems::UpdateMovement(positions, velocities, dt);
    GameSystems::RunSensors(positions, sensors);

    // 2. View Render Phase (Simulated via const reference reading)
    std::cout << "Render View: Entity 0 is at X: " << positions[0].X << "\n";
}

int main() {
    std::vector<Position> positions = { {0,0}, {10,10}, {50,50} };
    std::vector<Velocity> velocities = { {90, 20}, {180, 510}, {0, 0} };
    std::vector<Sensors>  sensors    = { {160.0f}, {220.0f}, {0.0f} };

    GameTickCPP(positions, velocities, sensors, 1.0f);
    return 0;
}

```

### 3. In C# (High-Performance Span and Ref Loops)

To keep C# running at native speeds for your ECS arrays, we use `Span<T>`. A `Span<T>` provides direct, safe, continuous access to memory layout. By using `ref var`, we can modify the fields of a struct inside an array directly without generating garbage collection allocations.

Systems written with Span<T> match C++ performance. C# can approach or match C++ performance in many data-oriented workloads (ECS updates, serialization, networking, numerical processing, business logic).

```csharp
using System;

public struct Position  { public float X; public float Y; }
public struct Velocity  { public float HeadingDegrees; public float SpeedKnots; }
public struct Sensors   { public float RadarRangeNM; }

public class SimulationEngine
{
    // Systems written with Span<T> match C++ performance
    public static void UpdateMovement(Span<Position> positions, ReadOnlySpan<Velocity> velocities, float dt)
    {
        for (int i = 0; i < positions.Length; i++)
        {
            // 'ref' prevents copying the struct, editing the array element directly in memory
            ref var pos = ref positions[i]; 
            pos.X += velocities[i].SpeedKnots * dt;
        }
    }

    public static void RunSensors(ReadOnlySpan<Sensors> sensors)
    {
        for (int i = 0; i < sensors.Length; i++)
        {
            if (sensors[i].RadarRangeNM > 0.0f)
            {
                Console.WriteLine($"Entity {i} sweeping sensors. Target Acquisition Zone: {sensors[i].RadarRangeNM} NM");
            }
        }
    }

    // The Single Frame Tick
    public static void GameTickCSharp(Position[] positions, Velocity[] velocities, Sensors[] sensors, float dt)
    {
        Console.WriteLine("--- [C# TICK START] ---");

        // 1. Model Logic Update (Passing arrays seamlessly as Performance Spans)
        UpdateMovement(positions, velocities, dt);
        RunSensors(sensors);

        // 2. View Render Phase
        Console.WriteLine($"Render View: Entity 0 is at X: {positions[0].X}");
    }

    static void Main()
    {
        Position[] positions = [ new() { X = 0, Y = 0 }, new() { X = 10, Y = 10 } ];
        Velocity[] velocities = [ new() { HeadingDegrees = 90, SpeedKnots = 22 }, new() { HeadingDegrees = 180, SpeedKnots = 510 } ];
        Sensors[] sensors = [ new() { RadarRangeNM = 160.0f }, new() { RadarRangeNM = 220.0f } ];

        GameTickCSharp(positions, velocities, sensors, 1.0f);
    }
}

```

### Performance & Design Takeaways for your Strategy Game

* **Memory Layout Convergence:** Notice that the core system loops are almost identical. Because all three implementations keep the data packed in flat arrays, your CPU treats them virtually the same, giving you elite performance across the board.
* **Why C# is so compelling here:** Look at the C# `UpdateMovement` system. By wrapping your standard arrays in a `Span<T>` and using `ref positions[i]`, C# enable the JIT to generate code where many bounds checks and copies can be eliminated while preserving safety guarantees, rendering your critical calculations just as fast as pointer operations in C or C++, but without risking a segmentation fault.



## C# convenience plus efficiency

For a long time, the software world had a strict rule: **Choose C/C++ for maximum speed, or choose C# for security and development velocity.** Today, thanks to a massive performance overhaul in modern .NET (.NET Core through .NET 8/9/10), that rule is dead.

C# can now match C and C++ speeds by giving you **low-level control when you need it, and high-level safety when you don't.**

Here is the secret behind how C# achieves this wizardry.

### 1. Value Types vs. Reference Types (The Memory Layout)

The reason C and C++ are traditionally fast isn't magic; it's because they let you arrange data in flat rows (contiguous memory) inside the CPU cache.

* **Traditional Managed Languages (like Java or old C#):** Every time you create an object using a `class`, it allocates memory scattered all over the place (the managed heap). The CPU has to jump around like crazy to read it, which ruins performance and triggers the feared Garbage Collector (GC) to clean it up later.
* **Modern C# with Structs:** When you use a `struct` instead of a `class` in C#, it becomes a **Value Type**. This means the memory layout is often similar to C. If you make an array of 1,000 `structs`, C# allocates one single, flat, continuous block of memory.

The CPU can stream through that array just as fast as it would stream through a C array, greatly reducing the Garbage Collector pressure.

### 2. Pointers vs. `Span<T>` (Speed with a Seatbelt)

In C or C++, to manipulate blocks of memory at maximum speed, you have to use raw pointers (`int* ptr`). Pointers have no boundaries. If your math is wrong, a pointer will happily read or overwrite memory belonging to another part of your computer, causing a spectacular crash (Segmentation Fault) or a critical security vulnerability.

C# solves this with **`Span<T>`**.

Think of a `Span<T>` as a managed pointer with a built-in seatbelt. It points directly to a raw chunk of memory (just like a C pointer) for maximum execution speed, but **the runtime ensures you can never read past the boundaries of that memory**.

You get the raw performance of a direct hardware memory pass, but if you accidentally try to read element 101 out of a 100-element array, C# throws a clean exception instead of letting your game corrupt its own data.

### 3. The `ref` and `in` Keywords: No Copying Allowed

In standard C#, when you pass a `struct` into a function, the computer duplicates the entire struct. If your strategy unit has components tracking 50 different weapon states and positions, copying that data 60 times a second will slow your game to a crawl.

By using the modern **`ref`** and **`in`** keywords, C# passes a direct memory address instead of making a copy:

```csharp
// 'in' passes by reference but makes it read-only (super safe!)
void CheckRadarRange(in PositionComp pos, in SensorsComp radar) {
    // Highly efficient math directly on the array memory, zero data copying.
}
```
Both the **`ref`** and **`in`** keywords are parameter modifiers used to pass arguments to a method **by reference** (meaning the method receives the exact memory address of the variable rather than a copied version of its data).

The fundamental difference lies in whether the method is allowed to modify the underlying data:

* **`ref` (Read/Write Reference):** Passes a variable by reference and gives the method full permission to read and **modify** its values. Any assignment made to the parameter inside the method instantly changes the original variable at the call site. It is typically used when a value type needs to be mutated directly in place to avoid the performance penalty of returning a new struct.
* **`in` (Read-Only Reference):** Passes a variable by reference but strictly enforces **read-only** access. The compiler treats the parameter as immutable, meaning any attempt to modify its fields inside the method will result in a compile-time error. It is primarily used as an optimization technique to pass large, heavy structures efficiently without the overhead of copying bytes, while still guaranteeing the original data remains safe from accidental side effects.

#### Key Differences at a Glance

| Feature | `ref` | `in` |
| --- | --- | --- |
| **Passes by Pointer?** | Yes (64-bit memory address) | Yes (64-bit memory address) |
| **Data Modification** | **Allowed** (Mutates original variable) | **Forbidden** (Enforced by compiler) |
| **Call-Site Requirement** | Must explicitly type `ref` | Optional to type `in` (Compiler infers it) |
| **Variable Initialization** | Must be initialized before passing | Must be initialized before passing |

### The Catch: You Have to Code Differently

While C# *can* be as efficient as C++, **it is not efficient by default.**

If you write standard object-oriented C# code using `class`, `new`, and heavy LINQ queries (`List.Where().Select()`), you will generate tons of memory trash, trigger the Garbage Collector, and drop frame rates.

But because you have explicitly chosen a **Data-Driven ECS architecture using flat arrays of Structs**, you are naturally coding in a way that aligns perfectly with C#'s high-performance features. You get the elite memory performance of a C++ engine, while keeping the reflection, fast compile times, and absolute stability of C#.

## Hybrid architecture

That combination of traits is exactly why C# is often considered the "sweet spot" for modern systems architecture—especially for games like *Harpoon* where you have distinct layers of heavy simulation mixed with heavy user interface and configuration data.

Your point highlights the ultimate superpower of C#: **Architectural Bifurcation** (splitting your codebase into a high-performance track and a high-convenience track).

Here is how that looks in practice for your specific game structure:

### Track 1: The High-Performance Core (The ECS Model)

For your simulation loops—calculating line-of-sight for 500 missiles, tracking radar cross-sections, and letting the enemy AI evaluate tactical positions—you use the strict, high-performance C# features:

* **Data structures:** Contiguous arrays of `struct`.
* **Execution:** `Span<T>`, `ref`, and `in` parameters.
* **Result:** Direct-to-hardware cache efficiency matching C/C++, with 100% memory safety. Zero Garbage Collection overhead here.

### Track 2: The High-Convenience Shell (The Views, Controllers, and Tools)

For parts of the game where code executes only once a frame, once a minute, or only when a player clicks a button, performance doesn't matter. You can immediately drop back into the ultra-convenient, luxurious side of C#:

* **The Input Controller:** Use **LINQ** queries to easily filter user keybindings or parse incoming command strings.
* **The View / UI:** Use traditional **Classes**, inheritance, and heavy event-driven programming to manage windows, text menus, buttons, and maps.
* **The Data Factory:** Use **Reflection** and automatic JSON serialization to seamlessly load your blueprints at startup.

### Updated Mental Model: Where the Languages Actually Sit

If we re-evaluate the languages based on this capability, the landscape shifts drastically:

* **Pure C** forces you to stay in the "manual, low-level performance" box for 100% of your codebase. You are writing manual string parsing code for your JSON, and manual array logic for your UI.
* **C++** allows you to mix paradigms, but the safety standard remains low. A mistake in your high-convenience UI code can still corrupt the memory of your high-performance simulation core and crash the entire program.
* **C#** gives you a safe dial. You can dial it down to "C-speed mode" for your core physics/AI arrays, and instantly dial it up to "Python/JavaScript-convenience mode" for your UI, tools, and file loading—and the safe runtime walls ensure a bug in your UI can never corrupt your simulation memory, unless you use `unsafe`, native interop, `Marshal` or P/Invoke.

For a solo developer or a small team building a complex data-driven strategy game, being able to pivot between raw hardware performance and high-level productivity in the exact same file is about as close to perfect as game architecture gets.

## Summary

C# is often described as the "best of both worlds" because it manages to bridge a massive industry divide: it provides the **high-level productivity, safety, and speed of development** found in languages like Java or Python, combined with the **low-level memory control, optimization, and performance features** traditionally reserved for C or C++.

Historically, you had to choose between a fast-to-write language that runs on a heavy virtual machine with a garbage collector, or a fast-to-execute language where a single missing pointer syntax could crash the entire operating system.

C# successfully eliminates this compromise through several modern features:

### 1. Value Types (`struct`) vs. Reference Types (`class`)

In languages like Java, almost everything is an object living on the **Heap**. This means even a simple 2D coordinate $(X, Y)$ requires a heap allocation, memory tracking, and pointer dereferencing to read.

C# lets you choose exactly how memory is laid out using `struct`:

* **`class` (Reference Type):** Managed by the Garbage Collector on the heap. Great for complex systems, business logic, and entity hierarchies.
* **`struct` (Value Type):** Structs are value types, and are stored inline wherever their containing storage lives (on the stack, on the heap, inside arrays or classes or native buffers). When you create an array of 1,000 entities using a struct, they sit sequentially next to each other in memory. This is incredibly friendly to your CPU's cache, drastically speeding up math-heavy systems like game physics or data pipelines without triggering the Garbage Collector.

### 2. Modern Safety with Performance: `ref` and `ReadOnlySpan<T>`

In C or C++, passing a massive chunk of data efficiently meant passing a raw memory pointer. If you made a mistake, you wrote into forbidden memory (causing Segfaults or security leaks).

Modern C# introduced features that allow you to pass data by reference safely:

* **`ref struct`:** Structs that are strictly constrained to the CPU stack, making it physically impossible for them to escape or cause memory leaks.
* **`Span<T>` and `ReadOnlySpan<T>`:** These act like secure, bounds-checked pointers to any contiguous block of memory (whether it's on the stack, the heap, or even native unmanaged C++ memory). You can manipulate or read subsets of arrays or text strings at maximum raw speed, completely eliminating memory allocations and string copying, while the compiler guarantees you can never read outside the allowed boundaries.

### 3. Escape Hatches when Needed: `unsafe` and Pointers

Unlike most high-level managed languages that strictly lock you inside a "sandbox," C# trusts the developer. If you are writing a high-performance game graphics engine, an AI matrix multiplier, or communicating directly with hardware drivers, you can mark a block of code as `unsafe`.

Inside an `unsafe` block, C# unlocks raw C-style pointers (`*`, `&`, `->`). You can manually pinning memory, perform pointer arithmetic, and bypass the execution engine completely. Because it requires the `unsafe` keyword, your high-performance code is neatly isolated, keeping the rest of your application completely safe and stable.

### 4. Managed Execution with Low-Level Layout Control

Even when writing standard managed code, C# allows you to decorate your data structures with explicit layouts using attributes like `[StructLayout(LayoutKind.Explicit)]`.

This lets you tell the compiler exactly how many bytes wide a structure is, map variables to the exact same memory positions (C-style unions), or force alignment for hardware serialization. You get total control over the binary footprint while still enjoying a modern, garbage-collected environment.

### Summary

C# gives you a modern ecosystem filled with advanced language features (LINQ, async/await, pattern matching) for 95% of your application, but gives you the exact low-level primitives needed to optimize the critical 5% of your performance bottlenecks. For projects like video games (e.g., Unity, Stride), simulation engines, and high-throughput data backends, it eliminates the need to rewrite performance-critical sections in a completely different language.

## `ref/in` vs `Span<T>/ReadOnlySpan<T>`

Both `ref`/`in` and `Span<T>`/`ReadOnlySpan<T>` are advanced performance features in C# designed to avoid copying data and eliminate heap allocations. Because they have similar goals, it's very common to wonder how they differ.

The simplest way to understand the difference is their scope:

* **`ref` and `in**` operate on **individual, single variables or single struct instances**.
* **`Span<T>` and `ReadOnlySpan<T>**` operate on **contiguous sequences or arrays of data** (or sections of them).

### 1. `ref` and `in` (Pass a Single Item by Reference)

The `ref` and `in` keywords are modifiers applied to method parameters or variable declarations. Instead of passing an entire struct by value (which copies all its bytes onto the stack), they pass a **managed pointer** to that single slot in memory.

* **`ref`**: Passes a single variable by reference. The receiving method can **read and write** to it.
* **`in`**: Passes a single variable by reference, but treats it as **read-only**. The receiving method cannot modify it.

```csharp
// Modifies the actual component inside the global array directly
public void TakeDamage(ref StatsComponent stats, int damage)
{
    stats.Health -= damage; 
}

// Reads the attacker's entity struct without copying its bytes
public void LogAttacker(in Entity attacker)
{
    // attacker.Id = 99; // ❌ Compile error! 'in' makes it read-only.
    Console.WriteLine($"Attacker ID: {attacker.Id}");
}
```

### 2. `Span<T>` and `ReadOnlySpan<T>` (Pass a Window of Multiple Items)

`Span<T>` is a structure that wraps a chunk of contiguous memory. It acts as a universal, high-performance window over an entire collection, array, or a sliced sub-section of data.

* **`Span<T>`**: Provides **read and write** access to a contiguous sequence of elements.
* **`ReadOnlySpan<T>`**: Provides **read-only** access to a contiguous sequence of elements.

```csharp
// This method can take a raw array, a List, or a chunk of memory
public void ProcessAllStats(ReadOnlySpan<StatsComponent> statsPool)
{
    for (int i = 0; i < statsPool.Length; i++)
    {
        // We can safely read any index in the contiguous sequence
        Console.WriteLine($"Entity health: {statsPool[i].Health}");
    }
}

```

What makes `Span<T>` special is **Slicing**. You can view a specific subset of an array without allocating any new memory:

```csharp
// Grabs a window containing only indices 10 through 19 of our 100-character array
ReadOnlySpan<StatsComponent> teamSlices = registry.StatsPool.AsSpan(10, 10);
```

**Analogy:** `Span` is like a drone camera feed looking down at an entire block of houses. You can pan, zoom, view the whole row, or slice your focus onto just three specific houses in the middle, all without building a new neighborhood.

### The Hidden Connection: How they work together

While they look different, `Span<T>` actually uses `ref` under the hood!

A `Span<T>` is physically defined as a `ref struct` that contains two things:

1. A managed pointer (`ref T`) to the *beginning* of the memory block.
2. An integer `Length` tracking how many elements follow it.

Because of this, when you index into a span (`statsPool[i]`), C# is performing ultra-fast `ref` pointer arithmetic behind the scenes to find that exact memory location.

### When to use which in your Indie Game Architecture

For your simulation and roguelike pipeline, your choice will depend entirely on what your system is doing:

#### Use `ref` / `in` when:

* You are passing a **single entity component** into a sub-method to calculate something (e.g., passing a ship's `RadarComponent` by `in` to see if it's jammed).
* You pull a single element out of an ECS pool array and want to mutate it directly inside that array slot without making a temporary copy:
```csharp
ref var shipStats = ref registry.StatsPool[targetId];
shipStats.Fuel -= 10;

```

#### Use `Span<T>` / `ReadOnlySpan<T>` when:

* You are writing a **global loop system** that filters or updates rows of components (e.g., a `MovementSystem` looping through your entire array of positions).
* You want to safely pass your **entire ECS data pool** to another layer (like your UI view rendering loop) while guaranteeing that the UI code can read the sequence but is physically blocked from mutating it:
```csharp
ReadOnlySpan<StatsComponent> stats = registry.StatsPool;
view.RenderInterface(stats);

```

* You need to parse data packets or files (like reading chunk sequences out of a save file) and want to parse sub-buffers with zero heap allocation overhead.
