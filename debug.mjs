// debug.js
import { Platform } from 'react-native';

console.log('Platform:', Platform.OS);
console.log('Version:', Platform.Version);
console.log('Is testing:', process.env.NODE_ENV === 'test');

// Log all mounted components
if (global?.__reactDevToolsGlobalHook) {
  console.log('React DevTools available');
}