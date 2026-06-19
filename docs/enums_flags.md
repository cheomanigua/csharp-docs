# Enums and Flags


# Enums

In C#, an **enum** (short for enumeration) is a value type that defines a set of named constants representing integral values. Enums are useful for creating readable, type-safe code when a variable can only take one of a predefined set of values.

By convention, enum name should be in singular.

### Key Points About C# Enums

1. **Syntax**:
   ```csharp
   enum EnumName
   {
       Value1,  // Implicitly assigned 0
       Value2,  // Implicitly assigned 1
       Value3   // Implicitly assigned 2
   }
   ```

2. **Underlying Type**:
   - By default, enums use `int` as the underlying type, but you can specify other integral types (`byte`, `sbyte`, `short`, `ushort`, `uint`, `long`, `ulong`).
   - Example:
     ```csharp
     enum Days : byte
     {
         Monday = 1,
         Tuesday = 2,
         Wednesday = 3
     }
     ```

3. **Explicit Values**:
   - You can assign specific values to enum members.
   - Example:
     ```csharp
     enum ErrorCode
     {
         None = 0,
         NotFound = 404,
         ServerError = 500
     }
     ```

4. **Usage**:
   - Enums are used to improve code readability and maintainability by replacing magic numbers or strings with meaningful names.
   - Example:
     ```csharp
     Days today = Days.Monday;
     if (today == Days.Monday)
     {
         Console.WriteLine("It's Monday!");
     }
     ```

5. **Enum Methods**:
   - **ToString()**: Converts the enum value to its string representation.
     ```csharp
     Console.WriteLine(Days.Monday); // Outputs: Monday
     ```
   - **Enum.Parse()**: Converts a string to an enum value.
     ```csharp
     Days day = (Days)Enum.Parse(typeof(Days), "Tuesday");
     ```
   - **Enum.GetValues()**: Retrieves all values in the enum.
     ```csharp
     foreach (Days day in Enum.GetValues(typeof(Days)))
     {
         Console.WriteLine(day);
     }
     ```

6. **Flags Attribute**:
   - Use the `[Flags]` attribute to allow bitwise operations for combining enum values.
   - Example:
     ```csharp
     [Flags]
     enum Permissions
     {
         None = 0,
         Read = 1,
         Write = 2,
         Delete = 4
     }

     Permissions userPerms = Permissions.Read | Permissions.Write;
     Console.WriteLine(userPerms); // Outputs: Read, Write
     ```

7. **Common Practices**:
   - Use singular names for enums (e.g., `Day` instead of `Days`) unless it’s a `[Flags]` enum, where plural is common.
   - Define a `None` or `Unknown` value for cases where no valid option applies.
   - Enums are often used in switch statements for clean control flow:
     ```csharp
     switch (today)
     {
         case Days.Monday:
             Console.WriteLine("Start of the week!");
             break;
         default:
             Console.WriteLine("Not Monday.");
             break;
     }
     ```

8. **Limitations**:
   - Enums cannot contain methods, properties, or fields.
   - Enums are not extensible (cannot inherit from other enums or classes).
   - Enums are value types, so they are stored on the stack unless boxed.

9. **Type Safety**:
   - Enums prevent invalid values at compile time (e.g., you can’t assign `Days.Monday = 999`).
   - However, casting an invalid integer to an enum is possible and may cause runtime issues:
     ```csharp
     Days invalid = (Days)999; // Compiles but may lead to undefined behavior
     ```

10. **Best Practices**:
    - Use enums for fixed, well-known sets of values (e.g., days of the week, error codes).
    - Avoid using enums for values that might change frequently or require complex logic.
    - Consider using `Enum.IsDefined()` to validate enum values when casting from integers or strings:
      ```csharp
      if (Enum.IsDefined(typeof(Days), 1))
      {
          Days day = (Days)1;
      }
      ```

### Example in Action
```csharp
using System;

enum Days
{
    Monday = 1,
    Tuesday,
    Wednesday,
    Thursday,
    Friday,
    Saturday,
    Sunday
}

class Program
{
    static void Main()
    {
        Days today = Days.Wednesday;
        Console.WriteLine($"Today is {today} (Value: {(int)today})"); // Outputs: Today is Wednesday (Value: 3)

        // Check if value is defined
        int input = 2;
        if (Enum.IsDefined(typeof(Days), input))
        {
            Days day = (Days)input;
            Console.WriteLine($"Day from input: {day}"); // Outputs: Day from input: Tuesday
        }
    }
}
```

### When to Use Enums
- Use enums when you have a fixed set of related constants (e.g., states, categories, or options).
- Avoid enums for dynamic or open-ended sets of values; consider classes or structs instead.

* * *

# Flags

In C#, the `[Flags]` attribute is used with enums to indicate that the enum values can be combined using bitwise operations, typically to represent a set of flags. Comparing bitmasks involves checking whether specific flags are set, unset, or match certain combinations using bitwise operators.

By convention, flags name should be in plural.

## Basic Usage

### Declaration

```csharp
[Flags]
enum Elements { Fire = 1<<0, Water = 1<<1, Earth = 1<<2 }	// Fire = 1, Water = 2, Earth = 4
```

### Set

There are four ways to set the same bits of a variable:

```csharp
		Elements elements = Elements.Fire | Elements.Water; // Fire, Water
		elements = (Elements)3;								// Fire, Water
		elements = (Elements)(1<<0 | 1<<1);					// Fire, Water
		elements = (Elements)0b011; 						// Fire, Water
```
### Get

There are three ways to get the bits set in a variable

```csharp
		Console.WriteLine(elements);											// Fire, Water
		Console.WriteLine((int)elements);										// 3
		Console.WriteLine(Convert.ToString((int)elements,2).PadLeft(3, '0'));	// 001
```

[!INFO]
When doing queries and comparing with other integers, <code>(int)elements</code> must be used.

### Key Concepts
- The `[Flags]` attribute allows enum values to be treated as bit fields.
- Each enum value typically represents a single bit (or a combination of bits) using powers of 2 (1, 2, 4, 8, etc.).
- Bitwise operators (`|`, `&`, `^`, `~`) are used to manipulate and compare flags.
- Common comparison tasks include checking if a specific flag is set, if all flags in a mask are set, or if any flags match.
- Once created, to get the value of an enum: `

```csharp
using System;

[Flags]
enum Sumer { Ur = 1<<0, Uruk = 1<<1, Kish = 1<<2, Adab = 1<<3, Lagash = 1<<4 }

class Program
{
    static void Main(string[] args)
	{
        // Four different ways to set the same bits
		Sumer capitals = Sumer.Uruk | Sumer.Kish;           // Uruk, Kish
		capitals = (Sumer)6;								// Uruk, Kish
		capitals = (Sumer)(1<<1 | 1<<2);					// Uruk, Kish
		capitals = (Sumer)0b00110;						    // Uruk, Kish

		// How to query using bitmasks
		Sumer target = (Sumer)0b11011;		// Ur, Uruk, Adab, Lagash
		Sumer current = (Sumer)0b01110;		// Uruk, Kish, Adab

		Console.WriteLine(target);							// 11011 <- target bits to achieve
		Console.WriteLine(current);							// 01110 <- current bits
		Console.WriteLine(current & target);				// 01010 <- target bits achieved
		Console.WriteLine(target & ~current);				// 10001 <- remaining target bits to achieve
		Console.WriteLine((current & target) ^ current);	// 00100 <- other

		if ((current & target) == current) {
			Console.WriteLine("Exact match. Target achieved! ");
		}
		else if ((current | target) == current) {
			Console.WriteLine("Target achieved!");
		}
		else {
			Console.WriteLine("Target not achieved!");
			Console.WriteLine($"{target & ~current} missing");
		}

    }
}
```

## Comparison Patterns

### Comparing Bitmasks
Here’s how to perform common comparisons with bitmasks in C#. Using bitmasks is faster then using HasFlag:

```csharp
using System;

[Flags]
enum Elements { Fire = 1<<0, Water = 1<<1, Earth = 1<<2 }	// Fire = 1, Water = 2, Earth = 4


class Program
{
    static void Main(string[] args)
	{
		Elements elements = Elements.Fire | Elements.Water;
		Console.WriteLine(elements);		// Fire, Water

        // Using HasFlag
		bool isFire = elements.HasFlag(Elements.Fire);                          // True
		bool isFireWater = elements.HasFlag(Elements.Fire | Elements.Water);    // True
		bool isEarth = elements.HasFlag(Elements.Earth);                        // False

        // Using bitwise `&`, equality operator `==`
		bool isFire = (elements & Elements.Fire) == Elements.Fire;              // True
        bool isFireWater = (elements & (Elements.Fire | Elements.Water)) == (Elements.Fire | Elements.Water);   // True
		bool isEarth = (elements & Elements.Earth) == Elements.Earth;           // False

        // Using bitwise `&`, equality operator `!= 0`
        bool isFire = (elements & Elements.Fire) != 0;                          // True
		bool isFireWater = (elements & (Elements.Fire | Elements.Water)) != 0;  // True
		bool isEarth = (elements & Elements.Earth) != 0;                        // False
    }
}
```

### Example

```csharp
using System;

[Flags]
enum Elements { Fire = 1<<0, Water = 1<<1, Earth = 1<<2 }	// Fire = 1, Water = 2, Earth = 4


class Program
{
    static void Main(string[] args)
	{
		Elements elements = (Elements)3; // Elements.Fire | Elements.Water

		// Check if a specific flag is set
		bool isFire = elements.HasFlag(Elements.Fire); // True
		bool isFireWater = elements.HasFlag(Elements.Fire | Elements.Water); // True
		bool isEarth = elements.HasFlag(Elements.Earth); // False
		
		// Check if all flags in a mask are set
		Elements requiredMask = (Elements)3;
		bool hasAll = (elements & requiredMask) == requiredMask; // True
		requiredMask = (Elements)7;
		hasAll = (elements & requiredMask) == requiredMask; // False

		// Check if any flag in a mask is set
		Elements checkMask = (Elements)3;
		bool hasAny = (elements & checkMask) != 0; // True
		checkMask = (Elements)4;
		hasAny = (elements & checkMask) != 0; // False

		// Check if no flags in a mask are set
		Elements forbiddenMask = (Elements)3;
		bool hasNone = (elements & forbiddenMask) == 0; // False
		forbiddenMask = (Elements)4;
		hasNone = (elements & forbiddenMask) == 0; // True

		// Compare exact bitmask
		Elements expectedMask = (Elements)3;
		bool isExactMatch = elements == expectedMask; // True
		expectedMask = (Elements)1;
		isExactMatch = elements == expectedMask; //False
    }
}
```


#### 1. **Check if a Specific Flag is Set**
Use the bitwise AND operator (`&`) with the `HasFlag` method or directly to check if a specific flag is set.

```csharp
[Flags]
public enum Permissions
{
    None = 0,
    Read = 1,
    Write = 2,
    Execute = 4,
    Delete = 8
}

Permissions userPermissions = Permissions.Read | Permissions.Write;

// Using HasFlag
bool canRead = userPermissions.HasFlag(Permissions.Read); // true
bool canDelete = userPermissions.HasFlag(Permissions.Delete); // false

// Using bitwise AND
bool canWrite = (userPermissions & Permissions.Write) == Permissions.Write; // true
```

#### 2. **Check if All Flags in a Mask are Set**
To verify that all flags in a specific mask are set, use the bitwise AND operator and compare the result to the mask.

```csharp
Permissions required = Permissions.Read | Permissions.Execute;
bool hasAll = (userPermissions & required) == required; // false (Execute is not set)
```

#### 3. **Check if Any Flag in a Mask is Set**
To check if at least one flag in a mask is set, use the bitwise AND operator and check if the result is non-zero.

```csharp
Permissions check = Permissions.Write | Permissions.Delete;
bool hasAny = (userPermissions & check) != 0; // true (Write is set)
```

#### 4. **Check if No Flags in a Mask are Set**
To ensure none of the flags in a mask are set, use the bitwise AND operator and check if the result is zero.

```csharp
Permissions forbidden = Permissions.Execute | Permissions.Delete;
bool hasNone = (userPermissions & forbidden) == 0; // true (neither Execute nor Delete is set)
```

#### 5. **Compare Exact Bitmask**
To check if the bitmask matches exactly, compare the enum values directly.

```csharp
Permissions expected = Permissions.Read | Permissions.Write;
bool isExactMatch = userPermissions == expected; // true
```

#### 6. **Toggle or Modify Flags**
You can add or remove flags using bitwise operators:
- **Add a flag**: Use the bitwise OR operator (`|`).
- **Remove a flag**: Use the bitwise AND operator (`&`) with the complement (`~`).
- **Toggle a flag**: Use the bitwise XOR operator (`^`).

```csharp
// Add a flag
userPermissions |= Permissions.Execute; // Now Read | Write | Execute

// Remove a flag
userPermissions &= ~Permissions.Write; // Now Read | Execute

// Toggle a flag
userPermissions ^= Permissions.Read; // Now Execute (Read is toggled off)
```



### Best Practices
- **Use Powers of 2**: Ensure enum values are powers of 2 to avoid overlapping bits unless intentional (e.g., `None = 0`, `Read = 1`, `Write = 2`, `Execute = 4`).
- **Explicitly Define Combinations**: For commonly used combinations, define them in the enum to improve readability.

```csharp
[Flags]
public enum Permissions
{
    None = 0,
    Read = 1,
    Write = 2,
    Execute = 4,
    Delete = 8,
    ReadWrite = Read | Write // 3
}
```

- **Use `HasFlag` for Readability**: While `HasFlag` is slightly slower than direct bitwise operations, it’s more readable for simple checks.
- **Avoid Invalid Combinations**: Validate input when necessary to ensure only valid flag combinations are used.

### Example: Comprehensive Comparison
```csharp
[Flags]
public enum Permissions
{
    None = 0,
    Read = 1,
    Write = 2,
    Execute = 4,
    Delete = 8
}

void CheckPermissions(Permissions userPermissions)
{
    Console.WriteLine($"Permissions: {userPermissions}");

    // Check individual flag
    Console.WriteLine($"Can Read: {userPermissions.HasFlag(Permissions.Read)}");

    // Check all flags in mask
    Permissions required = Permissions.Read | Permissions.Write;
    Console.WriteLine($"Has Read and Write: {(userPermissions & required) == required}");

    // Check any flag in mask
    Permissions check = Permissions.Execute | Permissions.Delete;
    Console.WriteLine($"Has Execute or Delete: {(userPermissions & check) != 0}");

    // Check exact match
    Permissions expected = Permissions.Read | Permissions.Write;
    Console.WriteLine($"Exact match for Read|Write: {userPermissions == expected}");
}

Permissions perms = Permissions.Read | Permissions.Write;
CheckPermissions(perms);
```

**Output:**
```
Permissions: Read, Write
Can Read: True
Has Read and Write: True
Has Execute or Delete: False
Exact match for Read|Write: True
```

### From `int` to binary

```csharp
int element = 4;
Console.WriteLine($"{element}: {Convert.ToString(element, 2)}"); // it will print 100

int element = 1;
Console.WriteLine($"{element}: {Convert.ToString(element, 2)}"); // it will print 1

int element = 1;
Console.WriteLine($"{element}: {Convert.ToString(element, 2).PadLeft(3, '0')}"); // it will print 001
```


### Notes
- The `HasFlag` method is convenient but performs a boxing operation for enums, which may impact performance in tight loops. Use bitwise operations for performance-critical code.
- Ensure the enum is marked with `[Flags]` to enable proper string representation (e.g., `Read, Write` instead of a numeric value).

* * *

## Mask-Based Filtering

The example below uses bitmasks to filter the category of an EntityID array for a RPG game that is architected by using Data-Driven Design and ECS. For instance, all items related data have an EntityID from 0 to 255:

```json
{
  "30": { <--- EntitiyId
    "Name": "Ring of Strength", 
    "Categories": { "Type": "Accessory", "Execution": "Immediate" },
    "GrantedComponents": [
      { "Tag": "AttributeComponent", "Properties": { "Target": "Strength", "Value": "3.0" } }
    ]
  },
  "101": { <--- EntityId
    "Name": "Sword of Flames", 
    "Categories": { "Type": "Weapon", "Execution": "Immediate" },
    "GrantedComponents": [
      { "Tag": "WeaponComponent", "Properties": { "Damage": "10.0", "DamageType": "Physical" } },
      { 
        "Tag": "MagicComponent", 
        "Properties": { "Trigger": "OnHit", "Effect": "Damage", "Value": "15.0", "DamageType": "Fire" } 
      }
    ]
  }
}
```

This is how the Mask-Based Filtering logic works:

```csharp
public static class EntityMasks
{
    // These values identify the bit-flags corresponding to your current pointer ranges
    public const int ITEM_MASK       = 0x000; // 0-255 (No high bits set)
    public const int NPC_MASK        = 0x100; // 256 (Bit 8 set)
    public const int PROJECTILE_MASK = 0x200; // 512 (Bit 9 set)
    
    // Mask to isolate only the type bits (ignoring the 0-255 index bits)
    public const int TYPE_MASK       = ITEM_MASK | NPC_MASK | PROJECTILE_MASK; 
}

public ItemData? GetItem(int id)
{
    // 1. Bitwise Type Check: Is this actually an item?
    if ((id & EntityMasks.TYPE_MASK) != EntityMasks.ITEM_MASK) return null;

    // 2. Bounds Check: Is the ID within our array memory?
    if (id >= 0 && id < _itemDatabase.Length)
        return _itemDatabase[id];

    return null;
}
```

### Understanding EntityMasks and Bitwise Filtering

Your code utilizes the concepts of **Bitmasks** to partition and validate entity IDs efficiently. Here is how the logic works:

#### 1. The Strategy: Partitioning

By assigning IDs in specific bit-blocks (e.g., `0x100` for NPCs, `0x200` for Projectiles), you are creating a system where the "Type" of an entity is encoded directly into its ID.

* **`ITEM_MASK` (0x000)**: Uses the lowest bits (0-255).
* **`NPC_MASK` (0x100)**: Flips bit 8.
* **`PROJECTILE_MASK` (0x200)**: Flips bit 9.

#### 2. The Power of `TYPE_MASK`

Using the **Bitwise OR** (`|`) operator to create `TYPE_MASK` creates a "master mask" that identifies the structural region of your ID, allowing you to ignore the specific index (0-255) and focus only on the category bits.

#### 3. Efficient Validation

In your `GetItem(int id)` method, you perform a **Fail-Fast** check:

```csharp
if ((id & EntityMasks.TYPE_MASK) != EntityMasks.ITEM_MASK) return null;

```

* **The Operation**: You use the bitwise `&` (AND) operator to extract the category bits of the `id`.
* **The Comparison**: If the extracted bits don't match `ITEM_MASK`, the system knows instantly—without checking the array or memory—that the ID is not an item.
* **Why it's fast**: Bitwise `&` is a single CPU instruction, which is significantly faster than standard range checking or complex conditionals.

### How to document this in your file

You can add this to a new section in your `enums_flags.md` file called **"Advanced Application: Mask-Based Entity Filtering"**.

### Key Takeaways

* **Safety**: You are preventing invalid data from reaching your array access logic by validating the ID's type first.
* **Performance**: You are using bitwise `&` rather than `HasFlag` or multiple `if` branches, which is preferred for performance-critical systems like game engines.
* **Scalability**: By updating `TYPE_MASK` via OR operations, the code is easily extensible if you add more entity types later.

### TYPE_MASK

To understand `TYPE_MASK`, you have to realize that your `id` carries two different pieces of information at the same time:

1. **The Index**: Which slot in the array it occupies (the lower 8 bits, 0-255).
2. **The Type**: Which category it belongs to (the higher bits, 256 and 512).

### The "Filter" Concept

When you look at an entity `id` like `260` (which is an NPC), its binary looks like this:
`0001 0000 0100` (Binary for 260)

If you only want to know the **Type**, you need to "hide" the index part (`0000 0100`) and only look at the category part (`0001 0000 0000`).

**`TYPE_MASK` is the tool that hides the index.**

### How the `&` (AND) operation works:

When you perform `(id & TYPE_MASK)`, the computer performs a logical "multiplication" on every bit:

* If the mask has a `1`, the original bit stays.
* If the mask has a `0`, the original bit is forced to `0` (hidden).

**Example: Is ID `260` an Item?**

* **ID**: `0001 0000 0100` (260)
* **MASK**: `0011 0000 0000` (0x300)
* **Result**: `0001 0000 0000` (0x100, which is `NPC_MASK`)

Now compare the result:
`0x100` (Result) `!=` `0x000` (ITEM_MASK). **The check returns `true`, and the function correctly returns `null` because it's an NPC, not an Item.**

### Why is this better than just checking the number?

If you didn't have `TYPE_MASK`, you would have to write:
`if (id >= 256 && id < 512)`

While that works for now, what happens if you add more entity types or move them around? With `TYPE_MASK`, you are asking the CPU to ignore the "noise" (the specific index) and look only at the "category" (the bits that define the type).

### In short:

* `TYPE_MASK` defines the **"Region of Interest"** in the number.
* By setting it to `0x300`, you are telling the computer: *"I don't care about the last 8 bits (the index); I only care about bits 8 and 9 (the category)."*


