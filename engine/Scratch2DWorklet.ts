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
  worldGravity,
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
    worldGravity: worldGravity, // Added default gravity vector (adjust if necessary)
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
  if (body.isStatic) return;
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

export function applyWallConstraintsToEngine(engine: Engine): void {
  // for (let body of this.bodies) {
  //   if (body.position.x > width - body.radius)
  //     body.position.x = width  - body.radius;
  //   if (body.position.y > height - body.radius)
  //     body.position.y = height - body.radius;
  //   if (body.position.x < body.radius)
  //     body.position.x = body.radius;
  //   if (body.position.y < body.radius)
  //     body.position.y = body.radius;
  // }
  "worklet";

  for (const body of engine.bodies) {
    if (body.x.value > engine.width - body.radius) {
      body.x.value = engine.width - body.radius;
    }
    if (body.y.value > engine.height - body.radius) {
      body.y.value = engine.height - body.radius;
    }
    if (body.x.value < body.radius) {
      body.x.value = body.radius;
    }
    if (body.y.value < body.radius) {
      body.y.value = body.radius;
    }
  }
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

        // ✅ Handle static bodies correctly
        const bodyStatic = body.isStatic;
        const otherStatic = other.isStatic;

        if (bodyStatic && otherStatic) {
          // Both static - do nothing
          continue;
        } else if (bodyStatic) {
          // body is static, move only other
          other.x.value -= tx * delta;
          other.y.value -= ty * delta;
        } else if (otherStatic) {
          // other is static, move only body
          body.x.value += tx * delta;
          body.y.value += ty * delta;
        } else {
          body.x.value += tx * 0.5 * delta;
          body.y.value += ty * 0.5 * delta;
          other.x.value -= tx * 0.5 * delta;
          other.y.value -= ty * 0.5 * delta;
        }
      }
    }
  }
}

export function stepEngine(engine: Engine, dt: number): void {
  "worklet";

  // Apply gravity and update positions
  for (const body of engine.bodies) {
    if (body.isStatic) continue;
    body.accelX.value = engine.worldGravity.x;
    body.accelY.value = engine.worldGravity.y;
    updateBodyPosition(body, dt);
  }

  // Build grid and handle collisions
  buildGridForEngine(engine);
  // applyConstraintsToEngine(engine);
  applyWallConstraintsToEngine(engine);
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
