# Scratch-2D

A high-performance 2D physics engine for React Native, built entirely on the UI thread using Worklets with real-time Skia rendering and visual effects.

## 🎯 Description

Scratch-2D is a custom-built physics simulation engine designed specifically for React Native applications. It leverages modern React Native libraries to achieve smooth 60fps animations by running all physics calculations directly on the UI thread, bypassing the JavaScript bridge entirely. The engine integrates seamlessly with Skia for hardware-accelerated rendering and supports advanced shader effects like metaball liquid simulations.

## 🚀 Technologies

### Core Stack
- **React Native** `0.81.5` - Mobile framework
- **Expo** `~54.0.25` - Development platform
- **TypeScript** `~5.9.2` - Type safety

### Performance & Rendering
- **react-native-worklets** `0.5.1` - UI thread execution (Software Mansion)
- **react-native-reanimated** `~4.1.1` - Shared value reactivity
- **@shopify/react-native-skia** `2.2.12` - Hardware-accelerated 2D graphics
- **react-native-gesture-handler** `^2.29.1` - Touch interactions

### Additional
- **expo-router** `~6.0.15` - File-based navigation
- **pressto** `^0.6.0` - Enhanced pressable components

## ✨ Features

### Physics Engine
- ✅ **Verlet Integration** - Stable, implicit time-stepping for realistic motion
- ✅ **Spatial Grid Collision Detection** - O(N×k) complexity using spatial hashing
- ✅ **World Boundaries** - Configurable wall constraints
- ✅ **World Gravity** - Global gravitational acceleration
- ✅ **Static Bodies** - Immovable objects for obstacles
- ✅ **Circle Shapes** - Efficient circular collision detection

### Performance
- ✅ **UI Thread Execution** - All calculations run on UI thread via worklets
- ✅ **Shared Value Architecture** - Zero-copy memory sharing between engine and renderer
- ✅ **Pre-allocated Arrays** - Fixed buffer size (400 bodies) for predictable performance
- ✅ **Grid-based Spatial Partitioning** - 50px cells for efficient broad-phase detection

### Rendering & Effects
- ✅ **Skia Integration** - Direct rendering from SharedValues
- ✅ **MetaBall Shader** - Liquid/blob visual effects using GLSL shaders
- ✅ **Real-time Uniforms** - Dynamic shader parameters updated per-frame
- ✅ **Interactive Gestures** - Tap-to-spawn circle bodies

## 🏗️ Architecture
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
        E[@shopify/react-native-skia]
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
    
    style C fill:#25F4EE
    style H fill:#FE2C55
    style E fill:#FFA500
### Engine Structure

engine/
├── Scratch2DTypes.ts # Type definitions and interfaces
└── Scratch2DWorklet.ts # Worklet functions (physics calculations)
components/
└── MetaBallShader.tsx # GLSL shader for liquid effects
app/
└── example.tsx # Demo implementation


### Key Concepts

**Worklet Functions**: All physics operations marked with `"worklet"` to run on UI thread
export function stepEngine(engine: Engine, dt: number): void {
  "worklet";
  // Physics calculations...
}**Shared Value Arrays**: Pre-allocated arrays of SharedValues for zero-copy rendering
const sharedXs = Array.from({ length: MAX_BODIES }, () => useSharedValue(0));**Spatial Grid**: 50×50px grid cells for efficient collision detection
grid: Map<string, Body[]>  // "x,y" -> [body1, body2, ...]## 📚 API Methods

### Engine Creation
createEngineOnUI(options: CreateEngineOptionsInterface): voidInitializes the physics engine on the UI thread.

### Body Management
addCircleAtPositionWorklet(options: AddCircleWithValuesOptionsInterface): voidSpawns a new circle body at specified position.

### Simulation
stepEngine(engine: Engine, dt: number): voidAdvances simulation by `dt` seconds. Handles:
- Gravity application
- Position updates (Verlet)
- Grid rebuilding
- Collision detection & resolution
- Boundary constraints

### Collision Detection
checkCollisionsInEngine(engine: Engine): voidDetects and resolves circle-circle collisions using spatial grid.

### Constraints
applyWallConstraintsToEngine(engine: Engine): void
applyConstraintsToEngine(engine: Engine): void  // Circular boundary## 🎮 Usage Example

// 1. Create engine
useEffect(() => {
  scheduleOnUI(createEngineOnUI, {
    width,
    height,
    engineRef,
    sharedXs, sharedYs, // ... shared arrays
    worldGravity: { x: 0, y: 200 },
  });
}, []);

// 2. Run simulation loop
useFrameCallback(({ timeSincePreviousFrame }) => {
  const dt = Math.min(timeSincePreviousFrame || 16.67, 33.34) / 1000;
  stepEngine(engineRef.value, dt);
});

// 3. Render with Skia
```<Canvas>
  {sharedXs.map((x, i) => (
    <Circle cx={x} cy={sharedYs[i]} r={sharedRadius[i]} color={sharedColors[i]} />
  ))}
</Canvas>## 🎨 MetaBall Shader
```

The included GLSL shader creates liquid-like blending effects:
- **SDF (Signed Distance Fields)** for smooth circle rendering
- **Smooth Min (smin)** function for organic blending
- **Dynamic uniforms** from SharedValues
- Supports up to 32 circles with configurable blend strength

## 🗺️ Roadmap

### In Progress
- [ ] **Individual Body Gravity** - Per-body gravity modifiers/vectors
- [ ] **Additional Skia Shaders** - Glow, trails, distortion effects
- [ ] **More Shapes** - Rectangles, polygons

### Future Enhancements
- [ ] Rotation and angular velocity
- [ ] Joints and constraints
- [ ] Body removal/recycling system
- [ ] Collision callbacks/events
- [ ] Performance profiling tools
- [ ] Matter.js compatibility layer

## 🚀 Getting Started

# Install dependencies
npm install

# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android## 📄 License

Private project

---

**Built with ❤️ using React Native Worklets**