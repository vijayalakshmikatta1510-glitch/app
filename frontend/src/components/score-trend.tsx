import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";

import { colors } from "@/src/theme";

const WIDTH = 320;
const HEIGHT = 140;
const PAD_X = 26;
const PAD_Y = 20;

export function ScoreTrend({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null;
  const stepX = (WIDTH - PAD_X * 2) / (scores.length - 1);
  const points = scores.map((score, index) => ({
    x: PAD_X + stepX * index,
    y: PAD_Y + (1 - Math.min(100, Math.max(0, score)) / 100) * (HEIGHT - PAD_Y * 2),
    score,
  }));
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  const delta = last.score - first.score;
  return (
    <View testID="score-trend-chart" style={styles.card}>
      <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        {[25, 50, 75].map((level) => {
          const y = PAD_Y + (1 - level / 100) * (HEIGHT - PAD_Y * 2);
          return <Line key={level} x1={PAD_X} y1={y} x2={WIDTH - PAD_X} y2={y} stroke={colors.divider} strokeWidth={1} strokeDasharray="4 6" />;
        })}
        <Polyline points={polyline} fill="none" stroke={colors.brandPrimary} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((point, index) => (
          <Circle key={index} cx={point.x} cy={point.y} r={index === points.length - 1 ? 5.5 : 4} fill={colors.brandPrimary} />
        ))}
      </Svg>
      <View style={styles.legend}>
        <Text style={styles.legendText}>First {first.score}</Text>
        <Text style={[styles.legendText, styles.delta, delta >= 0 ? styles.deltaUp : styles.deltaDown]}>{delta >= 0 ? "+" : ""}{delta} pts</Text>
        <Text style={styles.legendText}>Latest {last.score}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginTop: 14 },
  legend: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  legendText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  delta: { fontWeight: "800" },
  deltaUp: { color: colors.success },
  deltaDown: { color: colors.warning },
});
