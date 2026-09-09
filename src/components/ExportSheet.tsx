import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '@/theme/ThemeProvider';
import { Chip, ProgressBar } from '@/components/ui';
import { DateField } from '@/components/DateTimeField';
import { useConfirm } from '@/components/ConfirmDialog';
import { EXPORT_RANGE_OPTIONS, ExportRangeKey, resolveExportRange } from '@/utils/exportRange';
import { ExportFormat, EXPORT_STAGES, runExport } from '@/services/export';
import { todayKey, monthKey, parseDateKey } from '@/utils/format';

type OpenExportFn = () => void;
const ExportContext = createContext<OpenExportFn | null>(null);

const FORMATS: { key: ExportFormat; label: string; icon: string }[] = [
  { key: 'pdf', label: 'PDF', icon: 'file-text' },
  { key: 'csv', label: 'CSV', icon: 'grid' },
  { key: 'json', label: 'JSON', icon: 'code' },
];

/**
 * Owns the export config sheet (date range + format) and the processing overlay, so any screen
 * can trigger it via `useExport()` without prop-drilling — same shape as ConfirmProvider.
 */
export function ExportProvider({ children }: { children: React.ReactNode }) {
  const { colors, typography, radius } = useTheme();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [rangeKey, setRangeKey] = useState<ExportRangeKey>('month');
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [customStart, setCustomStart] = useState(`${monthKey()}-01`);
  const [customEnd, setCustomEnd] = useState(todayKey());
  const [stage, setStage] = useState<number | null>(null);

  const openExport = useCallback(() => setOpen(true), []);

  const startExport = useCallback(async () => {
    setOpen(false);
    const range = resolveExportRange(rangeKey, { start: customStart, end: customEnd });
    setStage(0);
    try {
      await runExport(format, range, setStage);
    } catch {
      confirm({ title: 'Export failed', message: 'Could not create the file. Nothing on your device was changed.', icon: 'alert-circle', tone: 'danger' });
    } finally {
      setStage(null);
    }
  }, [rangeKey, format, customStart, customEnd, confirm]);

  return (
    <ExportContext.Provider value={openExport}>
      {children}

      <Modal visible={open} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,18,22,0.45)', justifyContent: 'flex-end' }} onPress={() => setOpen(false)}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.surfaceCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, paddingBottom: 32, maxHeight: '86%' }}>
            <View style={{ width: 36, height: 4, backgroundColor: colors.neutral200, borderRadius: 2, alignSelf: 'center', marginBottom: 12 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 4 }}>
              <Text style={{ ...typography.h3, color: colors.neutral900 }}>Export report</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8} accessibilityLabel="Close">
                <Feather name="x" size={20} color={colors.neutral400} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
              <SheetLabel text="Date range" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: rangeKey === 'custom' ? 6 : 22 }}>
                {EXPORT_RANGE_OPTIONS.map((opt) => (
                  <Chip key={opt.key} label={opt.short} selected={rangeKey === opt.key} onPress={() => setRangeKey(opt.key)} />
                ))}
              </View>
              {rangeKey === 'custom' && (
                <View style={{ marginBottom: 16 }}>
                  <DateField
                    label="From"
                    value={customStart}
                    maximumDate={parseDateKey(customEnd)}
                    onChange={(k) => { setCustomStart(k); if (k > customEnd) setCustomEnd(k); }}
                  />
                  <DateField
                    label="To"
                    value={customEnd}
                    maximumDate={new Date()}
                    minimumDate={parseDateKey(customStart)}
                    onChange={(k) => { setCustomEnd(k); if (k < customStart) setCustomStart(k); }}
                  />
                </View>
              )}

              <SheetLabel text="Format" />
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                {FORMATS.map((f) => (
                  <Chip key={f.key} label={f.label} selected={format === f.key} onPress={() => setFormat(f.key)} icon={<Feather name={f.icon} size={13} color={format === f.key ? colors.neutral0 : colors.neutral600} />} />
                ))}
              </View>
            </ScrollView>
            <View style={{ paddingHorizontal: 24, paddingTop: 14 }}>
              <Pressable
                onPress={startExport}
                accessibilityRole="button"
                accessibilityLabel="Export"
                style={({ pressed }) => ({ height: 52, borderRadius: radius.lg, backgroundColor: colors.accent500, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: pressed ? 0.85 : 1 })}
              >
                <Feather name="share" size={17} color="#FFFFFF" />
                <Text style={{ ...typography.button, color: '#FFFFFF' }}>Export</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={stage !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15,18,22,0.6)', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={{ width: '100%', maxWidth: 300, backgroundColor: colors.surfaceCard, borderRadius: radius.xl, paddingVertical: 30, paddingHorizontal: 26, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.accent500} style={{ marginBottom: 20 }} />
            <StageText text={EXPORT_STAGES[stage ?? 0]} colors={colors} typography={typography} />
            <View style={{ width: '100%', marginTop: 18 }}>
              <ProgressBar progress={((stage ?? 0) + 1) / EXPORT_STAGES.length} color={colors.accent500} />
            </View>
          </View>
        </View>
      </Modal>
    </ExportContext.Provider>
  );
}

function SheetLabel({ text }: { text: string }) {
  const { colors, typography } = useTheme();
  return <Text style={{ ...typography.caption, color: colors.neutral400, textTransform: 'uppercase', marginBottom: 10 }}>{text}</Text>;
}

/** Cross-fades + slides a new stage label in so the progress overlay reads as active, not stuck. */
function StageText({ text, colors, typography }: { text: string; colors: any; typography: any }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 240, useNativeDriver: true }).start();
  }, [text, anim]);
  return (
    <Animated.Text
      style={{
        ...typography.bodyMedium,
        color: colors.neutral900,
        textAlign: 'center',
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
      }}
    >
      {text}
    </Animated.Text>
  );
}

export function useExport(): OpenExportFn {
  const ctx = useContext(ExportContext);
  if (!ctx) throw new Error('useExport must be used within an ExportProvider');
  return ctx;
}
