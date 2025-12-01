import useGetScreenDimentions from "@/hooks/useGetScreenDimentions";
import { Canvas, Rect, Shader, Skia, vec } from "@shopify/react-native-skia";
import React from "react";
import { StyleSheet, View } from "react-native";
import {
  Easing,
  SharedValue,
  useDerivedValue
} from "react-native-reanimated";

export interface MetaballCircle {
  x: SharedValue<number>;
  y: SharedValue<number>;
  radius: SharedValue<number>;
}

// Liquid Parameters
export const LIQUID_SPEED = 1000;
export const LIQUID_EASING = Easing.bezier(0.68, -0.1, 0.32, 1.2);

export default function MetaBallShader({
  circles,
  metaballColor,
  backgroundColor,
}: {
  circles?: MetaballCircle[];
  metaballColor: number[];
  backgroundColor: number[];
}) {
  const { width, height } = useGetScreenDimentions();
  const CANVAS_WIDTH = width;
  const CANVAS_HEIGHT = height;
  // TODO: Remove static value
  // const CANVAS_HEIGHT = height * 0.9;

  // Dynamic circles
  const CIRCLE_MAX = 32;
  // Create some test circles with SharedValues
  // const testCircles = useRef<MetaballCircle[]>([
  //   { x: makeMutable(100), y: makeMutable(100), radius: makeMutable(30) },
  //   { x: makeMutable(150), y: makeMutable(200), radius: makeMutable(5) },
  //   { x: makeMutable(100), y: makeMutable(150), radius: makeMutable(20) },
  //   {
  //     x: makeMutable(CANVAS_WIDTH / 2),
  //     y: makeMutable(CANVAS_HEIGHT / 2),
  //     radius: makeMutable(25),
  //   },
  // ]);

  const shader = Skia.RuntimeEffect.Make(`
     // Variables from the real world
     uniform vec2 u_aspectRatio;
     uniform vec4 u_circles[32]; // (cx, cy, radius, extra)
     uniform int u_circle_count;
     uniform vec3 u_metaballColor;  // RGB color for metaball
     uniform vec3 u_backgroundColor; // RGB color for background

     // AI
     uniform float u_blendK;       // sticky strength
     uniform float u_threshold;    // cut-off for fill


     // Important functions
     float sdCircle(vec2 uv, float radius, vec2 offset){
       return length(uv - offset) - radius;
     }

     // Is the function that blends surfaces
     float smin(float a, float b, float k) {
      float h = max(k - abs(a-b), 0.0) / k;
      return min(a, b) - h * h * k * 0.25;
     }

  vec4 drawScene(vec2 uv){
    // Backround vector
    vec4 col = vec4(1.);
 
   float field = 1e6;

   for (int i = 0; i < 32; ++i) {
    if (i >= u_circle_count) break;
    vec4 circle = u_circles[i];
    vec2 center = circle.xy / u_aspectRatio;
    center -= 0.5;
    center.x *= u_aspectRatio.x / u_aspectRatio.y;
    float radius = circle.z / u_aspectRatio.y;
    float dist = sdCircle(uv, radius, center);
    field = (i == 0) ? dist : smin(field, dist, u_blendK);
  }

   // Setup 
   col = field < -u_threshold ? vec4(u_metaballColor, 1.0) : vec4(u_backgroundColor, 1.0);
   
   return col;
 }

 
      vec4 main(vec2 pos) {
        // Normalize Dimensions so they are standard across all screens and
        // pixel densities
        vec2 uv = pos / u_aspectRatio;
        uv -= 0.5;
        uv.x *= u_aspectRatio.x/u_aspectRatio.y;

        // Finish Drawing
        return drawScene(uv);}
  `)!;
  const uniforms = useDerivedValue(() => {
    // 1. Create buffer: 32 circles × 4 floats (x, y, radius, extra)
    const circleBuffer = new Float32Array(CIRCLE_MAX * 4);

    // 2. Get active circles (filter to only "ball" type if needed)
    const activeCircles =
      circles && circles.length > 0 ? circles : [];
    const count = Math.min(activeCircles.length, CIRCLE_MAX);

    // 3. Fill buffer with circle data
    for (let i = 0; i < count; i++) {
      const circle = activeCircles[i];
      const baseIndex = i * 4;

      circleBuffer[baseIndex + 0] = circle.x.value; // x position
      circleBuffer[baseIndex + 1] = circle.y.value; // y position
      circleBuffer[baseIndex + 2] = circle.radius.value; // radius
      circleBuffer[baseIndex + 3] = 0; // extra (unused for now)
    }

    // 4. Zero out unused slots (safety)
    for (let i = count; i < CIRCLE_MAX; i++) {
      const baseIndex = i * 4;
      circleBuffer[baseIndex + 0] = 0;
      circleBuffer[baseIndex + 1] = 0;
      circleBuffer[baseIndex + 2] = 0;
      circleBuffer[baseIndex + 3] = 0;
    }

    // 5. Return uniforms
    return {
      u_aspectRatio: vec(CANVAS_WIDTH, CANVAS_HEIGHT),
      u_circles: Array.from(circleBuffer),
      u_circle_count: count,
      u_blendK: 0.32, // sticky strength
      u_threshold: 0.01, // edge threshold
      u_metaballColor: metaballColor, // blue
      u_backgroundColor: backgroundColor, // white
    };
  });
  ``;

  return (
    <View style={{ height: "100%", width: "100%" }}>
      <Canvas style={{ height: "100%", width: "100%" }}>
        <Rect x={0} y={0} height={height} width={width} color="violet">
          <Shader source={shader} uniforms={uniforms}></Shader>
        </Rect>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({});
