(function () {
  "use strict";

  window.InstrumentVisibilityTools = {
    init: function (ctx) {
      var instrumentVisibilityById = {};

      function getInstrumentsFromSheet() {
        if (!ctx.osmd || !ctx.osmd.Sheet || !Array.isArray(ctx.osmd.Sheet.Instruments)) {
          return [];
        }
        return ctx.osmd.Sheet.Instruments;
      }

      function getInstrumentStableId(instrument, index) {
        if (instrument && instrument.IdString) {
          return String(instrument.IdString);
        }
        return "instrument_" + index;
      }

      function getInstrumentDisplayName(instrument, index) {
        if (instrument && typeof instrument.Name === "string" && instrument.Name.trim()) {
          return instrument.Name.trim();
        }
        if (instrument && instrument.NameLabel && typeof instrument.NameLabel.text === "string" && instrument.NameLabel.text.trim()) {
          return instrument.NameLabel.text.trim();
        }
        return "Instrument " + (index + 1);
      }

      function syncStateWithSheet() {
        var instruments = getInstrumentsFromSheet();
        if (!instruments.length) {
          instrumentVisibilityById = {};
          return;
        }

        var nextState = {};
        instruments.forEach(function (instrument, index) {
          var instrumentId = getInstrumentStableId(instrument, index);
          if (Object.prototype.hasOwnProperty.call(instrumentVisibilityById, instrumentId)) {
            nextState[instrumentId] = !!instrumentVisibilityById[instrumentId];
          } else {
            nextState[instrumentId] = !!instrument.Visible;
          }
        });

        instrumentVisibilityById = nextState;
      }

      function applyToSheet() {
        var instruments = getInstrumentsFromSheet();
        if (!instruments.length) {
          return;
        }

        syncStateWithSheet();
        instruments.forEach(function (instrument, index) {
          var instrumentId = getInstrumentStableId(instrument, index);
          if (Object.prototype.hasOwnProperty.call(instrumentVisibilityById, instrumentId)) {
            instrument.Visible = !!instrumentVisibilityById[instrumentId];
          }
        });
      }

      function rebuildUi() {
        if (!ctx.instrumentVisibilityContainer) {
          return;
        }

        var instruments = getInstrumentsFromSheet();
        if (!instruments.length) {
          ctx.instrumentVisibilityContainer.textContent = "Render a score to manage instrument visibility.";
          return;
        }

        syncStateWithSheet();
        ctx.instrumentVisibilityContainer.innerHTML = "";

        instruments.forEach(function (instrument, index) {
          var instrumentId = getInstrumentStableId(instrument, index);
          var isVisible = !!instrumentVisibilityById[instrumentId];

          var row = document.createElement("div");
          row.className = "instrument-visibility-row";

          var name = document.createElement("span");
          name.className = "instrument-visibility-name";
          name.textContent = getInstrumentDisplayName(instrument, index);

          var button = document.createElement("button");
          button.type = "button";
          button.className = "instrument-visibility-toggle";
          button.setAttribute("data-state", isVisible ? "visible" : "hidden");
          button.textContent = isVisible ? "Hide" : "Show";
          button.setAttribute("aria-label", (isVisible ? "Hide " : "Show ") + getInstrumentDisplayName(instrument, index));

          button.addEventListener("click", function () {
            instrumentVisibilityById[instrumentId] = !instrumentVisibilityById[instrumentId];
            applyToSheet();
            ctx.osmd.render();

            if (typeof ctx.onVisibilityChanged === "function") {
              ctx.onVisibilityChanged();
            }

            rebuildUi();
            if (typeof ctx.setStatus === "function") {
              ctx.setStatus((instrumentVisibilityById[instrumentId] ? "Showing " : "Hiding ") + getInstrumentDisplayName(instrument, index) + ".");
            }
          });

          row.appendChild(name);
          row.appendChild(button);
          ctx.instrumentVisibilityContainer.appendChild(row);
        });
      }

      function getVisiblePlaybackChannelIds() {
        return getInstrumentsFromSheet()
          .filter(function (instrument) { return !!instrument.Visible; })
          .map(function (instrument, index) { return getInstrumentStableId(instrument, index); });
      }

      return {
        applyToSheet: applyToSheet,
        rebuildUi: rebuildUi,
        getVisiblePlaybackChannelIds: getVisiblePlaybackChannelIds
      };
    }
  };
})();
