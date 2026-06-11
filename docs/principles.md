# Core Principles of DoD

To integrate your **Flat Array + Index Map** approach into the documentation, we need to clarify that this is the final layer of your optimization strategy. It replaces the old "hardcoded field" approach (e.g., `stats.Health`) with a data-driven "Index Map" (e.g., `stats.Values[idx]`).

This documentation serves as your technical reference for the **System-Based Command Pipeline**, **Registry Pattern**, and **Flat Array + Index Map** architecture.

---

## 1. Core Architecture: System-Based Command Pipeline

The engine operates on a decoupled architecture where data definitions, logic processing, and presentation are strictly separated.

### The Execution Loop

1. **Command Enqueueing**: External sources push `GameCommand` objects into the `CommandQueue`.
2. **System Processing**: During the `Tick(float deltaTime)`, the `EngineDriver` triggers specific `Systems`.
3. **Data Mutation**: Logic results are written to the `EntityRegistry`, which acts as the "Source of Truth."
4. **View Synchronization**: The `RenderSystem` uses a `GameViewAdapter` to project registry data onto the UI.

---

## 2. Structural Patterns

### 2.1. The Registry Pattern (ECS Foundation)

We use the **Registry Pattern** to manage the entity lifecycle. It abstracts away memory management, providing a stable interface for systems to query entities.

### 2.2. Flat Array + Index Map (Data-Driven Schema)

This is the heart of your engine’s flexibility. Instead of hardcoding properties like `Strength` or `Intelligence` into your structs (which requires a recompile to change), we use a **Flat Array + Index Map** strategy.

This strategy balances high-performance memory layout with data access needs. It uses a **Flat Array** for storage and an **Index Map** to handle the translation between "Identity" and "Memory Offset."

* **Flat Array**: It is your memory strategy (how you store the data). Your `CharacterStats` component stores data in a contiguous `int[] Values` array, ensuring CPU cache-friendly access.
* **Index Map**: It is your access strategy (how you retrieve the data). This translates a Stat's identity (Name or Type) into a fixed array index. There are two primary strategies for this map:
    * **String-Based Map (Dynamic)**: Indices are determined at runtime by parsing a `StatsDefinition.json`. This offers maximum flexibility (add stats without recompiling) but introduces slight runtime overhead for lookups.
    * **Enum-Based Map (Static/Performant)**: Indices are defined by a compile-time `enum`. This offers the highest possible performance (zero-cost array access) and compile-time safety, at the cost of requiring a recompile if the stat schema changes.

    #### Dynamic Access vs. Direct Access
    * Systems using **String-Based Maps** query the `StatRegistry` at runtime to find the index.
    * Systems using **Enum-Based Maps** cast the `enum` directly to an `int` for instant, raw-array access.

    Using `enums` instead of `strings` just makes your **Index Map** more efficient, safer, and faster.

    #### The Comparison

    | Feature | String-Based Map | Enum-Based Map |
    | --- | --- | --- |
    | **Storage** | Flat Array (`int[]`) | Flat Array (`int[]`) |
    | **Index Access** | `_map["Strength"]` | `(int)StatType.Strength` |
    | **Performance** | O(1) with overhead (hashing/checks) | O(1) raw CPU offset (zero overhead) |
    | **Safety** | Runtime (risky) | Compile-time (guaranteed) |

#### Why it remains the same pattern:

You are still using an array for storage (`Values[]`), and you are still using a predefined key (`StatType`) to determine which slot in the array to access. You aren't changing the architecture; you are just upgrading the "Key" from a slow, error-prone string to a fast, type-safe integer.

### 2.3. The Adapter/DTO Pattern (Decoupling)

To prevent the high-performance `EntityRegistry` from being tightly coupled to UI, we use **Adapters**:

* **GameViewAdapter**: Uses the `StatRegistry` to translate the `Values` array indices back into named properties for the `CharacterSheetDto`. This shields the UI from the underlying storage mechanism.

---

## 3. Data-Driven Initialization Pipeline

We decouple entity blueprints from C# logic, allowing for rapid balancing via JSON.

1. **Blueprint Resolution**: The `StatInitializationSystem` reads the `Class` and `Race` definitions.
2. **Mapping**: Instead of hard-coded property assignment, it iterates through the `StatRegistry` indices, pulling data from JSON records and flattening them into the component's `Values` array.

---

## 4. Dynamic Modifiers (Dirty Flag Pattern)

To maintain $O(1)$ performance, we avoid constant recalculation. When equipment is added, the system sets `IsDirty = true`. The combat engine only performs the heavy lifting of summing equipment modifiers if this flag is set.

---

## 5. Performance vs. Schema Flexibility

| Layer | Function | Performance |
| --- | --- | --- |
| **Flat Array (`Values[]`)** | Contiguous memory for stats. | **Maximum (CPU cache friendly)** |
| **Index Map (`StatRegistry`)** | Maps Names to Indices. | **High (O(1) lookup)** |
| **JSON Definitions** | Runtime Data (Classes/Races). | **Maximum Flexibility** |

### Why This is Robust

By moving from hardcoded properties to the **Flat Array + Index Map** pattern, you have achieved the **Open/Closed Principle**: the system is *open* to adding new attributes (via JSON updates) but *closed* to modifications of the core engine code.

---

## 6. Architectural Patterns Summary

* **Command Pattern**: Enables asynchronous logic and replayability.
* **Strategy Pattern**: `IGameView` implementation allows swapping UI backends without changing engine logic.
* **Adapter Pattern**: The `GameViewAdapter` is the vital translation layer that keeps high-performance memory structures decoupled from the UI's data presentation needs.

---

### The Decoupled Path

* **Registry Pattern** manages *how we store it*.
* **Flat Array + Index Map** manages *how we identify it* dynamically.
* **Adapter/DTO Pattern** manages *how we share it* with the outside world.
* **System-Based Pipeline** manages *how we process it*.
