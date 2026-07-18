import React from 'react';
import { View, Text, Pressable } from 'react-native';

interface Props {
  children: React.ReactNode;
}
interface State {
  hasError: boolean;
}

/**
 * Top-level crash guard. Because Tally is fully offline we do NOT send crash reports
 * anywhere — we just show a safe recovery screen. User data lives untouched in SQLite.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Intentionally local-only. Log to the dev console during development.
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('[Tally] Unhandled error:', error);
    }
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            Tally hit an unexpected error. Your data is safe on this device — try again.
          </Text>
          <Pressable onPress={this.reset} style={styles.button} accessibilityRole="button">
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

const styles = {
  container: { flex: 1, backgroundColor: '#13161A', alignItems: 'center', justifyContent: 'center', padding: 32 } as const,
  title: { color: '#FFFFFF', fontSize: 19, fontWeight: '700', marginBottom: 8, textAlign: 'center' } as const,
  body: { color: '#8A93A0', fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 24 } as const,
  button: { backgroundColor: '#3D5AFE', paddingHorizontal: 24, paddingVertical: 13, borderRadius: 12 } as const,
  buttonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 } as const,
};
