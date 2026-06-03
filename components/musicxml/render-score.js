(function () {
  "use strict";

  // ScoreRenderer.init(ctx) — returns the rendering API.
  //
  // ctx must provide:
  //   osmd                   - OpenSheetMusicDisplay instance
  //   embeddedSamples        - { name: xmlString } map of built-in samples
  //   sampleSelect           - <select> DOM element
  //   fileInput              - <input type="file"> DOM element
  //   getNoteHighlighter()   - getter returning current noteHighlighter (or null)
  //   parseEditorXmlDoc()    - parses editor XML, returns XMLDocument (throws on error)
  //   serializeXmlDoc(doc)   - serializes XMLDocument to string
  //   setEditorContent(xml)  - sets the editor textarea content
  //   refreshNoteSelectors() - rebuilds measure/note dropdowns from editor XML
  //   setStatus(msg)         - updates the status bar
  //   debugLog(msg)          - appends a line to the debug console
  //   stopPlayback()         - stops audio playback
  //   setPlayAvailability(b) - enables/disables play button
  //   beforeRender()         - optional callback run after load() and before render()
  //   onAfterRender(xml)     - called after render; xml="" means cleared/failed

  window.ScoreRenderer = {
    init: function (ctx) {
      var renderRequestId = 0;
      var currentPlaybackXml = "";
      var lastRenderedXml = "";
      var currentRenderableName = "";

      function renderScore(label, scoreContent) {
        renderRequestId += 1;
        var requestId = renderRequestId;

        ctx.stopPlayback();
        var nh = ctx.getNoteHighlighter();
        if (nh && typeof nh.clear === "function") {
          nh.clear();
        }
        ctx.setStatus("Loading " + label + "...");

        ctx.osmd.load(scoreContent)
          .then(function () {
            if (requestId !== renderRequestId) {
              return;
            }

            if (typeof ctx.beforeRender === "function") {
              ctx.beforeRender();
            }

            ctx.osmd.render();
            currentRenderableName = label;

            if (typeof scoreContent === "string") {
              currentPlaybackXml = scoreContent.replace(/^\uFEFF/, "");
              lastRenderedXml = currentPlaybackXml;
              ctx.setEditorContent(currentPlaybackXml);
              ctx.refreshNoteSelectors();
              ctx.onAfterRender(currentPlaybackXml);
              ctx.setPlayAvailability(true);
            } else {
              currentPlaybackXml = "";
              lastRenderedXml = "";
              ctx.onAfterRender("");
              ctx.refreshNoteSelectors();
              ctx.setPlayAvailability(false);
            }

            ctx.setStatus("Rendered " + label + ".");
          })
          .catch(function (error) {
            if (requestId !== renderRequestId) {
              return;
            }
            console.error(error);
            currentPlaybackXml = "";
            currentRenderableName = "";
            ctx.onAfterRender("");
            ctx.setPlayAvailability(false);
            ctx.setStatus("Failed to load " + label + ". Check console details.");
          });
      }

      function renderSelection() {
        var selected = ctx.sampleSelect.value;
        if (!selected) {
          ctx.setStatus("No sample selected.");
          return;
        }

        var sample = ctx.embeddedSamples[selected];
        if (sample) {
          renderScore(selected, sample);
          return;
        }

        ctx.setStatus("Loading sample " + selected + "...");
        fetch(selected, { credentials: "include" })
          .then(function (response) {
            if (!response.ok) {
              throw new Error("HTTP " + response.status);
            }
            return response.text();
          })
          .then(function (xmlText) {
            renderScore(selected, xmlText);
          })
          .catch(function (error) {
            console.error(error);
            ctx.setStatus("Selected sample is not available.");
          });
      }

      function renderLocalFile() {
        if (!ctx.fileInput.files || ctx.fileInput.files.length === 0) {
          ctx.setStatus("Choose a local MusicXML or MXL file first.");
          return;
        }

        var file = ctx.fileInput.files[0];
        var fileName = file.name || "";
        var lowerName = fileName.toLowerCase();
        var isCompressedMxl = lowerName.endsWith(".mxl");
        var isXmlLike = lowerName.endsWith(".xml") || lowerName.endsWith(".musicxml");

        if (!isCompressedMxl && !isXmlLike) {
          ctx.setStatus("Unsupported file type. Use .xml, .musicxml, or .mxl.");
          return;
        }

        var reader = new FileReader();
        ctx.setStatus("Reading local file " + file.name + "...");

        reader.onload = function () {
          var content = reader.result;
          if (typeof content === "string") {
            content = content.replace(/^\uFEFF/, "");
          }
          renderScore(file.name, content);
        };

        reader.onerror = function () {
          ctx.setStatus("Failed to read local file " + file.name + ".");
        };

        if (isCompressedMxl) {
          reader.readAsArrayBuffer(file);
          return;
        }
        reader.readAsText(file, "utf-8");
      }

      function renderEditorContent() {
        var xmlDoc;
        try {
          xmlDoc = ctx.parseEditorXmlDoc();
        } catch (error) {
          ctx.setStatus("Cannot render editor content: " + error.message + ".");
          return;
        }
        var serializedXml = ctx.serializeXmlDoc(xmlDoc);
        ctx.setEditorContent(serializedXml);
        ctx.refreshNoteSelectors();
        renderScore("Editor Content", serializedXml);
      }

      function syncEditorWithCurrentScore() {
        if (!lastRenderedXml) {
          ctx.setStatus("No XML score in memory yet. Render a sample or XML file first.");
          return;
        }
        ctx.setEditorContent(lastRenderedXml);
        ctx.refreshNoteSelectors();
        ctx.setStatus("Editor updated from the current rendered score.");
      }

      return {
        renderScore: renderScore,
        renderSelection: renderSelection,
        renderLocalFile: renderLocalFile,
        renderEditorContent: renderEditorContent,
        syncEditorWithCurrentScore: syncEditorWithCurrentScore,
        getCurrentPlaybackXml: function () { return currentPlaybackXml; },
        getLastRenderedXml: function () { return lastRenderedXml; },
        getCurrentRenderableName: function () { return currentRenderableName; }
      };
    }
  };
})();
