(function () {
  "use strict";

  window.EditorNoteTools = {
    init: function (ctx) {
      function setEditorContent(xmlString) {
        if (ctx.editorWindow && typeof ctx.editorWindow.setEditorContent === "function") {
          ctx.editorWindow.setEditorContent(xmlString);
          return;
        }
        if (ctx.xmlEditor) {
          ctx.xmlEditor.value = xmlString || "";
        }
      }

      function getEditorContent() {
        if (ctx.editorWindow && typeof ctx.editorWindow.getEditorContent === "function") {
          return ctx.editorWindow.getEditorContent();
        }
        if (!ctx.xmlEditor) {
          return "";
        }
        return ctx.xmlEditor.value.replace(/^\uFEFF/, "").trim();
      }

      function parseEditorXmlDoc() {
        if (ctx.editorWindow && typeof ctx.editorWindow.parseEditorXmlDoc === "function") {
          return ctx.editorWindow.parseEditorXmlDoc();
        }

        var xml = getEditorContent();
        if (!xml) {
          throw new Error("Editor is empty");
        }

        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(xml, "application/xml");
        var parserError = xmlDoc.querySelector("parsererror");
        if (parserError) {
          var parserMessage = parserError.textContent ? parserError.textContent.trim() : "";
          throw new Error(parserMessage || "Editor XML is not valid MusicXML");
        }

        if (!xmlDoc.querySelector("score-partwise")) {
          throw new Error("MusicXML must contain a score-partwise root element");
        }

        return xmlDoc;
      }

      function serializeXmlDoc(xmlDoc) {
        if (ctx.editorWindow && typeof ctx.editorWindow.serializeXmlDoc === "function") {
          return ctx.editorWindow.serializeXmlDoc(xmlDoc);
        }
        return new XMLSerializer().serializeToString(xmlDoc);
      }

      function getFirstPart(xmlDoc) {
        return xmlDoc.querySelector("score-partwise > part");
      }

      function getAllParts(xmlDoc) {
        return Array.prototype.slice.call(xmlDoc.querySelectorAll("score-partwise > part"));
      }

      function normalizeNoteName(step, alter, octave) {
        var accidental = "";
        if (alter === 1) {
          accidental = "#";
        } else if (alter === -1) {
          accidental = "b";
        } else if (alter > 1) {
          accidental = "##";
        } else if (alter < -1) {
          accidental = "bb";
        }
        return step + accidental + octave;
      }

      function getDivisionsValue(xmlDoc, measureEl) {
        var divisionsNode = null;

        if (measureEl) {
          divisionsNode = measureEl.querySelector("attributes > divisions");
        }
        if (!divisionsNode) {
          divisionsNode = xmlDoc.querySelector("part measure attributes divisions");
        }

        if (!divisionsNode || !divisionsNode.textContent) {
          return 1;
        }

        var parsed = Number.parseInt(divisionsNode.textContent, 10);
        return !Number.isNaN(parsed) && parsed > 0 ? parsed : 1;
      }

      function getDurationFromType(noteType, divisions) {
        var map = {
          whole: 4,
          half: 2,
          quarter: 1,
          eighth: 0.5,
          "16th": 0.25
        };
        var beats = map[noteType] || 1;
        return Math.max(1, Math.round(divisions * beats));
      }

      function getNoteLabel(noteEl, measureNumber, noteIndex) {
        var restNode = noteEl.querySelector("rest");
        var typeNode = noteEl.querySelector("type");
        var typeText = typeNode && typeNode.textContent ? typeNode.textContent : "unknown";
        var pitchText = "Rest";

        if (!restNode) {
          var stepNode = noteEl.querySelector("pitch > step");
          var alterNode = noteEl.querySelector("pitch > alter");
          var octaveNode = noteEl.querySelector("pitch > octave");
          if (stepNode && octaveNode && stepNode.textContent && octaveNode.textContent) {
            var alter = alterNode && alterNode.textContent ? Number.parseInt(alterNode.textContent, 10) : 0;
            if (Number.isNaN(alter)) {
              alter = 0;
            }
            pitchText = normalizeNoteName(stepNode.textContent, alter, octaveNode.textContent);
          }
        }

        return "M" + measureNumber + " N" + noteIndex + ": " + pitchText + " (" + typeText + ")";
      }

      function refreshNoteSelectorsFromEditor() {
        if (!ctx.measureSelect || !ctx.noteSelect) {
          return;
        }

        ctx.measureSelect.innerHTML = "";
        ctx.noteSelect.innerHTML = "";

        var xmlDoc;
        try {
          xmlDoc = parseEditorXmlDoc();
        } catch (_error) {
          var emptyMeasureOption = document.createElement("option");
          emptyMeasureOption.value = "";
          emptyMeasureOption.textContent = "No measures";
          ctx.measureSelect.appendChild(emptyMeasureOption);
          var emptyNoteOption = document.createElement("option");
          emptyNoteOption.value = "";
          emptyNoteOption.textContent = "No notes";
          ctx.noteSelect.appendChild(emptyNoteOption);
          return;
        }

        var part = getFirstPart(xmlDoc);
        if (!part) {
          return;
        }

        var measures = part.querySelectorAll("measure");
        measures.forEach(function (measure, measureIndex) {
          var numberAttr = measure.getAttribute("number");
          var displayNumber = numberAttr || String(measureIndex + 1);
          var measureOption = document.createElement("option");
          measureOption.value = String(measureIndex);
          measureOption.textContent = "Measure " + displayNumber;
          ctx.measureSelect.appendChild(measureOption);

          var notes = measure.querySelectorAll(":scope > note");
          notes.forEach(function (note, noteIndex) {
            var option = document.createElement("option");
            option.value = "0:" + measureIndex + ":" + noteIndex;
            option.textContent = "P1 " + getNoteLabel(note, displayNumber, noteIndex + 1);
            ctx.noteSelect.appendChild(option);
          });
        });

        var allParts = getAllParts(xmlDoc);
        allParts.forEach(function (currentPart, partIndex) {
          if (partIndex === 0) {
            return;
          }

          var partMeasures = currentPart.querySelectorAll("measure");
          partMeasures.forEach(function (measure, measureIndex) {
            var numberAttr = measure.getAttribute("number");
            var displayNumber = numberAttr || String(measureIndex + 1);
            var notes = measure.querySelectorAll(":scope > note");
            notes.forEach(function (note, noteIndex) {
              var option = document.createElement("option");
              option.value = partIndex + ":" + measureIndex + ":" + noteIndex;
              option.textContent = "P" + (partIndex + 1) + " " + getNoteLabel(note, displayNumber, noteIndex + 1);
              ctx.noteSelect.appendChild(option);
            });
          });
        });

        if (!ctx.noteSelect.options.length) {
          measures.forEach(function (measure, measureIndex) {
            var numberAttr = measure.getAttribute("number");
            var displayNumber = numberAttr || String(measureIndex + 1);
            var notes = measure.querySelectorAll(":scope > note");
            notes.forEach(function (note, noteIndex) {
              var option = document.createElement("option");
              option.value = "0:" + measureIndex + ":" + noteIndex;
              option.textContent = getNoteLabel(note, displayNumber, noteIndex + 1);
              ctx.noteSelect.appendChild(option);
            });
          });
        }

        if (!ctx.measureSelect.options.length) {
          var noMeasures = document.createElement("option");
          noMeasures.value = "";
          noMeasures.textContent = "No measures";
          ctx.measureSelect.appendChild(noMeasures);
        }

        if (!ctx.noteSelect.options.length) {
          var noNotes = document.createElement("option");
          noNotes.value = "";
          noNotes.textContent = "No notes";
          ctx.noteSelect.appendChild(noNotes);
        }
      }

      function addNoteToEditor() {
        var xmlDoc;
        try {
          xmlDoc = parseEditorXmlDoc();
        } catch (error) {
          ctx.setStatus("Cannot add note: " + error.message + ".");
          return;
        }

        var part = getFirstPart(xmlDoc);
        if (!part) {
          ctx.setStatus("Cannot add note: no part found in MusicXML.");
          return;
        }

        var measures = part.querySelectorAll("measure");
        if (!measures.length) {
          ctx.setStatus("Cannot add note: no measures found in MusicXML.");
          return;
        }

        var measureIndex = Number.parseInt(ctx.measureSelect.value, 10);
        if (Number.isNaN(measureIndex) || measureIndex < 0 || measureIndex >= measures.length) {
          measureIndex = 0;
        }

        var targetMeasure = measures[measureIndex];
        var step = ctx.noteStepSelect && ctx.noteStepSelect.value ? ctx.noteStepSelect.value : "C";
        var alter = ctx.noteAlterSelect ? Number.parseInt(ctx.noteAlterSelect.value, 10) : 0;
        if (Number.isNaN(alter)) {
          alter = 0;
        }

        var octave = ctx.noteOctaveInput ? Number.parseInt(ctx.noteOctaveInput.value, 10) : 4;
        if (Number.isNaN(octave)) {
          octave = 4;
        }
        octave = Math.max(0, Math.min(9, octave));
        if (ctx.noteOctaveInput) {
          ctx.noteOctaveInput.value = String(octave);
        }

        var noteType = ctx.noteTypeSelect && ctx.noteTypeSelect.value ? ctx.noteTypeSelect.value : "quarter";
        var divisions = getDivisionsValue(xmlDoc, targetMeasure);
        var duration = getDurationFromType(noteType, divisions);

        var noteEl = xmlDoc.createElement("note");
        var pitchEl = xmlDoc.createElement("pitch");
        var stepEl = xmlDoc.createElement("step");
        stepEl.textContent = step;
        pitchEl.appendChild(stepEl);

        if (alter !== 0) {
          var alterEl = xmlDoc.createElement("alter");
          alterEl.textContent = String(alter);
          pitchEl.appendChild(alterEl);
        }

        var octaveEl = xmlDoc.createElement("octave");
        octaveEl.textContent = String(octave);
        pitchEl.appendChild(octaveEl);
        noteEl.appendChild(pitchEl);

        var durationEl = xmlDoc.createElement("duration");
        durationEl.textContent = String(duration);
        noteEl.appendChild(durationEl);

        var typeEl = xmlDoc.createElement("type");
        typeEl.textContent = noteType;
        noteEl.appendChild(typeEl);

        targetMeasure.appendChild(noteEl);

        var updatedXml = serializeXmlDoc(xmlDoc);
        setEditorContent(updatedXml);
        refreshNoteSelectorsFromEditor();
        var scoreRenderer = ctx.getScoreRenderer ? ctx.getScoreRenderer() : null;
        if (scoreRenderer) {
          scoreRenderer.renderScore("Editor Content", updatedXml);
        }
        ctx.setStatus("Added note " + normalizeNoteName(step, alter, octave) + " to measure " + (measureIndex + 1) + ".");
      }

      return {
        setEditorContent: setEditorContent,
        getEditorContent: getEditorContent,
        parseEditorXmlDoc: parseEditorXmlDoc,
        serializeXmlDoc: serializeXmlDoc,
        getFirstPart: getFirstPart,
        getAllParts: getAllParts,
        refreshNoteSelectorsFromEditor: refreshNoteSelectorsFromEditor,
        addNoteToEditor: addNoteToEditor,
        normalizeNoteName: normalizeNoteName
      };
    }
  };
})();
