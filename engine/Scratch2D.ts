import { vec, Vector } from "@shopify/react-native-skia";
import { SharedValue } from "react-native-reanimated";

export enum BodyType {
  CIRCLE = "circle",
  RECTANGLE = "rectangle",
}

function sumVectors(a: Vector, b: Vector): Vector {
  return vec(a.x + b.x, a.y + b.y);
}

function multiplyVector(a: Vector, b: number): Vector {
  return vec(a.x * b, a.y * b);
}

export class Body {
  constructor(
    public positionCurrent: SharedValue<Vector>, // ← Changed to SharedValue
    public acceleration: SharedValue<Vector>, // ← Changed to SharedValue
    public bodyType: BodyType,
    public positionPrevious: SharedValue<Vector>,
    public color?: string
  ) {
    this.positionCurrent = positionCurrent;
    this.acceleration = acceleration;
    this.bodyType = bodyType;
    this.color = color;
    this.positionPrevious = positionPrevious;
  }

  public updatePosition(dt: number): void {
    "worklet"; // ← Mark as worklet
    const current = this.positionCurrent.value;
    const accel = this.acceleration.value;
    const velocity = vec(
      current.x - this.positionPrevious.value.x,
      current.y - this.positionPrevious.value.y
    );

    this.positionPrevious.value = current;
    this.positionCurrent.value = vec(
      current.x + velocity.x + accel.x * dt * dt,
      current.y + velocity.y + accel.y * dt * dt
    );
    this.acceleration.value = vec(0, 200);
  }
}

export class CircleBody extends Body {
  public radius: number;
  constructor(
    positionCurrent: SharedValue<Vector>,
    acceleration: SharedValue<Vector>,
    bodyType: BodyType,
    positionPrevious: SharedValue<Vector>,
    radius: number,
    color?: string
  ) {
    super(positionCurrent, acceleration, bodyType, positionPrevious, color);
    this.radius = radius;
  }
}

export class RectangleBody extends Body {
  public width: number;
  public height: number;
  constructor(
    positionCurrent: SharedValue<Vector>,
    positionPrevious: SharedValue<Vector>,
    acceleration: SharedValue<Vector>,
    bodyType: BodyType,
    width: number,
    height: number,
    color?: string
  ) {
    super(positionCurrent, acceleration, bodyType, positionPrevious, color);
    this.width = width;
    this.height = height;
  }
}

interface EngineInterface {
  width: number;
  height: number;
  bodies: (CircleBody | RectangleBody)[];
  addBody: (body: CircleBody | RectangleBody) => CircleBody | RectangleBody;
  step: (dt: number) => void;
  checkCollisions: () => void;
  // removeBody: (body: Body) => void;
  // update: (dt: number) => void;
}

export class Scratch2D implements EngineInterface {
  width: number;
  height: number;
  bodies: (CircleBody | RectangleBody)[];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.bodies = [];
  }

  addCircleWithValues(
    positionCurrent: SharedValue<Vector>,  // ← Accept SharedValues
    acceleration: SharedValue<Vector>,
    positionPrevious: SharedValue<Vector>,
    radius: number,
    color?: string
  ): CircleBody {
    const body = new CircleBody(
      positionCurrent,
      acceleration,
      BodyType.CIRCLE,
      positionPrevious,
      radius,
      color
    );
    this.bodies.push(body);
    return body;
  }
  
//   addCircleWithValues(
//     positionCurrent: Vector,
//     acceleration: Vector,
//     positionPrevious: Vector,
//     radius: number,
//     color?: string
//   ): CircleBody {
//     let body: CircleBody;

//     body = new CircleBody(
//       positionCurrent,
//       acceleration,
//       BodyType.CIRCLE,
//       positionPrevious,
//       radius,
//       color
//     );
//     this.bodies.push(body);
//     return body;
//   }

  addBody(body: CircleBody | RectangleBody): CircleBody | RectangleBody {
    this.bodies.push(body);
    return body;
  }

  step(dt: number): void {
    
    for (const body of this.bodies) {
      body.acceleration.value = vec(0, 200);
      body.updatePosition(dt);
    }
  }
  checkCollisions(): void {
    return;
  }
}

// Worklet function to create engine instance on UI thread
