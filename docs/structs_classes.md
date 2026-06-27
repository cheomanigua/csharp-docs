# Strucs vs Classes

Structs and classes are almost the same thing. Given this code:


```csharp
using System;

class Car
{
	public string Brand { get; set; }
	public int PurchaseYear { get; set; }
	public Car(string brand, int purchaseYear)
	{
		PurchaseYear = purchaseYear;
		Brand = brand;
		Console.WriteLine($"Car {Brand} built in {PurchaseYear}.");
	}
}

struct Truck
{
    //Public Auto-Properties for the JsonSerializer compatibility
	public string Brand { get; set; }       // Caution. Check the warning box below
	public int PurchaseYear { get; set; }   // Caution. Check the warning box below
	public Truck(string brand, int purchaseYear)
	{
		PurchaseYear = purchaseYear;
		Brand = brand;
		Console.WriteLine($"Truck {Brand} built in {PurchaseYear}.");
	}
}

class Program
{
    static void Main(string[] args)
    {
		Car toyota = new Car("Toyota", 2025);
		Truck ford = new Truck("Ford", 2021);
    }
}
```
{{< alert context="warning" text="Be **cautious** with mutable structs (those with `{ get; set; }`) because changes to a copied struct don’t affect the original, which can lead to unexpected behavior. If you want immutability, consider using `{ get; init; }` (available in C# 9.0+) or making the fields readonly." />}}

</br>

What is the difference between a Struct and a Class?

In C#, **classes** and **structs** are both used to define custom data types, but they differ in key ways. Here's a concise comparison:

### **Class**
- **Type**: Reference type (stored on the heap).
- **Memory**: Reference points to the object; null is allowed.
- **Inheritance**: Supports inheritance; can inherit from a base class and implement interfaces.
- **Default Value**: `null` if uninitialized.
- **Use Case**: Suitable for complex objects with behavior, polymorphism, or when reference semantics are needed.
- **Modifiers**: Can be `abstract`, `sealed`, or have any access modifier.
- **Copy Behavior**: Passing a class object passes a reference; changes affect the same instance.
- **Constructors**: Supports parameterized constructors and a default constructor.
- **Lifetime**: Garbage-collected when no references remain.
- **Example**:
  ```csharp
  class Person
  {
      public string Name;
      public int Age;
      public Person(string name, int age) { Name = name; Age = age; }
  }
  ```

### **Struct**
- **Type**: Value type (stored on the stack or inline in containing type).
- **Memory**: Contains the data directly; cannot be `null`.
- **Inheritance**: Cannot inherit from another struct or class; can only implement interfaces.
- **Default Value**: All fields initialized to their default values (e.g., `0` for numbers).
- **Use Case**: Ideal for lightweight, immutable data structures with value semantics (e.g., `Point`, `DateTime`).
- **Modifiers**: Cannot be `abstract` or `sealed`; always implicitly sealed.
- **Copy Behavior**: Passing a struct creates a copy; changes do not affect the original.
- **Constructors**: Requires parameterized constructors; default constructor is implicit and initializes fields to default values.
- **Lifetime**: Freed when out of scope (stack) or when containing object is garbage-collected (heap).
- **Example**:
  ```csharp
  struct Point
  {
      public int X;
      public int Y;
      public Point(int x, int y) { X = x; Y = y; }
  }
  ```

### **Key Differences**
| Feature                | Class                          | Struct                        |
|-----------------------|--------------------------------|-------------------------------|
| **Type**              | Reference type                | Value type                   |
| **Memory Allocation** | Heap                          | Stack or inline              |
| **Inheritance**       | Supports inheritance          | No inheritance, only interfaces |
| **Nullability**       | Can be `null`                 | Cannot be `null`             |
| **Copy Semantics**    | Reference (shared)            | Copy (independent)           |
| **Performance**       | Slower due to heap allocation | Faster for small data types   |
| **Use Case**          | Complex objects, OOP           | Small, immutable data        |

### **When to Use**
- **Class**: Use for complex objects, when inheritance or reference semantics are needed (e.g., domain models like `Customer` or `Order`).
- **Struct**: Use for small, lightweight data structures with value semantics (e.g., `Point`, `Rectangle`, or simple numeric types). Avoid structs for large data types or mutable objects to prevent excessive copying.

### **Example Comparison**
```csharp
class Program
{
    static void Main()
    {
        // Class: Reference type
        Person person1 = new Person("Alice", 30);
        Person person2 = person1; // Reference to same object
        person2.Name = "Bob";
        Console.WriteLine(person1.Name); // Outputs: Bob

        // Struct: Value type
        Point point1 = new Point(10, 20);
        Point point2 = point1; // Creates a copy
        point2.X = 50;
        Console.WriteLine(point1.X); // Outputs: 10
    }
}
```

### **Performance Considerations**
- **Structs** are faster for small, frequently used data due to stack allocation and no garbage collection overhead. If you make an array of 1,000 structs, C# allocates one single, flat, continuous block of memory. Very fast.
- **Classes** are better for larger objects or when shared references are needed, but heap allocation and garbage collection add overhead.

Choose based on your specific needs for semantics, performance, and behavior. If unsure, **classes** are the default choice in C# for most scenarios.


### Value Types (`struct`) vs. Reference Types (`class`)

In languages like Java, almost everything is an object living on the **Heap**. This means even a simple 2D coordinate (X, Y) requires a heap allocation, memory tracking, and pointer dereferencing to read.

C# lets you choose exactly how memory is laid out using `struct`:

* **`class` (Reference Type):** Managed by the Garbage Collector on the heap. Great for complex systems, business logic, and entity hierarchies.
* **`struct` (Value Type):** Structs are value types, and are stored inline wherever their containing storage lives (on the stack, on the heap, inside arrays or classes or native buffers). When you create an array of 1,000 entities using a struct, they sit sequentially next to each other in memory. This is incredibly friendly to your CPU's cache, drastically speeding up math-heavy systems like game physics or data pipelines without triggering the Garbage Collector.
