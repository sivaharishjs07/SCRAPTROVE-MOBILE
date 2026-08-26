import 'react-native-gesture-handler';
import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  PlusJakartaSans_900Black,
} from '@expo-google-fonts/plus-jakarta-sans';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import AppNavigator from './src/navigation';
import AnimatedSplash from './src/components/AnimatedSplash';
import { COLORS } from './src/constants/colors';

// Keep the native splash on screen until the JS side is ready to take over
// with the animated splash. This prevents a white flash between the native
// splash disappearing and the animation starting.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    PlusJakartaSans_900Black,
  });

  const [splashDone, setSplashDone] = useState(false);

  // The moment fonts are loaded, hide the native splash so the animated
  // one can take over. Wrapped in useCallback + onLayout so we know the
  // JS root has mounted before we drop the native cover.
  const onRootLayout = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Belt + suspenders: if the onLayout doesn't fire quickly (rare on very
  // slow devices), force-hide after 1.2s so we never get stuck on the
  // native splash forever.
  useEffect(() => {
    const t = setTimeout(() => { SplashScreen.hideAsync().catch(() => {}); }, 1200);
    return () => clearTimeout(t);
  }, []);

  if (!fontsLoaded && !fontError) {
    // Font-loading fallback — native splash still covers this, but keep an
    // ActivityIndicator behind it in case the timeout fires early.
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary }}>
          <StatusBar style="light" />
          <ActivityIndicator color="#fff" size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }} onLayout={onRootLayout}>
        {/* Status bar visible — dark icons for white screens, overridden per-screen where needed */}
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <AppProvider>
          <AppNavigator />
        </AppProvider>
        {/* Animated splash overlay renders on top until it fades itself out */}
        {!splashDone && <AnimatedSplash onFinish={() => setSplashDone(true)} />}
      </View>
    </SafeAreaProvider>
  );
}
