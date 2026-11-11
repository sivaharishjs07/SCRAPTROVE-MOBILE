// Space to leave at the bottom of a screen so content is not hidden behind
// Android's navigation bar (gesture bar or 3-button bar).
//
// From SDK 54 (target Android 16) the app is always drawn edge-to-edge, so
// the system navigation bar sits on top of the bottom of every screen.
// Inside the bottom tab navigator the tab bar already reserves that space,
// so this returns 0 there; on stack screens it returns the bottom inset.
import { useContext } from 'react';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useBottomSpace() {
  const tabBarHeight = useContext(BottomTabBarHeightContext);
  const { bottom } = useSafeAreaInsets();
  return tabBarHeight ? 0 : bottom;
}
