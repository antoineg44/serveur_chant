(function () {
  "use strict";

  var COLORABLE_SELECTOR = "path,use,rect,circle,ellipse,polygon,polyline,line,text";

  function attach(container, osmd, options) {
    var selectedElement = null;
    var selectedStaveNote = null;
    var onSelect = options && typeof options.onSelect === "function" ? options.onSelect : null;

    function getStaveNote(target) {
      if (!target || typeof target.closest !== "function") {
        return null;
      }
      return target.closest("g.vf-stavenote") || null;
    }

    function getClickedNotehead(target, staveNote) {
      if (!target || typeof target.closest !== "function") {
        return null;
      }
      var notehead = target.closest("g.vf-notehead");
      if (notehead && staveNote && staveNote.contains(notehead)) {
        return notehead;
      }
      return null;
    }

    function clear() {
      if (!selectedElement) {
        selectedStaveNote = null;
        return;
      }
      var defaultColor = osmd && osmd.EngravingRules && osmd.EngravingRules.DefaultColorMusic
        ? osmd.EngravingRules.DefaultColorMusic
        : "#000000";
      applyColor(selectedElement, defaultColor);
      selectedElement = null;
      selectedStaveNote = null;
    }

    function applyColor(element, color) {
      if (!element) {
        return;
      }
      element.setAttribute("fill", color);
      element.setAttribute("stroke", color);
      var svgParts = element.querySelectorAll(COLORABLE_SELECTOR);
      svgParts.forEach(function (part) {
        part.setAttribute("fill", color);
        part.setAttribute("stroke", color);
      });
    }

    function onClick(event) {
      if (!event || !event.target || typeof event.target.closest !== "function") {
        return;
      }

      var staveNote = getStaveNote(event.target);
      if (!staveNote) {
        return;
      }

      var notehead = getClickedNotehead(event.target, staveNote);
      var clickedElement = notehead || staveNote;

      if (selectedElement && selectedElement !== clickedElement) {
        clear();
      }

      applyColor(clickedElement, "#d11f1f");
      selectedElement = clickedElement;
      selectedStaveNote = staveNote;

      if (onSelect) {
        onSelect(staveNote, notehead);
      }
    }

    if (container && typeof container.addEventListener === "function") {
      container.addEventListener("click", onClick);
    }

    return {
      clear: clear,
      getSelectedStaveNote: function () {
        return selectedStaveNote;
      },
      getSelectedNotehead: function () {
        return selectedElement && selectedElement.classList && selectedElement.classList.contains("vf-notehead")
          ? selectedElement
          : null;
      },
      detach: function () {
        clear();
        if (container && typeof container.removeEventListener === "function") {
          container.removeEventListener("click", onClick);
        }
      }
    };
  }

  window.NoteHighlighter = {
    attach: attach
  };
})();
