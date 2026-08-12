import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '@/theme/ThemeProvider';
import { mapIcon } from '@/utils/iconMap';
import { haptic } from '@/utils/haptics';
import { Category } from '@/db';

export const CAT_ROW_H = 62;

type Row = Category & { count: number };

/**
 * Drag-to-reorder categories built with PanResponder + Animated only — no extra native
 * dependency (react-native-gesture-handler / reanimated). Each row has a drag handle (the grip
 * icon on the right): pressing it grabs the row immediately — robust, with no long-press timing
 * or ScrollView gesture conflicts. Other rows shift to open a gap; dropping persists the order.
 * The "Other" default is rendered pinned at the bottom and is not draggable.
 */
export function DraggableCategoryList({
  items,
  pinned,
  onReorder,
  onPress,
  onDragActive,
}: {
  items: Row[];
  pinned?: Row | null;
  onReorder: (orderedIds: string[]) => void;
  onPress: (id: string) => void;
  onDragActive: (active: boolean) => void;
}) {
  const { colors, typography } = useTheme();
  const [order, setOrder] = useState<Row[]>(items);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Keep local order in sync when the source list changes (after a DB re-query).
  useEffect(() => { setOrder(items); }, [items]);

  const offsets = useRef<Map<string, Animated.Value>>(new Map()).current;
  const offsetFor = useCallback((id: string) => {
    let v = offsets.get(id);
    if (!v) { v = new Animated.Value(0); offsets.set(id, v); }
    return v;
  }, [offsets]);

  const orderRef = useRef(order);
  orderRef.current = order;
  const dragFrom = useRef(0);
  const hoverTo = useRef(0);

  const applyShift = useCallback((from: number, to: number) => {
    const list = orderRef.current;
    for (let p = 0; p < list.length; p++) {
      if (p === from) continue;
      let target = 0;
      if (from < to && p > from && p <= to) target = -CAT_ROW_H;
      else if (to < from && p >= to && p < from) target = CAT_ROW_H;
      Animated.timing(offsetFor(list[p].id), { toValue: target, duration: 120, useNativeDriver: true }).start();
    }
  }, [offsetFor]);

  const startDrag = useCallback((id: string) => {
    const idx = orderRef.current.findIndex(r => r.id === id);
    if (idx < 0) return;
    dragFrom.current = idx;
    hoverTo.current = idx;
    setDraggingId(id);
    onDragActive(true);
    haptic('impactMedium');
  }, [onDragActive]);

  const moveDrag = useCallback((id: string, dy: number) => {
    const from = dragFrom.current;
    const to = Math.max(0, Math.min(orderRef.current.length - 1, from + Math.round(dy / CAT_ROW_H)));
    offsetFor(id).setValue(dy);
    if (to !== hoverTo.current) { hoverTo.current = to; applyShift(from, to); }
  }, [offsetFor, applyShift]);

  const endDrag = useCallback((id: string, commit: boolean) => {
    const list = orderRef.current;
    const from = dragFrom.current;
    const to = hoverTo.current;
    const finish = () => {
      list.forEach(r => offsetFor(r.id).setValue(0));
      if (commit && to !== from) {
        const next = [...list];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        setOrder(next);
        onReorder(next.map(r => r.id));
      }
      setDraggingId(null);
      onDragActive(false);
    };
    if (commit && to !== from) {
      Animated.timing(offsetFor(id), { toValue: (to - from) * CAT_ROW_H, duration: 140, useNativeDriver: true }).start(finish);
    } else {
      finish();
    }
  }, [offsetFor, onDragActive, onReorder]);

  return (
    <View>
      {order.map(item => (
        <DragRow
          key={item.id}
          item={item}
          offset={offsetFor(item.id)}
          dragging={draggingId === item.id}
          dimmed={draggingId !== null && draggingId !== item.id}
          onPress={() => { if (!draggingId) onPress(item.id); }}
          onStart={startDrag}
          onMove={moveDrag}
          onEnd={endDrag}
        />
      ))}
      {pinned ? (
        <View style={{ height: CAT_ROW_H, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: colors.surfaceBorder, opacity: draggingId ? 0.85 : 1 }}>
          <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: pinned.color + '22', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name={mapIcon(pinned.icon)} size={18} color={pinned.color} />
          </View>
          <Pressable onPress={() => { if (!draggingId) onPress(pinned.id); }} style={{ flex: 1 }}>
            <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }} numberOfLines={1}>{pinned.name}</Text>
          </Pressable>
          <Text style={{ ...typography.caption, color: colors.neutral400 }}>{pinned.count} transactions</Text>
          <Feather name="chevron-right" size={16} color={colors.neutral300} />
        </View>
      ) : null}
    </View>
  );
}

function DragRow({
  item, offset, dragging, dimmed, onPress, onStart, onMove, onEnd,
}: {
  item: Row;
  offset: Animated.Value;
  dragging: boolean;
  dimmed: boolean;
  onPress: () => void;
  onStart: (id: string) => void;
  onMove: (id: string, dy: number) => void;
  onEnd: (id: string, commit: boolean) => void;
}) {
  const { colors, typography } = useTheme();
  // The handle claims the gesture on touch-down, so the surrounding scroll never fights it.
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => onStart(item.id),
      onPanResponderMove: (_e, g) => onMove(item.id, g.dy),
      onPanResponderRelease: () => onEnd(item.id, true),
      onPanResponderTerminate: () => onEnd(item.id, false),
    }),
  ).current;

  return (
    <Animated.View style={{ height: CAT_ROW_H, transform: [{ translateY: offset }], zIndex: dragging ? 10 : 1, elevation: dragging ? 6 : 0 }}>
      <View style={{
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4,
        borderBottomWidth: dragging ? 0 : 0.5, borderBottomColor: colors.surfaceBorder,
        backgroundColor: dragging ? colors.surfaceCard : 'transparent',
        borderRadius: dragging ? 12 : 0, opacity: dimmed ? 0.7 : 1,
        shadowColor: '#000', shadowOpacity: dragging ? 0.18 : 0, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
      }}>
        <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: item.color + '22', alignItems: 'center', justifyContent: 'center' }}>
          <Feather name={mapIcon(item.icon)} size={18} color={item.color} />
        </View>
        <Pressable onPress={onPress} style={{ flex: 1 }}>
          <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }} numberOfLines={1}>{item.name}</Text>
          <Text style={{ ...typography.caption, color: colors.neutral400 }}>{item.count} transactions</Text>
        </Pressable>
        {/* Drag handle */}
        <View {...pan.panHandlers} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={{ paddingHorizontal: 6, paddingVertical: 10 }}>
          <Feather name="menu" size={18} color={dragging ? colors.accent500 : colors.neutral300} />
        </View>
      </View>
    </Animated.View>
  );
}
