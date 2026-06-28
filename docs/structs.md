# Structs

## Definition

A **struct** (structure) is a user-defined value type that encapsulates small groups of related variables, designed primarily to provide high-performance memory layouts. Unlike a class, which is allocated on the managed heap and tracked by the Garbage Collector, a struct is typically allocated directly on the CPU stack or inline within its containing type. This contiguous stack allocation drastically reduces memory tracking overhead and maximizes CPU cache efficiency, making structs ideal for lightweight, immutable data structures, such as vectors, coordinates, or mathematical matrices that are created and destroyed frequently within tight execution loops.


```csharp
struct Point
{
    public int X;
    public int Y;
    public Point(int x, int y) { X = x; Y = y; }
}
```

## Struct High Performance

### `ref` and `in` keyword


In standard C#, when you pass a struct into a function, the computer duplicates the entire struct. If your strategy unit has components tracking 50 different weapon states and positions, copying that data 60 times a second will slow your game to a crawl.

By using the modern **`ref`** and **`in`** keywords, C# passes a direct memory address instead of making a copy:

```csharp
// 'in' passes by reference but makes it read-only (super safe!)
void CheckRadarRange(in PositionComp pos, in SensorsComp radar) {
    // Highly efficient math directly on the array memory, zero data copying.
}
```

To give you the full picture of how this works under the hood, here is the minimum, complete, compile-ready C# implementation.

This example demonstrates how C# blends low-level memory layout control (forcing data to align contiguously) with high-level code safety (`in` references protecting stack memory from accidental modifications).

#### The Complete C# Implementation

```csharp
using System;
using System.Runtime.InteropServices;

namespace SimulationEngine
{
    // 1. Force the CPU to lay out fields sequentially in memory, exactly like a C/C++ struct.
    // This allows sequential cache access when stored in arrays.
    [StructLayout(LayoutKind.Sequential)] // By default structs are sequencial. Added StructLayout for visibility only, no need to add it.
    public struct PositionComp
    {
        public float X;
        public float Y;

        public PositionComp(float x, float y)
        {
            X = x;
            Y = y;
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct SensorComp
    {
        public float Range;
        public float RangeSquared;
        public bool IsEnabled;

        public SensorComp(float range, bool isEnabled)
        {
            Range = range;
            RangeSquared = range * range;
            IsEnabled = isEnabled;
        }
    }

    public class RadarSystem
    {
        // 2. The Method using 'in' parameters
        // 'in' passes a raw memory address pointer (highly efficient for larger structures),
        // but the compiler will throw an error if you try to modify 'pos' or 'radar' inside.
        public static bool IsWithinRadarRange(in PositionComp sourcePos, in PositionComp targetPos, in SensorComp radar)
        {
            if (!radar.IsEnabled)
                return false;

            // Highly efficient math performed directly on the stack memory. Zero copying of structs.
            float deltaX = targetPos.X - sourcePos.X;
            float deltaY = targetPos.Y - sourcePos.Y;
            float distanceSquared = (deltaX * deltaX) + (deltaY * deltaY);
            Console.WriteLine($"Distance: {distanceSquared}. Radar Range: {radar.RangeSquared}");

            return distanceSquared <= radar.RangeSquared;
        }

        public static void Main()
        {
            // 3. Create component instances on the stack
            PositionComp ussPasadenaPos = new PositionComp(120.15f, 30.85f);
            PositionComp targetPos = new PositionComp(170.14f, 31.15f);
            SensorComp passiveRadar = new SensorComp(50.0f, true);

            // 4. Pass by reference implicitly
            bool detected = IsWithinRadarRange(ussPasadenaPos, targetPos, passiveRadar);

            Console.WriteLine($"Target Detected: {detected}");
        }
    }
}
```

#### Why this structure provides the "best of both worlds":

1. **Stack Allocation & Performance:** Because `PositionComp` and `SensorsComp` are defined as structs, instantiating them inside `Main()` allocates them entirely on the **CPU Stack**. There is zero pressure on the Garbage Collector, meaning this method can be called millions of times per second in a simulation loop without causing stuttering or latency spikes.
2. **Memory Layout Control:** The `[StructLayout(LayoutKind.Sequential)]` attribute ensures that if you put thousands of these structs inside a C# array, they will sit packed tightly together in RAM. This ensures your code is friendly to the CPU's hardware cache line fetcher.
3. **Pass-by-Reference Efficiency:** Normally, passing a struct to a method copies all of its variables into a new space. By using the `in` modifier, C# passes a 64-bit memory address (a pointer) instead. If your component grows to have dozens of variables, passing it remains incredibly cheap.
4. **Enforced Code Safety:** If you accidentally try to write code like `radar.RadarRangeNM = 100.0f;` inside `IsWithinRadarRange`, the C# compiler will refuse to compile your game, protecting your structural database fields from accidental modifications.

### `ref` vs `in`

In C#, both `ref` and `in` are used to pass arguments by reference (passing a memory address pointer instead of copying the whole value type). However, they enforce completely opposite rules regarding what the receiving method is allowed to do with that memory.

Here is the exact breakdown of their differences and why `in` was the correct architectural choice for the radar calculation example.

#### The Fundamental Difference

* **`ref` (Read/Write Reference):** Passes a reference to a variable that the method **can read and must be allowed to modify**. Any changes made to the variable inside the method immediately alter the original variable in the calling function.
* **`in` (Read-Only Reference):** Passes a reference to a variable that the method **can only read**. The compiler treats the argument as a `readonly` variable, making it physically impossible to modify its fields inside the method.

| Feature | `ref` | `in` |
| --- | --- | --- |
| **Passes by Pointer?** | Yes (64-bit memory address) | Yes (64-bit memory address) |
| **Can read values?** | Yes | Yes |
| **Can modify values?** | **Yes** | **No** (Compiler error) |
| **Requires initialization?** | Variable must be initialized before passing | Variable must be initialized before passing |
| **Keyword required at call site?** | **Yes** (e.g., `MyMethod(ref myVar)`) | **No** (Optional, compiler infers it) |

---

#### Why `in` Was Chosen for the Radar Example

In the radar system simulation method:

```csharp
public static bool IsWithinRadarRange(in PositionComp sourcePos, in PositionComp targetPos, in SensorsComp radar)

```

The `in` keyword was explicitly chosen over `ref` for two major reasons: **Intent and Data Integrity**, and **Call-Site Cleanliness**.

##### 1. Preventing Accidental Modification (Side Effects)

A radar check is a **pure mathematical query**. It answers a true/false question: *"Is Object B close enough to Object A?"* If we used `ref PositionComp targetPos`, the physics or radar loop would have permission to modify the target's physical location. If a programmer accidentally typed a bug inside the radar function like `targetPos.X = 0;`, the target submarine would instantly teleport to coordinates (0,0) on the map simply because its range was checked!

By using `in`, the compiler enforces a strict safety contract. If anyone tries to modify the position or sensor stats inside the method, the code will fail to compile. It guarantees that a query function remains a query and cannot introduce bugs into your game state.

##### 2. Optimization Without Data Copying

Because `PositionComp` and `SensorsComp` are `structs`, passing them without keywords normally copies all their internal data (doubles and floats) onto a new stack frame. If you run this range calculation for 10,000 units against 10,000 other units every frame, copying those bytes millions of times creates a massive CPU bottleneck.

Using `in` allows us to pass a tiny 64-bit memory pointer instead of copying the struct variables, giving us the raw speed of C-style pointers while keeping our game completely safe from memory corruption.

##### 3. Cleaner Syntax at the Call Site

When you use `ref`, you are forced to explicitly type the keyword when calling the method:

```csharp
// Using ref requires typing it every time:
RadarSystem.IsWithinRadarRange(ref ussPasadenaPos, ref targetPos, ref passiveRadar);

```

When you use `in`, C# allows you to pass variables normally without any extra keywords, making your math loops significantly cleaner and easier to read:

```csharp
// Using in looks like standard clean code:
RadarSystem.IsWithinRadarRange(ussPasadenaPos, targetPos, passiveRadar);

```

#### Summary Rule of Thumb

* Use **`in`** when passing large structs that you only want to **read** efficiently without copying.
* Use **`ref`** only when the explicit goal of the method is to **mutate/modify** the incoming struct directly in place (such as a physics integration step like `ApplyVelocity(ref PositionComp pos, VelocityComp vel)`).
