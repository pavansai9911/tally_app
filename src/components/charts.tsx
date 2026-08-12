import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Path, Line, Rect, G, Text as SvgTextEl } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

// Arc drawn START -> END clockwise (sweep flag 1). Drawing forward this way means a
// strokeDashoffset reveal fills each slice in the clockwise direction from its leading edge.
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

/**
 * Returns a stable Animated.Value that runs 0->1 on mount and whenever `trigger` changes (the
 * Reports screen bumps it on focus + period change). It drives SVG props DIRECTLY via animated
 * dash-offset / height / opacity, so the charts animate WITHOUT re-rendering React every frame —
 * that's what makes the motion smooth (the old approach pushed the value into state ~60x/sec and
 * re-rendered + recomputed every path each frame, which stuttered when all charts ran at once).
 */
function useRevealValue(trigger: unknown, duration = 900): Animated.Value {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    v.setValue(0);
    const a = Animated.timing(v, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [trigger, duration, v]);
  return v;
}

export function DonutChart({
  data, size = 140, strokeWidth = 22, centerLabel, centerValue, onSlicePress, animateTrigger,
}: {
  data: Array<{ value: number; color: string }>;
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
  onSlicePress?: (index: number) => void;
  /** Change this to (re)play the clockwise draw-in animation. */
  animateTrigger?: unknown;
}) {
  const { colors } = useTheme();
  const reveal = useRevealValue(animateTrigger, 950);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  // Static arc paths (computed once, not per frame). Each slice reveals during its own slice of
  // the 0->1 timeline via a clamped strokeDashoffset interpolation → a clockwise sweep.
  let cumAngle = 0;
  const totalSweep = data.reduce((s, d) => s + Math.max((d.value / total) * 360, 0.5), 0) || 360;
  const arcs = data.map((d, i) => {
    const sweep = Math.max((d.value / total) * 360, 0.5);
    const startAngle = cumAngle;
    const endAngle = cumAngle + sweep;
    cumAngle = endAngle;
    return {
      key: i,
      color: d.color,
      path: describeArc(cx, cy, r, startAngle, endAngle),
      len: (sweep / 360) * circumference,
      startFrac: startAngle / totalSweep,
      endFrac: endAngle / totalSweep,
    };
  });

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={cx} cy={cy} r={r} stroke={colors.neutral100} strokeWidth={strokeWidth} fill="none" />
      {arcs.map(a => (
        <AnimatedPath
          key={a.key}
          d={a.path}
          stroke={a.color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="butt"
          strokeDasharray={[a.len, a.len + 1]}
          strokeDashoffset={reveal.interpolate({
            inputRange: [a.startFrac, Math.max(a.endFrac, a.startFrac + 0.0001)],
            outputRange: [a.len, 0],
            extrapolate: 'clamp',
          })}
          onPress={onSlicePress ? () => onSlicePress(a.key) : undefined}
        />
      ))}
      {centerValue && (
        <>
          {centerLabel && (
            <SvgText x={cx} y={cy - 6} text={centerLabel} size={11} color={colors.neutral400} />
          )}
          <SvgText x={cx} y={cy + 12} text={centerValue} size={14} weight="700" color={colors.neutral900} />
        </>
      )}
    </Svg>
  );
}

function SvgText({ x, y, text, size, color, weight }: { x: number; y: number; text: string; size: number; color: string; weight?: string }) {
  return (
    <SvgTextEl x={x} y={y} fontSize={size} fill={color} fontWeight={weight ?? '400'} textAnchor="middle">
      {text}
    </SvgTextEl>
  );
}

export function ProgressRing({ progress, size = 140, strokeWidth = 14, color, label, value }: {
  progress: number; size?: number; strokeWidth?: number; color: string; label?: string; value?: string;
}) {
  const { colors } = useTheme();
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dash = circumference * Math.max(0, Math.min(1, progress));

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={cx} cy={cy} r={r} stroke={colors.neutral100} strokeWidth={strokeWidth} fill="none" />
      <Circle
        cx={cx} cy={cy} r={r} stroke={color} strokeWidth={strokeWidth} fill="none"
        strokeDasharray={`${dash} ${circumference}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      {value && <SvgText x={cx} y={cy - 4} text={value} size={24} weight="700" color={colors.neutral900} />}
      {label && <SvgText x={cx} y={cy + 18} text={label} size={11} color={colors.neutral400} />}
    </Svg>
  );
}

export function GroupedBarChart({
  data, width = 312, height = 200, barColorA, barColorB, animateTrigger,
}: {
  data: Array<{ label: string; a: number; b: number }>;
  width?: number;
  height?: number;
  barColorA: string;
  barColorB: string;
  /** Change this to (re)play the grow-up animation. */
  animateTrigger?: unknown;
}) {
  const { colors } = useTheme();
  const grow = useRevealValue(animateTrigger, 800);
  const maxVal = Math.max(...data.flatMap(d => [d.a, d.b]), 1);
  const chartHeight = height - 30;
  const groupWidth = width / data.length;
  const barWidth = Math.min(14, groupWidth / 3);
  const n = Math.max(data.length, 1);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={0} y1={chartHeight} x2={width} y2={chartHeight} stroke={colors.surfaceBorder} strokeWidth={1} />
      {data.map((d, i) => {
        const groupX = i * groupWidth + groupWidth / 2;
        // Slight left-to-right cascade: each group's window on the 0->1 timeline starts later.
        const start = (i / n) * 0.5;
        const range = { inputRange: [start, start + 0.5], extrapolate: 'clamp' as const };
        const fullA = (d.a / maxVal) * (chartHeight - 10);
        const fullB = (d.b / maxVal) * (chartHeight - 10);
        return (
          <G key={i}>
            <AnimatedRect
              x={groupX - barWidth - 2}
              y={grow.interpolate({ ...range, outputRange: [chartHeight, chartHeight - fullA] })}
              width={barWidth}
              height={grow.interpolate({ ...range, outputRange: [0, fullA] })}
              rx={3}
              fill={barColorA}
            />
            <AnimatedRect
              x={groupX + 2}
              y={grow.interpolate({ ...range, outputRange: [chartHeight, chartHeight - fullB] })}
              width={barWidth}
              height={grow.interpolate({ ...range, outputRange: [0, fullB] })}
              rx={3}
              fill={barColorB}
            />
            <SvgText x={groupX} y={height - 6} text={d.label} size={10} color={colors.neutral400} />
          </G>
        );
      })}
    </Svg>
  );
}

export function TrendLineChart({ points, width = 312, height = 170, color, fillColor, animateTrigger }: {
  points: number[]; width?: number; height?: number; color: string; fillColor?: string;
  /** Change this to (re)play the left-to-right draw animation. */
  animateTrigger?: unknown;
}) {
  const { colors } = useTheme();
  const draw = useRevealValue(animateTrigger, 900);
  if (points.length === 0) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const chartHeight = height - 20;
  const stepX = width / Math.max(points.length - 1, 1);

  const coords = points.map((v, i) => ({
    x: i * stepX,
    y: chartHeight - ((v - min) / range) * (chartHeight - 10) - 5,
  }));

  const linePath = coords.reduce((acc, c, i) => acc + (i === 0 ? `M${c.x},${c.y}` : ` L${c.x},${c.y}`), '');
  const areaPath = `${linePath} L${coords[coords.length - 1].x},${chartHeight} L0,${chartHeight} Z`;
  const lineLen = coords.reduce((sum, c, i) => i === 0 ? 0 : sum + Math.hypot(c.x - coords[i - 1].x, c.y - coords[i - 1].y), 0) || 1;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={0} y1={chartHeight} x2={width} y2={chartHeight} stroke={colors.surfaceBorder} strokeWidth={1} />
      {fillColor && (
        <AnimatedPath d={areaPath} fill={fillColor} opacity={draw.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] })} />
      )}
      <AnimatedPath
        d={linePath}
        stroke={color}
        strokeWidth={2.5}
        fill="none"
        strokeDasharray={lineLen}
        strokeDashoffset={draw.interpolate({ inputRange: [0, 1], outputRange: [lineLen, 0] })}
      />
      <AnimatedCircle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r={4} fill={color} opacity={draw} />
    </Svg>
  );
}

export function Heatmap({ cells, weeks = 16, color4 }: {
  cells: Array<{ date: string; intensity: 0 | 1 | 2 | 3 }>; // 0=empty,1=light,2=mid,3=full
  weeks?: number;
  color4: [string, string, string, string];
}) {
  const cellSize = 14;
  const gap = 4;
  const cols = weeks;
  const rows = 7;
  const width = cols * (cellSize + gap) - gap;
  const height = rows * (cellSize + gap) - gap;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {cells.map((cell, i) => {
        const col = Math.floor(i / 7);
        const row = i % 7;
        return (
          <Rect
            key={cell.date}
            x={col * (cellSize + gap)}
            y={row * (cellSize + gap)}
            width={cellSize}
            height={cellSize}
            rx={3}
            fill={color4[cell.intensity]}
          />
        );
      })}
    </Svg>
  );
}
