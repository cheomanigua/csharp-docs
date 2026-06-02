# Dictionaries

## Dictionary creation

There are to ways to create a dictionary:

```csharp
Dictionary<string, int> attributes = new Dictionary<string, int>
{
	{"strength", 7},
	{"intelligence", 8},
	{"dexterity", 5}
};
```
or

```csharp
Dictionary<string, int> attributes = new Dictionary<string, int>()
attributes.Add("strength", 7);
attributes.Add("intelligence", 8);
attributes.Add("dexterity", 5);
```

## New Entry

```csharp
attributes.Add("endurance", 10);
```

## Entry Update

```csharp
// Direct update
attributes["endurance"] = 8;                    // endurance == 8

// Update via variable
int endurance = (int)attributes["endurance"];
endurance += 4;
attributes["endurance"] = endurance;            // endurance == 12
```

## Example

```csharp
using System.Collections.Generic;
using System.Linq;

public partial class Player : RigidBody2D
{
    // Declare a new dictionary
    Dictionary<string, int> attributes;

    public override void _Ready()
    {
        // Define a declared dictionary
        attributes = new Dictionary<string, int>
        {
            {"strength", 7},
            {"intelligence", 8},
            {"dexterity", 5}
        };

        // Add new entry
        attributes.Add("endurance", 6);

        // Update an entry
        attributes["strength"] = 8;

        // Update an entry
        int strength = (int)attributes["strength"];
        strength += 2;
        attributes["strength"] = strength;

        // Check if element "strength" is in the dictionary
        if (attributes.ContainsKey("strength")
        {
            GD.Print("Strength is present.");
        }



        // Dictionary iteration

        foreach (var attrib in attributes)
        {
            Godot.GD.Print(attrib.Key, ": ", attrib.Value);
        }

        foreach (var attrib in attributes)
        {
            Godot.GD.Print($"{attrib.Key}: {attrib.Value}");
        }

        foreach (KeyValuePair<string, int> attrib in attributes)
        {
            Godot.GD.Print(attrib.Key, ": ", attrib.Value);
        }

        foreach (var key in attributes.Keys)
        {
            Godot.GD.Print(key);
        }

        foreach (var val in attributes.Values)
        {
            Godot.GD.Print(val);
        }
    }
}
```

## Object vs Variant

</br>

##### Object (`Dictionary<string, object>`)

```csharp
var city = new Dictionary<string, object>
{
    {"name", "Uruk"},
    {"population", 3000},
    {"growth_rate", 2.5f}
};
```

It is better for most scenarios because of performance, simplicity and flexibility.

- **Performance**: Faster for dictionary creation (0.001–0.002 ms vs. 0.002–0.005 ms) and JSON deserialization (0.005–0.01 ms vs. 0.01–0.02 ms).
- **Simplicity**: No custom `JsonConverter` needed for `System.Text.Json`.
- **Flexibility**: Works seamlessly in C# and can be converted to `Variant` for Godot API calls using `ConvertToVariant`.

</br>
</br>

##### Variant (`Dictionary<string, Variant>`)

```csharp
var city = new Dictionary<string, Variant>
{
    {"name", "Uruk"},
    {"population", 3000},
    {"growth_rate", 2.5f}
};
```

It is better only if:

- You frequently pass the dictionary to Godot’s API (e.g., `Node.Set`, `Node.Call`) and want to avoid conversion overhead.
- You’re comfortable with a custom `JsonConverter` for JSON deserialization or using Godot’s `Json` class (slower but simpler).
- The implicit conversion of .NET types to `Variant` is reliable in your environment.


## JSON


JSON file: [creatures.json](https://drive.google.com/file/d/1pqJw1z3rW2_9pZzKRPQUmhrX_wpwNScq/view)

##### Object (`Dictionary<string, Dictionary<string, object>>`)

```csharp
// Read JSON file
string jsonString = File.ReadAllText("creatures.json");

// Parse JSON into a dictionary (deserialization)
var creatures = JsonSerializer.Deserialize<Dictionary<string, Dictionary<string, object>>>(jsonString);

// Print the dictionary formatted as JSON (serialization)
string jsonOutput = JsonSerializer.Serialize(creatures, new JsonSerializerOptions { WriteIndented = true });
GD.Print(jsonOutput);
```

{{< alert context="warning" text="While the code loaded the JSON into a `Dictionary<string, Dictionary<string, object>>`, using `object` in C# can get messy quickly. You have to constantly cast things (e.g., telling the computer *Trust me, this object is an integer*), which leads to bugs. Since you are using C# in Godot, the most powerful and clean way to handle NPC stats is to map your JSON directly to a C# Class or Struct. See example below:" />}}

JSON file: [creaturesclass.json](https://drive.google.com/file/d/1bnpA4guQ7u_bXxW7cZym16UezOjPewqy/view)

##### Class (`Dictionary<string, FooClass>`)

```csharp
public class NpcStats
{
    public string RaceName { get; set; }
    public int Strength { get; set; }
    public int Dexterity { get; set; }
    public int Endurance { get; set; }
    public int Intelligence { get; set; }
    public int Health { get; set; }
}

public partial class Whatever : Node
{
    public override void _Ready()
    {
        // Read JSON file
        string jsonString = File.ReadAllText("creaturesclass.json");

        // Deserialize (No extra options needed because the keys match exactly!)
        var creatures = JsonSerializer.Deserialize<Dictionary<string, NpcStats>>(jsonString);

        // Print the dictionary formatted as JSON (serialization)
        string jsonOutput = JsonSerializer.Serialize(creatures, new JsonSerializerOptions { WriteIndented = true });
        GD.Print(jsonOutput);

    }
}
```

## Iteration and access

Given the above JSON deserialization (Object version or Class version), we can iterate and access particular keys and values:

{{< tabs tabTotal="2">}}
{{% tab tabName="Object" %}}

```csharp
var ckey = "goblin"
var cvalue = "strength"


/////  1. ITERATION  /////

// Print primary keys
foreach (var race in creatures)
{
    GD.Print(race.Key);
}

// Print attributes of goblin
GD.Print("VERSION 1");
foreach (var attribute in creatures[ckey])
{
    GD.Print($"{attribute.Key}: {attribute.Value}");        // same result as VERSION 2
}

// Print attributes of goblin
GD.Print("\nVERSION 2");
foreach (var attribute in creatures[ckey].Keys)
{
    GD.Print($"{attribute}: {creatures[ckey][attribute]}"); // same result as VERSION 1
}

// Print a list of all creatures and their attributes
foreach (var creature in creatures)
{
    GD.Print($"Creature: {creature.Key}");
    foreach (var attribute in creature.Value)
    {
        GD.Print($"{attribute.Key}: {attribute.Value}");
    }
}


/////  2. ACCESS PARTICULAR KEYS AND VALUES  /////

// Accessing list of primary keys
GD.Print(string.Join(", ", creatures.Keys));                // agoiru, orc, adivia, human, goblin

// Accessing list of primary values
GD.Print(string.Join(", ", creatures[ckey]));               // [race_name, goblin], [strength, 5], [dexterity, 7], etc

// Accessing list of secondary keys
GD.Print($"{string.Join(", ", creatures[ckey].Keys)}");     // race_name, strength, dexterity, etc

// Accessing list of secondary values
GD.Print($"{string.Join(", ", creatures[ckey].Values)}");   // goblin, 5, 7, etc

// Accessing goblin strength
GD.Print(creatures["goblin"]["strength"]);      // 5
GD.Print(creatures["goblin"][cvalue]);          // 5
GD.Print(creatures[ckey]["strength"]);          // 5
GD.Print(creatures[ckey][cvalue]);              // 5
```

{{% /tab %}}
{{% tab tabName="Class" %}}

```csharp
// Setup lookup variables for the documentation samples below
var ckey = "goblin";

// Cache the properties once via reflection to keep loop execution performant
var properties = typeof(NpcStats).GetProperties();


// ====================================================================
// PART 1: ITERATION VARIATIONS
// ====================================================================
GD.Print("\n===== 1. ITERATION EXAMPLES =====");

// A. Print Primary Keys (The high-level dictionary keys)
GD.Print("--- PRIMARY KEYS ---");
foreach (var race in creatures)
{
    GD.Print(race.Key);
}

// B. Print attributes of a SINGLE creature (VERSION 1: Dynamic Reflection)
GD.Print("\n--- SINGLE CREATURE: VERSION 1 (Reflection) ---");
foreach (var property in properties)
{
    var value = property.GetValue(creatures[ckey]);
    GD.Print($"{property.Name}: {value}");
}

// C. Print attributes of a SINGLE creature (VERSION 2: Static / Hardcoded)
GD.Print("\n--- SINGLE CREATURE: VERSION 2 (Direct Property Access) ---");
var gob = creatures[ckey];
GD.Print($"RaceName: {gob.RaceName}");
GD.Print($"Strength: {gob.Strength}");
GD.Print($"Dexterity: {gob.Dexterity}");
GD.Print($"Endurance: {gob.Endurance}");
GD.Print($"Intelligence: {gob.Intelligence}");
GD.Print($"Health: {gob.Health}");


// --- PRINT ALL CREATURES VARIATIONS ---

// Loop Version A: Direct Property Access
// Best for production gameplay logic. Incredibly fast, type-safe, and 
// benefits from IDE autocomplete.
GD.Print("\n--- ALL CREATURES: VERSION A (Direct) ---");
foreach (var creature in creatures)
{
    GD.Print($"Creature: {creature.Key}");
    GD.Print($"  RaceName: {creature.Value.RaceName}");
    GD.Print($"  Strength: {creature.Value.Strength}");
    GD.Print($"  Dexterity: {creature.Value.Dexterity}");
    GD.Print($"  Endurance: {creature.Value.Endurance}");
    GD.Print($"  Intelligence: {creature.Value.Intelligence}");
    GD.Print($"  Health: {creature.Value.Health}");
}

// Loop Version B: Reflection
// Perfect for telemetry, generalized debugging, or log-dumps. If you add 
// new stats to the blueprint class later, this loop auto-updates itself.
GD.Print("\n--- ALL CREATURES: VERSION B (Reflection) ---");
foreach (var creature in creatures)
{
    GD.Print($"Creature: {creature.Key}");
    foreach (var property in properties)
    {
        var value = property.GetValue(creature.Value);
        GD.Print($"  {property.Name}: {value}");
    }
}

// Loop Version C: LINQ / Inline String Join
// Highly compact variation using a LINQ projection to smash all 
// data names and values into a single inline print statement.
GD.Print("\n--- ALL CREATURES: VERSION C (LINQ / Inline) ---");
foreach (var creature in creatures)
{
    var valuesList = properties.Select(p => $"{p.Name}: {p.GetValue(creature.Value)}");
    GD.Print($"Creature: {creature.Key} -> {string.Join(", ", valuesList)}");
}


// ====================================================================
// PART 2: ACCESSING PARTICULAR KEYS AND VALUES
// ====================================================================
GD.Print("\n===== 2. ACCESS PARTICULAR KEYS AND VALUES =====");

// Accessing list of primary keys
GD.Print(string.Join(", ", creatures.Keys));                // agoiru, orc, adivia, human, goblin

// Accessing list of primary values (Outputs the loaded C# object types)
GD.Print(string.Join(", ", creatures.Values));

// Accessing list of secondary keys (Property names from the class definition via LINQ)
var secondaryKeys = properties.Select(p => p.Name);
GD.Print(string.Join(", ", secondaryKeys));                 // RaceName, Strength, Dexterity, Endurance, Intelligence, Health

// Accessing list of secondary values for a specific key
var secondaryValues = properties.Select(p => p.GetValue(creatures[ckey]));
GD.Print(string.Join(", ", secondaryValues));                // goblin, 5, 7, 7, 5, 10

// Accessing goblin strength directly
// Notice how clean, type-safe, and compile-checked this is compared to string dictionary lookups!
GD.Print(creatures["goblin"].Strength);                     // 5
GD.Print(creatures[ckey].Strength);                         // 5
```

{{% /tab %}}
{{< /tabs >}}


## Search particular element

If we want to find out if a particular element is inside a dictionary, there are different ways to implement the search. In the examples below, we are looking for `Gold`.

#### One dimentional dictionary

```csharp
Dictionary<string, int> inventory = new Dictionary<string, int>
{
    {"Silver", 23},
    {"Gold", 56},
    {"Ruby", 8}
};

// Option 1. Faster if only "Gold" is required
if (inventory.ContainsKey("Gold"))
{
    GD.Print("There is gold!!");
}

// Option 2. Faster if "Gold" and quantity is required
if (inventory.TryGetValue("Gold", out int quantity))
{
    Console.WriteLine($"Gold is found with quantity {quantity}.");
}
```

#### Nested dictionary with Tuple

```csharp
Dictionary<int, (string, int)> inventory = new Dictionary<int, (string, int)>
{
    { 0, ("Silver", 23) },
    { 1, ("Gold", 56) },
    { 2, ("Ruby", 8) }
};

foreach (var pair in inventory)
{
    if (pair.Value.Item1 == "Gold")
    {
        Console.WriteLine($"Gold is found at key {pair.Key} with quantity {pair.Value.Item2}.");
        break; // Stop after finding the first instance, adjust if you need all instances
    }
}
```

#### Nested dictionary with dictionary

```csharp
Dictionary<string, Dictionary<string, Dictionary<string, double>>> inventory = new Dictionary<string, Dictionary<string, Dictionary<string, double>>>();

// Searching in outer dictionary
if (inventory.ContainsKey("Gold"))
{
    Console.WriteLine("Gold is found as an outer key in the inventory!");
}

// Searching in middle dictionary
foreach (var outerPair in inventory)
{
    if (outerPair.Value.ContainsKey("Gold"))
    {
        found = true;
        Console.WriteLine($"Gold found as a middle key in outer key '{outerPair.Key}' with value {outerPair.Value["Gold"]}.");
        break; // Stop after finding the first instance, adjust if you need all instances
    }
}

// Searching in inner dictionary
foreach (var outerPair in inventory)
{
    foreach (var middlePair in outerPair.Value)
    {
        if (middlePair.Value.ContainsKey("Gold"))
        {
            found = true;
            Console.WriteLine($"Gold found in outer key '{outerPair.Key}', middle key '{middlePair.Key}' with value {middlePair.Value["Gold"]}.");
            break; // Stop after finding the first instance, adjust if you need all instances
        }
    }
    if (found) break;
}
```

## Dictionary vs Class

- Use a **Dictionary** only if your players can dynamically gain completely unpredictable, random modifications during runtime that you cannot plan for (e.g., a status effect engine where strings are dynamically generated by mods).
- Use a **Class** for core player stats (Strength, Intel, Dex). It makes your code faster, completely eliminates runtime crashes from simple typos, and naturally interfaces with Godot features.


| Feature | `Dictionary<string, int>` | Strongly Typed Class | Winner |
| --- | --- | --- | --- |
| **Data Memory** | Spread across a messy hash table. | Compact, contiguous block of memory. | **Class** |
| **Access Speed** | Medium (Requires calculating string hashes). | Instant (Points directly to a memory address). | **Class** |
| **Typo Protection** | None. `attributes["strenth"]` crashes game at runtime. | Total. `attributes.Strenth` won't even compile. | **Class** |
| **Autocomplete** | No. You must memorize your strings. | Yes. Your IDE tells you exactly what variables exist. | **Class** |

<br><br>
Example:

{{< tabs tabTotal="2">}}
{{% tab tabName="Dictionary" %}}

```csharp
using System.Collections.Generic;
using System.Linq;

public partial class Player : RigidBody2D
{
    // Declare a new dictionary
    Dictionary<string, int> attributes;

    public override void _Ready()
    {
        // Define a declared dictionary
        attributes = new Dictionary<string, int>
        {
            {"strength", 7},
            {"intelligence", 8},
            {"dexterity", 5}
        };

        // Add new entry
        attributes.Add("endurance", 6);

        // Update an entry
        attributes["strength"] = 8;

        // Update an entry
        int strength = (int)attributes["strength"];
        strength += 2;
        attributes["strength"] = strength;

        // Check if element "strength" is in the dictionary
        if (attributes.ContainsKey("strength")
        {
            GD.Print("Strength is present.");
        }

        // Dictionary iteration

        foreach (var attrib in attributes)
        {
            Godot.GD.Print(attrib.Key, ": ", attrib.Value);
        }

        foreach (var attrib in attributes)
        {
            Godot.GD.Print($"{attrib.Key}: {attrib.Value}");
        }

        foreach (KeyValuePair<string, int> attrib in attributes)
        {
            Godot.GD.Print(attrib.Key, ": ", attrib.Value);
        }

        foreach (var key in attributes.Keys)
        {
            Godot.GD.Print(key);
        }

        foreach (var val in attributes.Values)
        {
            Godot.GD.Print(val);
        }
    }
}
```

{{% /tab %}}
{{% tab tabName="Class" %}}

```csharp
using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using Godot;

// 1. THE BLUEPRINT CLASS
// This defines the structure of your player's data safely and efficiently.
public class PlayerAttributes
{
    public int Strength { get; set; }
    public int Intelligence { get; set; }
    public int Dexterity { get; set; }
    public int Endurance { get; set; } // Ready to hold data when needed
}

// 2. YOUR GODOT PLAYER NODE
public partial class Player : RigidBody2D
{
    // Declare the strongly typed data class
    private PlayerAttributes attributes;

    public override void _Ready()
    {
        // Define/Initialize the class instance (Replaces dictionary creation)
        attributes = new PlayerAttributes
        {
            Strength = 7,
            Intelligence = 8,
            Dexterity = 5
        };

        // "Add new entry" -> In a class, you just assign a value to the pre-defined property
        attributes.Endurance = 6;

        // Update an entry (Direct assignment)
        attributes.Strength = 8;

        // Update an entry (Math operation)
        // Notice how you don't need to type-cast from (int) anymore! It's natively an integer.
        attributes.Strength += 2; 

        // Check if an attribute is "present"
        // Because fields are defined at compile time, attributes are ALWAYS present.
        // Instead of searching keys, you check if the property has been set or meets a condition.
        if (attributes.Strength > 0)
        {
            GD.Print("Strength is present and active.");
        }

        // ====================================================================
        // DATA ITERATION VARIATIONS
        // ====================================================================
        GD.Print("\n===== ITERATION EXAMPLES =====");

        // Cache properties for reflection loops
        var properties = typeof(PlayerAttributes).GetProperties();

        // Variation 1: Reflection (Simulates iterating through Dictionary KeyValuePairs)
        foreach (var property in properties)
        {
            GD.Print(property.Name, ": ", property.GetValue(attributes));
        }

        // Variation 2: Reflection with String Interpolation
        foreach (var property in properties)
        {
            GD.Print($"{property.Name}: {property.GetValue(attributes)}");
        }

        // Variation 3: Printing only the "Keys" (Property Names)
        foreach (var property in properties)
        {
            GD.Print(property.Name);
        }

        // Variation 4: Printing only the "Values" (Property Data)
        foreach (var property in properties)
        {
            GD.Print(property.GetValue(attributes));
        }
    }
}
```

{{% /tab %}}
{{< /tabs >}}

### Dictionaries Use Cases

Dictionaries make sense when your game data is **unpredictable, dynamic, or structural chaos is a feature**.

While a strongly typed class forces you to lock down your attributes ahead of time (e.g., every NPC *must* have exactly `Strength`, `Dexterity`, and `Intelligence`), a dictionary allows you to change the entire structure of an object on the fly while the game is running.

Here are the specific scenarios in a game where dictionaries are vastly superior to strongly typed classes for NPCs or Cities:

#### 1. When Storing Dynamic Status Effects or Buffs

If your NPCs can catch diseases, drink temporary potions, or get cursed, a dictionary is perfect. You don't want to bloat your `NpcStats` class with 100 boolean variables for every possible status effect in the game.

Instead, you give the NPC a status dictionary:

```csharp
// The keys appear and disappear completely at runtime
var activeStatuses = new Dictionary<string, int>
{
    { "Poisoned", 3 }, // Takes 3 damage per turn
    { "Frozen", 1 }    // Frozen for 1 turn
};

// When the poison wears off, you completely erase it from existence
activeStatuses.Remove("Poisoned");

```

#### 2. When Handling City Inventories or Market Prices

In a economy simulation game, cities might trade dozens of different commodities (Wheat, Iron, Wood, Spice). If you use a class, you have to hardcode `public int WheatCount { get; set; }`. If you decide to add "Ruby" to the game later, you have to rewrite your code.

A dictionary allows a city's market to scale infinitely without changing a single line of C# code:

```csharp
// Perfect use case: The keys change depending on what the city actually owns
var cityMarketStock = new Dictionary<string, int>
{
    { "Wheat", 500 },
    { "Iron Ore", 12 },
    { "Silk", 0 } 
};

// Adding a new item to the global economy requires zero code changes!
cityMarketStock.Add("Dragon Scales", 1); 

```

#### 3. When Building an Aggressive Modding System

If you want players to be able to open up your game's JSON files, add a brand-new attribute that you never planned for (like `"Mana"` or `"RadiationLevel"`), and have the game just "figure it out," you *must* use a dictionary.

A strongly typed class will completely crash or ignore any JSON keys that don't match its hardcoded properties. A `Dictionary<string, object>` will gracefully swallow whatever random data a modder injects into the text file.

#### 4. When Implementing City "Tags" or Traits

If your cities can randomly gain or lose global traits based on historical game events, a dictionary (or a `HashSet`) is ideal.

```csharp
// A dictionary allows you to dynamically attach data-heavy traits to a city
var cityTraits = new Dictionary<string, object>
{
    { "IsCapital", true },
    { "PlagueOutbreak", 4 }, // Level 4 plague severity
    { "CurrentRuler", "King George III" }
};

```

### Architectural Summary: The Hybrid Approach

In professional game development, you rarely choose just *one*. The best architecture uses a **Hybrid Approach**:

```csharp
public class NativeCity
{
    // 1. CORE DATA (Use a Class): Core things that EVERY city guaranteed to have.
    public string CityName { get; set; }
    public int Population { get; set; }
    
    // 2. DYNAMIC DATA (Use Dictionaries): Things that change shape constantly.
    public Dictionary<string, int> ResourceStockpile { get; set; }
    public Dictionary<string, Variant> ActiveEvents { get; set; }
}

```

> **The Golden Rule:** Use **Classes** for the rigid skeleton of your NPCs/Cities (data that is permanent and universal). Use **Dictionaries** for the fluid flesh of your systems (inventories, status effects, and moddable elements that fluctuate dynamically).

## Hybrid approach (Dictionary + Class)

Game development actually uses an hybrid approach: using dictionaries and classes simultaneously.

- Use **Classes** for the rigid skeleton of your NPCs/Cities (data that is permanent and universal).
- Use **Dictionaries** for the fluid flesh of your systems (inventories, status effects, and moddable elements that fluctuate dynamically).

To implement a true hybrid approach, we will divide our creature data into two distinct categories:

- The Core Stats (Strongly Typed Class): Permanent, universal values that every single creature in the game is guaranteed to have (Strength, Dexterity, Endurance, Intelligence, Health).
- The Dynamic Traits (Dictionary): Unpredictable, fluid data that can change completely depending on the creature type or game state (Inventories, active spells, status effects, special abilities, or modded entries).

Example:

JSON file: [creatureshybrid](https://drive.google.com/file/d/1gdrLa3VkiFJBX2VEU8nYNYJfexV0M6LR/view)

```csharp
using System;
using System.IO;
using System.Collections.Generic;
using System.Text.Json;
using Godot;

// ============================================================================
// 1. THE HYBRID BLUEPRINT CLASS
// ============================================================================
public class NpcStats
{
    // --- CORE FIELDS (Strongly Typed) ---
    // Guaranteed to exist on every NPC. Fast, compile-safe.
    public string RaceName { get; set; }
    public int Strength { get; set; }
    public int Dexterity { get; set; }
    public int Endurance { get; set; }
    public int Intelligence { get; set; }
    public int Health { get; set; }

    // --- DYNAMIC FIELDS (The Dictionary) ---
    // Totally unpredictable. Allows unique data per creature without bloating the class.
    public Dictionary<string, object> DynamicTraits { get; set; } = new Dictionary<string, object>();
}

// ============================================================================
// 2. MAIN EXECUTION
// ============================================================================
public partial class Whatever : Node
{
    public override void _Ready()
    {
        // Load and parse the hybrid JSON structure
        string jsonString = File.ReadAllText("creatures.json");
        var creatures = JsonSerializer.Deserialize<Dictionary<string, NpcStats>>(jsonString);

        // Let's look up our two different creatures to see how the code handles them
        string orcKey = "Orc";
        string goblinKey = "Goblin";

        if (!creatures.ContainsKey(orcKey) || !creatures.ContainsKey(goblinKey)) return;

        NpcStats orc = creatures[orcKey];
        NpcStats goblin = creatures[goblinKey];


        // ----- DEMONSTRATING THE HYBRID BENEFIT -----

        GD.Print("===== CORE STATS (Same for both, clean autocomplete) =====");
        // Both objects use standard dot-notation properties natively
        GD.Print($"{orc.RaceName} HP: {orc.Health} | Strength: {orc.Strength}");
        GD.Print($"{goblin.RaceName} HP: {goblin.Health} | Strength: {goblin.Strength}");


        GD.Print("\n===== DYNAMIC TRAITS (Unique per creature) =====");

        // 1. Processing the Orc's unique dynamic data
        GD.Print($"--- {orc.RaceName} Traits ---");
        if (orc.DynamicTraits.TryGetValue("WeaponType", out object weapon))
        {
            GD.Print($"Equipped Weapon: {weapon}"); // Outputs: Greataxe
        }
        if (orc.DynamicTraits.TryGetValue("IsEnraged", out object enraged) && (bool)enraged)
        {
            GD.Print("Warning: This Orc is currently enraged!");
        }

        // 2. Processing the Goblin's unique dynamic data
        GD.Print($"\n--- {goblin.RaceName} Traits ---");
        if (goblin.DynamicTraits.TryGetValue("StealthLevel", out object stealth))
        {
            // JsonElement numbers often deserialize as JsonElement objects, 
            // so using Convert avoids casting errors with dynamic objects
            int level = Convert.ToInt32(stealth); 
            GD.Print($"Stealth Skill Level: {level}"); // Outputs: 3
        }
        if (goblin.DynamicTraits.TryGetValue("CanSteal", out object thief) && (bool)thief)
        {
            GD.Print("Watch your pockets, this creature can steal your gold.");
        }


        GD.Print("\n===== RUNTIME FLUIDITY (Modifying dictionaries dynamically) =====");
        // We can add a brand-new trait to the Goblin right now during gameplay 
        // without altering the NpcStats class structure at all.
        goblin.DynamicTraits.Add("CurrentStatusEffect", "Poisoned");

        // We can completely clean up or remove traits when they wear off
        orc.DynamicTraits.Remove("IsEnraged");
        GD.Print("The Orc has calmed down. 'IsEnraged' trait removed.");
    }
}
```

#### Architectural Breakdown of this Output

- When making an AI Combat Loop: You write `if (orc.Strength > goblin.Dexterity)`. This evaluates instantly with pure CPU math performance.
- When giving the player an item reward: You write `player.Gold += Convert.ToInt32(orc.DynamicTraits["GoldReward"]);`. The dictionary handles it safely. If you later create a "Deer" JSON entry that has no gold reward, the game won't break; it will simply skip checking that key!
