import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PressableOpacity } from "pressto";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function index() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <PressableOpacity
        onPress={() => {
          router.push("/example");
        }}
      >
        <Text style={{ color: "white", fontSize: 20, fontWeight: "bold" }}>
          Example
        </Text>
      </PressableOpacity>

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({});
