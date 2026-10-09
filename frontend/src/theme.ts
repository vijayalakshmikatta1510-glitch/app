import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#F9F8F6",
  onSurface: "#1A1A1A",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#1A1A1A",
  surfaceTertiary: "#F0EEE9",
  onSurfaceTertiary: "#1A1A1A",
  surfaceInverse: "#1C1C1E",
  onSurfaceInverse: "#F9F8F6",
  muted: "#76726C",
  brand: "#A34C35",
  onBrand: "#FFFFFF",
  brandPrimary: "#A34C35",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#8C3D26",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#EAE4DC",
  onBrandTertiary: "#5A281B",
  success: "#3B6E48",
  onSuccess: "#FFFFFF",
  warning: "#C27803",
  onWarning: "#FFFFFF",
  error: "#B23B3B",
  onError: "#FFFFFF",
  info: "#336699",
  onInfo: "#FFFFFF",
  border: "#E5E1DB",
  borderStrong: "#C8C2B9",
  divider: "#EFECE6",
};

export type ThemeColors = typeof light;
export const defaultScheme = "light" satisfies ColorScheme;
export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

export { light as colors };