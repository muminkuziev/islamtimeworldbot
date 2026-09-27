'use strict';
/* Safe-area ownership:
   - CSS env(safe-area-inset-*) follows browser/iOS insets and rotation.
   - MainActivity supplies only system-bar/cutout overlap with the WebView,
     converted to CSS pixels, and reapplies it after navigation/resizing.
   Zero is a valid native inset (the OS may already fit the WebView). Do not
   replace it with a guessed status-bar height or a snapshot of CSS env(). */
