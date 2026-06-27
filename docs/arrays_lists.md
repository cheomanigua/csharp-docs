# Arrays and Lists

In C#, **arrays** and **lists** are both used to store collections of items, but they have key differences in terms of flexibility, performance, and use cases. Here's a concise comparison:

## Array (`T[]`)
- **Definition**: A fixed-size collection of elements of the same type, stored contiguously in memory.
- **Key Characteristics**:
  - **Fixed Size**: Size is defined at creation and cannot be changed (e.g., `int[] arr = new int[5];`). Use `List<T>` for dynamic sizing.
  - **Performance**: Slightly faster due to fixed size and direct memory access.
  - **Memory**: More memory-efficient for fixed-size data, as it doesn't require overhead for dynamic resizing.
  - **Type Safety**: Strongly typed, elements must be of the declared type.
  - **Usage**: Use when the size of the collection is known and won't change, or when performance is critical.
  - Arrays are **reference types**, stored on the heap.
  - Index out-of-bounds errors throw `IndexOutOfRangeException`.
  - Multidimensional arrays (`[,]`) are rectangular; jagged arrays (`[][]`) allow varying sizes.


### Declaring and Initializing Arrays
```csharp
// Declare an array
int[] numbers;

// Initialize with a fixed size
numbers = new int[3]; // Array of 5 integers, initialized to 0

// Initialize with values
int[] numbers = { 1, 2, 3 };

// Short syntax for initialization
int[] numbers = new int[] { 1, 2, 3 };

// Fixed size
numbers.Length = 4; // Error: Cannot resize

// Multidimensional array (2D)
int[,] matrix = new int[2, 3]; // 2 rows, 3 columns

// Jagged array (array of arrays)
int[][] jagged = new int[3][];
jagged[0] = new int[] { 1, 2 };
jagged[1] = new int[] { 3, 4, 5 };

string[] sumer = new string[] { "Ur", "Uruk", "Adab", "Kish", "Lagash", "Larsa", "Umma" };
Array.Sort(sumer);

foreach (string city in sumer)
{
    Console.WriteLine(city);
}
```

### Accessing Elements
```csharp
// Set value
numbers[0] = 10;

// Get value
int first = numbers[0]; // 10

// Multidimensional access
matrix[0, 1] = 5;

// Jagged array access
jagged[0][1] = 2;
```

### Properties and Methods
- **Length**: Returns the total number of elements.
  ```csharp
  int size = numbers.Length; // 5
  ```
- **GetLength**: For multidimensional arrays, gets size of a specific dimension.
  ```csharp
  int rows = matrix.GetLength(0); // 2
  ```
- **Common Methods**:
  - `Array.Sort(numbers)`: Sorts the array.
  - `Array.Reverse(numbers)`: Reverses the array.
  - `Array.IndexOf(numbers, value)`: Finds the index of a value.
  - `Array.Resize(ref numbers, newSize)`: Resizes the array.

### Iterating Arrays
```csharp
// For loop (faster)
for (int i = 0; i < numbers.Length; i++)
{
    Console.WriteLine(numbers[i]);
}

// Foreach loop (slower)
foreach (int num in numbers)
{
    Console.WriteLine(num);
}
```



## List (`List<T>`)
- **Definition**: A dynamic, resizable collection of elements of the same type, implemented as a dynamic array under the hood.
- **Key Characteristics**:
  - **Dynamic Size**: Can grow or shrink as needed using methods like `Add`, `Remove`, or `Clear`.
  - **Performance**: Slightly slower than arrays due to dynamic resizing and additional method overhead.
  - **Memory**: Uses more memory due to internal bookkeeping for dynamic resizing.
  - **Type Safety**: Strongly typed, like arrays, but with more flexibility (e.g., generic `List<T>`).
  - **Usage**: Use when the size of the collection may change or when you need built-in methods for manipulation.
  - **Example**:
    ```csharp
    List<int> numbers = new List<int> { 1, 2, 3 };
    numbers.Add(4); // Adds 4 to the list
    numbers.Remove(2); // Removes 2 from the list
    ```
In C#, a `List<T>` is a dynamic, generic collection class in the `System.Collections.Generic` namespace that allows you to store and manage a list of items of type `T`. It’s similar to an array but can grow or shrink in size dynamically. Below is a concise overview of `List<T>` with examples.

### Key Features of `List<T>`
- **Dynamic Size**: Automatically resizes as elements are added or removed.
- **Type-Safe**: Uses generics, so you specify the type of elements (e.g., `List<int>`, `List<string>`).
- **Common Methods**:
  - `Add(T item)`: Adds an item to the end of the list.
  - `AddRange(IEnumerable<T> collection)`: Adds multiple items.
  - `Remove(T item)`: Removes the first occurrence of an item.
  - `RemoveAt(int index)`: Removes the item at the specified index.
  - `Clear()`: Removes all items.
  - `Contains(T item)`: Checks if an item exists.
  - `Find(Predicate<T> match)`: Returns the first item matching a condition.
  - `Sort()`: Sorts the list.
  - `ToArray()`: Converts the list to an array.
- **Properties**:
  - `Count`: Gets the number of elements in the list.
  - `Capacity`: Gets or sets the total number of elements the internal array can hold.

### Example Usage
```csharp
using System;
using System.Collections.Generic;

class Program
{
    static void Main()
    {
        // Create a List<int>
        List<int> numbers = new List<int>();

        // Add elements
        numbers.Add(10);
        numbers.AddRange(new int[] { 20, 30, 40 });

        // Access elements
        Console.WriteLine($"First element: {numbers[0]}"); // Output: 10
        Console.WriteLine($"Count: {numbers.Count}"); // Output: 4

        // Modify element
        numbers[1] = 25;

        // Remove element
        numbers.Remove(30); // Removes 30
        numbers.RemoveAt(0); // Removes element at index 0

        // Check if contains
        Console.WriteLine($"Contains 25: {numbers.Contains(25)}"); // Output: True

        // Iterate through the list
        Console.WriteLine("Numbers in list:");
        foreach (int num in numbers)
        {
            Console.WriteLine(num);
        }

        // Find example
        int found = numbers.Find(x => x > 20);
        Console.WriteLine($"First number > 20: {found}"); // Output: 25

        // Sort the list
        numbers.Add(15);
        numbers.Sort();
        Console.WriteLine("Sorted list:");
        foreach (int num in numbers)
        {
            Console.WriteLine(num); // Output: 15, 25, 40
        }
    }
}
```

### Common Use Cases
- **Dynamic Data Storage**: When the number of items isn’t known at compile time.
- **Flexible Operations**: Adding, removing, or modifying elements without fixed size constraints.
- **Data Processing**: Filtering, sorting, or searching through collections.

### Notes
- **Performance**: `List<T>` is efficient for most operations, but random access (`[index]`) is O(1), while `Remove` or `Contains` can be O(n).
- **Thread Safety**: `List<T>` is not thread-safe by default; use `ConcurrentBag<T>` or synchronization for multi-threaded scenarios.
- **Alternatives**: Consider `Array` for fixed-size collections, `Dictionary<TKey, TValue>` for key-value pairs, or `HashSet<T>` for unique items.

##  Differences between Arrays and Lists
| Feature                | Array (`T[]`)                     | List (`List<T>`)                  |
|------------------------|-----------------------------------|-----------------------------------|
| **Size**               | Fixed at creation                | Dynamic, can grow/shrink          |
| **Performance**         | Faster for access                | Slightly slower due to resizing   |
| **Memory Efficiency**  | More efficient (fixed size)      | Less efficient (dynamic overhead) |
| **Functionality**      | Limited (basic indexing)         | Rich methods (`Add`, `Remove`, etc.) |
| **Declaration**        | `int[] arr = new int[5];`        | `List<int> list = new List<int>();` |
| **Namespace**          | Built-in                         | Requires `System.Collections.Generic` |

### When to Use
- **Array**: Use for fixed-size collections, performance-critical scenarios, or when working with APIs that require arrays.
- **List**: Use for dynamic collections, when you need to add/remove elements frequently, or when you want built-in methods for manipulation.

### Conversion
- Convert array to list: `List<int> list = array.ToList();`
- Convert list to array: `int[] array = list.ToArray();`
