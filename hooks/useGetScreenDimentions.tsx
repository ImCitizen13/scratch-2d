import { useEffect, useState } from "react";
import { Dimensions, ScaledSize } from "react-native";

export default function useGetScreenDimentions() {
  const [dimensions, setDimensions] = useState<ScaledSize>(
    Dimensions.get("window")
  );

  useEffect(() => {
    const subscription = Dimensions.addEventListener(
      "change",
      ({ window }) => {
        setDimensions(window);
      }
    );

    return () => subscription?.remove();
  }, []);

  return {
    width: dimensions.width,
    height: dimensions.height,
    scale: dimensions.scale,
    fontScale: dimensions.fontScale,
  };
}

