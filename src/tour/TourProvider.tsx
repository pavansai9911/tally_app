import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { Animated, Easing, Modal, Pressable, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '@/theme/ThemeProvider';
import { haptic } from '@/utils/haptics';
import { getSetting, setSetting } from '@/db/database';
import { TOUR_STEPS, TOUR_DONE_KEY, TourStep } from './steps';

export interface TargetRect { x: number; y: number; width: number; height: number }

/** Handle a <TourTarget> registers so the tour can locate it at runtime. */
export interface TargetHandle {
  measure: (cb: (rect: TargetRect | null) => void) => void;
}

interface TourContextValue {
  registerTarget: (id: string, handle: TargetHandle) => void;
  unregisterTarget: (id: string) => void;
  /** Screens with scrollable content register this so the tour can reveal off-screen targets. */
  registerScroller: (fn: ((deltaY: number) => void) | null) => void;
  /** Lets the tour switch bottom tabs between steps. */
  registerTabSwitcher: (fn: ((tab: string) => void) | null) => void;
  startTour: () => void;
  maybeAutoStart: () => void;
  isActive: boolean;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within a TourProvider');
  return ctx;
}

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const PAD = 8;       // breathing room around the highlighted element
const RADIUS = 14;

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { colors, typography, radius } = useTheme();
  const { width: W, height: H } = useWindowDimensions();

  const targets = useRef(new Map<string, TargetHandle>()).current;
  const scrollerRef = useRef<((deltaY: number) => void) | null>(null);
  const tabSwitcherRef = useRef<((tab: string) => void) | null>(null);

  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<TargetRect | null>(null);
  const [ready, setReady] = useState(false);

  // Spotlight geometry is animated (SVG props can't use the native driver).
  const sx = useRef(new Animated.Value(0)).current;
  const sy = useRef(new Animated.Value(0)).current;
  const sw = useRef(new Animated.Value(0)).current;
  const sh = useRef(new Animated.Value(0)).current;
  const cardIn = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  const registerTarget = useCallback((id: string, handle: TargetHandle) => {
    targets.set(id, handle);
  }, [targets]);

  const unregisterTarget = useCallback((id: string) => {
    targets.delete(id);
  }, [targets]);

  const registerScroller = useCallback((fn: ((deltaY: number) => void) | null) => {
    scrollerRef.current = fn;
  }, []);

  const registerTabSwitcher = useCallback((fn: ((tab: string) => void) | null) => {
    tabSwitcherRef.current = fn;
  }, []);

  const step: TourStep | undefined = TOUR_STEPS[stepIndex];

  const finish = useCallback(async (completed: boolean) => {
    Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setIsActive(false);
      setRect(null);
      setReady(false);
      setStepIndex(0);
    });
    // Either way we don't auto-show it again; Settings can replay it.
    await setSetting(TOUR_DONE_KEY, '1').catch(() => {});
    if (completed) haptic('notificationSuccess');
  }, [fade]);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setRect(null);
    setReady(false);
    setIsActive(true);
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [fade]);

  const maybeAutoStart = useCallback(() => {
    getSetting(TOUR_DONE_KEY)
      .then((v) => { if (v !== '1') startTour(); })
      .catch(() => {});
  }, [startTour]);

  // Resolve the current step: switch tab -> reveal target -> measure -> animate spotlight.
  useEffect(() => {
    if (!isActive || !step) return;
    let cancelled = false;
    setReady(false);
    cardIn.setValue(0);

    (async () => {
      if (step.tab && tabSwitcherRef.current) {
        tabSwitcherRef.current(step.tab);
        await wait(320);
      }

      if (!step.target) {
        if (cancelled) return;
        setRect(null);
        setReady(true);
        animateCardIn();
        return;
      }

      const handle = targets.get(step.target);
      if (!handle) {
        // Target not mounted (e.g. an empty section) — show the card centred rather than
        // stalling the tour.
        if (cancelled) return;
        setRect(null);
        setReady(true);
        animateCardIn();
        return;
      }

      const measured = await measureHandle(handle);
      if (cancelled) return;

      // Auto-scroll when the element sits outside the comfortable viewport.
      const topLimit = 90;
      const bottomLimit = H - 300;
      if (measured && scrollerRef.current) {
        if (measured.y + measured.height > bottomLimit) {
          scrollerRef.current(measured.y + measured.height - bottomLimit + 24);
          await wait(380);
        } else if (measured.y < topLimit) {
          scrollerRef.current(measured.y - topLimit - 12);
          await wait(380);
        }
      }

      const finalRect = (await measureHandle(handle)) ?? measured;
      if (cancelled || !finalRect) {
        setRect(null);
        setReady(true);
        animateCardIn();
        return;
      }

      applyRect(finalRect);
      setRect(finalRect);
      setReady(true);
      animateCardIn();
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, stepIndex]);

  function applyRect(r: TargetRect) {
    const target = {
      x: Math.max(0, r.x - PAD),
      y: Math.max(0, r.y - PAD),
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    };
    // First spotlight appears instantly; later ones glide to the next element.
    const first = rect === null;
    const cfg = { duration: first ? 0 : 320, easing: Easing.out(Easing.cubic), useNativeDriver: false };
    Animated.parallel([
      Animated.timing(sx, { toValue: target.x, ...cfg }),
      Animated.timing(sy, { toValue: target.y, ...cfg }),
      Animated.timing(sw, { toValue: target.width, ...cfg }),
      Animated.timing(sh, { toValue: target.height, ...cfg }),
    ]).start();
  }

  function animateCardIn() {
    Animated.timing(cardIn, {
      toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }

  const goNext = useCallback(() => {
    haptic('selection');
    if (stepIndex >= TOUR_STEPS.length - 1) finish(true);
    else setStepIndex((i) => i + 1);
  }, [stepIndex, finish]);

  const goPrev = useCallback(() => {
    haptic('selection');
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const value = useMemo<TourContextValue>(() => ({
    registerTarget, unregisterTarget, registerScroller, registerTabSwitcher, startTour, maybeAutoStart, isActive,
  }), [registerTarget, unregisterTarget, registerScroller, registerTabSwitcher, startTour, maybeAutoStart, isActive]);

  // Place the tooltip above or below the spotlight, whichever has more room.
  const cardBelow = !rect || rect.y + rect.height < H * 0.55;
  const cardTop = rect
    ? (cardBelow ? rect.y + rect.height + PAD + 16 : undefined)
    : undefined;
  const cardBottom = rect && !cardBelow ? H - rect.y + PAD + 16 : undefined;

  const isLast = stepIndex === TOUR_STEPS.length - 1;

  return (
    <TourContext.Provider value={value}>
      {children}
      <Modal transparent visible={isActive} animationType="none" onRequestClose={() => finish(false)}>
        <Animated.View style={{ flex: 1, opacity: fade }}>
          {/* Dim layer with a hole punched over the target */}
          <Svg width={W} height={H} style={{ position: 'absolute', top: 0, left: 0 }}>
            <Defs>
              <Mask id="tour-mask">
                <Rect x={0} y={0} width={W} height={H} fill="white" />
                {rect && (
                  <AnimatedRect x={sx as any} y={sy as any} width={sw as any} height={sh as any} rx={RADIUS} fill="black" />
                )}
              </Mask>
            </Defs>
            <Rect x={0} y={0} width={W} height={H} fill="rgba(8,10,14,0.82)" mask="url(#tour-mask)" />
          </Svg>

          {/* Ring around the highlighted element */}
          {rect && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: Animated.subtract(sx, new Animated.Value(0)) as any,
                top: sy as any,
                width: sw as any,
                height: sh as any,
                borderRadius: RADIUS,
                borderWidth: 2,
                borderColor: colors.accent500,
              }}
            />
          )}

          {/* Tooltip card */}
          {ready && (
            <Animated.View
              style={{
                position: 'absolute',
                left: 20,
                right: 20,
                ...(cardTop !== undefined ? { top: cardTop } : {}),
                ...(cardBottom !== undefined ? { bottom: cardBottom } : {}),
                ...(!rect ? { top: H / 2 - 130 } : {}),
                backgroundColor: colors.surfaceCard,
                borderRadius: radius.xl,
                padding: 20,
                opacity: cardIn,
                transform: [{ translateY: cardIn.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
                elevation: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ ...typography.caption, color: colors.accent500, fontWeight: '700' }}>
                  STEP {stepIndex + 1} OF {TOUR_STEPS.length}
                </Text>
                {!isLast && (
                  <Pressable onPress={() => finish(false)} hitSlop={10} accessibilityLabel="Skip tour">
                    <Text style={{ ...typography.bodySmallMedium, color: colors.neutral500 }}>Skip</Text>
                  </Pressable>
                )}
              </View>

              <Text style={{ ...typography.h3, color: colors.neutral900, marginBottom: 6 }}>{step?.title}</Text>
              <Text style={{ ...typography.body, color: colors.neutral500, lineHeight: 21, marginBottom: 18 }}>
                {step?.body}
              </Text>

              {/* Progress dots */}
              <View style={{ flexDirection: 'row', gap: 5, marginBottom: 16 }}>
                {TOUR_STEPS.map((s, i) => (
                  <View
                    key={s.id}
                    style={{
                      height: 4, borderRadius: 2, flex: i === stepIndex ? 2 : 1,
                      backgroundColor: i === stepIndex ? colors.accent500 : colors.neutral200,
                    }}
                  />
                ))}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {stepIndex > 0 && (
                  <Pressable
                    onPress={goPrev}
                    style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: radius.lg, backgroundColor: colors.neutral50 }}
                  >
                    <Text style={{ ...typography.button, color: colors.neutral900 }}>Back</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={goNext}
                  style={{ flex: 1, height: 48, borderRadius: radius.lg, backgroundColor: colors.accent500, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                >
                  <Text style={{ ...typography.button, color: '#FFFFFF' }}>{isLast ? 'Finish' : 'Next'}</Text>
                  <Feather name={isLast ? 'check' : 'arrow-right'} size={17} color="#FFFFFF" />
                </Pressable>
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </Modal>
    </TourContext.Provider>
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(() => resolve(), ms); });
}

function measureHandle(handle: TargetHandle): Promise<TargetRect | null> {
  return new Promise((resolve) => {
    let settled = false;
    handle.measure((r) => { if (!settled) { settled = true; resolve(r); } });
    // Never hang the tour if a measure callback doesn't fire.
    setTimeout(() => { if (!settled) { settled = true; resolve(null); } }, 500);
  });
}
