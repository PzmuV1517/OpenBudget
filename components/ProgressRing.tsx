import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/lib/useTheme';

interface ProgressRingProps {
  /** 0..1 fill ratio. */
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  /** Optional centered label (e.g. "64%"). */
  label?: string;
}

/** Thin SVG progress ring. Turns amber/red as it approaches/exceeds full. */
export function ProgressRing({
  progress,
  size = 48,
  strokeWidth = 5,
  color,
  label,
}: ProgressRingProps) {
  const { colors } = useTheme();
  const clamped = Math.min(1, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped);

  const ringColor =
    color ?? (clamped >= 1 ? colors.negative : clamped >= 0.85 ? colors.warning : colors.accent);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.cardAlt}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          // Start at 12 o'clock.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
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
