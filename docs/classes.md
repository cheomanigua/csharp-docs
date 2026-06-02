# Classes

### Terminology

- **[Members](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/members)**: represent the data and behaviour of a class or struct: fields, constants, properties, methods, events, operators, indexers, constructors, finalizers, nested types. All members use PascalCase style, except private fields and local variables, which use camelCase style.
- **[Fields](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/fields)**: variable of any type that is declared directly in a class or struct. Generally, you should declare private or protected accessibility for fields. Data exposed to client code should be provided through methods, properties, and indexers.
    ```csharp
    private string _lastName;   // private fields use camelCase starting with underscore (_)
    public string FirstName;    // public fields use PascalCase. However it is recommended to use properties instead
    ```
- **[Properties](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/properties)**: provides a flexible mechanism to read, write, or compute the value of a data field. Properties appear as public data members, but they're implemented as special methods called accessors (get/set).
    ```csharp
    // All properties use PascalCase
    public string FirstName { get; set; }
    private string Address { get; set; }
    ```
- **[Methods](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/methods)**: A method is a code block that contains a series of statements. A program causes the statements to be executed by calling the method and specifying any required method arguments.
    ```csharp
    // All methods use PascalCase
    public void StartEngine() {/* Method statements here */ }
    ```
- **[Constructors](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/constructors)**: A constructor is a method called by the runtime when an instance of a class or a struct is created. A class or struct can have multiple constructors that take different arguments.
    ```csharp
    public class Person
    {
        private string Last { get; set; }
        private string First { get; set; }

        public Person(string last, string first)
        {
            Last = last;
            First = first;
        }

        // Remaining implementation of Person class.
    }
    ```
- **Local variables**: are not members. Declared within a method, constructor, or block (e.g., inside curly braces {}). It exists only within that specific scope and is destroyed when the scope is exited. Local variables are typically stored on the stack and are not associated with an object's state.

    ```csharp
    public class Person
    {
        // private field
        private int _luck;

        public int IncreaseLuck()
        {
            int localVar = 10;  // local variable, exists only in IncreaseLuck
            var localVar2= 10;  // local variables can use implicitly typed (`var`) when the type is evident
            return _luck += localVar;
        }
    }

### Naming conventions [](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/identifier-names)

- Use PascalCase for class names, method names, property names and public fields.
- Use PascalCase for constant names, both fields and local constants.
- Use camelCase for local variables (used only within a method, not within constructors or setters and getters).
- Use camelCase for method parameters.
- Use camelCase starting with underscore (_) for private fields (used in setters and getters).

```csharp
public class Person
{
    // Private fields
    private int _count;
    private int _age;

    // Property to expose/access the field _age
    public int Age
    {
        get => _age;
        set => _age = value;
    }

    // Property to expose/access the field _age (same as above, but shorter style)
    // In this case, there is no need to declare the private field _age.
    public int Age { get; set; }

    // Property exposing private field _count
    public int Count
    {
        get { return _count; }
    }

    // Property exposing private field _count (same as above, but shorter)
    public int Count => _count;

    // Property to expose/access the fields _firstName and _lastName.
    // There is no need to declare _firstName and _lastName using this style.
    private string FirstName { get; set; }
    private string LastName { get; set; }

    // Constructor
    public Person(string lastName, string firstName, int age)
    {
        LastName = lastName;
        FirstName = firstName;
        Age = age;
    }

    // Method
    public void Increment()
    {
        var step = 1;   // local variable
        _count += step; // accessing private field
    }
}
```



### Expression-Bodied Members/Methods

The `=>` operator is used to define a member (like a property, method, or indexer) with a single expression, making the syntax more concise.

- **Syntax**: `returnType MemberName => expression;`
- **Usage**: Replaces a full method or property getter with a single expression that returns a value.
- **Example**:
  ```csharp
  public class Person
  {
      private int _count = 42;
      public int Count => _count; // Expression-bodied property (read-only), returns _count
      public int DoubleCount() => _count * 2; // Expression-bodied method, returns _count * 2
  }
  ```
- **Explanation**: The `Count` property returns `_count`, and the `DoubleCount` method returns `_count * 2`. The `=>` replaces the need for a `{ return expression; }` block.

## 1. Class definition

A class must first be defined and later on instantiated. A class is composed of data, methods and constructors.

### 1.1. Data

A data can be declared inside a class either via a property or via a field. The simple one is via a field:

#### Field

```csharp
private string _lastName;           // private fields use camelCase starting with underscore (_)
public int PurchaseYear;            // public fields use PascalCase
public readonly int PurchaseYear;   // readonly public fields can only be assigned during instantiation
```

#### Property

```csharp
public int PurchaseYear { get; set; }   // properties use PascalCase and accessors
```
Property values are exposed via [accessors](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/using-properties): a read method (`get`) and a write method (`set`). Below are four different ways to use accessors to achieve the same result:

{{< tabs tabTotal="4">}}
{{% tab tabName="Block-Style" %}}

```csharp
// private instance field in camelCase and underscore
private int _purchaseYear;

// property in PascalCase
public int PurchaseYear
{
    get { return _purchaseYear; }
    private set { _purchaseYear = value; }
}
```

{{% /tab %}}
{{% tab tabName="Expression-Bodied" %}}

```csharp
// private instance field in camelCase and underscore
private int _purchaseYear;

// property in PascalCase
public int PurchaseYear
{
    get => _purchaseYear;
    private set => _purchaseYear = value;
}
```

{{% /tab %}}
{{% tab tabName="Auto-Implement" %}}

```csharp
public int PurchaseYear { get; private set; }
```
{{% /tab %}}
{{% tab tabName="Auto-Implement assigned" %}}

If the property has a public write method (`set`), you can assign a value after the declaration:

```csharp
public int PurchaseYear { get; set; } = 2025;
```
{{% /tab %}}
{{< /tabs >}}

It is also possible to use an indexed property with the write method (`get`):

```csharp
public Car this[int lotNumber]
{
    get { ... }
}
```

#### Example Usage:
```csharp
public class Car
{
    // Private field
    private int _purchaseYear;

    // Public property
    public int PurchaseYear
    {
        get => _purchaseYear;
        private set => _purchaseYear = value;
    }

    // Public method
    public void SetYear(int year)
    {
        PurchaseYear = year; // Allowed within the class
    }
}

var car = new Car();
car.PurchaseYear = 2024;                // Error: `setter` is private
car.SetYear(2023);                      // Works because SetYear is a class member method
Console.WriteLine(car.PurchaseYear);    // Works because `getter` is public. Prints 2023
```

#### Block-Style use

- If you want to add validation logic to the setter (e.g., ensuring `PurchaseYear` is within a valid range), use private fields and a traditional block-style setter:

  ```csharp
  private int _purchaseYear;

  public int PurchaseYear
  {
    get { return _purchaseYear; }
    private set
    {
        if (value >= 1900 && value <= DateTime.Now.Year)
            _purchaseYear = value;
        else
            throw new ArgumentException("Invalid purchase year");
    }
  }
  ```
- Ensure the property is used in a context where a private setter makes sense, as it restricts external modification.

#### Public fields vs properties

```csharp
public int PurchaseYear;                // public field
public int PurchaseYear { get; set; }   // property
```
In C#, **public fields** and **properties** both provide access to data in a class, but they serve different purposes and have distinct characteristics.

- A **public field** is a variable directly accessible from outside the class.
- A **property** is a member that provides a controlled way to access a private field (or data) with optional logic.

|                 | Public Field                     | Property                          |
|-----------------------|----------------------------------|-----------------------------------|
| **Encapsulation**     | None; direct access to data.     | Encapsulates data; controls access. |
| **Logic**             | No logic for get/set.            | Can include validation or logic.  |
| **Flexibility**       | Fixed; cannot change behavior.   | Can modify `get`/`set` later without breaking API. |
| **Usage**             | Avoid in public APIs; use internally or for simple structs. | Preferred for public APIs and most class designs. |
| **Performance**       | Marginally faster (negligible).  | Slightly slower due to method calls (negligible). |
| **Compatibility**     | Limited (e.g., no data binding).  | Works with frameworks, interfaces, etc. |

</br>

##### When to use

- **Public Fields**: Use sparingly, typically for internal or private fields, simple structs, or when performance is critical and no logic is needed (e.g., temporary data containers).
- **Properties**: Use in most cases, especially for public APIs, to ensure encapsulation, maintainability, and flexibility. Auto-implemented properties are ideal for simple cases, while full properties allow custom logic.

### 1.2. Methods

A method is an action that can be invoked within the class. Three questions have to be made when declaring a method:

1. Can the action be performed outside the class or only inside the class?

    ```csharp
    public string Hello() {}    // Action can be performed outside the class
    private int Addition() {}   // Action can only be performed inside the class
    ```

2. Does the action returns a value?

    ```csharp
    public string Hello()
    {
        string message = "Hello world";
        return message;             // returns a value
    }

    public void Hola()
    {
        GD.Print("Hello world");    // does not return a value
    }
    ```

3. Does the action require certain information to run?

    ```csharp
    private int Addition(int a, int b)     // requires certain information to run (int a, int b)
    {
        int result = a + b;
        return result;
    }
    ```

### 1.3. Constructor

A constructor lets you instantiate a class easily. We can define several distinct constructors in order to instantiate in several distinct ways.

All classes must have a constructor. If you don't define one, the C# compiler will use a default constructor:

```csharp
public Car() { }
```

We can define a constructor:

```csharp
public Car(int purchaseYear)
{
    PurchaseYear = purchaseYear;
}
```

In case of inheritance, the parent class constructor must be called first:

```csharp
public class Car
{
    public Car()
    {
        Console.WriteLine("Car constructor");
    }
}

public class Toyota : Car
{
    public Toyota()
    {
        Console.WriteLine("Toyota constructor");
    }
}
```

If the parent class constructor uses a paramenter, then the child class must fill that parameter by using the key word `base`:

```csharp
public class Car
{
    public Car(int purchaseYear)
    {
        Console.WriteLine("Car constructor");
    }
}

public class Toyota : Car
{
    public Toyota() : base(2025)
    {
        Console.WriteLine("Toyota constructor");
    }
}
```

### 1.4. Logic & validation in Properties

We can use accessors and constructors to build property logic validation. In the example below, we create the following class definition:

- **Properties**: Name, Strength, Intelligence, Dexterity, Endurance, Health, Mana.
- Health value is calculated by adding Strength + Endurance.
- Health value cannot exceeds the value 100.
- Mana value is calculated by multiplying Intelligence * 2.
- Mana value cannot exceeds the value 50.

```csharp

public class Person
{
    private int _health;
    private int _mana;

    public string Name { get; set; }
    public int Strength { get; set; }
    public int Intelligence { get; set; }
    public int Dexterity { get; set; }
    public int Endurance { get; set; }
    public int Health
    {
        get { return _health; }
        set => _health = System.Math.Clamp(value, 0, 100);
    }
    public int Mana
    {
        get => _mana;
        set => _mana = System.Math.Clamp(value, 0, 50);
    }

    public Person(string name, int str, int intel, int dex, int endu)
    {
        Name = name;
        Strength = str;
        Intelligence = intel;
        Dexterity = dex;
        Endurance = endu;
        Health = Strength + Endurance;
        Mana = Intelligence * 2;
    }
}
```

</br>

The above code works only during instantiation. However, if during the game `Strength` or `Endurance` changes value, it won't be reflected to `Health`. Likewise, if `Intelligence` changes value, it won't be reflected to `Mana`. If we want **Health** and **Mana** to update when **Strength**, **Endurance** or **Intelligence** changes, use this code instead:

```csharp

public class Person
{
    // Private fields
    private int _strength;
    private int _endurance;
    private int _intelligence;
    private int _health;
    private int _mana;

    // Public properties
    public string Name { get; set; }
    public int Dexterity { get; set; }

    public int Strength
    {
        get => _strength;
        set { _strength = value; UpdateHealth(); }
    }

    public int Endurance
    {
        get => _endurance;
        set { _endurance = value; UpdateHealth(); }
    }

    public int Intelligence
    {
        get => _intelligence;
        set { _intelligence= value; UpdateMana(); }
    }

    public int Health
    {
        get => _health;
        private set => _health = System.Math.Clamp(value, 0, 100);
    }

    public int Mana
    {
        get => _mana;
        private set => _mana = System.Math.Clamp(value, 0, 50);
    }

    // Constructor
    public Person(string name, int str, int intel, int dex, int endu)
    {
        Name = name;
        Strength = str;
        Intelligence = intel;
        Dexterity = dex;
        Endurance = endu;
    }

    // Methods
    private void UpdateHealth()
    {
        Health = _strength + _endurance;
    }

    private void UpdateMana()
    {
        Mana = _intelligence * 2;
    }
}
```
</br>

If we want to inform about `Health` and `Mana` changes, we can create events and add logic to the setters:

```csharp
public event System.Action<int> HealthChanged;
public event System.Action<int> ManaChanged;

public int Health
{
    get => _health;
    private set
    {
        _health = System.Math.Clamp(value, 0, 100);
        HealthChanged?.Invoke(_health);
    }
}
public int Mana
{
    get => _mana;
    private set
    {
        _mana = System.Math.Clamp(value, 0, 50);
        ManaChanged?.Invoke(_mana);
    }
}
```

## 2. Class instantiation

### 2.1. New

To create the actual instance, the `new` keyword is used. Given the class constructor:

```csharp
public Car(int purchaseYear)
{
    PurchaseYear = purchaseYear;
}
```
you can create an instance:

```csharp
Car car = new Car(2025);
```
or

```csharp
Car car = new(2025);
```

If the class constructor has no parameters:

```csharp
Car car = new Car();
```
or

```csharp
Car car = new();
```

### 2.2. Object initializer

If the class has a constructor with no parameters, you can use an object initializer.

Given the class:

```csharp
public class Employee
{
    public string Name { get; set; }
    public string Surname { get; set; }
    public bool isVIP { get; private set; }
}
```

you can assign values to a newly created instance using an object initializer: 

```csharp
var employee = new Employee { Name = "John", Surname = "Doe" };
```
As you can see above, since the boolean value `isVip` is using a private write method (`set`), it can only be defined inside the class and not by using the object initializer.

After instantiation, you can change `Name` or `Surname` like this:

```csharp
employee.Name = "Alice";
```

## 3. Virtual methods

When a class inherits from another, the child class has naturally the methods and data from the parent class. Sometimes, however, the child class may redefine some methods from the parent class. In that case:

* On the parent class, the keyword `virtual` must be used before the method name.
* On the child class, the keyword `override` must be used before the method to be replaced from the parent class.

```csharp
public class Car
{
    public virtual void StartEngine()
    {
        Console.WriteLine("Starting up engine...");
    }
}

public class Toyota : Car
{
    public override void StartEngine()
    {
        Console.WriteLine("Toyota is starting up engine...");
    }
}
```

## 4. Abstract class

An **abstract class** in C# is a class that cannot be instantiated directly and is designed to serve as a base class for other classes. It is declared using the `abstract` keyword and can contain both abstract members (methods, properties, etc., without implementation) and non-abstract members (with implementation). Derived classes must implement all abstract members unless they are also abstract.

#### Key Characteristics of an Abstract Class:
1. **Cannot be instantiated**: You cannot create an object of an abstract class using `new`.
2. **May contain abstract members**: These are declared without implementation, and derived classes must provide the implementation.
3. **Can contain non-abstract members**: These provide shared functionality for derived classes.
4. **Can include constructors**: These are used to initialize fields when derived classes are instantiated.
5. **Inheritance requirement**: Only classes that inherit from the abstract class can implement its abstract members.
6. **Can be extended**: Derived classes inherit from it using the `:` operator and must implement all abstract members or be abstract themselves.

#### Syntax Example:
```csharp
public abstract class Animal
{
    public string Name { get; set; } // Non-abstract property
    public abstract void MakeSound(); // Abstract method (no implementation)
    
    public void Sleep() // Non-abstract method
    {
        Console.WriteLine($"{Name} is sleeping.");
    }
}

public class Dog : Animal
{
    public override void MakeSound() // Must implement abstract method
    {
        Console.WriteLine("Woof!");
    }
}
```

#### Example Use Case:
Suppose you're building a game with different types of characters (e.g., `Warrior`, `Mage`). You can use an abstract class `Character` to define common properties like `Health` and `Name`, and an abstract method `Attack()` that each character type implements differently.

```csharp
public abstract class Character
{
    public string Name { get; set; }
    public int Health { get; set; }

    public abstract void Attack();
}

public class Warrior : Character
{
    public override void Attack()
    {
        Console.WriteLine($"{Name} swings a sword!");
    }
}

public class Mage : Character
{
    public override void Attack()
    {
        Console.WriteLine($"{Name} casts a fireball!");
    }
}
```

#### When to Use an Abstract Class:
Use an abstract class when:
1. **Shared Base Functionality**: You want to provide common functionality (fields, methods, or properties) for a group of related classes while enforcing certain behaviors to be implemented by derived classes.
   - Example: A base `Shape` class with a common `Color` property and an abstract `CalculateArea()` method that each derived shape (e.g., `Circle`, `Rectangle`) must implement.
2. **Hierarchy Design**: You need to define a template for a class hierarchy where some methods are mandatory but their implementation varies.
   - Example: A `Vehicle` class with an abstract `StartEngine()` method, implemented differently for `Car` and `Motorcycle`.
3. **Prevent Instantiation**: You want to ensure the base class cannot be instantiated directly, as it represents a general concept rather than a concrete object.
   - Example: `Animal` as an abstract class, with specific animals like `Dog` or `Cat` as concrete implementations.
4. **Mix of Abstract and Concrete Members**: Unlike interfaces, abstract classes can include implemented methods, making them suitable when you want to combine enforced contracts with reusable code.


#### When Not to Use:
- If you only need a contract without shared implementation, use an **interface** instead.
- If you need multiple inheritance, interfaces are better, as C# does not support multiple class inheritance.
- If the class can be instantiated on its own, it should not be abstract.

In summary, use abstract classes when you need a base class with shared functionality and want to enforce specific behaviors in derived classes while preventing direct instantiation.



## 5. Interface

In C#, an **interface** is a contract that defines a set of methods, properties, events, or indexers that a class or struct must implement, without providing any implementation details (from C# 8, you can provide implementation details, although is not recommended). It’s like a blueprint that ensures any class implementing the interface provides specific functionality.

There are no scopes inside an interface, everything is public by convention.

#### Key Characteristics of an Interface
- **Syntax**: Defined using the `interface` keyword, e.g., `public interface IMyInterface`.
- **Members**: Can include method signatures, properties, events, or indexers, but no implementation (prior to C# 8.0; default implementations were added in C# 8.0).
- **No Fields**: Interfaces cannot contain fields or constructors.
- **Multiple Inheritance**: A class can implement multiple interfaces, unlike class inheritance, which is single in C#.
- **Access Modifier**: Interface members are implicitly public and cannot have access modifiers like `private` or `protected`.

#### Example
```csharp
public interface IVehicle
{
    void Start();                                   // without implementation details
    void Stop() { Console.WriteLine("Stopped"); }   // with implementation details
    int Speed { get; }
}

public class Car : IVehicle
{
    public int Speed { get; private set; }
    public void Start() { Console.WriteLine("Car started."); }
    public void Stop() { Console.WriteLine("Car stopped."); }
}

public class Truck : IVehicle
{
    public int Speed { get; private set; }
    public void Start() { Console.WriteLine("Truck started."); }
    public void Stop() { Console.WriteLine("Truck stopped."); }
}

public class RemoteControl
{
    public void StartEngine(IVehicle vehicle)
    {
        vehicle.Start();
    }
}

var remoteControl = new RemoteControl();
var truck = New Truck();
remoteControl.StartEngine(truck); // will print "Truck started."
```
#### Inheritance

Inheritance is possible between interfaces:

```csharp
public interface IAutomaticGear
{
    void changeGear(string gear);
}

public interface IVehicle : IAutomaticGear
{
    void Start();
}

public class Car : IVehicle
{
    public void Start() { Console.WriteLine("Car started."); }
    public void changeGear(string gear) { Console.WriteLine(gear); }
}
```

#### Polymorphism

Polymorphism is possible with interfaces:

```csharp
public void CheckList(IAutomaticGear augear) { }

var car = new Car();
CheckList(car);
```

#### When to Use an Interface
Use interfaces when you want to:
1. **Define a Contract**: Ensure that different classes implement the same set of methods or properties, promoting consistency (e.g., `IEnumerable` for collections).
2. **Enable Polymorphism**: Allow different classes to be treated uniformly through a common interface type, regardless of their specific implementation.
3. **Support Loose Coupling**: Reduce dependencies between components by programming to an interface rather than a concrete class.
4. **Facilitate Dependency Injection**: Interfaces make it easier to swap implementations (e.g., in testing or modular design).
5. **Allow Multiple Inheritance**: Since C# doesn’t support multiple class inheritance, interfaces provide a way to achieve similar flexibility.
6. **Standardize Behavior Across Unrelated Classes**: For example, a `Car` and a `Bicycle` can both implement `IVehicle` despite having no common base class.

#### Practical Scenarios
- **Framework Design**: Libraries like .NET use interfaces extensively (e.g., `IDisposable` for resource cleanup, `IComparable` for sorting).
- **Unit Testing**: Interfaces allow mocking dependencies (e.g., `IRepository` for a data layer).
- **Extensibility**: Enable future implementations without modifying existing code (e.g., plugin systems).
- **Cross-Cutting Concerns**: Standardize behavior like logging or authentication across unrelated components.

#### When *Not* to Use an Interface
- **Implementation Details Required**: If you need shared implementation logic, consider an **abstract class** instead, as interfaces (pre-C# 8.0) cannot provide implementation.
- **Tight Coupling Acceptable**: If classes are closely related and share a common base with behavior, a base class might be simpler.
- **Premature Abstraction**: Avoid creating interfaces for every class unless there’s a clear need, as it can overcomplicate the design.

#### Example with Dependency Injection
```csharp
public interface ILogger
{
    void Log(string message);
}

public class ConsoleLogger : ILogger
{
    public void Log(string message)
    {
        Console.WriteLine(message);
    }
}

public class App
{
    private readonly ILogger _logger;

    public App(ILogger logger)
    {
        _logger = logger;
    }

    public void Run()
    {
        _logger.Log("Application running.");
    }
}
```

Here, `App` depends on the `ILogger` interface, making it easy to swap `ConsoleLogger` with, say, a `FileLogger` without changing `App`’s code.

#### Key Considerations
- **C# 8.0+ Default Implementations**: Interfaces can now include default method implementations, but use this sparingly to avoid blurring the line between interfaces and abstract classes.
- **Naming**: By convention, interface names start with `I` (e.g., `IList`, `IDisposable`).
- **Explicit Implementation**: A class can implement an interface explicitly to avoid polluting its public API (e.g., `void IVehicle.Start()`).

In summary, use interfaces to define contracts for behavior, promote flexibility, and enable polymorphism, especially in scenarios requiring loose coupling or multiple implementations of the same functionality.

## 6. Abstract Class vs. Interface
- **Abstract Class**:
  - Can have both abstract and non-abstract members.
  - Supports fields, constructors, and access modifiers.
  - A class can inherit only one abstract class (single inheritance).
  - Use when you need shared implementation and a clear hierarchical relationship.
- **Interface**:
  - Contains only method signatures, properties, or events (no implementation until default implementations in C# 8.0+).
  - No fields or constructors.
  - A class can implement multiple interfaces.
  - Use for defining contracts without shared implementation.


## 7. OOP Basic Theory

### 7.1. Inheritance

In C# it is not possible to inherit from several classes. So it's necessary to select the class to inherit from.

```csharp
class Character { }
class Wizard : Character { }
```

### 7.2. Encapsulation

Everything inside a class is encapsulated, and the amount of encapsulation depends on the scope:

- **Public**: the member is visible both inside and outside the class.
- **Private**: the member is visible only inside the class.
- **Protected**: the member is visible only inside the class and within the child classes hierarchy.

### 7.3. Polymorphism

{{< alert text="To understand the code below, that uses the `new` keyword and constructors, check first [Class Instantiation](#3-class-instantiation)." />}}

Given the parent class and child class:

```csharp
class Car { }
class Toyota : Car { }
```

with polymorphism you can instantiate like this:

```csharp
Car toyota = new Toyota();
```

but not like this:
```csharp
Toyota toyota = new Car();
```
Polymorphism let you do this:

```csharp
public class Driver
{
    public void LogIn(Car car) { }
}

var john = new Driver();
john.LogIn(new Car(2025));
john.LogIn(new Toyota());
```
However:

```csharp
public class Driver
{
    public void LogIn(Toyota toyota) { }
}

var john = New Driver();
john.LogIn(new Car(2025)); // Compiler error
john.LogIn(new Toyota()); // Fine
```
