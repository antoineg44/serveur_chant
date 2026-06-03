(function () {
  "use strict";

  window.NoteAnnotationTools = {
    init: function (ctx) {
      var lastRenderedEntries = [];
      var selectedClickToken = "";

      function debugLog(message) {
        if (typeof ctx.debugLog === "function") {
          ctx.debugLog(message);
        }
      }

      var noteHighlighter = window.NoteHighlighter
        ? window.NoteHighlighter.attach(ctx.container, ctx.osmd, {
          onSelect: function (staveNote, clickedNotehead) {
            selectedClickToken = "";
            if (!staveNote || !ctx.container) {
              debugLog("Click: no staveNote found");
              return;
            }

            var allStaveNotes = ctx.container.querySelectorAll("g.vf-stavenote");
            var staveIndex = -1;
            for (var i = 0; i < allStaveNotes.length; i += 1) {
              if (allStaveNotes[i] === staveNote) {
                staveIndex = i;
                break;
              }
            }

            debugLog("Click: staveNote DOM index=" + staveIndex + " of " + allStaveNotes.length + ", entries=" + lastRenderedEntries.length);

            if (staveIndex < 0 || staveIndex >= lastRenderedEntries.length) {
              debugLog("Click: staveNote index out of range");
              return;
            }

            var entry = lastRenderedEntries[staveIndex];
            if (!entry || entry.isRest || !entry.baseToken) {
              debugLog("Click: entry is rest or has no token");
              return;
            }

            var resolvedToken = entry.baseToken;

            if (clickedNotehead && entry.chordTokens.length > 1) {
              var noteheadsInStave = Array.prototype.slice.call(staveNote.querySelectorAll("g.vf-notehead"));
              if (noteheadsInStave.length > 1) {
                noteheadsInStave.sort(function (a, b) {
                  try { return a.getBBox().y - b.getBBox().y; } catch (_error) { return 0; }
                });
                var noteheadIndex = noteheadsInStave.indexOf(clickedNotehead);
                if (noteheadIndex >= 0) {
                  var chordSorted = entry.chordTokens.map(function (token, idx) {
                    return { token: token, midi: entry.chordMidis[idx] };
                  }).sort(function (a, b) {
                    if (a.midi === null || b.midi === null) { return 0; }
                    return b.midi - a.midi;
                  });
                  if (noteheadIndex < chordSorted.length) {
                    resolvedToken = chordSorted[noteheadIndex].token;
                  }
                }
              }
            }

            selectedClickToken = resolvedToken;
            debugLog("Click resolved token=" + resolvedToken);

            if (ctx.noteSelect) {
              var matchingOption = ctx.noteSelect.querySelector("option[value='" + resolvedToken + "']");
              if (matchingOption) {
                ctx.noteSelect.value = resolvedToken;
              }
            }
          }
        })
        : null;

      function getAllParts(xmlDoc) {
        return Array.prototype.slice.call(xmlDoc.querySelectorAll("score-partwise > part"));
      }

      function annotateRenderedNotes(xmlString) {
        lastRenderedEntries = [];
        selectedClickToken = "";
        if (!xmlString) {
          return;
        }

        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(xmlString, "application/xml");
        if (xmlDoc.querySelector("parsererror")) {
          return;
        }

        var parts = getAllParts(xmlDoc);
        if (!parts.length) {
          return;
        }

        var partMeasures = parts.map(function (part) {
          return Array.prototype.slice.call(part.querySelectorAll("measure"));
        });
        var maxMeasures = partMeasures.reduce(function (m, arr) { return Math.max(m, arr.length); }, 0);

        var STEP_MAP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

        function calcMidi(note) {
          var stepNode = note.querySelector("pitch > step");
          var octaveNode = note.querySelector("pitch > octave");
          var alterNode = note.querySelector("pitch > alter");
          if (!stepNode || !octaveNode || !stepNode.textContent || !octaveNode.textContent) { return null; }
          var oct = Number.parseInt(octaveNode.textContent, 10);
          var alt = alterNode && alterNode.textContent ? Number.parseInt(alterNode.textContent, 10) : 0;
          if (Number.isNaN(alt)) { alt = 0; }
          if (Number.isNaN(oct)) { return null; }
          return (oct + 1) * 12 + (STEP_MAP[stepNode.textContent] || 0) + alt;
        }

        var renderedEntries = [];

        for (var measureIndex = 0; measureIndex < maxMeasures; measureIndex += 1) {
          parts.forEach(function (_part, partIndex) {
            var measure = partMeasures[partIndex][measureIndex];
            if (!measure) { return; }

            if (ctx.osmd && ctx.osmd.Sheet && ctx.osmd.Sheet.Instruments) {
              var osmdInstrument = ctx.osmd.Sheet.Instruments[partIndex];
              if (osmdInstrument && !osmdInstrument.Visible) {
                return;
              }
            }

            var currentEntry = null;
            var notes = measure.querySelectorAll(":scope > note");
            notes.forEach(function (note, noteIndex) {
              var isChordContinuation = !!note.querySelector("chord");
              var token = partIndex + ":" + measureIndex + ":" + noteIndex;
              var isRest = !!note.querySelector("rest");

              if (isChordContinuation) {
                if (currentEntry && !currentEntry.isRest) {
                  currentEntry.chordTokens.push(token);
                  currentEntry.chordMidis.push(calcMidi(note));
                }
                return;
              }

              if (isRest) {
                currentEntry = { isRest: true, baseToken: "", chordTokens: [], chordMidis: [] };
                renderedEntries.push(currentEntry);
                return;
              }

              currentEntry = { isRest: false, baseToken: token, chordTokens: [token], chordMidis: [calcMidi(note)] };
              renderedEntries.push(currentEntry);
            });
          });
        }

        lastRenderedEntries = renderedEntries;
        var staveCount = ctx.container ? ctx.container.querySelectorAll("g.vf-stavenote").length : 0;
        debugLog("Built rendered entries: xmlEntries=" + renderedEntries.length + ", staveNotes=" + staveCount);
      }

      function clearSelection() {
        selectedClickToken = "";
        if (noteHighlighter && typeof noteHighlighter.clear === "function") {
          noteHighlighter.clear();
        }
      }

      return {
        getNoteHighlighter: function () { return noteHighlighter; },
        getRenderedEntries: function () { return lastRenderedEntries; },
        getSelectedToken: function () { return selectedClickToken; },
        annotateRenderedNotes: annotateRenderedNotes,
        clearSelection: clearSelection
      };
    }
  };
})();
