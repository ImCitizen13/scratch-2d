import {
  AddCircleWithValuesOptionsInterface,
  Body,
  BodyType,
  CreateEngineOptionsInterface,
  Engine,
} from "./Scratch2DTypes";

// ============================================
// Helper Functions
// ============================================

function getCellKey(x: number, y: number): string {
  "worklet";
  return `${x},${y}`;
}

function getBodyCell(
  body: Body,
  gridCellSize: number
): { cellX: number; cellY: number; key: string } {
  "worklet";
  const cellX = Math.floor(body.x.value / gridCellSize);
  const cellY = Math.floor(body.y.value / gridCellSize);
  return {
    cellX,
    cellY,
    key: getCellKey(cellX, cellY),
  };
}

// ============================================
// Engine Creation (DATA ONLY - NO FUNCTIONS)
// ============================================

export function createEngineOnUI({
  width,
  height,
  engineRef,
  sharedXs,
  sharedYs,
  sharedRadius,
  bodyCount,
  sharedPrevXs,
  sharedPrevYs,
  sharedAccelXs,
  sharedAccelYs,
  sharedColors,
  sharedTypes,
  sharedIsStatic,
}: CreateEngineOptionsInterface): void {
  "worklet";

  const CELL_SIZE = 50;
  if (engineRef.value) return;
  // Engine contains ONLY data, no functions
  engineRef.value = {
    width,
    height,
    bodies: [],
    bodyCount,
    sharedXs,
    sharedYs,
    sharedPrevXs,
    sharedPrevYs,
    sharedAccelXs,
    sharedAccelYs,
    sharedRadius,
    sharedColors,
    sharedTypes,
    sharedIsStatic,
    grid: new Map<string, Body[]>(),
    gridCellSize: CELL_SIZE,
    gridCols: Math.ceil(width / CELL_SIZE),
    gridRows: Math.ceil(height / CELL_SIZE),
  };
}

// ============================================
// Engine Operations (SEPARATE WORKLET FUNCTIONS)
// ============================================

export function addCircleToEngine(
  engine: Engine,
  index: number,
  radius: number,
  isStatic: boolean,
  color?: string
): Body {
  "worklet";

  const body: Body = {
    index,
    x: engine.sharedXs[index],
    y: engine.sharedYs[index],
    prevX: engine.sharedPrevXs[index],
    prevY: engine.sharedPrevYs[index],
    accelX: engine.sharedAccelXs[index],
    accelY: engine.sharedAccelYs[index],
    radius,
    bodyType: BodyType.CIRCLE,
    color,
    isStatic,

  };

  engine.bodies.push(body);
  engine.bodyCount.value = engine.bodies.length;
  return body;
}
// Separate function for updating body position
export function updateBodyPosition(body: Body, dt: number): void {
  "worklet";

  const vx = body.x.value - body.prevX.value;
  const vy = body.y.value - body.prevY.value;

  body.prevX.value = body.x.value;
  body.prevY.value = body.y.value;

  body.x.value += vx + body.accelX.value * dt * dt;
  body.y.value += vy + body.accelY.value * dt * dt;
}

export function buildGridForEngine(engine: Engine): void {
  "worklet";

  engine.grid.clear();

  for (const body of engine.bodies) {
    const { key } = getBodyCell(body, engine.gridCellSize);

    if (!engine.grid.has(key)) {
      engine.grid.set(key, []);
    }
    engine.grid.get(key)!.push(body);
  }
}

export function getNearbyBodiesInEngine(engine: Engine, body: Body): Body[] {
  "worklet";

  const { cellX, cellY } = getBodyCell(body, engine.gridCellSize);
  const nearby: Body[] = [];

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const key = getCellKey(cellX + dx, cellY + dy);
      const cell = engine.grid.get(key);
      if (cell) {
        nearby.push(...cell);
      }
    }
  }

  return nearby;
}

export function applyConstraintsToEngine(engine: Engine): void {
  "worklet";

  const radius = (engine.width / 2) * 0.95;
  const centerX = engine.width / 2;
  const centerY = engine.height / 2;

  for (const body of engine.bodies) {
    const dx = body.x.value - centerX;
    const dy = body.y.value - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > radius - body.radius) {
      const factor = (radius - body.radius) / dist;
      body.x.value = centerX + dx * factor;
      body.y.value = centerY + dy * factor;
    }
  }
}

export function checkCollisionsInEngine(engine: Engine): void {
  "worklet";

  const checked = new Set<string>();

  for (const body of engine.bodies) {
    const nearby = getNearbyBodiesInEngine(engine, body);

    for (const other of nearby) {
      if (body.index === other.index) continue;

      const pairKey =
        body.index < other.index
          ? `${body.index}-${other.index}`
          : `${other.index}-${body.index}`;

      if (checked.has(pairKey)) continue;
      checked.add(pairKey);

      const dx = body.x.value - other.x.value;
      const dy = body.y.value - other.y.value;
      const distSq = dx * dx + dy * dy;
      const minDist = body.radius + other.radius;

      if (distSq < minDist * minDist && distSq > 0) {
        const dist = Math.sqrt(distSq);
        const tx = dx / dist;
        const ty = dy / dist;
        const delta = minDist - dist;

        body.x.value += tx * 0.5 * delta;
        body.y.value += ty * 0.5 * delta;
        other.x.value -= tx * 0.5 * delta;
        other.y.value -= ty * 0.5 * delta;
      }
    }
  }
}

export function stepEngine(engine: Engine, dt: number): void {
  "worklet";

  // Apply gravity and update positions
  for (const body of engine.bodies) {
    if (body.isStatic) continue;
    body.accelX.value = 0;
    body.accelY.value = 200;
    updateBodyPosition(body, dt);
  }

  // Build grid and handle collisions
  buildGridForEngine(engine);
  applyConstraintsToEngine(engine);
  checkCollisionsInEngine(engine);
}

// ============================================
// High-Level Helper Functions
// ============================================

export function addCircleAtPositionWorklet({
  engineRef,
  x,
  y,
  radius,
  color,
  isStatic,
}: AddCircleWithValuesOptionsInterface): void {
  "worklet";

  const engine = engineRef.value;
  if (!engine) return;
  if (engine.bodyCount.value >= engine.sharedXs.length) return;

  const index = engine.bodyCount.value;

  // Initialize position values in shared arrays
  engine.sharedXs[index].value = x;
  engine.sharedYs[index].value = y;
  engine.sharedPrevXs[index].value = x;
  engine.sharedPrevYs[index].value = y;
  engine.sharedAccelXs[index].value = 0;
  engine.sharedAccelYs[index].value = 0;
  engine.sharedRadius[index].value = radius;
  engine.sharedColors[index].value = color || "#000000";
  engine.sharedTypes[index].value = BodyType.CIRCLE;
  engine.sharedIsStatic[index].value = isStatic;

  // Add body to engine
  addCircleToEngine(engine, index, radius, isStatic, color);
}

// import {
//   AddCircleWithValuesOptionsInterface,
//   Body,
//   BodyType,
//   CreateEngineOptionsInterface,
//   Engine,
// } from "./Scratch2DTypes";

// function getCellKey(x: number, y: number): string {
//   "worklet";
//   return `${x},${y}`;
// }

// // Add this helper function at the top with getCellKey
// function getBodyCell(
//   body: Body,
//   gridCellSize: number
// ): { cellX: number; cellY: number; key: string } {
//   "worklet";
//   const cellX = Math.floor(body.x.value / gridCellSize);
//   const cellY = Math.floor(body.y.value / gridCellSize);
//   return {
//     cellX,
//     cellY,
//     key: getCellKey(cellX, cellY),
//   };
// }

// // Worklet function to create engine with SharedValue arrays
// // export function createEngineOnUI({
// //   width,
// //   height,
// //   engineRef,
// //   sharedXs,
// //   sharedYs,
// //   sharedRadius,
// //   bodyCount,
// //   sharedPrevXs, // NEW
// //   sharedPrevYs, // NEW
// //   sharedAccelXs, // NEW
// //   sharedAccelYs, // NEW
// //   sharedColors,
// //   sharedTypes,
// //   sharedIsStatic,
// // }: CreateEngineOptionsInterface): void {
// //   "worklet";

// //   // NEW: Grid configuration
// //   const CELL_SIZE = 50; // Adjust based on your typical body size
// //   const GRID_COLS = Math.ceil(width / CELL_SIZE);
// //   const GRID_ROWS = Math.ceil(height / CELL_SIZE);
// //   // ✅ CREATE LOCAL VARIABLES BEFORE THE OBJECT
// //   const bodies: Body[] = [];
// //   const grid = new Map<string, Body[]>();
// //   const gridCellSize = CELL_SIZE;
// //   const gridCols = GRID_COLS;
// //   const gridRows = GRID_ROWS;

// //   // Type-safe engine object
// //   const engine: Engine = {
// //     // Dimensions
// //     width,
// //     height,

// //     // State
// //     bodies: [],
// //     bodyCount,

// //     // SharedValue Arrays (EngineArrays)
// //     sharedXs,
// //     sharedYs,
// //     sharedPrevXs,
// //     sharedPrevYs,
// //     sharedAccelXs,
// //     sharedAccelYs,
// //     sharedRadius,
// //     sharedColors,
// //     sharedTypes,
// //     sharedIsStatic,

// //     // Grid (EngineGrid)
// //     grid,
// //     gridCellSize,
// //     gridCols,
// //     gridRows,

// //     addCircleWithValues: (
// //       index: number,
// //       radius: number,
// //       isStatic: boolean,
// //       color?: string
// //     ): Body => {
// //       "worklet";
// //       // Create body
// //       const body: Body = {
// //         index,
// //         x: sharedXs[index],
// //         y: sharedYs[index],
// //         prevX: sharedPrevXs[index],
// //         prevY: sharedPrevYs[index],
// //         accelX: sharedAccelXs[index],
// //         accelY: sharedAccelYs[index],
// //         radius,
// //         bodyType: BodyType.CIRCLE,
// //         color,
// //         isStatic, // ← ADD THIS LINE!
// //         updatePosition: (dt: number) => {
// //           "worklet";
// //           // Component-wise Verlet integration
// //           const vx = body.x.value - body.prevX.value;
// //           const vy = body.y.value - body.prevY.value;

// //           body.prevX.value = body.x.value;
// //           body.prevY.value = body.y.value;

// //           body.x.value += vx + body.accelX.value * dt * dt;
// //           body.y.value += vy + body.accelY.value * dt * dt;
// //         },
// //       };

// //       bodies.push(body);
// //       bodyCount.value = bodies.length;
// //       return body;
// //     },

// //     addBody: (body: Body): Body => {
// //       "worklet";

// //       body.index = bodyCount.value;
// //       bodies.push(body);
// //       bodyCount.value = bodies.length;
// //       return body;
// //     },
// //     // NEW: Build spatial grid for collision detection
// //     buildGrid: (): void => {
// //       "worklet";

// //       // Clear grid
// //       grid.clear();

// //       // Insert all bodies into grid cells
// //       for (const body of bodies) {
// //         const { key } = getBodyCell(body, gridCellSize);

// //         if (!grid.has(key)) {
// //           grid.set(key, []);
// //         }
// //         grid.get(key)!.push(body);
// //       }
// //     },

// //     // NEW: Get potential collision candidates for a body
// //     getNearbyBodies: (body: Body): Body[] => {
// //       "worklet";
// //       const { cellX, cellY } = getBodyCell(body, gridCellSize);

// //       const nearby: Body[] = [];

// //       // Check 9 cells: current + 8 neighbors
// //       for (let dx = -1; dx <= 1; dx++) {
// //         for (let dy = -1; dy <= 1; dy++) {
// //           const key = getCellKey(cellX + dx, cellY + dy);
// //           const cell = grid.get(key);
// //           if (cell) {
// //             nearby.push(...cell);
// //           }
// //         }
// //       }

// //       return nearby;
// //     },

// //     step: (dt: number) => {
// //       "worklet";
// //       // Apply gravity and update positions
// //       for (const body of bodies) {
// //         if (body.isStatic) continue;
// //         body.accelX.value = 0;
// //         body.accelY.value = 200;
// //         body.updatePosition(dt);
// //       }

// //       // NEW: Build grid before collision checks
// //       engine.buildGrid();
// //       engine.applyConstraints();
// //       engine.checkCollisions();
// //     },
// //     applyConstraints: () => {
// //       "worklet";
// //       const radius = (width / 2) * 0.95;
// //       // Cache center and radius outside the loop
// //       const centerX = width / 2;
// //       const centerY = height / 2;

// //       for (const body of bodies) {
// //         const dx = body.x.value - centerX;
// //         const dy = body.y.value - centerY;
// //         const dist = Math.sqrt(dx * dx + dy * dy);
// //         if (dist > radius - body.radius) {
// //           const factor = (radius - body.radius) / dist;
// //           body.x.value = centerX + dx * factor;
// //           body.y.value = centerY + dy * factor;
// //         }
// //       }
// //       return;
// //     },
// //     // UPDATED: Use grid for collision detection
// //     checkCollisions: () => {
// //       "worklet";
// //       const engine = engineRef.value;
// //       if (!engine) return;

// //       // Track checked pairs to avoid duplicates
// //       const checked = new Set<string>();

// //       for (const body of bodies) {
// //         // Get nearby bodies from grid instead of checking all
// //         const nearby = engine.getNearbyBodies(body);

// //         for (const other of nearby) {
// //           // Skip self
// //           if (body.index === other.index) continue;

// //           // Skip if already checked this pair
// //           const pairKey =
// //             body.index < other.index
// //               ? `${body.index}-${other.index}`
// //               : `${other.index}-${body.index}`;

// //           if (checked.has(pairKey)) continue;
// //           checked.add(pairKey);

// //           // Calculate difference vector
// //           const dx = body.x.value - other.x.value;
// //           const dy = body.y.value - other.y.value;
// //           const distSq = dx * dx + dy * dy;
// //           const minDist = body.radius + other.radius;

// //           // Check if circles overlap (using squared distance)
// //           if (distSq < minDist * minDist && distSq > 0) {
// //             const dist = Math.sqrt(distSq);
// //             const tx = dx / dist;
// //             const ty = dy / dist;
// //             const delta = minDist - dist;

// //             body.x.value += tx * 0.5 * delta;
// //             body.y.value += ty * 0.5 * delta;
// //             other.x.value -= tx * 0.5 * delta;
// //             other.y.value -= ty * 0.5 * delta;
// //           }
// //         }
// //       }
// //     },
// //   };
// //   engineRef.value = engine;
// // }

// export function createEngineOnUI({
//   width,
//   height,
//   engineRef,
//   sharedXs,
//   sharedYs,
//   sharedRadius,
//   bodyCount,
//   sharedPrevXs,
//   sharedPrevYs,
//   sharedAccelXs,
//   sharedAccelYs,
//   sharedColors,
//   sharedTypes,
//   sharedIsStatic,
// }: CreateEngineOptionsInterface): void {
//   "worklet";

//   // Grid configuration
//   const CELL_SIZE = 50;
//   const GRID_COLS = Math.ceil(width / CELL_SIZE);
//   const GRID_ROWS = Math.ceil(height / CELL_SIZE);

//   // Create local variables
//   const bodies: Body[] = [];
//   const grid = new Map<string, Body[]>();
//   const gridCellSize = CELL_SIZE;
//   const gridCols = GRID_COLS;
//   const gridRows = GRID_ROWS;

//   // ✅ DEFINE METHODS AS FUNCTIONS FIRST (before the engine object)

//   const buildGrid = (): void => {
//     "worklet";
//     grid.clear();

//     for (const body of bodies) {
//       const { key } = getBodyCell(body, gridCellSize);

//       if (!grid.has(key)) {
//         grid.set(key, []);
//       }
//       grid.get(key)!.push(body);
//     }
//   };

//   const getNearbyBodies = (body: Body): Body[] => {
//     "worklet";
//     const { cellX, cellY } = getBodyCell(body, gridCellSize);

//     const nearby: Body[] = [];

//     for (let dx = -1; dx <= 1; dx++) {
//       for (let dy = -1; dy <= 1; dy++) {
//         const key = getCellKey(cellX + dx, cellY + dy);
//         const cell = grid.get(key);
//         if (cell) {
//           nearby.push(...cell);
//         }
//       }
//     }

//     return nearby;
//   };

//   const applyConstraints = (): void => {
//     "worklet";
//     const radius = (width / 2) * 0.95;
//     const centerX = width / 2;
//     const centerY = height / 2;

//     for (const body of bodies) {
//       const dx = body.x.value - centerX;
//       const dy = body.y.value - centerY;
//       const dist = Math.sqrt(dx * dx + dy * dy);

//       if (dist > radius - body.radius) {
//         const factor = (radius - body.radius) / dist;
//         body.x.value = centerX + dx * factor;
//         body.y.value = centerY + dy * factor;
//       }
//     }
//   };

//   const checkCollisions = (): void => {
//     "worklet";
//     const checked = new Set<string>();

//     for (const body of bodies) {
//       const nearby = getNearbyBodies(body);  // ✅ Can call directly now!

//       for (const other of nearby) {
//         if (body.index === other.index) continue;

//         const pairKey = body.index < other.index
//           ? `${body.index}-${other.index}`
//           : `${other.index}-${body.index}`;

//         if (checked.has(pairKey)) continue;
//         checked.add(pairKey);

//         const dx = body.x.value - other.x.value;
//         const dy = body.y.value - other.y.value;
//         const distSq = dx * dx + dy * dy;
//         const minDist = body.radius + other.radius;

//         if (distSq < minDist * minDist && distSq > 0) {
//           const dist = Math.sqrt(distSq);
//           const tx = dx / dist;
//           const ty = dy / dist;
//           const delta = minDist - dist;

//           body.x.value += tx * 0.5 * delta;
//           body.y.value += ty * 0.5 * delta;
//           other.x.value -= tx * 0.5 * delta;
//           other.y.value -= ty * 0.5 * delta;
//         }
//       }
//     }
//   };

//   const addCircleWithValues = (
//     index: number,
//     radius: number,
//     isStatic: boolean,
//     color?: string
//   ): Body => {
//     "worklet";

//     const body: Body = {
//       index,
//       x: sharedXs[index],
//       y: sharedYs[index],
//       prevX: sharedPrevXs[index],
//       prevY: sharedPrevYs[index],
//       accelX: sharedAccelXs[index],
//       accelY: sharedAccelYs[index],
//       radius,
//       bodyType: BodyType.CIRCLE,
//       color,
//       isStatic,
//       updatePosition: (dt: number) => {
//         "worklet";
//         const vx = body.x.value - body.prevX.value;
//         const vy = body.y.value - body.prevY.value;

//         body.prevX.value = body.x.value;
//         body.prevY.value = body.y.value;

//         body.x.value += vx + body.accelX.value * dt * dt;
//         body.y.value += vy + body.accelY.value * dt * dt;
//       },
//     };

//     bodies.push(body);
//     bodyCount.value = bodies.length;
//     return body;
//   };

//   const addBody = (body: Body): Body => {
//     "worklet";
//     body.index = bodyCount.value;
//     bodies.push(body);
//     bodyCount.value = bodies.length;
//     return body;
//   };

//   const step = (dt: number): void => {
//     "worklet";

//     for (const body of bodies) {
//       if (body.isStatic) continue;
//       body.accelX.value = 0;
//       body.accelY.value = 200;
//       body.updatePosition(dt);
//     }

//     // ✅ Call functions directly (they're already defined above)
//     buildGrid();
//     applyConstraints();
//     checkCollisions();
//   };

//   // NOW create the engine object and assign the functions
//   const engine: Engine = {
//     width,
//     height,
//     bodies,
//     bodyCount,
//     sharedXs,
//     sharedYs,
//     sharedPrevXs,
//     sharedPrevYs,
//     sharedAccelXs,
//     sharedAccelYs,
//     sharedRadius,
//     sharedColors,
//     sharedTypes,
//     sharedIsStatic,
//     grid,
//     gridCellSize,
//     gridCols,
//     gridRows,

//     // Assign the functions we defined above
//     addCircleWithValues,
//     addBody,
//     buildGrid,
//     getNearbyBodies,
//     step,
//     applyConstraints,
//     checkCollisions,
//   };

//   engineRef.value = engine;
// }

// // In Scratch2DWorklet.ts - Add this helper
// export function addCircleAtPositionWorklet({
//   engineRef,
//   x,
//   y,
//   radius,
//   color,
//   isStatic,
// }: AddCircleWithValuesOptionsInterface): void {
//   "worklet";
//   const engine = engineRef.value;
//   if (!engine) return;

//   // Check if we have space
//   if (engine.bodyCount.value >= engine.sharedXs.length) return;
//   const index = engine.bodyCount.value;

//   // Initialize position values
//   engine.sharedXs[index].value = x;
//   engine.sharedYs[index].value = y;
//   engine.sharedPrevXs[index].value = x;
//   engine.sharedPrevYs[index].value = y;
//   engine.sharedAccelXs[index].value = 0;
//   engine.sharedAccelYs[index].value = 0;
//   engine.sharedRadius[index].value = radius;
//   engine.sharedColors[index].value = color || "#000000";
//   engine.sharedTypes[index].value = BodyType.CIRCLE;
//   engine.sharedIsStatic[index].value = isStatic;

//   // Use existing method
//   engine.addCircleWithValues(index, radius, isStatic, color);
// }
