(function () {
  "use strict";

  var EMBEDDED_SAMPLES = {
    "HelloWorld.xml": "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n<!DOCTYPE score-partwise PUBLIC\n    \"-//Recordare//DTD MusicXML 3.0 Partwise//EN\"\n    \"http://www.musicxml.org/dtds/partwise.dtd\">\n<score-partwise version=\"3.0\">\n  <part-list>\n    <score-part id=\"P1\">\n      <part-name>Music</part-name>\n    </score-part>\n  </part-list>\n  <part id=\"P1\">\n    <measure number=\"1\">\n      <attributes>\n        <divisions>1</divisions>\n        <key>\n          <fifths>0</fifths>\n        </key>\n        <time>\n          <beats>4</beats>\n          <beat-type>4</beat-type>\n        </time>\n        <clef>\n          <sign>G</sign>\n          <line>2</line>\n        </clef>\n      </attributes>\n      <note>\n        <pitch>\n          <step>C</step>\n          <octave>4</octave>\n        </pitch>\n        <duration>4</duration>\n        <type>whole</type>\n      </note>\n    </measure>\n  </part>\n</score-partwise>"
  };
  var STATIC_XML_SAMPLES = ["SchbAvMaSample.musicxml"];
  var DEFAULT_SAMPLE = "SchbAvMaSample.musicxml";

  var sampleSelect = document.getElementById("sampleSelect");
  var renderBtn = document.getElementById("renderBtn");
  var fileInput = document.getElementById("fileInput");
  var renderFileBtn = document.getElementById("renderFileBtn");
  var downloadMusicXmlBtn = document.getElementById("downloadMusicXmlBtn");
  var downloadMusicXmlPdfBtn = document.getElementById("downloadMusicXmlPdfBtn");
  var omrPdfPathInput = document.getElementById("omrPdfPathInput");
  var copyOmrCommandBtn = document.getElementById("copyOmrCommandBtn");
  var omrCommandPreview = document.getElementById("omrCommandPreview");
  var xmlEditor = document.getElementById("xmlEditor");
  var renderEditorBtn = document.getElementById("renderEditorBtn");
  var syncEditorBtn = document.getElementById("syncEditorBtn");
  var transposeDownBtn = document.getElementById("transposeDownBtn");
  var transposeUpBtn = document.getElementById("transposeUpBtn");
  var measureSelect = document.getElementById("measureSelect");
  var noteStepSelect = document.getElementById("noteStepSelect");
  var noteAlterSelect = document.getElementById("noteAlterSelect");
  var noteOctaveInput = document.getElementById("noteOctaveInput");
  var noteTypeSelect = document.getElementById("noteTypeSelect");
  var addNoteBtn = document.getElementById("addNoteBtn");
  var noteSelect = document.getElementById("noteSelect");
  var deleteNoteBtn = document.getElementById("deleteNoteBtn");
  var refreshNotesBtn = document.getElementById("refreshNotesBtn");
  var enableAudioBtn = document.getElementById("enableAudioBtn");
  var playBtn = document.getElementById("playBtn");
  var stopBtn = document.getElementById("stopBtn");
  var speedSlider = document.getElementById("speedSlider");
  var speedValue = document.getElementById("speedValue");
  var mixerContainer = document.getElementById("mixerContainer");
  var instrumentVisibilityContainer = document.getElementById("instrumentVisibilityContainer");
  var zoomOutBtn = document.getElementById("zoomOutBtn");
  var zoomInBtn = document.getElementById("zoomInBtn");
  var status = document.getElementById("status");
  var debugLogEl = document.getElementById("debugLog");
  var clearDebugBtn = document.getElementById("clearDebugBtn");
  var container = document.getElementById("osmdContainer");

  function getSourceFromQuery() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      var source = (params.get("source") || params.get("url") || params.get("file") || "").trim();
      return source;
    } catch (error) {
      return "";
    }
  }

  var scoreRenderer = null;
  var currentZoom = 1;
  var ZOOM_STEP = 0.1;
  var MIN_ZOOM = 0.4;
  var MAX_ZOOM = 2.2;

  var debugTools = window.DebugTools
    ? window.DebugTools.init({
      debugLogEl: debugLogEl,
      clearDebugBtn: clearDebugBtn
    })
    : null;

  var editorWindow = window.EditorWindow
    ? window.EditorWindow.init({
      xmlEditor: xmlEditor
    })
    : null;

  function debugLog(message) {
    if (debugTools && typeof debugTools.debugLog === "function") {
      debugTools.debugLog(message);
      return;
    }
    console.log("[OSMD DEBUG] " + String(message));
  }

  function setStatus(message) {
    status.textContent = message;
    debugLog("STATUS: " + message);
  }

  function setSheetOpenState(isOpen) {
    document.body.classList.toggle("sheet-open", !!isOpen);
  }

  function shouldIgnoreGlobalKeydown(event) {
    if (!event || !event.target) {
      return false;
    }

    var target = event.target;
    if (target.isContentEditable) {
      return true;
    }

    var tagName = target.tagName ? target.tagName.toUpperCase() : "";
    return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT" || tagName === "BUTTON";
  }

  function applyZoom(osmd) {
    return function (newZoom) {
      var clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
      currentZoom = Math.round(clamped * 100) / 100;
      osmd.Zoom = currentZoom;

      if (scoreRenderer && scoreRenderer.getCurrentRenderableName()) {
        osmd.render();
      }

      setStatus("Zoom: " + Math.round(currentZoom * 100) + "%.");
    };
  }

  function populateSamples() {
    STATIC_XML_SAMPLES.forEach(function (sampleName) {
      var option = document.createElement("option");
      option.value = sampleName;
      option.textContent = sampleName;
      sampleSelect.appendChild(option);
    });

    Object.keys(EMBEDDED_SAMPLES).forEach(function (sampleName) {
      var option = document.createElement("option");
      option.value = sampleName;
      option.textContent = sampleName;
      sampleSelect.appendChild(option);
    });
  }

  if (!window.opensheetmusicdisplay || !window.opensheetmusicdisplay.OpenSheetMusicDisplay) {
    setStatus("OSMD library not loaded. Check your network or CDN access.");
    return;
  }

  if (!window.Tone) {
    setStatus("Tone.js not loaded. Playback controls are unavailable.");
  }

  var osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(container, {
    backend: "svg",
    drawTitle: true,
    followCursor: false
  });

  var editorNoteTools = window.EditorNoteTools
    ? window.EditorNoteTools.init({
      xmlEditor: xmlEditor,
      editorWindow: editorWindow,
      measureSelect: measureSelect,
      noteSelect: noteSelect,
      noteStepSelect: noteStepSelect,
      noteAlterSelect: noteAlterSelect,
      noteOctaveInput: noteOctaveInput,
      noteTypeSelect: noteTypeSelect,
      setStatus: setStatus,
      getScoreRenderer: function () { return scoreRenderer; }
    })
    : null;

  var noteAnnotationTools = window.NoteAnnotationTools
    ? window.NoteAnnotationTools.init({
      container: container,
      osmd: osmd,
      noteSelect: noteSelect,
      debugLog: debugLog
    })
    : null;

  var instrumentVisibilityTools = window.InstrumentVisibilityTools
    ? window.InstrumentVisibilityTools.init({
      osmd: osmd,
      instrumentVisibilityContainer: instrumentVisibilityContainer,
      setStatus: setStatus,
      onVisibilityChanged: function () {
        if (noteAnnotationTools && scoreRenderer) {
          noteAnnotationTools.annotateRenderedNotes(scoreRenderer.getCurrentPlaybackXml());
        }
      }
    })
    : null;

  var localOmrTools = window.LocalOmrTools
    ? window.LocalOmrTools.init({
      omrPdfPathInput: omrPdfPathInput,
      omrCommandPreview: omrCommandPreview,
      setStatus: setStatus
    })
    : null;

  var noteHighlighter = noteAnnotationTools ? noteAnnotationTools.getNoteHighlighter() : null;

  var downloadTools = window.DownloadTools
    ? window.DownloadTools.init({
      sampleSelect: sampleSelect,
      osmd: osmd,
      container: container,
      setStatus: setStatus,
      getEditorContent: function () { return editorNoteTools ? editorNoteTools.getEditorContent() : ""; },
      getScoreRenderer: function () { return scoreRenderer; }
    })
    : null;

  var transposeTools = window.TransposeTools
    ? window.TransposeTools.init({
      parseEditorXmlDoc: function () { return editorNoteTools.parseEditorXmlDoc(); },
      serializeXmlDoc: function (xmlDoc) { return editorNoteTools.serializeXmlDoc(xmlDoc); },
      setEditorContent: function (xml) { editorNoteTools.setEditorContent(xml); },
      refreshNoteSelectors: function () { editorNoteTools.refreshNoteSelectorsFromEditor(); },
      renderScore: function (label, xml) {
        if (scoreRenderer) {
          scoreRenderer.renderScore(label, xml);
        }
      },
      setStatus: setStatus
    })
    : null;

  var noteDeleter = window.NoteDeleter
    ? window.NoteDeleter.init({
      getSelectedToken: function () {
        var selected = noteAnnotationTools ? noteAnnotationTools.getSelectedToken() : "";
        return selected || (noteSelect && noteSelect.value ? noteSelect.value : "");
      },
      parseEditorXmlDoc: function () { return editorNoteTools.parseEditorXmlDoc(); },
      serializeXmlDoc: function (xmlDoc) { return editorNoteTools.serializeXmlDoc(xmlDoc); },
      getAllParts: function (xmlDoc) { return editorNoteTools.getAllParts(xmlDoc); },
      noteHighlighter: noteHighlighter,
      setEditorContent: function (xml) { editorNoteTools.setEditorContent(xml); },
      refreshNoteSelectors: function () { editorNoteTools.refreshNoteSelectorsFromEditor(); },
      renderScore: function (label, xml) { if (scoreRenderer) { scoreRenderer.renderScore(label, xml); } },
      setStatus: setStatus,
      debugLog: debugLog
    })
    : null;

  var playbackController = window.PlaybackController
    ? window.PlaybackController.init({
      osmd: osmd,
      playBtn: playBtn,
      stopBtn: stopBtn,
      enableAudioBtn: enableAudioBtn,
      speedSlider: speedSlider,
      speedValueEl: speedValue,
      mixerContainer: mixerContainer,
      setStatus: setStatus,
      debugLog: debugLog,
      getCurrentPlaybackXml: function () {
        return scoreRenderer ? scoreRenderer.getCurrentPlaybackXml() : "";
      },
      getCurrentRenderableName: function () {
        return scoreRenderer ? scoreRenderer.getCurrentRenderableName() : "";
      },
      getVisiblePlaybackChannelIds: function () {
        return instrumentVisibilityTools ? instrumentVisibilityTools.getVisiblePlaybackChannelIds() : [];
      },
      getRenderedEntries: function () {
        return noteAnnotationTools ? noteAnnotationTools.getRenderedEntries() : [];
      }
    })
    : null;

  scoreRenderer = window.ScoreRenderer
    ? window.ScoreRenderer.init({
      osmd: osmd,
      embeddedSamples: EMBEDDED_SAMPLES,
      sampleSelect: sampleSelect,
      fileInput: fileInput,
      getNoteHighlighter: function () { return noteHighlighter; },
      parseEditorXmlDoc: function () { return editorNoteTools.parseEditorXmlDoc(); },
      serializeXmlDoc: function (xmlDoc) { return editorNoteTools.serializeXmlDoc(xmlDoc); },
      setEditorContent: function (xml) { editorNoteTools.setEditorContent(xml); },
      refreshNoteSelectors: function () { editorNoteTools.refreshNoteSelectorsFromEditor(); },
      setStatus: setStatus,
      debugLog: debugLog,
      stopPlayback: function () {
        if (playbackController) {
          playbackController.stopPlayback();
        }
      },
      setPlayAvailability: function (enabled) {
        if (playbackController) {
          playbackController.setPlayAvailability(enabled);
        }
      },
      beforeRender: function () {
        if (instrumentVisibilityTools) {
          instrumentVisibilityTools.applyToSheet();
        }
      },
      onAfterRender: function (xml) {
        if (noteAnnotationTools) {
          noteAnnotationTools.annotateRenderedNotes(xml);
        }
        if (instrumentVisibilityTools) {
          instrumentVisibilityTools.rebuildUi();
        }
        setSheetOpenState(!!xml);
      }
    })
    : null;

  populateSamples();
  var querySource = getSourceFromQuery();
  if (querySource) {
    var queryOption = document.createElement("option");
    queryOption.value = querySource;
    queryOption.textContent = "Remote MusicXML";
    sampleSelect.appendChild(queryOption);
    sampleSelect.value = querySource;
  }

  if (sampleSelect && sampleSelect.querySelector("option[value='" + DEFAULT_SAMPLE + "']")) {
    if (!querySource) {
      sampleSelect.value = DEFAULT_SAMPLE;
    }
  }

  if (editorNoteTools) {
    editorNoteTools.refreshNoteSelectorsFromEditor();
  }

  var applyZoomFn = applyZoom(osmd);

  renderBtn.addEventListener("click", function () { if (scoreRenderer) { scoreRenderer.renderSelection(); } });
  renderFileBtn.addEventListener("click", function () { if (scoreRenderer) { scoreRenderer.renderLocalFile(); } });

  if (localOmrTools) {
    localOmrTools.refreshCommandPreview();
    if (omrPdfPathInput) {
      omrPdfPathInput.addEventListener("input", localOmrTools.refreshCommandPreview);
    }
    if (copyOmrCommandBtn) {
      copyOmrCommandBtn.addEventListener("click", function () {
        localOmrTools.copyCommandFromPreview();
      });
    }
  }

  downloadMusicXmlBtn.addEventListener("click", function () {
    if (downloadTools) {
      downloadTools.downloadModifiedMusicXml();
    }
  });

  downloadMusicXmlPdfBtn.addEventListener("click", function () {
    if (downloadTools) {
      downloadTools.downloadModifiedMusicXmlPdf();
    }
  });

  renderEditorBtn.addEventListener("click", function () { if (scoreRenderer) { scoreRenderer.renderEditorContent(); } });
  syncEditorBtn.addEventListener("click", function () { if (scoreRenderer) { scoreRenderer.syncEditorWithCurrentScore(); } });

  transposeDownBtn.addEventListener("click", function () {
    if (transposeTools) {
      transposeTools.transposeEditorBySemitones(-1);
    }
  });

  transposeUpBtn.addEventListener("click", function () {
    if (transposeTools) {
      transposeTools.transposeEditorBySemitones(1);
    }
  });

  addNoteBtn.addEventListener("click", function () {
    if (editorNoteTools) {
      editorNoteTools.addNoteToEditor();
    }
  });

  deleteNoteBtn.addEventListener("click", function () {
    if (noteDeleter) {
      noteDeleter.deleteSelected();
    }
  });

  refreshNotesBtn.addEventListener("click", function () {
    if (editorNoteTools) {
      editorNoteTools.refreshNoteSelectorsFromEditor();
    }
  });

  enableAudioBtn.addEventListener("click", function () {
    if (playbackController) {
      playbackController.enableAudio();
    }
  });

  playBtn.addEventListener("click", function () {
    if (playbackController) {
      playbackController.playCurrentScore();
    }
  });

  stopBtn.addEventListener("click", function () {
    if (playbackController) {
      playbackController.stopPlayback();
    }
  });

  zoomOutBtn.addEventListener("click", function () {
    applyZoomFn(currentZoom - ZOOM_STEP);
  });

  zoomInBtn.addEventListener("click", function () {
    applyZoomFn(currentZoom + ZOOM_STEP);
  });

  window.addEventListener("keydown", function (event) {
    if (event.repeat) {
      return;
    }

    var isSpace = event.code === "Space" || event.key === " " || event.key === "Spacebar";
    if (!isSpace || shouldIgnoreGlobalKeydown(event)) {
      return;
    }

    event.preventDefault();

    if (!stopBtn.disabled) {
      stopBtn.click();
      return;
    }

    if (!playBtn.disabled) {
      playBtn.click();
    }
  });

  if (debugTools && typeof debugTools.bindClearButton === "function") {
    debugTools.bindClearButton();
  }

  debugLog("Debug logging initialized");

  if (playbackController) {
    playbackController.enableAudio();
  }

  if (scoreRenderer) {
    scoreRenderer.renderSelection();
  }
})();
