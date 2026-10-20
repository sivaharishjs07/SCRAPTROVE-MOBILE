import React, { useEffect, useRef } from 'react';
import {
  View, Animated, Easing, Image, StyleSheet, Dimensions, StatusBar,
} from 'react-native';

// Two-stage splash:
//   1. Native splash (splash.png) shows instantly at cold launch and stays
//      up until App.js calls SplashScreen.hideAsync() — no white flash.
//   2. This component then renders on top of the app content and plays a
//      short, snappy animation. When done it calls onFinish() which lets
//      the parent unmount this overlay and show the actual first screen.
//
// Native-driven animations only — smooth on low-end Android (2 GB RAM).

const { width: SW } = Dimensions.get('window');
const SYMBOL_SIZE = Math.min(SW * 0.32, 180);

export default function AnimatedSplash({ onFinish }) {
  const symbolScale   = useRef(new Animated.Value(0.5)).current;
  const symbolOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkY     = useRef(new Animated.Value(20)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // Symbol appears with subtle bounce
      Animated.parallel([
        Animated.timing(symbolOpacity, {
          toValue: 1, duration: 260, useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
        Animated.spring(symbolScale, {
          toValue: 1, useNativeDriver: true,
          friction: 6, tension: 60,
        }),
      ]),
      // Wordmark slides + fades in
      Animated.parallel([
        Animated.timing(wordmarkY, {
          toValue: 0, duration: 420, useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(wordmarkOpacity, {
          toValue: 1, duration: 420, useNativeDriver: true,
        }),
      ]),
      // Tagline fades in
      Animated.timing(taglineOpacity, {
        toValue: 1, duration: 300, useNativeDriver: true,
      }),
      // Hold before fading the whole overlay out
      Animated.delay(700),
      Animated.timing(overlayOpacity, {
        toValue: 0, duration: 320, useNativeDriver: true,
        easing: Easing.in(Easing.quad),
      }),
    ]).start(() => onFinish && onFinish());
  }, [onFinish, overlayOpacity, symbolOpacity, symbolScale, taglineOpacity, wordmarkOpacity, wordmarkY]);

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} pointerEvents="none">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.center}>
        <Animated.Image
          source={require('../../assets/adaptive-icon.png')}
          style={[
            styles.symbol,
            { opacity: symbolOpacity, transform: [{ scale: symbolScale }] },
          ]}
          resizeMode="contain"
        />
        <Animated.Image
          source={require('../../assets/wordmark.png')}
          style={[
            styles.wordmark,
            { opacity: wordmarkOpacity, transform: [{ translateY: wordmarkY }] },
          ]}
          resizeMode="contain"
        />
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          Recycle · Earn
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 999,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  symbol: {
    width: SYMBOL_SIZE,
    height: SYMBOL_SIZE,
    marginBottom: 20,
  },
  wordmark: {
    // Sized off screen width so it scales with the device. resizeMode is
    // "contain", so the taller box lets the artwork render larger without
    // distorting it.
    width: SW * 0.78,
    height: 72,
    marginBottom: 14,
  },
  tagline: {
    fontSize: 16,
    color: '#4B5563',
    letterSpacing: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
