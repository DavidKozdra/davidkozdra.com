/* Playables SDK bridge. */
// Playables SDK v1.0.0
      // Game lifecycle bridge: rAF-based game-ready detection + event communication
      (function () {
        "use strict";
        if (window.playablesSDK) return;
        var HANDLER_NAME = "playablesGameEventHandler";
        var ANDROID_BRIDGE_NAME = "_MetaPlayablesBridge";
        var RAF_FRAME_THRESHOLD = 3;
        var gameReadySent = false;
        var firstInteractionSent = false;
        var errorSent = false;
        var frameCount = 0;
        var originalRAF = window.requestAnimationFrame;
        function hasIOSBridge() {
          return !!(
            window.webkit &&
            window.webkit.messageHandlers &&
            window.webkit.messageHandlers[HANDLER_NAME]
          );
        }
        function hasAndroidBridge() {
          return !!(
            window[ANDROID_BRIDGE_NAME] &&
            typeof window[ANDROID_BRIDGE_NAME].postEvent === "function"
          );
        }
        function isInIframe() {
          return !!(window.parent && window.parent !== window);
        }
        function sendEvent(eventName, payload) {
          var message = {
            type: eventName,
            payload: payload || {},
            timestamp: Date.now(),
          };
          if (hasIOSBridge()) {
            try {
              window.webkit.messageHandlers[HANDLER_NAME].postMessage(message);
            } catch (e) {}
            return;
          }
          if (hasAndroidBridge()) {
            try {
              var p = payload || {};
              p.__secureToken = window.__fbAndroidBridgeAuthToken || "";
              window[ANDROID_BRIDGE_NAME].postEvent(
                eventName,
                JSON.stringify(p),
              );
            } catch (e) {}
            return;
          }
          if (isInIframe()) {
            try {
              window.parent.postMessage(message, "*");
            } catch (e) {}
            return;
          }
        }
        function onFrame() {
          if (gameReadySent) return;
          frameCount++;
          if (frameCount >= RAF_FRAME_THRESHOLD) {
            gameReadySent = true;
            sendEvent("game_ready", {
              frame_count: frameCount,
              detected_at: Date.now(),
            });
            return;
          }
          originalRAF.call(window, onFrame);
        }
        if (originalRAF) {
          window.requestAnimationFrame = function (callback) {
            if (!gameReadySent) {
              return originalRAF.call(window, function (timestamp) {
                frameCount++;
                if (frameCount >= RAF_FRAME_THRESHOLD && !gameReadySent) {
                  gameReadySent = true;
                  sendEvent("game_ready", {
                    frame_count: frameCount,
                    detected_at: Date.now(),
                  });
                }
                callback(timestamp);
              });
            }
            return originalRAF.call(window, callback);
          };
        }
        function setupFirstInteractionDetection() {
          var events = ["touchstart", "mousedown", "keydown"];
          function onFirstInteraction() {
            if (firstInteractionSent) return;
            firstInteractionSent = true;
            sendEvent("user_interaction_start", null);
            for (var i = 0; i < events.length; i++)
              document.removeEventListener(events[i], onFirstInteraction, true);
          }
          for (var i = 0; i < events.length; i++)
            document.addEventListener(events[i], onFirstInteraction, true);
        }
        if (document.readyState === "loading") {
          document.addEventListener(
            "DOMContentLoaded",
            setupFirstInteractionDetection,
          );
        } else {
          setupFirstInteractionDetection();
        }
        window.addEventListener("error", function (event) {
          if (errorSent) return;
          errorSent = true;
          sendEvent("error", {
            message: event.message || "Unknown error",
            source: event.filename || "",
            lineno: event.lineno || 0,
            colno: event.colno || 0,
            auto_captured: true,
          });
        });
        window.addEventListener("unhandledrejection", function (event) {
          if (errorSent) return;
          errorSent = true;
          var reason = event.reason;
          sendEvent("error", {
            message: reason instanceof Error ? reason.message : String(reason),
            type: "unhandled_promise_rejection",
            auto_captured: true,
          });
        });
        window.playablesSDK = {
          complete: function (score) {
            sendEvent("game_ended", { score: score, completed: true });
          },
          error: function (message) {
            if (errorSent) return;
            errorSent = true;
            sendEvent("error", {
              message: message || "Unknown error",
              auto_captured: false,
            });
          },
          sendEvent: function (eventName, payload) {
            if (!eventName || typeof eventName !== "string") return;
            sendEvent(eventName, payload);
          },
        };
        if (originalRAF) {
          originalRAF.call(window, onFrame);
        }
      })();

