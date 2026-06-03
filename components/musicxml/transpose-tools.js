(function () {
  "use strict";

  function normalizePitchClass(value) {
    return ((value % 12) + 12) % 12;
  }

  function pitchClassFromFifths(fifths) {
    return normalizePitchClass(fifths * 7);
  }

  function bestFifthsForPitchClass(pitchClass) {
    var best = 0;
    var bestAbs = Infinity;

    for (var f = -7; f <= 7; f += 1) {
      if (pitchClassFromFifths(f) !== pitchClass) {
        continue;
      }

      var abs = Math.abs(f);
      if (abs < bestAbs || (abs === bestAbs && f < best)) {
        best = f;
        bestAbs = abs;
      }
    }

    return best;
  }

  function mappingForPitchClass(pitchClass, preferFlats) {
    var PITCH_TO_STEP_ALTER_SHARP = [
      { step: "C", alter: 0 },
      { step: "C", alter: 1 },
      { step: "D", alter: 0 },
      { step: "D", alter: 1 },
      { step: "E", alter: 0 },
      { step: "F", alter: 0 },
      { step: "F", alter: 1 },
      { step: "G", alter: 0 },
      { step: "G", alter: 1 },
      { step: "A", alter: 0 },
      { step: "A", alter: 1 },
      { step: "B", alter: 0 }
    ];

    var PITCH_TO_STEP_ALTER_FLAT = [
      { step: "C", alter: 0 },
      { step: "D", alter: -1 },
      { step: "D", alter: 0 },
      { step: "E", alter: -1 },
      { step: "E", alter: 0 },
      { step: "F", alter: 0 },
      { step: "G", alter: -1 },
      { step: "G", alter: 0 },
      { step: "A", alter: -1 },
      { step: "A", alter: 0 },
      { step: "B", alter: -1 },
      { step: "B", alter: 0 }
    ];

    var mappingTable = preferFlats ? PITCH_TO_STEP_ALTER_FLAT : PITCH_TO_STEP_ALTER_SHARP;
    return mappingTable[pitchClass];
  }

  function setPitch(xmlDoc, pitchNode, octaveNode, mapped, nextOctave) {
    var alterNode = pitchNode.querySelector("alter");

    pitchNode.querySelector("step").textContent = mapped.step;
    octaveNode.textContent = String(nextOctave);

    if (mapped.alter === 0) {
      if (alterNode) {
        pitchNode.removeChild(alterNode);
      }
      return;
    }

    if (alterNode) {
      alterNode.textContent = String(mapped.alter);
      return;
    }

    var newAlter = xmlDoc.createElement("alter");
    newAlter.textContent = String(mapped.alter);
    if (octaveNode.parentNode === pitchNode) {
      pitchNode.insertBefore(newAlter, octaveNode);
    } else {
      pitchNode.appendChild(newAlter);
    }
  }

  function reviewEnharmonicSpellings(xmlDoc, STEP_TO_PITCH) {
    var reviewedCount = 0;
    var parts = Array.prototype.slice.call(xmlDoc.querySelectorAll("score-partwise > part"));

    parts.forEach(function (partNode) {
      var measures = Array.prototype.slice.call(partNode.querySelectorAll(":scope > measure"));
      var currentFifths = 0;

      measures.forEach(function (measureNode) {
        var fifthsNodeInMeasure = measureNode.querySelector(":scope > attributes > key > fifths");
        if (fifthsNodeInMeasure && fifthsNodeInMeasure.textContent) {
          var parsedFifths = Number.parseInt(fifthsNodeInMeasure.textContent, 10);
          if (!Number.isNaN(parsedFifths)) {
            currentFifths = parsedFifths;
          }
        }

        var preferFlatsFromKey = currentFifths < 0;
        var noteNodes = Array.prototype.slice.call(measureNode.querySelectorAll(":scope > note"));

        noteNodes.forEach(function (noteNode) {
          if (noteNode.querySelector("rest")) {
            return;
          }

          var pitchNode = noteNode.querySelector("pitch");
          if (!pitchNode) {
            return;
          }

          var stepNode = pitchNode.querySelector("step");
          var octaveNode = pitchNode.querySelector("octave");
          var alterNode = pitchNode.querySelector("alter");
          if (!stepNode || !octaveNode || !stepNode.textContent || !octaveNode.textContent) {
            return;
          }

          var step = stepNode.textContent.trim();
          if (!Object.prototype.hasOwnProperty.call(STEP_TO_PITCH, step)) {
            return;
          }

          var octave = Number.parseInt(octaveNode.textContent, 10);
          var alter = alterNode && alterNode.textContent ? Number.parseInt(alterNode.textContent, 10) : 0;
          if (Number.isNaN(octave)) {
            return;
          }
          if (Number.isNaN(alter)) {
            alter = 0;
          }

          var midi = (octave + 1) * 12 + STEP_TO_PITCH[step] + alter;
          var pitchClass = normalizePitchClass(midi);
          var mapped = mappingForPitchClass(pitchClass, preferFlatsFromKey);
          if (!mapped) {
            return;
          }

          var oldStep = step;
          var oldAlter = alter;
          setPitch(xmlDoc, pitchNode, octaveNode, mapped, octave);

          if (oldStep !== mapped.step || oldAlter !== mapped.alter) {
            reviewedCount += 1;
          }
        });
      });
    });

    return reviewedCount;
  }

  window.TransposeTools = {
    init: function (ctx) {
      function transposeEditorBySemitones(delta) {
        var xmlDoc;
        try {
          xmlDoc = ctx.parseEditorXmlDoc();
        } catch (error) {
          ctx.setStatus("Cannot transpose: " + error.message + ".");
          return;
        }

        var STEP_TO_PITCH = {
          C: 0,
          D: 2,
          E: 4,
          F: 5,
          G: 7,
          A: 9,
          B: 11
        };

        var transposedCount = 0;
        var partNodes = Array.prototype.slice.call(xmlDoc.querySelectorAll("score-partwise > part"));

        partNodes.forEach(function (partNode) {
          var measures = Array.prototype.slice.call(partNode.querySelectorAll(":scope > measure"));
          var currentFifths = 0;

          measures.forEach(function (measureNode) {
            var fifthsNodeInMeasure = measureNode.querySelector(":scope > attributes > key > fifths");
            if (fifthsNodeInMeasure && fifthsNodeInMeasure.textContent) {
              var parsedFifths = Number.parseInt(fifthsNodeInMeasure.textContent, 10);
              if (!Number.isNaN(parsedFifths)) {
                currentFifths = parsedFifths;
              }
            }

            var preferFlatsFromKey = currentFifths < 0;
            var noteNodes = Array.prototype.slice.call(measureNode.querySelectorAll(":scope > note"));

            noteNodes.forEach(function (noteNode) {
              if (noteNode.querySelector("rest")) {
                return;
              }

              var pitchNode = noteNode.querySelector("pitch");
              if (!pitchNode) {
                return;
              }

              var stepNode = pitchNode.querySelector("step");
              var octaveNode = pitchNode.querySelector("octave");
              var alterNode = pitchNode.querySelector("alter");
              if (!stepNode || !octaveNode || !stepNode.textContent || !octaveNode.textContent) {
                return;
              }

              var step = stepNode.textContent.trim();
              if (!Object.prototype.hasOwnProperty.call(STEP_TO_PITCH, step)) {
                return;
              }

              var octave = Number.parseInt(octaveNode.textContent, 10);
              var alter = alterNode && alterNode.textContent ? Number.parseInt(alterNode.textContent, 10) : 0;
              if (Number.isNaN(octave)) {
                return;
              }
              if (Number.isNaN(alter)) {
                alter = 0;
              }

              var midi = (octave + 1) * 12 + STEP_TO_PITCH[step] + alter;
              var nextMidi = Math.max(0, Math.min(127, midi + delta));
              var normalizedPitchClass = normalizePitchClass(nextMidi);
              var nextOctave = Math.floor(nextMidi / 12) - 1;
              var mapped = mappingForPitchClass(normalizedPitchClass, preferFlatsFromKey);
              if (!mapped) {
                return;
              }

              setPitch(xmlDoc, pitchNode, octaveNode, mapped, nextOctave);
              transposedCount += 1;
            });
          });
        });

        var keyNodes = Array.prototype.slice.call(xmlDoc.querySelectorAll("score-partwise part measure attributes key"));
        var transposedKeys = 0;

        keyNodes.forEach(function (keyNode) {
          var fifthsNode = keyNode.querySelector("fifths");
          if (!fifthsNode || !fifthsNode.textContent) {
            return;
          }

          var oldFifths = Number.parseInt(fifthsNode.textContent, 10);
          if (Number.isNaN(oldFifths)) {
            return;
          }

          var oldPitchClass = pitchClassFromFifths(oldFifths);
          var newPitchClass = normalizePitchClass(oldPitchClass + delta);
          var newFifths = bestFifthsForPitchClass(newPitchClass);

          if (newFifths !== oldFifths) {
            fifthsNode.textContent = String(newFifths);
            transposedKeys += 1;
          }
        });

        var enharmonicReviewedCount = reviewEnharmonicSpellings(xmlDoc, STEP_TO_PITCH);

        if (!transposedCount) {
          ctx.setStatus("No pitched notes found to transpose.");
          return;
        }

        var updatedXml = ctx.serializeXmlDoc(xmlDoc);
        ctx.setEditorContent(updatedXml);
        ctx.refreshNoteSelectors();
        ctx.renderScore("Editor Content", updatedXml);

        var directionLabel = delta > 0 ? "+" + delta : String(delta);
        ctx.setStatus("Transposed " + transposedCount + " notes by " + directionLabel + " semitone(s), updated " + transposedKeys + " key signature(s), reviewed " + enharmonicReviewedCount + " enharmonic note(s).");
      }

      return {
        transposeEditorBySemitones: transposeEditorBySemitones
      };
    }
  };
})();
