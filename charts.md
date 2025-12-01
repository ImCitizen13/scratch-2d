#Visualizations



## 🗺️ Architecture Overview


```mermaid
graph TB
    subgraph "React Component Layer"
        A[example.tsx]
        B[MetaBallShader.tsx]
    end
    
    subgraph "Engine Layer (Worklets)"
        C[Scratch2DWorklet.ts]
        D[Scratch2DTypes.ts]
    end
    
    subgraph "Rendering Layer"
        E["@shopify/react-native-skia"]
        F[Canvas & Circle Components]
    end
    
    subgraph "Reactivity Layer"
        G[react-native-reanimated]
        H[SharedValue Arrays]
    end
    
    subgraph "Threading"
        I[UI Thread]
        J[JS Thread]
    end
    
    A --> C
    A --> H
    A --> F
    B --> E
    C --> D
    C --> H
    H --> F
    F --> E
    C -.runs on.-> I
    A -.runs on.-> J
    E -.runs on.-> I
    
    style C fill:#25F4EE, color:#000000
    style H fill:#FE2C55, color:#000000
    style E fill:#FFA500, color:#000000
```


## 🗺️ Data Flow Architecture

```mermaid
flowchart LR
    subgraph "Initialization"
        A[Component Mount] --> B[Create SharedValue Arrays]
        B --> C[scheduleOnUI]
        C --> D[createEngineOnUI]
    end
    
    subgraph "UI Thread"
        D --> E[Engine Object]
        E --> F[Bodies Array]
        E --> G[Spatial Grid]
        
        H[useFrameCallback] --> I[stepEngine]
        I --> J[Update Positions]
        J --> K[Check Collisions]
        K --> L[Apply Constraints]
        L --> M[Write to SharedValues]
    end
    
    subgraph "Rendering"
        M --> N[Skia Canvas]
        N --> O[Circle Components]
        O --> P[Read SharedValues]
        P --> Q[GPU Rendering]
    end
    
    subgraph "Shaders"
        M --> R[MetaBall Shader]
        R --> S[RuntimeEffect GLSL]
        S --> T[Uniform Updates]
        T --> Q
    end
    
    style E fill:#25F4EE
    style M fill:#FE2C55
    style N fill:#FFA500
```


## 🗺️ Physics Simulation Loop

```mermaid
stateDiagram-v2
    [*] --> Initialize
    Initialize --> FrameCallback
    
    state "Frame Update" as FrameCallback {
        [*] --> CalculateDelta
        CalculateDelta --> ApplyGravity
        ApplyGravity --> UpdatePositions
        UpdatePositions --> BuildGrid
        BuildGrid --> CheckCollisions
        CheckCollisions --> ApplyConstraints
        ApplyConstraints --> [*]
    }
    
    FrameCallback --> WriteSharedValues
    WriteSharedValues --> SkiaRender
    SkiaRender --> FrameCallback
    
    note right of ApplyGravity
        worldGravity -> accelX/accelY
    end note
    
    note right of UpdatePositions
        Verlet Integration
        x += vx + ax*dt²
    end note
    
    note right of BuildGrid
        Map<"x,y", Body[]>
        O(N) rebuild
    end note
    
    note right of CheckCollisions
        O(N×k) with grid
        Position-based resolution
    end note
```

## 🗺️ Type System Structure

```mermaid
classDiagram
    class Engine {
        +number width
        +number height
        +Body[] bodies
        +SharedValue~number~ bodyCount
        +Object worldGravity
        +Map~string,Body[]~ grid
        +number gridCellSize
        +SharedValue~number~[] sharedXs
        +SharedValue~number~[] sharedYs
        +SharedValue~number~[] sharedRadius
    }
    
    class Body {
        +number index
        +SharedValue~number~ x
        +SharedValue~number~ y
        +SharedValue~number~ prevX
        +SharedValue~number~ prevY
        +SharedValue~number~ accelX
        +SharedValue~number~ accelY
        +BodyType bodyType
        +number radius
        +string color
        +boolean isStatic
    }
    
    class BodyType {
        <<enumeration>>
        CIRCLE
        RECTANGLE
    }
    
    class MetaballCircle {
        +SharedValue~number~ x
        +SharedValue~number~ y
        +SharedValue~number~ radius
    }
    
    Engine "1" --> "*" Body : contains
    Body --> BodyType : has type
    Engine --> EngineArrays : implements
    Engine --> EngineGrid : implements
    MetaballCircle ..> Body : similar to
```

## 🗺️ Spatial Grid Visualization

```mermaid
graph TD
    subgraph "Spatial Hash Grid (50x50px cells)"
        A["Cell (0,0)"] 
        B["Cell (1,0)"]
        C["Cell (2,0)"]
        D["Cell (0,1)"]
        E["Cell (1,1)"] 
        F["Cell (2,1)"]
        G["Cell (0,2)"]
        H["Cell (1,2)"]
        I["Cell (2,2)"]
    end
    
    subgraph "Bodies"
        B1[Body 1]
        B2[Body 2]
        B3[Body 3]
    end
    
    B1 --> E
    B2 --> E
    B3 --> F
    
    subgraph "Collision Check"
        E --> |"Check 3x3 neighbors"| D
        E --> |"Check 3x3 neighbors"| A
        E --> |"Check 3x3 neighbors"| B
        E --> |"Check 3x3 neighbors"| F
        E --> |"Check 3x3 neighbors"| H
    end
    
    style E fill:#25F4EE
    style B1 fill:#FE2C55
    style B2 fill:#FE2C55
```



## 🗺️ Gesture Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant GestureDetector
    participant TapGesture
    participant addCircleWorklet
    participant Engine
    participant SharedValues
    participant SkiaCanvas
    
    User->>GestureDetector: Tap screen
    GestureDetector->>TapGesture: onEnd(event)
    TapGesture->>addCircleWorklet: {x, y, radius, color}
    
    Note over addCircleWorklet: Runs on UI Thread
    
    addCircleWorklet->>SharedValues: Write position[index]
    addCircleWorklet->>SharedValues: Write radius[index]
    addCircleWorklet->>SharedValues: Write color[index]
    addCircleWorklet->>Engine: addCircleToEngine()
    Engine->>Engine: bodies.push(newBody)
    Engine->>SharedValues: bodyCount.value++
    
    Note over SkiaCanvas: Automatic reactivity
    
    SharedValues->>SkiaCanvas: Re-render
    SkiaCanvas->>User: Visual feedback
```

## 🗺️ Shader Pipeline

```mermaid
flowchart TB
    subgraph "Component State"
        A[SharedValue Arrays] --> B[sharedXs, sharedYs, sharedRadius]
    end
    
    subgraph "useDerivedValue"
        B --> C[Create Float32Array buffer]
        C --> D[Fill with circle data<br/>4 floats per circle]
        D --> E[Pack into uniforms object]
    end
    
    subgraph "Skia RuntimeEffect"
        E --> F[u_circles array]
        F --> G[GLSL Shader Code]
        G --> H[For each circle:<br/>sdCircle + smin]
        H --> I[field < threshold?]
        I --> J[Output metaball color]
        I --> K[Output background color]
    end
    
    subgraph "Rendering"
        J --> L[GPU Fragment Shader]
        K --> L
        L --> M[Screen Pixels]
    end
    
    style E fill:#25F4EE
    style G fill:#FFA500
    style L fill:#FE2C55
```