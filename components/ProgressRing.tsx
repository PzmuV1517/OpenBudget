import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/lib/useTheme';

interface ProgressRingProps {
  /** 0..1 fraction to fill — now represents how much is LEFT. */
  progress: number;
  size?: number;
  strokeWidth?: number;
  /** Main arc color. Defaults by remaining level (red/amber when low). */
  color?: string;
  /** 0..1 owed (incoming) fraction, drawn as a blue arc past the remaining. */
  owedProgress?: number;
  /** Optional centered label (e.g. "64%"). */
  label?: string;
}

const clamp = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Thin SVG ring showing how much of an envelope is LEFT. Money owed to the
 * envelope is drawn as a blue arc continuing from where the remaining arc ends,
 * so you can see current funds plus what's still coming in.
 */
export function ProgressRing({
  progress,
  size = 48,
  strokeWidth = 5,
  color,
  owedProgress = 0,
  label,
}: ProgressRingProps) {
  const { colors } = useTheme();
  const remaining = clamp(progress);
  // Owed fills the leftover arc, never overflowing the circle.
  const owed = Math.min(clamp(owedProgress), 1 - remaining);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const ringColor =
    color ??
    (remaining <= 0 ? colors.negative : remaining <= 0.15 ? colors.warning : colors.accent);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.cardAlt}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Remaining (main) arc, from 12 o'clock clockwise. */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - remaining)}
          transform={`rotate(-90 ${center} ${center})`}
        />
        {/* Owed (incoming) arc, in blue, continuing where remaining ends. */}
        {owed > 0 && (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.owed}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="butt"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - owed)}
            transform={`rotate(${-90 + remaining * 360} ${center} ${center})`}
          />
        )}
      </Svg>
      {label != null && (
        <Text
          style={{
            position: 'absolute',
            fontSize: size * 0.24,
            fontWeight: '700',
            color: colors.textMuted,
          }}
        >
          {label}
        </Text>
      )}
    </View>
  );
}
