import {
    addCircleAtPositionWorklet,
    createEngineOnUI,
} from "@/engine/Scratch2DWorklet";

import useGetScreenDimentions from "@/hooks/useGetScreenDimentions";
import AntDesign from "@expo/vector-icons/AntDesign";
import {
    Canvas,
    Circle,
    Group,
    Text,
    useFont,
    vec,
} from "@shopify/react-native-skia";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PressableOpacity } from "pressto";
import React, { useEffect, useRef } from "react";
import { Text as RNText, View } from "react-native";
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from "react-native-gesture-handler";
import {
    useDerivedValue,
    useFrameCallback,
    useSharedValue,
} from "react-native-reanimated";
import { scheduleOnUI } from "react-native-worklets";
const MAX_BODIES = 400;

export default function index() {
  const { width, height } = useGetScreenDimentions();

  // Pre-allocate SharedValue arrays
  const sharedXs = Array.from({ length: MAX_BODIES }, () => useSharedValue(0));
  const sharedYs = Array.from({ length: MAX_BODIES }, () => useSharedValue(0));
  const sharedRadius = Array.from({ length: MAX_BODIES }, () =>
    useSharedValue(0)
  );
  const bodyCount = useSharedValue(0);
  const engineRef = useSharedValue<any>(null);
  const lastUpdate = useSharedValue<number>(Date.now());

  // Line 96: Use useRef instead of let
  const poolIndexRef = useRef(0);

  // Create engine on UI thread with SharedValue arrays
  useEffect(() => {
    scheduleOnUI(
      createEngineOnUI,
      width,
      height,
      engineRef,
      sharedXs,
      sharedYs,
      sharedRadius,
      bodyCount
    );
    // Line 96: Use useRef instead of let
    poolIndexRef.current++;
  }, []);

  useFrameCallback(({ timeSincePreviousFrame }) => {
    const engine = engineRef.value;
    if (!engine) return;

    const deltaMs =
      (timeSincePreviousFrame || 0) > 0 ? timeSincePreviousFrame || 0 : 16.67;
    const clampedDelta = Math.min(deltaMs, 33.34) / 1000;

    engine.step(clampedDelta);
    lastUpdate.value += deltaMs;
  });

  const positionPool = Array.from({ length: MAX_BODIES }, () =>
    useSharedValue(vec(0, 0))
  );
  const accelerationPool = Array.from({ length: MAX_BODIES }, () =>
    useSharedValue(vec(0, 0))
  );
  const positionPreviousPool = Array.from({ length: MAX_BODIES }, () =>
    useSharedValue(vec(0, 0))
  );

  const tap = Gesture.Tap()
    .onEnd((event: any) => {
      "worklet";
      if (poolIndexRef.current >= MAX_BODIES) return;

      const pos = positionPool[poolIndexRef.current];
      const accel = accelerationPool[poolIndexRef.current];
      const prev = positionPreviousPool[poolIndexRef.current];

      pos.value = vec(event.x, event.y);
      accel.value = vec(0, 0);
      prev.value = vec(event.x, event.y);

      addCircleAtPositionWorklet(
        engineRef,
        pos,
        accel,
        prev,
        15,
        poolIndexRef.current % 2 == 0 ? "#25F4EE" : "#FE2C55"
      );

    })
    .onFinalize(() => {
      poolIndexRef.current++;
    });

  const font = useFont(require("../assets/fonts/SpaceMono-Regular.ttf"), 50);
  const font2 = useFont(require("../assets/fonts/SpaceMono-Regular.ttf"), 20);

  // Inside component:
  const countText = useDerivedValue(() => {
    return `Circles: ${bodyCount.value}`;
  });
  // Inside component:
  const countText2 = useDerivedValue(() => {
    return `Collision Checks: ${bodyCount.value * bodyCount.value}`;
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View
        style={{
          flex: 1,
          width: width,
          height: height,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "black",
        }}
      >
        <PressableOpacity
          style={{
            //   position: "absolute",
            width: "100%",
            top: height * 0.05,
            left: 0,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-start",
            padding: 16,
            zIndex: 1000,
          }}
          onPress={() => router.back()}
        >
          <RNText style={{ color: "white", fontSize: 20, fontWeight: "bold" }}>
            <AntDesign name="left" size={24} color="white" /> Back
          </RNText>
        </PressableOpacity>
        <GestureDetector gesture={tap}>
          <Canvas
            style={{
              flex: 1,
              width: "100%",
              height: "100%",
            }}
          >
            <Text text={countText} font={font} x={25} y={100} color="white" />
            <Text text={countText2} font={font2} x={25} y={150} color="white" />
            <Group>
              {Array.from({ length: MAX_BODIES }, (_, i) => (
                <Circle
                  key={i}
                  cx={sharedXs[i]} // Skia reads SharedValue directly
                  cy={sharedYs[i]} // Skia reads SharedValue directly
                  r={sharedRadius[i]} // Skia reads SharedValue directly
                  color={poolIndexRef.current % 2 == 0 ? "#25F4EE" : "#FE2C55"}
                />
              ))}
            </Group>
          </Canvas>
        </GestureDetector>
        <StatusBar style="light" animated={true} />
      </View>
    </GestureHandlerRootView>
  );
}
