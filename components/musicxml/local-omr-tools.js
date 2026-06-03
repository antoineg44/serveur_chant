(function () {
  "use strict";

  function normalizeWindowsPath(path) {
    if (!path) {
      return "";
    }

    var trimmed = String(path).trim().replace(/^"+|"+$/g, "");
    return trimmed.replace(/\//g, "\\");
  }

  function quotePowerShell(value) {
    return "'" + String(value).replace(/'/g, "''") + "'";
  }

  function suggestOutputMusicXmlPath(pdfPath) {
    var normalized = normalizeWindowsPath(pdfPath);
    if (!normalized) {
      return "C:\\scores\\my-sheet.musicxml";
    }

    if (/\.pdf$/i.test(normalized)) {
      return normalized.replace(/\.pdf$/i, ".musicxml");
    }

    return normalized + ".musicxml";
  }

  function copyTextToClipboard(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      return navigator.clipboard.writeText(text);
    }

    return new Promise(function (resolve, reject) {
      try {
        var fallback = document.createElement("textarea");
        fallback.value = text;
        fallback.setAttribute("readonly", "readonly");
        fallback.style.position = "fixed";
        fallback.style.opacity = "0";
        document.body.appendChild(fallback);
        fallback.select();
        var copied = document.execCommand("copy");
        document.body.removeChild(fallback);
        if (copied) {
          resolve();
          return;
        }
      } catch (error) {
        reject(error);
        return;
      }
      reject(new Error("Clipboard API unavailable."));
    });
  }

  window.LocalOmrTools = {
    init: function (ctx) {
      function buildLocalOmrPowerShellCommand(pdfPath) {
        var normalizedPdfPath = normalizeWindowsPath(pdfPath);
        var finalPdfPath = normalizedPdfPath || "C:\\scores\\my-sheet.pdf";
        var outputPath = suggestOutputMusicXmlPath(finalPdfPath);

        return [
          "python .\\tools\\local-omr\\convert_pdf_to_musicxml.py " + quotePowerShell(finalPdfPath) + " -o " + quotePowerShell(outputPath),
          "# Alternative via npm: npm run omr:pdf -- " + quotePowerShell(finalPdfPath) + " -o " + quotePowerShell(outputPath)
        ].join("\r\n");
      }

      function refreshCommandPreview() {
        if (!ctx.omrCommandPreview) {
          return;
        }
        var pdfPath = ctx.omrPdfPathInput ? ctx.omrPdfPathInput.value : "";
        ctx.omrCommandPreview.value = buildLocalOmrPowerShellCommand(pdfPath);
      }

      function copyCommandFromPreview() {
        refreshCommandPreview();
        return copyTextToClipboard(ctx.omrCommandPreview ? ctx.omrCommandPreview.value : "")
          .then(function () {
            ctx.setStatus("Copied Windows OMR command to clipboard.");
          })
          .catch(function () {
            ctx.setStatus("Could not copy automatically. Copy from the command preview box.");
          });
      }

      return {
        buildLocalOmrPowerShellCommand: buildLocalOmrPowerShellCommand,
        refreshCommandPreview: refreshCommandPreview,
        copyCommandFromPreview: copyCommandFromPreview
      };
    }
  };
})();
