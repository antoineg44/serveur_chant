(function () {
  "use strict";

  function setStatus(message) {
    var status = document.getElementById("status");
    if (status) {
      status.textContent = message;
    }
  }

  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = url;
      script.async = false;
      script.onload = function () {
        resolve(url);
      };
      script.onerror = function () {
        reject(new Error("Failed to load " + url));
      };
      document.head.appendChild(script);
    });
  }

  function tryScriptCandidates(label, candidates) {
    var index = 0;

    function tryNext() {
      if (index >= candidates.length) {
        return Promise.reject(new Error(label + " unavailable"));
      }

      var candidate = candidates[index];
      index += 1;
      return loadScript(candidate).catch(tryNext);
    }

    return tryNext();
  }

  setStatus("Loading libraries...");

  var osmdCandidates = [
    "opensheetmusicdisplay.min.js",
    "https://unpkg.com/opensheetmusicdisplay@1.9.9/build/opensheetmusicdisplay.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/opensheetmusicdisplay/1.9.9/opensheetmusicdisplay.min.js",
    "https://cdn.jsdelivr.net/npm/opensheetmusicdisplay@1.9.9/build/opensheetmusicdisplay.min.js"
  ];

  var toneCandidates = [
    "Tone.js",
    "https://unpkg.com/tone@15.1.22/build/Tone.js",
    "https://cdnjs.cloudflare.com/ajax/libs/tone/15.1.22/Tone.js",
    "https://cdn.jsdelivr.net/npm/tone@15.1.22/build/Tone.js"
  ];

  tryScriptCandidates("OpenSheetMusicDisplay", osmdCandidates)
    .then(function () {
      return tryScriptCandidates("Tone.js", toneCandidates).catch(function () {
        setStatus("Tone.js unavailable. Continuing without audio playback.");
      });
    })
    .then(function () {
      return loadScript("highlight-note.js");
    })
    .then(function () {
      return loadScript("delete-note.js");
    })
    .then(function () {
      return loadScript("playback-controller.js");
    })
    .then(function () {
      return loadScript("render-score.js");
    })
    .then(function () {
      return loadScript("debug-tools.js");
    })
    .then(function () {
      return loadScript("editor-window.js");
    })
    .then(function () {
      return loadScript("editor-note-tools.js");
    })
    .then(function () {
      return loadScript("note-annotation-tools.js");
    })
    .then(function () {
      return loadScript("instrument-visibility-tools.js");
    })
    .then(function () {
      return loadScript("local-omr-tools.js");
    })
    .then(function () {
      return loadScript("tabs-window.js");
    })
    .then(function () {
      return loadScript("download-tools.js");
    })
    .then(function () {
      return loadScript("transpose-tools.js");
    })
    .then(function () {
      return loadScript("app.js");
    })
    .catch(function () {
      setStatus("OpenSheetMusicDisplay could not be loaded. Ensure opensheetmusicdisplay.min.js is in the same folder as index.html.");
    });
})();
