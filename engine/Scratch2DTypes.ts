import { SharedValue } from "react-native-reanimated";


export enum BodyType {
  CIRCLE = "circle",
  RECTANGLE = "rectangle",
}


// ============================================
// Body Interfaces
// ============================================

export interface Body {
  index: number;
  x: SharedValue<number>;
  y: SharedValue<number>;
  prevX: SharedValue<number>;
  prevY: SharedValue<number>;
  accelX: SharedValue<number>;
  accelY: SharedValue<number>;
  bodyType: BodyType;
  radius: number;
  color?: string;
  isStatic: boolean;
  // updatePosition: (dt: number) => void;
}

// ============================================
// Engine Interfaces
// ============================================

export interface EngineArrays {
  sharedXs: SharedValue<number>[];
  sharedYs: SharedValue<number>[];
  sharedPrevXs: SharedValue<number>[];
  sharedPrevYs: SharedValue<number>[];
  sharedAccelXs: SharedValue<number>[];
  sharedAccelYs: SharedValue<number>[];
  sharedRadius: SharedValue<number>[];
  sharedColors: SharedValue<string>[];
  sharedTypes: SharedValue<BodyType>[];
  sharedIsStatic: SharedValue<boolean>[];
}

export interface EngineGrid {
  grid: Map<string, Body[]>;
  gridCellSize: number;
  gridCols: number;
  gridRows: number;
}

export interface EngineMethods {
  addCircleWithValues: (
    index: number,
    radius: number,
    isStatic: boolean,
    color?: string
  ) => Body;
  addBody: (body: Body) => Body;
  buildGrid: () => void;
  getNearbyBodies: (body: Body) => Body[];
  step: (dt: number) => void;
  applyConstraints: () => void;
  checkCollisions: () => void;
}

export interface Engine extends EngineArrays, EngineGrid {
  width: number;
  height: number;
  bodies: Body[];
  bodyCount: SharedValue<number>;
  worldGravity: { x: number; y: number };
}

// ============================================
// Function Parameter Interfaces
// ============================================

export interface CreateEngineOptionsInterface {
  width: number;
  height: number;
  engineRef: SharedValue<Engine | null>;
  sharedXs: SharedValue<number>[];
  sharedYs: SharedValue<number>[];
  sharedPrevXs: SharedValue<number>[];
  sharedPrevYs: SharedValue<number>[];
  sharedAccelXs: SharedValue<number>[];
  sharedAccelYs: SharedValue<number>[];
  sharedRadius: SharedValue<number>[];
  sharedColors: SharedValue<string>[];
  sharedTypes: SharedValue<BodyType>[];
  sharedIsStatic: SharedValue<boolean>[];
  bodyCount: SharedValue<number>;
  worldGravity: { x: number; y: number };
}

export interface AddCircleWithValuesOptionsInterface {
  engineRef: SharedValue<Engine | null>;
  x: number;
  y: number;
  radius: number;
  color?: string;
  isStatic: boolean;
}

// ============================================
// Helper Types
// ============================================

export type BodyIndex = number;
export type CellKey = string;