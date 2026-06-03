(function () {
  "use strict";

  window.DebugTools = {
    init: function (ctx) {
      var debugLines = [];

      function debugLog(message) {
        var line = "[" + new Date().toLocaleTimeString() + "] " + String(message);
        debugLines.push(line);
        if (debugLines.length > 120) {
          debugLines.splice(0, debugLines.length - 120);
        }

        if (ctx.debugLogEl) {
          ctx.debugLogEl.textContent = debugLines.join("\n");
          ctx.debugLogEl.scrollTop = ctx.debugLogEl.scrollHeight;
        }

        console.log("[OSMD DEBUG] " + line);
      }

      function clearDebugLog() {
        debugLines = [];
        if (ctx.debugLogEl) {
          ctx.debugLogEl.textContent = "";
        }
      }

      function bindClearButton() {
        if (ctx.clearDebugBtn) {
          ctx.clearDebugBtn.addEventListener("click", clearDebugLog);
        }
      }

      return {
        debugLog: debugLog,
        clearDebugLog: clearDebugLog,
        bindClearButton: bindClearButton
      };
    }
  };
})();
