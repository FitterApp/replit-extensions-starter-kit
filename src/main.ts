// Standard extension entry point pattern
// This file exports mount/unmount functions for the extension
// The mount function receives an element and SDK, unmount cleans up

import './assets/main.css'
import App from './App.vue'
import { createMountPair } from './lib/mount-manager';

// Export mount/unmount pair - this is the standard pattern for all extensions
// The createMountPair function handles Vue app lifecycle management
export const { mount, unmount } = createMountPair(App);
