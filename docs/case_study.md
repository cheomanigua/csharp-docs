# Game

## Design Patterns

Based on the provided source code, your project implements three main software engineering design patterns, falling under the **Behavioral**, **Creational**, and **Architectural / Structural** categories.

Here is a breakdown of the design patterns found in your code, where they are implemented, and why they fit your data-driven ECS architecture:

### 1. The Command Pattern (Behavioral)

The **Command Pattern** encapsulates a request or action as an object, allowing you to parameterize clients with different requests, queue or log requests, and support undoable operations.

* **Where it is implemented:** Inside `Systems.cs`, you define the `IGameCommand` interface and the `AttackCommand` struct.
* **How it works in your project:** Instead of the `Program.cs` file directly telling the `CombatSystem` to deal damage, it instantiates an `AttackCommand` object. This object packages together the executioner, the target, the combat subsystem reference, and the specific skill payload into a clean, detached unit of work. When `controller.IssueCommand(in npcEntity, in attackCmd)` is invoked, the command executes its encapsulated payload.
* **Why it's useful here:** It creates a strict abstraction barrier between your input layer (your game loop simulation) and your heavy business logic systems (`CombatSystem`).

### 2. The Abstract Factory Pattern (Creational)

The **Abstract Factory Pattern** provides an interface for creating families of related or dependent objects without specifying their concrete classes.

* **Where it is implemented:** Inside `Systems.cs`, you define the `IEntityFactory` interface and implement the concrete `RpgEntityFactory` class.
* **How it works in your project:** Your game logic does not instantiate components manually via standard constructors inside the main application thread. Instead, you feed a single data-transfer structure (`CharacterTemplate`) into `registry.CreateCharacter(template)`. The factory automatically handles the creation of a unified entity handle, translates plain text lists into component structures, and maps everything sequentially into the back-end component memory buffers (`IdentityPool`, `StatsPool`, `SkillsPool`, `EquipmentPool`).
* **Why it's useful here:** This pattern isolates the parsing and composition of entities from your runtime logic. Your game loop doesn't need to understand how components are packed in memory; it just asks the factory for a structured entity.

### 3. The Model-View-Controller Architectural Pattern (MVC)

While not a pure structural pattern, **MVC** divides an application into three interconnected components to separate internal representations of information from the ways information is presented to the user.

* **Where it is implemented:** Your code utilizes a decoupled MVC layout, split across several files.
* **Model (The Components & Registry):** Your data layer is represented by the raw component structs inside `Core.cs` (`StatsComponent`, `IdentityComponent`, `SkillsComponent`) and the data pools held by the factory array grids.
* **View (`CharacterConsoleView`):** Referenced inside your namespace as a rendering utility. It reads continuous state parameters using `ReadOnlySpan` segments and prints them cleanly to the console terminal without altering or owning the components.
* **Controller (`CharacterController`):** Manages the processing timeline. It captures instructions—such as the manual command parameters passed at startup—and dispatches them out to be executed against the backend models.

* **Why it's useful here:** Separating your display views from your underlying data allows you to completely replace your console-based rendering with a full 2D or 3D graphics engine later on without modifying a single line of your core data components or combat math.

* * *

## ECS and Data Driven design

Yes, **Entity Component System (ECS)** and **Data-Driven Design** are absolutely implemented in your project, but with an important structural caveat: you have built a high-performance **Custom/Hybrid ECS** tailored to a data-driven pipeline, rather than utilizing a heavy, third-party general-purpose ECS framework.

Here is exactly how both patterns are achieved, where they live in your source code, and how they interact:

### 1. How Entity Component System (ECS) is implemented

Your architecture breaks down neatly into the three classic structural pillars of ECS:

#### **Entities (The "E" in ECS)**

* **What they are:** An entity should never be an object that holds its own data or behavior. It is purely a lightweight identifier.
* **Where it is in your code:** In `Core.cs`, `public readonly struct Entity` contains nothing but a single integer: `public readonly int Id;`. It acts simply as a row index pointer to look up data in the component arrays.

#### **Components (The "C" in ECS)**

* **What they are:** Components must be pure data structures (`structs`) containing no business logic or behavior.
* **Where it is in your code:** Inside `Core.cs`, you have defined pure data containers like `StatsComponent` (holding `Health` and `Mana`) and `SkillsComponent` (holding a bitmask integer).

#### **Systems (The "S" in ECS)**

* **What they are:** Systems hold all the global execution behavior, rules, and mathematical logic. They must be completely stateless regarding entity data; instead, they operate by filtering and mutating component arrays directly.
* **Where it is in your code:** Your `CombatSystem` inside `Systems.cs` is a textbook ECS system. When an attack triggers, it accepts an entity handle, looks up its raw positions in the component array arrays via its `Id`, and directly mutates the values inside the `StatsPool`.

#### **The ECS Memory Layout Win (Data-Oriented Design)**

Your factory (`RpgEntityFactory`) sets up pre-allocated, flat arrays for your components:

```csharp
public IdentityComponent[] IdentityPool = new IdentityComponent[100];
public StatsComponent[] StatsPool = new StatsComponent[100];
public int[] EquipmentPool = new int[100];
```

By doing this, your data sits tightly packed together back-to-back in your computer's RAM. When a system runs, the CPU can read these rows instantly with maximum hardware cache efficiency, completely avoiding the slow pointer-chasing and memory fragmentation issues typical of traditional object-oriented games.

### 2. How Data-Driven Design is implemented

Data-driven design means the rules, balance, parameters, and content of your game live **externally in text configuration assets**, and your code acts as a generic engine that reads and executes those files without requiring code updates.

Your project accomplishes this completely through three layout files:

1. **`weapons.json` (The Content Catalog):** Controls your items. If a designer wants to change a weapon's attributes or add a new one, they update this file. The C# code never hardcodes weapon values.
2. **`skills.json` (The Rules Engine):** Configures your combat metrics. It maps multipliers, ranges, and costs completely outside compiled code lines.
3. **`characters.json` (The World Blueprint):** Defines who entities are, what they have equipped, and what they know.

#### **The Runtime Serialization Bridge**

In `Program.cs`, your game initializes by streaming these asset tables into memory. It uses integer hashes (`template.EquippedWeapon.GetHashCode()`) and dynamic binary bitmasks (`SkillDatabase.GetCombinedBitmask()`) to instantly convert human-readable text labels into numbers your CPU can evaluate using raw hardware gates.

### Summary: The Final Architecture

Your project is a highly elegant symbiosis of both paradigms:

* **Data-Driven Design** handles the **Configuration and Composition** of your universe at startup (loading strings from JSON files and mapping them to database registries).
* **ECS** handles the **Execution and Simulation** of your universe during the gameplay frame loop (running zero-allocation, cache-friendly numerical operations on flat data blocks).

* * *

## Composition (ECS)

**Composition** is the foundational heart and soul of ECS. In fact, ECS was invented specifically to enforce **Composition over Inheritance** at a strict, hardware-enforced level.

To answer your question directly: **Yes, ECS automatically and inherently uses composition.** By its very nature, you cannot use inheritance to build an entity in a true ECS; you are forced to compose it.

Here is exactly how it works, how it contrasts with traditional object-oriented game development, and why it is a game-changer for your roguelikes, simulations, and NPC-driven crime games.

### The Problem with Inheritance (The "Deep Tree" Nightmare)

In traditional Object-Oriented Programming (OOP), you create games using inheritance (an object **is** a type of class).

Imagine you are building your Space Station Crime game. You start with a base class: `NPC`.

1. You need a standard crew member, so you inherit: `CrewMember : NPC`.
2. You need an automated cleaning droid that moves around the station, so you inherit: `StationDroid : NPC`.
3. You need a security guard who can attack a criminal: `SecurityGuard : CrewMember`.

Now, the designer comes to you with a classic rogue-like/simulation twist: *"We want a rogue security droid that has gone haywire, has relationship friction metrics with the crew, and can attack the player."*

Suddenly, your inheritance tree shatters. Where does `RogueSecurityDroid` go?

* If it inherits from `StationDroid`, it doesn't get the combat math from `SecurityGuard`.
* If it inherits from `SecurityGuard`, it inherits unnecessary organic traits (like blood type, hunger, or sleeping schedules) because it's inheriting from `CrewMember`.

This is called the **Diamond Dependency Problem** or the **Deep Hierarchy Trap**.

### How ECS Automatically Solves This via Pure Composition

In your custom ECS project, an entity **is nothing** on its own—it is just an empty ID integer. Instead of defining what an object *is*, you define what an object **has** by attaching independent data components to that ID.

To build that exact same universe using your factory layout, you just stitch components together like LEGO bricks:

```csharp
// 1. A standard human crew member
int alice = CreateEntityID();
IdentityPool[alice] = new IdentityComponent { Class = CharacterClass.Rogue };
StatsPool[alice]    = new StatsComponent { Health = 100, Mana = 0 };
SkillsPool[alice]   = new SkillsComponent { Skills = SkillDatabase.GetSingleBitmask("Illusion") };

// 2. A peaceful cleaning droid
int wallE = CreateEntityID();
DroidMovementPool[wallE] = new DroidMovementComponent { Battery = 100, Speed = 2.0f };
// (Notice: wallE has NO StatsPool or SkillsPool. It cannot be attacked or use weapons!)

// 3. The Rogue Security Droid (The magical mix-and-match!)
int terminator = CreateEntityID();
DroidMovementPool[terminator] = new DroidMovementComponent { Battery = 500, Speed = 5.0f };
StatsPool[terminator]         = new StatsComponent { Health = 300, Mana = 0 };
EquipmentPool[terminator]     = "assassins_dagger".GetHashCode(); // Give the robot a blade!
```

#### Why this is "Automatic":

You didn't have to write a custom `RogueSecurityDroid` class. You didn't have to refactor any base classes. The `CombatSystem` only looks for things that have a `StatsPool` and an `EquipmentPool`. Because your rogue droid has both, the `CombatSystem` automatically treats it as a combat-ready agent. Meanwhile, your `DroidBatterySystem` automatically runs its logic on it because it possesses a `DroidMovementComponent`.

### Why Composition via ECS is Perfect for Your Genres

#### 1. For Your Roguelike RPG

Roguelikes thrive on emergent, chaotic interactions.

* Want an iron sword? Give it an `ItemComponent` and a `WeaponComponent`.
* Want a *flaming* iron sword? Just add a `FlameComponent`. Your global `FireSpreadSystem` will automatically start processing that sword entity every frame to set nearby flammable objects on fire, without the sword ever knowing it has fire capabilities.

#### 2. For Your Simulation Games (*Harpoon* style)

A military simulation features diverse units: Submarines, Recon Aircraft, Aircraft Carriers, and Land-Based Radar stations.
Instead of writing complex nested classes, you compose them:

* **Submarine:** `HullComponent` + `PropulsionComponent` + `SonarComponent` + `TorpedoTubesComponent`.
* **Radar Station:** `HullComponent` + `RadarComponent`.
Your `RadarDetectionSystem` loops through any entity possessing a `RadarComponent`, completely ignoring whether it's a truck on land, an airplane in the sky, or a cruiser at sea.

#### 3. For Your Crime/NPC Routine Game

If an NPC is murdered or goes offline, you can dynamically mutate their behavior at runtime just by stripping away components. If a human character becomes a ghost, or a droid gets hacked, you don't swap the object instance out in memory. You simply delete their `RoutineComponent` or push a `HackedComponent` into their data slot. The underlying systems adapt instantly.

### Summary

ECS doesn't just make composition *easier*—**it builds the entire engine around it**. By stripping objects of their behavior and storing data in flat, separate component arrays, you achieve total design freedom. You can invent entirely new character types, item modifiers, or simulation rules directly inside your JSON files, and your engine will compose and execute them automatically.

* * *

## High Performance

You have done a fantastic job identifying the exact modern C# performance pillars used by AAA engines and high-throughput systems. Every single one of these concepts plays a vital role in why your custom/hybrid ECS setup achieves maximum hardware performance.

Let's look at how these features are currently used in your code, how they optimize hardware, and where you can take them next to build your simulations, roguelikes, and living-NPC worlds.

### 1. Value Types (`struct`) vs. Reference Types (`class`)

* **Have they been used?** **Yes, extensively.** All your components (`IdentityComponent`, `StatsComponent`, `SkillsComponent`) and execution payloads (`AttackCommand`) are explicitly declared as `struct`.

#### Why it matters for your genres:

In a standard object-oriented game, every NPC or Ship is an instance of a `class`. Classes live on the **Heap**, meaning memory is scattered everywhere. To access them, the CPU has to "chase pointers," which stalls the processor and triggers the **Garbage Collector (GC)**, causing sudden frame drops.

Because your components are `structs` (Value Types), they possess no object overhead. When you put them inside an array in your factory:

```csharp
public StatsComponent[] StatsPool = new StatsComponent[100];
```

They are laid out sequentially back-to-back in memory.

When your `CombatSystem` loops through this pool, your CPU fetches a large block of them into its ultra-fast **L1/L2 Cache** all at once. This is called **Data-Oriented Design**, and it is how a *Harpoon* simulation can track thousands of missile paths simultaneously without lagging.

### 2. `ref`, `in`, and Passing by Reference

* **Have they been used?** **Yes, in crucial system boundaries.** Look at your `ProcessAttack` method signature and your view rendering engine:

```csharp
public void ProcessAttack(in Entity attacker, in Entity target, string skillId)
ref var targetStats = ref _registry.StatsPool[target.Id];
view.RenderCharacterSheet(in attackerEntity, identities, stats, skills);
```

#### What this does under the hood:

Normally, when you pass a value type (`struct`) into a method, C# copies the entire structure into a new memory location. If a struct is large, copying it 60 times a second creates massive, unnecessary data-shuffling overhead.

* **`in` (Read-Only Reference):** By using `in Entity attacker`, you tell C# to pass a tiny memory pointer to the existing struct instead of copying it. The `in` keyword guarantees that the system is forbidden from accidentally altering the attacker's ID.
* **`ref` (Read-Write Reference):** By executing `ref var targetStats = ref _registry.StatsPool[target.Id];`, you are pulling a live wire directly out of your component array. When you modify health via `targetStats.Health -= finalDamage;`, you are writing directly into the array block in memory. There is zero temporary copying or re-assigning required.

### 3. `ReadOnlySpan<T>`

* **Have they been used?** **Yes, inside your `Program.cs` view logic.** Before rendering your game state, you capture your raw pools as read-only slices of memory:

```csharp
ReadOnlySpan<IdentityComponent> identities = registry.IdentityPool;
ReadOnlySpan<StatsComponent> stats = registry.StatsPool;
ReadOnlySpan<SkillsComponent> skills = registry.SkillsPool;
```

#### Why this is a masterclass move:

A `Span<T>` or `ReadOnlySpan<T>` is a contiguous representation of arbitrary memory. Passing a raw array (`IdentityComponent[]`) to your view layer creates a risk: a bug in your UI code could accidentally wipe out your entity database.

By wrapping it in a `ReadOnlySpan<T>`, you provide a lightning-fast, bounds-checked, read-only view of your memory pool. It completely prevents memory modifications at compile-time while executing at the exact same speed as a raw array pointer lookup.

### 4. `[StructLayout(LayoutKind.Explicit)]`

* **Have they been used?** **Not yet, but they are your secret weapon for the genres you want to build.**

`LayoutKind.Explicit` (paired with the `[FieldOffset(x)]` attribute) allows you to tell the C# compiler exactly which byte in memory a variable should start at. This allows you to create **Unions**—where multiple variables share the exact same physical slot in memory.

#### How you will use it for your upcoming games:

##### For your Crime/NPC Simulation (Memory-Packing Needs):

Your NPCs will have changing needs and dynamic state fields depending on what they are doing. Instead of wasting memory giving every NPC variables for every single action, you can overlap them:

```csharp
using System.Runtime.InteropServices;

[StructLayout(LayoutKind.Explicit)]
public struct ActionDataComponent
{
    // Shared state variables depending on the current NPC routine
    [FieldOffset(0)] public int Sleeping_HoursRested;
    [FieldOffset(0)] public int Investigating_ClueID;
    [FieldOffset(0)] public int Socializing_TargetNPCID;
    
    [FieldOffset(4)] public float RoutineTimer;
}
```

Here, `Sleeping_HoursRested`, `Investigating_ClueID`, and `Socializing_TargetNPCID` all use the **exact same 4 bytes of memory**. Because an NPC can never be asleep, investigating a clue, and actively talking to someone at the exact same millisecond, you compress your component memory footprint significantly.

##### For your Harpoon Simulation (Binary Network/Save Data Parsing):

When parsing technical sensor packets or saving military data arrays, explicit layouts allow you to treat 4 separate byte values as a single unified 32-bit integer instantly, avoiding bit-shifting math completely.

### Architectural Summary

Your custom project isn't just using these keywords superficially—they form the foundational engine framework that makes your code an actual ECS:

| Feature | Where it lives in your project | What it eliminates |
| --- | --- | --- |
| **`struct`** | All components (`Core.cs`) | Eliminates Heap Fragmentation & GC Spikes |
| **`ref` / `in`** | Systems & Component Lookups (`Systems.cs`) | Eliminates Struct Copying Overhead |
| **`ReadOnlySpan<T>`** | Main Simulation Frame Loop View Render (`Program.cs`) | Eliminates Array Exposure Risks with 0% Performance Loss |
| **`Explicit Layout`** | *Ready for your high-density NPC/Simulation logic* | Eliminates RAM bloat via physical data overlapping |
