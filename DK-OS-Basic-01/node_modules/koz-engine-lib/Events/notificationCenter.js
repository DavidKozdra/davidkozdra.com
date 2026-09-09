/**
 * DEPRECATED: Backward compatibility shim.
 * 
 * NotificationCenter has been consolidated into NotificationManager.
 * Import from notificationManager.js instead:
 * 
 *   const { NotificationManager, DEFAULT_COLORS, getNotificationColor } = require('./notificationManager');
 *   const center = new NotificationManager(options);
 * 
 * This file is maintained for backward compatibility only.
 */

let api = null;
if (typeof require === "function") {
  try {
    api = require("./notificationManager");
  } catch (_err) {
    console.warn("Failed to load notificationManager; using fallback NotificationCenter");
  }
}

(function initNotificationCenterCompat(root, factory) {
  const compatApi = factory(api);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = compatApi;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createNotificationCenterCompatApi(notificationManagerApi) {
  // Re-export NotificationManager as NotificationCenter for backward compatibility
  let NotificationManager = null;
  let DEFAULT_COLORS = null;
  let getNotificationColor = null;

  if (notificationManagerApi) {
    NotificationManager = notificationManagerApi.NotificationManager;
    DEFAULT_COLORS = notificationManagerApi.DEFAULT_COLORS;
    getNotificationColor = notificationManagerApi.getNotificationColor;
  }

  // Alias for backward compatibility
  const NotificationCenter = NotificationManager;

  return {
    DEFAULT_COLORS: DEFAULT_COLORS,
    getNotificationColor: getNotificationColor,
    NotificationCenter: NotificationCenter,
    NotificationManager: NotificationManager, // Also export new name
  };
});
