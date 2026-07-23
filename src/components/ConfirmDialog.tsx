import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '@/theme/ThemeProvider';
import { haptic } from '@/utils/haptics';

export type ConfirmButtonStyle = 'default' | 'cancel' | 'destructive';

export interface ConfirmButton {
  text: string;
  style?: ConfirmButtonStyle;
  onPress?: () => void | Promise<void>;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** Feather icon name for the badge. Defaults from `tone`. */
  icon?: string;
  /** `danger` paints the badge + primary button red; `default` uses the accent. */
  tone?: 'danger' | 'default';
  /** Buttons in display order. Defaults to a single dismiss button. */
  buttons?: ConfirmButton[];
}

type ConfirmFn = (opts: ConfirmOptions) => void;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * App-wide themed replacement for `Alert.alert`. A single provider owns one animated,
 * theme-aware dialog; screens call `useConfirm()(opts)` with a title/message/buttons that
 * mirror `Alert.alert`, so messages can be context-aware ("you'll lose your 12-day streak").
 * The default OS alert is not theme-aware and looks foreign in dark mode — this is.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { colors, typography, radius } = useTheme();
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [visible, setVisible] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  // Bumped on every open. The delayed teardown only clears if no newer dialog has opened,
  // so a success dialog raised from within a button handler is never clobbered.
  const gen = useRef(0);

  const confirm = useCallback<ConfirmFn>((o) => {
    gen.current += 1;
    setOpts(o);
    setVisible(true);
    haptic('impactLight');
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 90 }).start();
    } else {
      anim.setValue(0);
    }
  }, [visible, anim]);

  const close = useCallback(() => {
    const g = gen.current;
    // Fade/scale out, then unmount and clear — unless a newer dialog has since opened.
    Animated.timing(anim, { toValue: 0, duration: 130, useNativeDriver: true }).start(() => {
      if (gen.current === g) {
        setVisible(false);
        setOpts(null);
      }
    });
  }, [anim]);

  const runButton = useCallback((b: ConfirmButton) => {
    close();
    // Let the dialog begin dismissing before the action navigates/mutates.
    setTimeout(() => { b.onPress?.(); }, 60);
  }, [close]);

  const buttons: ConfirmButton[] = opts?.buttons ?? [{ text: 'OK', style: 'default' }];
  const tone = opts?.tone ?? (buttons.some(b => b.style === 'destructive') ? 'danger' : 'default');
  const isDanger = tone === 'danger';
  const badgeBg = isDanger ? colors.expenseTint : colors.accentTint;
  const badgeFg = isDanger ? colors.expense : colors.accent500;
  const icon = opts?.icon ?? (isDanger ? 'alert-triangle' : 'help-circle');

  // Non-cancel buttons first (primary action on top), cancel pinned to the bottom.
  const ordered = [...buttons].sort((a, b) => (a.style === 'cancel' ? 1 : 0) - (b.style === 'cancel' ? 1 : 0));

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
        <Pressable
          onPress={() => {
            const cancel = buttons.find(b => b.style === 'cancel');
            if (cancel) runButton(cancel); else close();
          }}
          style={{ flex: 1, backgroundColor: 'rgba(15,18,22,0.55)', alignItems: 'center', justifyContent: 'center', padding: 28 }}
        >
          {/* Inner Pressable swallows taps so pressing the card doesn't dismiss. */}
          <Pressable
            onPress={() => {}}
            style={{ width: '100%', maxWidth: 360 }}
          >
            <Animated.View
              style={{
                backgroundColor: colors.surfaceCard,
                borderRadius: radius.xl,
                padding: 24,
                opacity: anim,
                transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
                shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12,
              }}
            >
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: badgeBg, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 }}>
                <Feather name={icon} size={24} color={badgeFg} />
              </View>
              <Text style={{ ...typography.h3, color: colors.neutral900, textAlign: 'center', marginBottom: opts?.message ? 8 : 20 }}>
                {opts?.title}
              </Text>
              {opts?.message ? (
                <Text style={{ ...typography.body, color: colors.neutral500, textAlign: 'center', lineHeight: 21, marginBottom: 22 }}>
                  {opts.message}
                </Text>
              ) : null}
              <View style={{ gap: 10 }}>
                {ordered.map((b, i) => {
                  const destructive = b.style === 'destructive';
                  const cancel = b.style === 'cancel';
                  const bg = destructive ? colors.expense : cancel ? colors.surfaceSunken : colors.accent500;
                  const fg = cancel ? colors.neutral700 : '#FFFFFF';
                  return (
                    <Pressable
                      key={`${b.text}-${i}`}
                      onPress={() => runButton(b)}
                      accessibilityRole="button"
                      accessibilityLabel={b.text}
                      style={({ pressed }) => ({
                        height: 50, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: bg, opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <Text style={{ ...typography.button, color: fg }}>{b.text}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
}
