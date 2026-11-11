/**
 * App-wide error boundary (wraps everything in App.js).
 *
 * If any screen throws while rendering, React would otherwise unmount the
 * whole tree and the user would be left with a blank screen. This shows a
 * friendly message with "Try again" (re-render) and "Restart app" (reload
 * the JavaScript bundle via expo-updates). Error details are only shown in
 * development builds; release builds show no internals.
 *
 * Note: React error boundaries only catch errors during rendering and
 * lifecycle methods, not inside event handlers or promises; those are
 * handled where they happen (try/catch around API calls etc.).
 * There is no crash-reporting service in the app; adding one (e.g. Sentry,
 * Firebase Crashlytics) is a client decision and must be declared in the
 * Play Data safety form.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import * as Updates from 'expo-updates';

// TODO(client): Tamil text. The app language is not available here (the
// error may have come from the component that provides it), so this
// screen is English-only.
const TEXT = {
  title: 'Something went wrong',
  body: 'Sorry, the app ran into a problem. Your data on our servers is safe. Please try again; if it keeps happening, restart the app.',
  retry: 'Try again',
  restart: 'Restart app',
};

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (__DEV__) console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  retry = () => this.setState({ error: null });

  restart = async () => {
    try {
      await Updates.reloadAsync();
    } catch {
      // reloadAsync is unavailable in development; fall back to re-render.
      this.retry();
    }
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.container} accessibilityRole="alert">
        <Text style={styles.emoji}>⚠️</Text>
        <Text style={styles.title}>{TEXT.title}</Text>
        <Text style={styles.body}>{TEXT.body}</Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={this.retry} activeOpacity={0.85}>
          <Text style={styles.primaryText}>{TEXT.retry}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={this.restart} activeOpacity={0.85}>
          <Text style={styles.secondaryText}>{TEXT.restart}</Text>
        </TouchableOpacity>

        {__DEV__ ? (
          <ScrollView style={styles.devBox}>
            <Text style={styles.devText}>{String(error?.stack || error)}</Text>
          </ScrollView>
        ) : null}
      </View>
    );
  }
}

// Plain system font and fixed colours on purpose: this screen must render
// even if fonts or theme constants are what failed.
const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emoji: { fontSize: 44, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 10, textAlign: 'center' },
  body: { fontSize: 15, color: '#4B5563', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  primaryBtn: {
    backgroundColor: '#16A34A', borderRadius: 12, paddingVertical: 14, alignSelf: 'stretch',
    alignItems: 'center', marginBottom: 12,
  },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    borderColor: '#16A34A', borderWidth: 1.5, borderRadius: 12, paddingVertical: 13,
    alignSelf: 'stretch', alignItems: 'center',
  },
  secondaryText: { color: '#16A34A', fontSize: 16, fontWeight: '700' },
  devBox: { marginTop: 20, maxHeight: 200, alignSelf: 'stretch', backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10 },
  devText: { fontSize: 11, color: '#991B1B', fontFamily: 'monospace' },
});
