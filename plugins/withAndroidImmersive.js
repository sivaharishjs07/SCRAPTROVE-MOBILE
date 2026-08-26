/**
 * withAndroidImmersive — Expo config plugin
 *
 * Problem: React Native's StatusBar.setHidden(true) uses the deprecated
 * FLAG_FULLSCREEN / setSystemUiVisibility() API which Android 12+ (API 31+)
 * silently ignores. Samsung One UI also overrides translucent manifest flags.
 *
 * Fix: Inject modern WindowInsetsController code directly into MainActivity.kt
 * so the status bar is hidden BEFORE React Native even loads — zero chance
 * of it being overridden or ignored.
 *
 * Uses:
 *   WindowCompat.setDecorFitsSystemWindows(window, false)
 *     → app draws edge-to-edge behind the status bar area
 *   WindowInsetsControllerCompat.hide(Type.statusBars())
 *     → genuinely hides the status bar (modern API, works on Android 12+)
 *   BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
 *     → bar stays hidden; only briefly appears on swipe (same as sticky-immersive)
 */

const { withMainActivity } = require('@expo/config-plugins');

const IMPORTS = [
  'import androidx.core.view.WindowCompat',
  'import androidx.core.view.WindowInsetsCompat',
  'import androidx.core.view.WindowInsetsControllerCompat',
].join('\n');

// Injected right after super.onCreate — window is valid at this point
const FULLSCREEN_CODE = `
    // ── True fullscreen via WindowInsetsController (Android 12+) ──────────────
    WindowCompat.setDecorFitsSystemWindows(window, false)
    WindowInsetsControllerCompat(window, window.decorView).apply {
      hide(WindowInsetsCompat.Type.statusBars())
      systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    }
    // ──────────────────────────────────────────────────────────────────────────`;

module.exports = function withAndroidImmersive(config) {
  return withMainActivity(config, (config) => {
    let src = config.modResults.contents;

    // 1. Add imports before the class declaration (safe insertion point)
    if (!src.includes('WindowInsetsControllerCompat')) {
      // Try inserting after "import android.os.Bundle" first
      if (src.includes('import android.os.Bundle')) {
        src = src.replace(
          'import android.os.Bundle',
          `import android.os.Bundle\n${IMPORTS}`
        );
      } else {
        // Fallback: insert just before "class MainActivity"
        src = src.replace(
          '\nclass MainActivity',
          `\n${IMPORTS}\nclass MainActivity`
        );
      }
    }

    // 2. Inject fullscreen code right after super.onCreate(savedInstanceState)
    if (!src.includes('WindowCompat.setDecorFitsSystemWindows')) {
      src = src.replace(
        'super.onCreate(savedInstanceState)',
        `super.onCreate(savedInstanceState)${FULLSCREEN_CODE}`
      );
    }

    config.modResults.contents = src;
    return config;
  });
};
