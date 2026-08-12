import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/ui';
import { useConfirm } from '@/components/ConfirmDialog';
import { openFeedbackEmail, FEEDBACK_EMAIL } from '@/services/feedback';
import { RootStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Feedback'>;

export default function FeedbackScreen({ navigation }: Props) {
  const { colors, typography, radius } = useTheme();
  const confirm = useConfirm();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const canSend = message.trim().length > 0 && !sending;

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    const ok = await openFeedbackEmail(subject.trim() || 'General feedback', message);
    setSending(false);
    if (ok) {
      navigation.goBack();
    } else {
      confirm({
        title: 'No email app found',
        message: `Couldn't open an email app on this device. You can email your feedback to ${FEEDBACK_EMAIL} directly.`,
        icon: 'mail',
        tone: 'danger',
      });
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} accessibilityLabel="Back">
          <Feather name="chevron-left" size={24} color={colors.neutral900} />
        </Pressable>
        <Text style={{ ...typography.h3, color: colors.neutral900 }}>Send feedback</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={{ ...typography.body, color: colors.neutral500, lineHeight: 21, marginBottom: 20 }}>
            Found a bug or have an idea? Write it below and tap Send — your email app opens with
            everything drafted, and you send it whenever you're ready. Nothing is sent automatically.
          </Text>

          <Text style={{ ...typography.caption, color: colors.neutral600, textTransform: 'uppercase', marginBottom: 8 }}>Subject</Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="Bug Report / Feature Request / General Feedback"
            placeholderTextColor={colors.neutral400}
            style={{ ...typography.body, color: colors.neutral900, backgroundColor: colors.surfaceSunken, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 18 }}
          />

          <Text style={{ ...typography.caption, color: colors.neutral600, textTransform: 'uppercase', marginBottom: 8 }}>Message</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Describe the issue or idea in as much detail as you like…"
            placeholderTextColor={colors.neutral400}
            multiline
            textAlignVertical="top"
            style={{ ...typography.body, color: colors.neutral900, backgroundColor: colors.surfaceSunken, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, minHeight: 160, marginBottom: 16 }}
          />

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.surfaceSunken, marginBottom: 20 }}>
            <Feather name="info" size={15} color={colors.neutral500} style={{ marginTop: 1 }} />
            <Text style={{ ...typography.caption, color: colors.neutral500, flex: 1, lineHeight: 16 }}>
              To help us fix things faster, the email also includes your app version, Android
              version and device model. It stays offline until you press Send in your email app.
            </Text>
          </View>

          <Button label={sending ? 'Opening email…' : 'Send'} onPress={handleSend} disabled={!canSend} icon={<Feather name="send" size={16} color="#FFFFFF" />} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
