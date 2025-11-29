import { vec, Vector } from "@shopify/react-native-skia";
import { SharedValue } from "react-native-reanimated";

export enum BodyType {
  CIRCLE = "circle",
  RECTANGLE = "rectangle",
}
// Worklet function to create engine with SharedValue arrays
export function createEngineOnUI(
  width: number,
  height: number,
  engineRef: SharedValue<any>,
  sharedXs: SharedValue<number>[],
  sharedYs: SharedValue<number>[],
  sharedRadius: SharedValue<number>[],
  bodyCount: SharedValue<number>
): void {
  "worklet";

  engineRef.value = {
    width,
    height,
    bodies: [],
    sharedXs,
    sharedYs,
    sharedRadius,
    bodyCount,

    addCircleWithValues: (
      positionCurrent: SharedValue<Vector>,
      acceleration: SharedValue<Vector>,
      positionPrevious: SharedValue<Vector>,
      radius: number,
      color?: string
    ) => {
      "worklet";
      const engine = engineRef.value;
      const index = engine.bodyCount.value;

      // Create body
      const body = {
        index, // Store index for this body
        positionCurrent,
        acceleration,
        positionPrevious,
        bodyType: BodyType.CIRCLE,
        radius,
        color,
        updatePosition: (dt: number) => {
          "worklet";
          const current = positionCurrent.value;
          const accel = acceleration.value;
          const prev = positionPrevious.value;

          // Calculate velocity inline (no vec allocation)
          const vx = current.x - prev.x;
          const vy = current.y - prev.y;

          positionPrevious.value = current;
          positionCurrent.value = vec(
            current.x + vx + accel.x * dt * dt,
            current.y + vy + accel.y * dt * dt
          );
          if (accel.y !== 200) {
            acceleration.value = vec(0, 200);
          }
        },
      };

      // Initialize SharedValues for this body
      const pos = positionCurrent.value;
      engine.sharedXs[index].value = pos.x;
      engine.sharedYs[index].value = pos.y;
      engine.sharedRadius[index].value = radius;

      engine.bodies.push(body);
      engine.bodyCount.value = engine.bodies.length;
      return body;
    },

    addBody: (body: any) => {
      "worklet";
      const engine = engineRef.value;
      body.index = engine.bodyCount.value;
      engine.bodies.push(body);
      engine.bodyCount.value = engine.bodies.length;
      return body;
    },

    step: (dt: number) => {
      "worklet";
      const engine = engineRef.value;
      for (const body of engine.bodies) {
        // body.acceleration.value = vec(0, 200);
        body.updatePosition(dt);

        // Write position to SharedValue arrays for Skia
        const pos = body.positionCurrent.value;
        engine.sharedXs[body.index].value = pos.x;
        engine.sharedYs[body.index].value = pos.y;
      }
      engine.applyConstraints();
      engine.checkCollisions();
    },
    applyConstraints: () => {
      "worklet";
      const engine = engineRef.value;
      const radius = (engine.width / 2) * 0.95;
      // Cache center and radius outside the loop
      const centerX = engine.width / 2;
      const centerY = engine.height / 2;

      for (const body of engine.bodies) {
        const pos = body.positionCurrent.value;
        const dx = pos.x - centerX;
        const dy = pos.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius - body.radius) {
          const factor = (radius - body.radius) / dist;
          body.positionCurrent.value = vec(
            centerX + dx * factor,
            centerY + dy * factor
          );
        }
      }
      return;
    },
    checkCollisions: () => {
      "worklet";
      const engine = engineRef.value;

      for (let i = 0; i < engine.bodies.length; i++) {
        for (let k = i + 1; k < engine.bodies.length; k++) {
          // Start at i+1 to avoid duplicate checks
          const bodyA = engine.bodies[i];
          const bodyB = engine.bodies[k];

          // Calculate difference vector (bodyA - bodyB)
          const dx =
            bodyA.positionCurrent.value.x - bodyB.positionCurrent.value.x;
          const dy =
            bodyA.positionCurrent.value.y - bodyB.positionCurrent.value.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Check if circles overlap
          if (dist < bodyA.radius + bodyB.radius && dist > 0) {
            // Normalized direction vector (t in p5 code)
            const tx = dx / dist;
            const ty = dy / dist;

            // How much they overlap
            const delta = bodyA.radius + bodyB.radius - dist;

            // Push each body half the overlap distance apart
            bodyA.positionCurrent.value = vec(
              bodyA.positionCurrent.value.x + tx * 0.5 * delta,
              bodyA.positionCurrent.value.y + ty * 0.5 * delta
            );

            bodyB.positionCurrent.value = vec(
              bodyB.positionCurrent.value.x - tx * 0.5 * delta,
              bodyB.positionCurrent.value.y - ty * 0.5 * delta
            );
          }
        }
      }
    },
  };
}

// In Scratch2DWorklet.ts - Add this helper
export function addCircleAtPositionWorklet(
  engineRef: SharedValue<any>,
  positionCurrent: SharedValue<Vector>,
  acceleration: SharedValue<Vector>,
  positionPrevious: SharedValue<Vector>,
  radius: number,
  color: string
): void {
  "worklet";
  const engine = engineRef.value;
  if (!engine) return;

  // Check if we have space
  if (engine.bodyCount.value >= engine.sharedXs.length) return;

  // Use existing method
  engine.addCircleWithValues(
    positionCurrent,
    acceleration,
    positionPrevious,
    radius,
    color
  );
}
