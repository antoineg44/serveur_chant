(function () {
  "use strict";

  // NoteDeleter.init(ctx) — returns { deleteSelected }
  //
  // ctx must provide:
  //   getSelectedToken()      -> string  (current click/dropdown token)
  //   parseEditorXmlDoc()     -> XMLDocument  (throws on invalid XML)
  //   serializeXmlDoc(xmlDoc) -> string
  //   getAllParts(xmlDoc)      -> Element[]
  //   noteHighlighter         -> { clear() } | null
  //   setEditorContent(xml)
  //   refreshNoteSelectors()
  //   renderScore(label, xml)
  //   setStatus(message)
  //   debugLog(message)

  window.NoteDeleter = {
    init: function (ctx) {
      return {
        deleteSelected: function () {
          var xmlDoc;
          try {
            xmlDoc = ctx.parseEditorXmlDoc();
          } catch (error) {
            ctx.setStatus("Cannot delete note: " + error.message + ".");
            return;
          }

          var selectedToken = ctx.getSelectedToken();
          ctx.debugLog("Delete clicked: token=" + (selectedToken || "<empty>"));

          if (!selectedToken) {
            ctx.setStatus("No note selected to delete.");
            return;
          }

          var tokens = selectedToken.split(":");
          if (tokens.length !== 2 && tokens.length !== 3) {
            ctx.setStatus("Invalid note selection.");
            return;
          }

          var partIndex = 0;
          var measureIndex;
          var noteIndex;

          if (tokens.length === 3) {
            partIndex = Number.parseInt(tokens[0], 10);
            measureIndex = Number.parseInt(tokens[1], 10);
            noteIndex = Number.parseInt(tokens[2], 10);
          } else {
            measureIndex = Number.parseInt(tokens[0], 10);
            noteIndex = Number.parseInt(tokens[1], 10);
          }

          if (Number.isNaN(partIndex) || Number.isNaN(measureIndex) || Number.isNaN(noteIndex)) {
            ctx.debugLog("Token parse failed: token=" + selectedToken);
            ctx.setStatus("Invalid note selection.");
            return;
          }

          ctx.debugLog("Delete target: part=" + (partIndex + 1) + " (idx=" + partIndex + "), measure=" + (measureIndex + 1) + " (idx=" + measureIndex + "), noteIdx=" + noteIndex);

          var parts = ctx.getAllParts(xmlDoc);
          if (!parts.length) {
            ctx.setStatus("Cannot delete note: no part found in MusicXML.");
            return;
          }

          if (partIndex < 0 || partIndex >= parts.length) {
            ctx.setStatus("Selected note part is out of range.");
            return;
          }

          var measures = parts[partIndex].querySelectorAll("measure");
          if (measureIndex < 0 || measureIndex >= measures.length) {
            ctx.debugLog("Delete rejected: measure out of range. measures=" + measures.length);
            ctx.setStatus("Selected note measure is out of range.");
            return;
          }

          var notes = measures[measureIndex].querySelectorAll(":scope > note");
          ctx.debugLog("Delete lookup: notes in target measure=" + notes.length);
          if (noteIndex < 0 || noteIndex >= notes.length) {
            ctx.debugLog("Delete rejected: note index out of range.");
            ctx.setStatus("Selected note index is out of range.");
            return;
          }

          var noteNode = notes[noteIndex];
          var isBaseChordNote = !!noteNode && !noteNode.querySelector("chord");
          var hasNextChordContinuation = noteIndex + 1 < notes.length && !!notes[noteIndex + 1].querySelector("chord");

          if (noteNode && noteNode.parentNode) {
            noteNode.parentNode.removeChild(noteNode);
          }

          // If the deleted note was the base of a chord, promote the next chord note
          if (isBaseChordNote && hasNextChordContinuation) {
            var newNotes = measures[measureIndex].querySelectorAll(":scope > note");
            if (noteIndex < newNotes.length) {
              var promotedNode = newNotes[noteIndex];
              var chordTag = promotedNode.querySelector(":scope > chord");
              if (chordTag) {
                promotedNode.removeChild(chordTag);
              }
            }
          }

          ctx.debugLog("Delete succeeded: token=" + selectedToken);

          var updatedXml = ctx.serializeXmlDoc(xmlDoc);
          ctx.setEditorContent(updatedXml);
          ctx.refreshNoteSelectors();
          if (ctx.noteHighlighter && typeof ctx.noteHighlighter.clear === "function") {
            ctx.noteHighlighter.clear();
          }
          ctx.renderScore("Editor Content", updatedXml);
          ctx.setStatus("Deleted selected note.");
        }
      };
    }
  };
})();
