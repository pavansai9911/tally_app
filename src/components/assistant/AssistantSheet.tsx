import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView,
  Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '@/theme/ThemeProvider';
import { haptic } from '@/utils/haptics';
import { AssistantAvatar, AssistantAvatarWithStatus } from './AssistantAvatar';
import { TypingDots } from './TypingDots';
import { createAssistantEngine, AssistantReply, ChatMessage, Suggestion } from '@/assistant';

let seq = 0;
const nextId = () => `m${Date.now()}_${seq++}`;

/** Reveals text character-by-character, then reports completion. */
function useTypewriter(full: string, enabled: boolean, onDone?: () => void) {
  const [shown, setShown] = useState(enabled ? '' : full);
  useEffect(() => {
    if (!enabled) {
      setShown(full);
      return;
    }
    let i = 0;
    setShown('');
    // Slightly faster for long answers so lists don't crawl.
    const step = full.length > 160 ? 3 : 1;
    const interval = setInterval(() => {
      i += step;
      if (i >= full.length) {
        setShown(full);
        clearInterval(interval);
        onDone?.();
      } else {
        setShown(full.slice(0, i));
      }
    }, 16);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full, enabled]);
  return shown;
}

function Bubble({
  message,
  onTyped,
}: {
  message: ChatMessage;
  onTyped?: () => void;
}) {
  const { colors, typography, radius } = useTheme();
  const isUser = message.role === 'user';
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter]);

  const text = useTypewriter(message.text, !!message.animate, onTyped);

  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        flexDirection: 'row',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        gap: 8,
        marginBottom: 10,
      }}
    >
      {!isUser && <AssistantAvatar size={26} />}
      <View
        style={{
          maxWidth: '78%',
          backgroundColor: isUser ? colors.accent500 : colors.surfaceSunken,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: radius.lg,
          borderBottomRightRadius: isUser ? 4 : radius.lg,
          borderBottomLeftRadius: isUser ? radius.lg : 4,
        }}
      >
        <Text style={{ ...typography.body, color: isUser ? '#FFFFFF' : colors.neutral900, lineHeight: 20 }}>
          {text}
        </Text>
      </View>
    </Animated.View>
  );
}

export function AssistantSheet({
  visible,
  onClose,
  onNavigate,
  onDataChanged,
}: {
  visible: boolean;
  onClose: () => void;
  onNavigate?: (target: { tab: string; screen?: string; params?: Record<string, unknown> }) => void;
  /** Fired after the assistant writes data, so the host screen can refresh. */
  onDataChanged?: () => void;
}) {
  const { colors, typography, radius } = useTheme();
  const { height } = useWindowDimensions();

  const engine = useMemo(() => createAssistantEngine(), []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState('');
  const [nav, setNav] = useState<AssistantReply['navigate'] | null>(null);
  const [navLabel, setNavLabel] = useState<string>('Open');

  const scrollRef = useRef<ScrollView>(null);
  // Guards the window between sending and the reply starting, where `pending` is still false.
  const busyRef = useRef(false);
  const slide = useRef(new Animated.Value(0)).current;

  // Sheet enter / exit
  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: visible ? 280 : 200,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  const pushReply = useCallback(async (reply: AssistantReply) => {
    setSuggestions([]);
    setNav(null);
    // Bubbles arrive one at a time with a short "thinking" pause between them.
    for (let i = 0; i < reply.messages.length; i++) {
      setPending(true);
      await new Promise<void>((resolve) => { setTimeout(() => resolve(), i === 0 ? 420 : 320); });
      setPending(false);
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'assistant', text: reply.messages[i], createdAt: Date.now(), animate: true },
      ]);
      await new Promise<void>((resolve) => { setTimeout(() => resolve(), 120); });
    }
    if (reply.success) {
      haptic('notificationSuccess');
      // The assistant just wrote to the database — refresh the screen behind the sheet.
      onDataChanged?.();
    }
    setSuggestions(reply.suggestions ?? []);
    if (reply.navigate) {
      setNav(reply.navigate);
      setNavLabel(reply.navigateLabel ?? 'Open');
    }
  }, [onDataChanged]);

  // Every open starts a fresh conversation.
  useEffect(() => {
    if (visible) {
      engine.greet().then(pushReply);
    } else {
      // Clear history and abandon any half-finished flow so reopening starts clean.
      engine.reset();
      setMessages([]);
      setSuggestions([]);
      setNav(null);
      setInput('');
      setPending(false);
      busyRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busyRef.current) return;
      busyRef.current = true;
      haptic('selection');
      setInput('');
      setSuggestions([]);
      setNav(null);
      setMessages((prev) => [...prev, { id: nextId(), role: 'user', text, createdAt: Date.now() }]);
      try {
        const reply = await engine.respond(text);
        await pushReply(reply);
      } finally {
        busyRef.current = false;
      }
    },
    [engine, pushReply],
  );

  const sheetHeight = Math.min(height * 0.82, height - 60);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* Scrim — Home stays visible behind it */}
        <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.surfaceOverlay, opacity: slide }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close assistant" />
        </Animated.View>

        {/* 'padding' on both platforms: inside a Modal, Android does not resize reliably. */}
        <KeyboardAvoidingView behavior="padding">
          <Animated.View
            style={{
              height: sheetHeight,
              backgroundColor: colors.surfaceCard,
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              overflow: 'hidden',
              transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [sheetHeight, 0] }) }],
            }}
          >
            {/* Grabber */}
            <View style={{ alignItems: 'center', paddingTop: 10 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral200 }} />
            </View>

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: colors.surfaceBorder }}>
              <View>
                <AssistantAvatarWithStatus size={42} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.bodyMedium, fontWeight: '700', color: colors.neutral900 }}>Tally Assistant</Text>
                <Text style={{ ...typography.caption, color: colors.income }}>Online · works offline</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
                <Feather name="x" size={22} color={colors.neutral500} />
              </Pressable>
            </View>

            {/* Conversation */}
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((m) => (
                <Bubble key={m.id} message={m} onTyped={() => scrollRef.current?.scrollToEnd({ animated: true })} />
              ))}
              {pending && (
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 10 }}>
                  <AssistantAvatar size={26} />
                  <View style={{ backgroundColor: colors.surfaceSunken, paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.lg, borderBottomLeftRadius: 4 }}>
                    <TypingDots />
                  </View>
                </View>
              )}

              {nav && (
                <Pressable
                  onPress={() => { onNavigate?.(nav as any); onClose(); }}
                  style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, backgroundColor: colors.accentTint, marginLeft: 34, marginBottom: 10 }}
                >
                  <Feather name="arrow-up-right" size={15} color={colors.accent500} />
                  <Text style={{ ...typography.bodySmallMedium, color: colors.accent500 }}>{navLabel}</Text>
                </Pressable>
              )}
            </ScrollView>

            {/* Suggestion chips */}
            {suggestions.length > 0 && !pending && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 10 }}>
                {suggestions.map((sg, i) => (
                  <Chip key={`${sg.label}-${i}`} index={i} label={sg.label} onPress={() => send(sg.value ?? sg.label)} />
                ))}
              </View>
            )}

            {/* Composer */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 18, borderTopWidth: 0.5, borderTopColor: colors.surfaceBorder }}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ask me anything…"
                placeholderTextColor={colors.neutral400}
                onSubmitEditing={() => send(input)}
                returnKeyType="send"
                style={{
                  flex: 1,
                  ...typography.body,
                  color: colors.neutral900,
                  backgroundColor: colors.surfaceSunken,
                  borderRadius: 22,
                  paddingHorizontal: 16,
                  paddingVertical: Platform.OS === 'ios' ? 12 : 8,
                  maxHeight: 100,
                }}
                multiline
              />
              <Pressable
                onPress={() => send(input)}
                disabled={!input.trim() || pending}
                accessibilityLabel="Send"
                style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: input.trim() && !pending ? colors.accent500 : colors.neutral200,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Feather name="send" size={19} color={input.trim() && !pending ? '#FFFFFF' : colors.neutral400} />
              </Pressable>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Chip({ label, onPress, index }: { label: string; onPress: () => void; index: number }) {
  const { colors, typography } = useTheme();
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 220,
      delay: index * 45,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  return (
    <Animated.View style={{ opacity: enter, transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }}>
      <Pressable
        onPress={onPress}
        style={{
          paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18,
          borderWidth: 1, borderColor: colors.accent500, backgroundColor: colors.accentTint,
        }}
      >
        <Text style={{ ...typography.bodySmallMedium, color: colors.accent500 }}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}
