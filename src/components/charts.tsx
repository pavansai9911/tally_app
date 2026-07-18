import React from 'react';
import Svg, { Circle, Path, Line, Rect, G } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';

const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export function DonutChart({
  data, size = 140, strokeWidth = 22, centerLabel, centerValue,
}: {
  data: Array<{ value: number; color: string }>;
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const { colors, typography } = useTheme();
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  let cumulativeAngle = 0;
  const arcs = data.map((d, i) => {
    const sweep = (d.value / total) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + Math.max(sweep, 0.5);
    cumulativeAngle = endAngle;
    return { path: describeArc(cx, cy, r, startAngle, endAngle), color: d.color, key: i };
  });

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={cx} cy={cy} r={r} stroke={colors.neutral100} strokeWidth={strokeWidth} fill="none" />
      {arcs.map(a => (
        <Path key={a.key} d={a.path} stroke={a.color} strokeWidth={strokeWidth} fill="none" strokeLinecap="butt" />
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

// Lightweight text helper since react-native-svg Text needs explicit import
import { Text as SvgTextEl } from 'react-native-svg';
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
  data, width = 312, height = 200, barColorA, barColorB, labelKey = 'label',
}: {
  data: Array<{ label: string; a: number; b: number }>;
  width?: number;
  height?: number;
  barColorA: string;
  barColorB: string;
  labelKey?: string;
}) {
  const { colors } = useTheme();
  const maxVal = Math.max(...data.flatMap(d => [d.a, d.b]), 1);
  const chartHeight = height - 30;
  const groupWidth = width / data.length;
  const barWidth = Math.min(14, groupWidth / 3);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={0} y1={chartHeight} x2={width} y2={chartHeight} stroke={colors.surfaceBorder} strokeWidth={1} />
      {data.map((d, i) => {
        const groupX = i * groupWidth + groupWidth / 2;
        const heightA = (d.a / maxVal) * (chartHeight - 10);
        const heightB = (d.b / maxVal) * (chartHeight - 10);
        return (
          <G key={i}>
            <Rect x={groupX - barWidth - 2} y={chartHeight - heightA} width={barWidth} height={heightA} rx={3} fill={barColorA} />
            <Rect x={groupX + 2} y={chartHeight - heightB} width={barWidth} height={heightB} rx={3} fill={barColorB} />
            <SvgText x={groupX} y={height - 6} text={d.label} size={10} color={colors.neutral400} />
          </G>
        );
      })}
    </Svg>
  );
}

export function TrendLineChart({ points, width = 312, height = 170, color, fillColor }: {
  points: number[]; width?: number; height?: number; color: string; fillColor?: string;
}) {
  const { colors } = useTheme();
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

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={0} y1={chartHeight} x2={width} y2={chartHeight} stroke={colors.surfaceBorder} strokeWidth={1} />
      {fillColor && <Path d={areaPath} fill={fillColor} opacity={0.5} />}
      <Path d={linePath} stroke={color} strokeWidth={2.5} fill="none" />
      <Circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r={4} fill={color} />
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
