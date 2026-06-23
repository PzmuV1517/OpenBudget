import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useThemedStyles } from '@/lib/useTheme';
import { type AppColors, fontSize, radius, shadow } from '@/lib/theme';

export interface RadialOption {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onSelect: () => void;
}

interface RadialAddMenuProps {
  options: RadialOption[];
}

const RADIUS = 122; // distance from the FAB center to each option
const FAB = 60;
const OPTION = 54;
const BOX = 84; // option label box width
const HOVER_MAX = 86; // finger within this of an option center selects it

/** Option center offset (dx, dy) from the FAB center, fanned up-and-left. */
function offsetFor(i: number, n: number): { x: number; y: number } {
  // Sweep from straight up (270°) to straight left (180°) so the wheel stays
  // on-screen from a bottom-right FAB.
  const deg = n === 1 ? 225 : 270 - (90 * i) / (n - 1);
  const rad = (deg * Math.PI) / 180;
  return { x: Math.cos(rad) * RADIUS, y: Math.sin(rad) * RADIUS };
}

/**
 * GTA-style radial menu. Long-press the FAB to fan the options out; drag onto
 * one and release to pick it, or release on the center / empty space to cancel.
 * A quick tap opens it in sticky mode where options are tappable.
 */
export function RadialAddMenu({ options }: RadialAddMenuProps) {
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const [sticky, setSticky] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const hoveredRef = useRef<number | null>(null);
  const offsets = options.map((_, i) => offsetFor(i, options.length));

  function close() {
    setOpen(false);
    setSticky(false);
    setHovered(null);
    hoveredRef.current = null;
  }

  function openDrag() {
    setOpen(true);
    setSticky(false);
    setHovered(null);
    hoveredRef.current = null;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function nearestOption(dx: number, dy: number): number | null {
    let best: number | null = null;
    let bestDist = HOVER_MAX;
    offsets.forEach((o, i) => {
      const d = Math.hypot(dx - o.x, dy - o.y);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  }

  function onMove(dx: number, dy: number) {
    const next = nearestOption(dx, dy);
    if (next !== hoveredRef.current) {
      hoveredRef.current = next;
      setHovered(next);
      if (next !== null) Haptics.selectionAsync();
    }
  }

  function endDrag() {
    const picked = hoveredRef.current;
    close();
    if (picked !== null) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      options[picked].onSelect();
    }
  }

  function tapToggle() {
    if (open) close();
    else {
      setOpen(true);
      setSticky(true);
      setHovered(null);
    }
  }

  const pan = Gesture.Pan()
    .runOnJS(true)
    .activateAfterLongPress(180)
    .onStart(openDrag)
    .onUpdate((e) => onMove(e.translationX, e.translationY))
    .onEnd(endDrag);

  const tap = Gesture.Tap().runOnJS(true).maxDuration(260).onStart(tapToggle);

  const gesture = Gesture.Exclusive(pan, tap);

  return (
    <>
      {open && (
        <Pressable
          style={styles.overlay}
          pointerEvents={sticky ? 'auto' : 'none'}
          onPress={sticky ? close : undefined}
        />
      )}

      <View style={styles.anchor} pointerEvents="box-none">
        {open &&
          options.map((opt, i) => {
            const o = offsets[i];
            const isHover = hovered === i;
            return (
              <Pressable
                key={opt.key}
                pointerEvents={sticky ? 'auto' : 'none'}
                onPress={
                  sticky
                    ? () => {
                        close();
                        opt.onSelect();
                      }
                    : undefined
                }
                style={[
                  styles.optionBox,
                  { left: FAB / 2 - BOX / 2 + o.x, top: FAB / 2 - OPTION / 2 + o.y },
                ]}
              >
                <View style={[styles.optionCircle, isHover && styles.optionCircleHover]}>
                  <Ionicons
                    name={opt.icon}
                    size={24}
                    color={isHover ? '#fff' : styles._iconColor.color}
                  />
                </View>
                <Text style={[styles.optionLabel, isHover && styles.optionLabelHover]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}

        <GestureDetector gesture={gesture}>
          <View style={[styles.fab, open && styles.fabOpen]}>
            <Ionicons name={open ? 'close' : 'add'} size={30} color="#fff" />
          </View>
        </GestureDetector>
      </View>
    </>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    _iconColor: { color: c.accent },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    anchor: {
      position: 'absolute',
      right: 20,
      bottom: 24,
      width: FAB,
      height: FAB,
    },
    fab: {
      width: FAB,
      height: FAB,
      borderRadius: radius.pill,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow.fab,
    },
    fabOpen: {
      backgroundColor: c.textMuted,
    },
    optionBox: {
      position: 'absolute',
      width: BOX,
      alignItems: 'center',
    },
    optionCircle: {
      width: OPTION,
      height: OPTION,
      borderRadius: radius.pill,
      backgroundColor: c.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow.card,
    },
    optionCircleHover: {
      backgroundColor: c.accent,
      borderColor: c.accent,
      transform: [{ scale: 1.15 }],
    },
    optionLabel: {
      marginTop: 6,
      fontSize: fontSize.xs,
      fontWeight: '700',
      color: c.textMuted,
    },
    optionLabelHover: {
      color: c.accent,
    },
  });
