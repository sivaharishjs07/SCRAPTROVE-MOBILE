/**
 * Patches react-native-webview/react-native.config.js to suppress the
 * console.log('Hello?', e) in the catch block.
 *
 * When react-native-test-app is not installed (it shouldn't be in production),
 * the catch block logs "Hello? Error: Cannot find module 'react-native-test-app'"
 * to stdout. Gradle then receives that text instead of valid JSON when running
 * `@react-native-community/cli config`, causing the build to fail.
 */
const fs = require('fs');
const path = require('path');

const configPath = path.join(
  __dirname, '..', 'node_modules', 'react-native-webview', 'react-native.config.js'
);

if (!fs.existsSync(configPath)) {
  console.log('[patch-rn-webview] File not found, skipping patch:', configPath);
  process.exit(0);
}

let content = fs.readFileSync(configPath, 'utf8');

// Comment out the console.log that outputs "Hello?" to stdout and breaks Gradle
const before = `console.log('Hello?', e);`;
const after  = `// console.log('Hello?', e); // patched by scripts/patch-rn-webview.js`;

if (content.includes(before)) {
  content = content.replace(before, after);
  fs.writeFileSync(configPath, content, 'utf8');
  console.log('[patch-rn-webview] Patched successfully.');
} else {
  console.log('[patch-rn-webview] Already patched or pattern not found, no changes made.');
}
