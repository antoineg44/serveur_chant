(function () {
  "use strict";

  // PlaybackController.init(ctx) -> playback API
  //
  // ctx must provide:
  //   playBtn, stopBtn, enableAudioBtn
  //   speedSlider, speedValueEl, mixerContainer
  //   setStatus(message), debugLog(message)
  //   getCurrentPlaybackXml(), getCurrentRenderableName()
  //   getVisiblePlaybackChannelIds() - optional; returns array of visible part IDs
  window.PlaybackController = {
    init: function (ctx) {
      var playbackTimerId = 0;
      var cursorTimerIds = [];
      var synthByChannel = {};
      var channelLevels = {};
      var mixerChannelsKey = "";
      var hasPlayableScore = false;
      var audioUnlocked = false;
      var previousFollowCursor = null;
      var playbackRate = 1;
      var baseTempoForDisplay = 120;
      var pausedStartBeats = 0;
      var sessionStartBeats = 0;
      var sessionTempo = 120;
      var sessionTotalBeats = 0;
      var lastPlaybackXml = "";
      var seekDebugOverlay = null;
      var speedRetimeTimerId = 0;

      function ensureSeekDebugOverlay() {
        if (seekDebugOverlay) {
          return seekDebugOverlay;
        }

        var host = document.getElementById("osmdContainer");
        if (!host) {
          return null;
        }

        if (window.getComputedStyle(host).position === "static") {
          host.style.position = "relative";
        }

        var overlay = document.createElement("div");
        overlay.setAttribute("id", "seekDebugOverlay");
        overlay.setAttribute("aria-live", "polite");
        overlay.style.position = "absolute";
        overlay.style.left = "10px";
        overlay.style.bottom = "10px";
        overlay.style.zIndex = "25";
        overlay.style.maxWidth = "420px";
        overlay.style.padding = "6px 8px";
        overlay.style.border = "1px solid #c3ccd7";
        overlay.style.borderRadius = "8px";
        overlay.style.background = "rgba(255, 255, 255, 0.92)";
        overlay.style.color = "#1f2937";
        overlay.style.font = "600 12px/1.35 Consolas, 'Courier New', monospace";
        overlay.style.pointerEvents = "none";
        overlay.textContent = "Seek debug: inactive";

        host.appendChild(overlay);
        seekDebugOverlay = overlay;
        return seekDebugOverlay;
      }

      function updateSeekDebugOverlay(text) {
        var overlay = ensureSeekDebugOverlay();
        if (!overlay) {
          return;
        }
        overlay.textContent = text;
      }

      function levelToDecibels(level) {
        var clamped = Math.max(0, Math.min(100, level));
        if (clamped <= 0) {
          return -60;
        }
        return Math.max(-60, 20 * Math.log10(clamped / 100));
      }

      function ensureChannelSynth(channelId) {
        if (synthByChannel[channelId]) {
          return synthByChannel[channelId];
        }

        var initialLevel = Object.prototype.hasOwnProperty.call(channelLevels, channelId)
          ? channelLevels[channelId]
          : 80;
        channelLevels[channelId] = initialLevel;

        var volume = new window.Tone.Volume(levelToDecibels(initialLevel)).toDestination();
        var synth = new window.Tone.PolySynth(window.Tone.Synth).connect(volume);
        synthByChannel[channelId] = {
          synth: synth,
          volume: volume
        };
        return synthByChannel[channelId];
      }

      function updateChannelLevel(channelId, level) {
        var parsed = Number.parseFloat(level);
        if (Number.isNaN(parsed)) {
          parsed = 80;
        }
        parsed = Math.max(0, Math.min(100, parsed));
        channelLevels[channelId] = parsed;

        if (synthByChannel[channelId] && synthByChannel[channelId].volume) {
          var db = levelToDecibels(parsed);
          if (synthByChannel[channelId].volume.volume) {
            synthByChannel[channelId].volume.volume.value = db;
          }
        }
      }

      function rebuildMixerUi(channels) {
        if (!ctx.mixerContainer) {
          return;
        }

        var nextKey = channels.map(function (channel) { return channel.id; }).join("|");
        if (mixerChannelsKey === nextKey && ctx.mixerContainer.children.length) {
          return;
        }
        mixerChannelsKey = nextKey;

        ctx.mixerContainer.innerHTML = "";

        if (!channels.length) {
          ctx.mixerContainer.textContent = "Render a score to load instrument channels.";
          return;
        }

        channels.forEach(function (channel, index) {
          if (!Object.prototype.hasOwnProperty.call(channelLevels, channel.id)) {
            channelLevels[channel.id] = 80;
          }

          var row = document.createElement("div");
          row.className = "mixer-row";

          var label = document.createElement("label");
          var sliderId = "mixerSlider_" + index;
          label.setAttribute("for", sliderId);
          label.textContent = channel.name;

          var slider = document.createElement("input");
          slider.type = "range";
          slider.id = sliderId;
          slider.min = "0";
          slider.max = "100";
          slider.step = "1";
          slider.value = String(channelLevels[channel.id]);

          var valueLabel = document.createElement("span");
          valueLabel.className = "mixer-value";
          valueLabel.textContent = String(Math.round(channelLevels[channel.id]));

          slider.addEventListener("input", function () {
            updateChannelLevel(channel.id, slider.value);
            valueLabel.textContent = String(Math.round(channelLevels[channel.id]));
          });

          row.appendChild(label);
          row.appendChild(slider);
          row.appendChild(valueLabel);
          ctx.mixerContainer.appendChild(row);
        });
      }

      function ensureMixerChannels(channels) {
        channels.forEach(function (channel) {
          ensureChannelSynth(channel.id);
        });
        rebuildMixerUi(channels);
      }

      function releaseAllChannels() {
        Object.keys(synthByChannel).forEach(function (channelId) {
          var channel = synthByChannel[channelId];
          if (channel && channel.synth) {
            channel.synth.releaseAll();
          }
        });
      }

      function getPlaybackRate() {
        if (!ctx.speedSlider) {
          return playbackRate;
        }
        var percent = Number.parseFloat(ctx.speedSlider.value);
        if (Number.isNaN(percent)) {
          percent = 100;
        }
        percent = Math.max(50, Math.min(150, percent));
        playbackRate = percent / 100;
        return playbackRate;
      }

      function updateSpeedUi() {
        var bpm = Math.round(baseTempoForDisplay * getPlaybackRate());
        if (ctx.speedValueEl) {
          ctx.speedValueEl.textContent = bpm + " BPM";
        }
      }

      function isPlayTabActive() {
        var playTab = document.getElementById("playTab");
        return !!playTab && playTab.getAttribute("aria-selected") === "true";
      }

      function setPlayAvailability(enabled) {
        hasPlayableScore = enabled;
        ctx.playBtn.disabled = !enabled || !audioUnlocked || !window.Tone;
        ctx.stopBtn.disabled = true;

        if (enabled) {
          refreshMixerChannelsFromCurrentScore();
        } else if (ctx.mixerContainer) {
          mixerChannelsKey = "";
          ctx.mixerContainer.textContent = "Render a score to load instrument channels.";
          pausedStartBeats = 0;
          sessionStartBeats = 0;
          sessionTotalBeats = 0;
          lastPlaybackXml = "";
        }
      }

      function setAudioUnlocked(unlocked) {
        audioUnlocked = unlocked;
        if (ctx.enableAudioBtn) {
          ctx.enableAudioBtn.disabled = unlocked || !window.Tone;
          ctx.enableAudioBtn.textContent = unlocked ? "Audio Ready" : "Enable Audio";
        }
        ctx.playBtn.disabled = !hasPlayableScore || !audioUnlocked || !window.Tone;
      }

      function setPlaying(playing) {
        ctx.playBtn.disabled = playing || !hasPlayableScore || !audioUnlocked || !window.Tone;
        ctx.stopBtn.disabled = !playing;
      }

      function clearPlaybackTimer() {
        if (playbackTimerId) {
          window.clearTimeout(playbackTimerId);
          playbackTimerId = 0;
        }
      }

      function clearCursorTimers() {
        if (!cursorTimerIds.length) {
          return;
        }
        cursorTimerIds.forEach(function (timerId) {
          window.clearTimeout(timerId);
        });
        cursorTimerIds = [];
      }

      function clearSpeedRetimeTimer() {
        if (!speedRetimeTimerId) {
          return;
        }
        window.clearTimeout(speedRetimeTimerId);
        speedRetimeTimerId = 0;
      }

      function isTransportRunning() {
        return !!(window.Tone && window.Tone.Transport && window.Tone.Transport.state === "started");
      }

      function restartPlaybackAtCurrentBeat() {
        if (!isTransportRunning()) {
          return;
        }

        var elapsedSeconds = Math.max(0, window.Tone.Transport.seconds || 0);
        var elapsedBeats = elapsedSeconds * (sessionTempo / 60);
        pausedStartBeats = Math.min(sessionTotalBeats || Infinity, sessionStartBeats + elapsedBeats);

        clearPlaybackTimer();
        clearCursorTimers();
        releaseAllChannels();
        window.Tone.Transport.stop();
        window.Tone.Transport.cancel(0);
        window.Tone.Transport.position = 0;

        playCurrentScore();
      }

      function resetCursorPlayback() {
        clearCursorTimers();

        if (!ctx.osmd) {
          return;
        }

        if (previousFollowCursor !== null) {
          ctx.osmd.FollowCursor = previousFollowCursor;
          previousFollowCursor = null;
        }

        if (!ctx.osmd.cursor) {
          return;
        }

        try {
          ctx.osmd.cursor.hide();
          ctx.osmd.cursor.reset();
        } catch (_error) {
          // Ignore cursor reset errors for scores where cursor is disabled.
        }
      }

      function scheduleCursorPlayback(parsed, effectiveTempo, startBeat) {
        // Prefer schedulingCursorBeats (includes rest positions, sorted) so the cursor
        // advances in sync with audio even when the visible part has rests.
        var cursorBeats = (parsed.schedulingCursorBeats && parsed.schedulingCursorBeats.length)
          ? parsed.schedulingCursorBeats
          : (parsed.cursorStartBeats || []);
        if (!ctx.osmd || !ctx.osmd.cursor || !cursorBeats.length) {
          return;
        }

        clearCursorTimers();

        var cursorStarts = cursorBeats;
        var secondsPerBeat = 60 / effectiveTempo;

        try {
          if (previousFollowCursor === null) {
            previousFollowCursor = !!ctx.osmd.FollowCursor;
          }
          ctx.osmd.FollowCursor = true;

          if (startBeat <= 0.0001) {
            ctx.osmd.cursor.reset();
            ctx.osmd.cursor.show();
          } else {
            ctx.osmd.cursor.show();
          }
        } catch (_error) {
          return;
        }

        if (cursorStarts.length < 2) {
          return;
        }

        for (var i = 0; i < cursorStarts.length; i += 1) {
          (function (beat) {
            if (beat <= startBeat + 0.0001) {
              return;
            }

            var timerId = window.setTimeout(function () {
              if (window.Tone && window.Tone.Transport && window.Tone.Transport.state !== "started") {
                return;
              }
              try {
                ctx.osmd.cursor.next();
              } catch (_error) {
                // Ignore cursor movement errors during playback.
              }
            }, (beat - startBeat) * secondsPerBeat * 1000);
            cursorTimerIds.push(timerId);
          })(cursorStarts[i]);
        }
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

      function parseMusicXmlForPlayback(xmlString) {
        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(xmlString, "application/xml");
        if (xmlDoc.querySelector("parsererror")) {
          throw new Error("MusicXML parser error");
        }

        var parts = Array.prototype.slice.call(xmlDoc.querySelectorAll("score-partwise > part"));
        if (!parts.length) {
          throw new Error("No playable part found in score");
        }

        var partNameById = {};
        Array.prototype.slice.call(xmlDoc.querySelectorAll("score-partwise > part-list > score-part")).forEach(function (scorePart) {
          var id = scorePart.getAttribute("id") || "";
          var nameNode = scorePart.querySelector("part-name");
          if (id) {
            partNameById[id] = nameNode && nameNode.textContent ? nameNode.textContent.trim() : id;
          }
        });

        var globalTempo = 120;
        var events = [];
        var cursorStarts = [];
        var cursorRenderOrderBeats = [];
        var tokenStartBeats = {};
        var channels = [];
        var partMeasureCursorStarts = [];

        var totalBeats = 0;

        parts.forEach(function (part, partIndex) {
          var partId = part.getAttribute("id") || ("P" + (partIndex + 1));
          var channelName = partNameById[partId] || ("Part " + (partIndex + 1));
          channels.push({ id: partId, name: channelName });
          partMeasureCursorStarts[partIndex] = [];

          var measures = part.querySelectorAll("measure");
          var divisions = 1;
          var tempo = globalTempo;
          var nowDiv = 0;
          var lastNoteStartDiv = 0;

          measures.forEach(function (measure, measureIndex) {
            var visualStarts = [];
            var noteIndexInMeasure = -1;
            var children = measure.children;
            for (var i = 0; i < children.length; i += 1) {
              var el = children[i];

              if (el.tagName === "attributes") {
                var divNode = el.querySelector("divisions");
                if (divNode && divNode.textContent) {
                  var parsedDivisions = Number.parseInt(divNode.textContent, 10);
                  if (!Number.isNaN(parsedDivisions) && parsedDivisions > 0) {
                    divisions = parsedDivisions;
                  }
                }
                continue;
              }

              if (el.tagName === "direction") {
                var soundNode = el.querySelector("sound[tempo]");
                if (soundNode) {
                  var soundTempo = Number.parseFloat(soundNode.getAttribute("tempo"));
                  if (!Number.isNaN(soundTempo) && soundTempo > 0) {
                    tempo = soundTempo;
                    globalTempo = soundTempo;
                  }
                }
                var perMinuteNode = el.querySelector("metronome > per-minute");
                if (perMinuteNode && perMinuteNode.textContent) {
                  var perMinuteTempo = Number.parseFloat(perMinuteNode.textContent);
                  if (!Number.isNaN(perMinuteTempo) && perMinuteTempo > 0) {
                    tempo = perMinuteTempo;
                    globalTempo = perMinuteTempo;
                  }
                }
                continue;
              }

              if (el.tagName === "backup") {
                var backupDurationNode = el.querySelector("duration");
                if (backupDurationNode && backupDurationNode.textContent) {
                  var backupDuration = Number.parseInt(backupDurationNode.textContent, 10);
                  if (!Number.isNaN(backupDuration)) {
                    nowDiv = Math.max(0, nowDiv - backupDuration);
                  }
                }
                continue;
              }

              if (el.tagName === "forward") {
                var forwardDurationNode = el.querySelector("duration");
                if (forwardDurationNode && forwardDurationNode.textContent) {
                  var forwardDuration = Number.parseInt(forwardDurationNode.textContent, 10);
                  if (!Number.isNaN(forwardDuration)) {
                    nowDiv += forwardDuration;
                  }
                }
                continue;
              }

              if (el.tagName !== "note") {
                continue;
              }

              noteIndexInMeasure += 1;

              var durationNode = el.querySelector("duration");
              var durationDiv = durationNode && durationNode.textContent ? Number.parseInt(durationNode.textContent, 10) : 0;
              if (Number.isNaN(durationDiv) || durationDiv < 0) {
                durationDiv = 0;
              }

              var isChord = !!el.querySelector("chord");
              var isRest = !!el.querySelector("rest");
              var startDiv = isChord ? lastNoteStartDiv : nowDiv;
              var startBeats = startDiv * (1 / divisions);
              var token = partIndex + ":" + measureIndex + ":" + noteIndexInMeasure;
              tokenStartBeats[token] = startBeats;

              if (!isRest) {
                var stepNode = el.querySelector("pitch > step");
                var alterNode = el.querySelector("pitch > alter");
                var octaveNode = el.querySelector("pitch > octave");
                if (stepNode && octaveNode && stepNode.textContent && octaveNode.textContent) {
                  var alter = alterNode && alterNode.textContent ? Number.parseInt(alterNode.textContent, 10) : 0;
                  if (Number.isNaN(alter)) {
                    alter = 0;
                  }

                  var noteName = normalizeNoteName(stepNode.textContent, alter, octaveNode.textContent);
                  var beatsPerDivision = 1 / divisions;
                  events.push({
                    channelId: partId,
                    note: noteName,
                    startBeats: startBeats,
                    durationBeats: Math.max(durationDiv * beatsPerDivision, 0.05)
                  });

                  if (!isChord) {
                    cursorStarts.push(startBeats);
                  }
                }
              }

              if (!isChord) {
                visualStarts.push(startBeats);
              }

              if (!isChord) {
                lastNoteStartDiv = nowDiv;
                nowDiv += durationDiv;
              }
            }

            partMeasureCursorStarts[partIndex][measureIndex] = visualStarts;
          });

          totalBeats = Math.max(totalBeats, nowDiv / divisions);
        });

        var maxMeasures = partMeasureCursorStarts.reduce(function (max, measures) {
          return Math.max(max, measures.length);
        }, 0);

        for (var measureIndex = 0; measureIndex < maxMeasures; measureIndex += 1) {
          for (var partIndex = 0; partIndex < partMeasureCursorStarts.length; partIndex += 1) {
            var startsInMeasure = partMeasureCursorStarts[partIndex][measureIndex] || [];
            for (var j = 0; j < startsInMeasure.length; j += 1) {
              cursorRenderOrderBeats.push(startsInMeasure[j]);
            }
          }
        }

        // Map partId → per-measure visual starts (notes + rests) for visibility-aware filtering.
        var partVisualStartsById = {};
        parts.forEach(function (part, partIndex) {
          var partId = part.getAttribute("id") || ("P" + (partIndex + 1));
          partVisualStartsById[partId] = partMeasureCursorStarts[partIndex] || [];
        });

        return {
          tempo: globalTempo,
          channels: channels,
          events: events,
          totalBeats: totalBeats,
          partVisualStartsById: partVisualStartsById,
          cursorRenderOrderBeats: cursorRenderOrderBeats,
          tokenStartBeats: tokenStartBeats,
          cursorStartBeats: cursorStarts
            .sort(function (a, b) { return a - b; })
            .filter(function (beat, index, array) {
              if (index === 0) {
                return true;
              }
              return Math.abs(beat - array[index - 1]) > 0.0001;
            })
        };
      }

      function getVisibleChannelIdMap() {
        if (!ctx.getVisiblePlaybackChannelIds || typeof ctx.getVisiblePlaybackChannelIds !== "function") {
          return null;
        }

        var ids = ctx.getVisiblePlaybackChannelIds();
        if (!Array.isArray(ids)) {
          return null;
        }

        var visibleIdMap = {};
        ids.forEach(function (id) {
          if (id === undefined || id === null) {
            return;
          }
          visibleIdMap[String(id)] = true;
        });

        return visibleIdMap;
      }

      function filterParsedByVisibleChannels(parsed) {
        var visibleIdMap = getVisibleChannelIdMap();
        if (!visibleIdMap) {
          return parsed;
        }

        var visiblePartIndexMap = {};
        (parsed.channels || []).forEach(function (channel, index) {
          if (!!visibleIdMap[String(channel.id)]) {
            visiblePartIndexMap[String(index)] = true;
          }
        });

        var filteredChannels = (parsed.channels || []).filter(function (channel) {
          return !!visibleIdMap[String(channel.id)];
        });

        var filteredEvents = (parsed.events || []).filter(function (event) {
          return !!visibleIdMap[String(event.channelId)];
        });

        var filteredCursorStarts = filteredEvents
          .map(function (event) { return event.startBeats; })
          .sort(function (a, b) { return a - b; })
          .filter(function (beat, index, array) {
            if (index === 0) {
              return true;
            }
            return Math.abs(beat - array[index - 1]) > 0.0001;
          });

        var filteredTotalBeats = filteredEvents.reduce(function (max, event) {
          return Math.max(max, event.startBeats + event.durationBeats);
        }, 0);

        var filteredTokenStartBeats = {};
        Object.keys(parsed.tokenStartBeats || {}).forEach(function (token) {
          var tokenPartIndex = token.split(":")[0];
          if (!!visiblePartIndexMap[tokenPartIndex]) {
            filteredTokenStartBeats[token] = parsed.tokenStartBeats[token];
          }
        });

        // Build sorted, deduplicated cursor beat list for visible parts that includes
        // rest positions. OSMD cursor.next() advances through rests too, so omitting
        // them causes the cursor to lag behind audio after any voice rest.
        var schedulingCursorBeats = filteredCursorStarts; // fallback: non-rest only
        if (parsed.partVisualStartsById) {
          var rawRenderBeats = [];
          var visibleMeasureStarts = filteredChannels.map(function (channel) {
            return parsed.partVisualStartsById[channel.id] || [];
          });
          var maxMeasureCount = visibleMeasureStarts.reduce(function (max, arr) {
            return Math.max(max, arr.length);
          }, 0);
          for (var mi = 0; mi < maxMeasureCount; mi += 1) {
            visibleMeasureStarts.forEach(function (measures) {
              var beats = measures[mi] || [];
              beats.forEach(function (beat) { rawRenderBeats.push(beat); });
            });
          }
          rawRenderBeats.sort(function (a, b) { return a - b; });
          schedulingCursorBeats = rawRenderBeats.filter(function (beat, idx, arr) {
            return idx === 0 || Math.abs(beat - arr[idx - 1]) > 0.0001;
          });
        }

        return {
          tempo: parsed.tempo,
          channels: filteredChannels,
          events: filteredEvents,
          totalBeats: filteredTotalBeats,
          cursorRenderOrderBeats: schedulingCursorBeats,
          tokenStartBeats: filteredTokenStartBeats,
          cursorStartBeats: filteredCursorStarts,
          schedulingCursorBeats: schedulingCursorBeats
        };
      }

      function moveCursorToBeat(parsed, targetBeat) {
        // Use schedulingCursorBeats (includes rests) so the step count to reach
        // targetBeat matches the number of cursor.next() calls OSMD actually needs.
        var cursorBeats = parsed && ((parsed.schedulingCursorBeats && parsed.schedulingCursorBeats.length)
          ? parsed.schedulingCursorBeats
          : (parsed.cursorStartBeats || []));
        if (!ctx.osmd || !ctx.osmd.cursor || !cursorBeats || !cursorBeats.length) {
          return;
        }

        var starts = cursorBeats;
        var safeBeat = Math.max(0, Math.min(targetBeat, parsed.totalBeats || targetBeat));
        var targetIndex = 0;

        while (targetIndex < starts.length && starts[targetIndex] < safeBeat - 0.0001) {
          targetIndex += 1;
        }

        try {
          if (previousFollowCursor === null) {
            previousFollowCursor = !!ctx.osmd.FollowCursor;
          }
          ctx.osmd.FollowCursor = true;
          ctx.osmd.cursor.reset();
          ctx.osmd.cursor.show();

          for (var i = 0; i < targetIndex; i += 1) {
            ctx.osmd.cursor.next();
          }
        } catch (_error) {
          // Ignore cursor movement errors for unsupported cursor states.
        }
      }

      function bindSheetClickToCursor() {
        var sheetContainer = document.getElementById("osmdContainer");
        if (!sheetContainer) {
          return;
        }

        sheetContainer.addEventListener("click", function (event) {
          if (!isPlayTabActive()) {
            return;
          }

          var playbackXml = ctx.getCurrentPlaybackXml ? ctx.getCurrentPlaybackXml() : "";
          if (!playbackXml) {
            return;
          }

          var parsed;
          try {
            parsed = filterParsedByVisibleChannels(parseMusicXmlForPlayback(playbackXml));
          } catch (_error) {
            return;
          }

          if (!parsed.cursorStartBeats.length) {
            return;
          }

          if (window.Tone && window.Tone.Transport && window.Tone.Transport.state === "started") {
            stopPlayback();
          }

          var targetBeat = 0;
          var clickedToken = "";
          var mappingSource = "ratio";
          var target = event.target;
          var clickedStave = target && typeof target.closest === "function"
            ? target.closest("g.vf-stavenote")
            : null;
          var staveNotes = Array.prototype.slice.call(sheetContainer.querySelectorAll("g.vf-stavenote"));
          var renderedEntries = ctx.getRenderedEntries ? ctx.getRenderedEntries() : [];
          var tokenBeatMap = parsed.tokenStartBeats || {};
          var renderOrderBeats = parsed.cursorRenderOrderBeats || [];

          function getBeatForStaveIndex(staveIndex, sourcePrefix) {
            if (staveIndex < 0) {
              return null;
            }

            if (renderedEntries.length > staveIndex) {
              var entry = renderedEntries[staveIndex];
              var token = entry && entry.baseToken ? entry.baseToken : "";
              if (token && Object.prototype.hasOwnProperty.call(tokenBeatMap, token)) {
                return {
                  beat: tokenBeatMap[token],
                  token: token,
                  source: sourcePrefix + "-token"
                };
              }
            }

            if (renderOrderBeats.length) {
              var clampedIndex = Math.max(0, Math.min(renderOrderBeats.length - 1, staveIndex));
              return {
                beat: renderOrderBeats[clampedIndex] || 0,
                token: "",
                source: sourcePrefix + "-render-order"
              };
            }

            var mappedIndex = Math.round(
              staveIndex * (parsed.cursorStartBeats.length - 1) / Math.max(1, staveNotes.length - 1)
            );
            return {
              beat: parsed.cursorStartBeats[Math.max(0, Math.min(parsed.cursorStartBeats.length - 1, mappedIndex))] || 0,
              token: "",
              source: sourcePrefix + "-proportional"
            };
          }

          if (clickedStave) {
            var staveIndex = staveNotes.indexOf(clickedStave);
            var directResult = getBeatForStaveIndex(staveIndex, "hit");
            if (directResult) {
              targetBeat = directResult.beat;
              clickedToken = directResult.token || "";
              mappingSource = directResult.source;
            }
          } else {
            var notePoints = [];
            var averageHeight = 18;

            if (staveNotes.length) {
              var totalHeight = 0;
              for (var s = 0; s < staveNotes.length; s += 1) {
                var noteRect = staveNotes[s].getBoundingClientRect();
                totalHeight += Math.max(1, noteRect.height || 1);
                var pointBeat = getBeatForStaveIndex(s, "nearest");
                if (!pointBeat) {
                  continue;
                }
                notePoints.push({
                  index: s,
                  x: (noteRect.left + noteRect.right) / 2,
                  y: (noteRect.top + noteRect.bottom) / 2,
                  beat: pointBeat.beat,
                  token: pointBeat.token || "",
                  source: pointBeat.source
                });
              }
              if (staveNotes.length) {
                averageHeight = totalHeight / staveNotes.length;
              }
            }

            if (notePoints.length) {
              var sortedByY = notePoints.slice().sort(function (a, b) { return a.y - b.y; });
              var rows = [];
              var rowThreshold = Math.max(14, Math.min(42, averageHeight * 1.6));

              sortedByY.forEach(function (point) {
                var row = rows.length ? rows[rows.length - 1] : null;
                if (!row || Math.abs(point.y - row.avgY) > rowThreshold) {
                  rows.push({ avgY: point.y, minX: point.x, maxX: point.x, points: [point] });
                } else {
                  row.points.push(point);
                  row.avgY = row.points.reduce(function (sum, p) { return sum + p.y; }, 0) / row.points.length;
                  row.minX = Math.min(row.minX, point.x);
                  row.maxX = Math.max(row.maxX, point.x);
                }
              });

              var bestRow = null;
              var bestRowScore = Infinity;
              rows.forEach(function (row) {
                var yDistance = Math.abs(event.clientY - row.avgY);
                var outsideX = 0;
                if (event.clientX < row.minX) {
                  outsideX = row.minX - event.clientX;
                } else if (event.clientX > row.maxX) {
                  outsideX = event.clientX - row.maxX;
                }
                var rowScore = yDistance + (outsideX * 0.25);
                if (rowScore < bestRowScore) {
                  bestRowScore = rowScore;
                  bestRow = row;
                }
              });

              if (bestRow && bestRow.points.length) {
                var rowPoints = bestRow.points.slice().sort(function (a, b) { return a.x - b.x; });
                var firstPoint = rowPoints[0];
                var lastPoint = rowPoints[rowPoints.length - 1];

                if (event.clientX <= firstPoint.x) {
                  targetBeat = firstPoint.beat;
                  clickedToken = firstPoint.token;
                  mappingSource = "row-edge-left";
                } else if (event.clientX >= lastPoint.x) {
                  targetBeat = lastPoint.beat;
                  clickedToken = lastPoint.token;
                  mappingSource = "row-edge-right";
                } else {
                  var leftPoint = firstPoint;
                  var rightPoint = lastPoint;
                  for (var rp = 1; rp < rowPoints.length; rp += 1) {
                    if (rowPoints[rp].x >= event.clientX) {
                      rightPoint = rowPoints[rp];
                      leftPoint = rowPoints[rp - 1];
                      break;
                    }
                  }

                  var deltaX = rightPoint.x - leftPoint.x;
                  if (Math.abs(deltaX) < 0.0001) {
                    targetBeat = leftPoint.beat;
                    clickedToken = leftPoint.token;
                    mappingSource = "row-duplicate-x";
                  } else {
                    var t = (event.clientX - leftPoint.x) / deltaX;
                    targetBeat = leftPoint.beat + ((rightPoint.beat - leftPoint.beat) * t);
                    mappingSource = "row-interp";

                    if (t < 0.2) {
                      clickedToken = leftPoint.token;
                    } else if (t > 0.8) {
                      clickedToken = rightPoint.token;
                    } else {
                      clickedToken = "";
                    }
                  }
                }
              }
            }

            if (!notePoints.length || (mappingSource === "ratio" && targetBeat === 0)) {
              var nearestStaveIndex = -1;
              var nearestDistance = Infinity;
              for (var n = 0; n < staveNotes.length; n += 1) {
                var nearestRect = staveNotes[n].getBoundingClientRect();
                var dx = ((nearestRect.left + nearestRect.right) / 2) - event.clientX;
                var dy = ((nearestRect.top + nearestRect.bottom) / 2) - event.clientY;
                var distance = Math.sqrt((dx * dx) + (dy * dy));
                if (distance < nearestDistance) {
                  nearestDistance = distance;
                  nearestStaveIndex = n;
                }
              }

              if (nearestStaveIndex >= 0) {
                var fallbackResult = getBeatForStaveIndex(nearestStaveIndex, "nearest-fallback");
                if (fallbackResult) {
                  targetBeat = fallbackResult.beat;
                  clickedToken = fallbackResult.token || "";
                  mappingSource = fallbackResult.source;
                }
              }
            }

            if (mappingSource === "ratio" && targetBeat === 0) {
              var rect = sheetContainer.getBoundingClientRect();
              var relativeX = rect.width > 0 ? Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) : 0;
              targetBeat = (parsed.totalBeats || 0) * relativeX;
              mappingSource = "x-ratio";
            }
          }

          if (!Number.isFinite(targetBeat)) {
            targetBeat = 0;
            mappingSource = "invalid-reset";
            clickedToken = "";
          }

          if (mappingSource === "ratio" && targetBeat === 0) {
            if (parsed.cursorStartBeats.length) {
              targetBeat = parsed.cursorStartBeats[0] || 0;
              mappingSource = "first-cursor-beat";
            } else {
              mappingSource = "zero-default";
            }
          }

          if (mappingSource.indexOf("row-") === 0 && parsed.cursorStartBeats.length) {
            var nearestGridBeat = parsed.cursorStartBeats[0];
            var bestGridDistance = Math.abs(nearestGridBeat - targetBeat);
            for (var g = 1; g < parsed.cursorStartBeats.length; g += 1) {
              var gridBeat = parsed.cursorStartBeats[g];
              var gridDistance = Math.abs(gridBeat - targetBeat);
              if (gridDistance < bestGridDistance) {
                bestGridDistance = gridDistance;
                nearestGridBeat = gridBeat;
              }
            }

            if (bestGridDistance <= 0.35) {
              targetBeat = nearestGridBeat;
              mappingSource = mappingSource + "-grid";
            }
          }

          if (mappingSource === "ratio" || mappingSource === "x-ratio") {
            var rect = sheetContainer.getBoundingClientRect();
            var relativeX = rect.width > 0 ? Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) : 0;
            targetBeat = (parsed.totalBeats || 0) * relativeX;
            mappingSource = "x-ratio";
          }

          pausedStartBeats = Math.max(0, Math.min(targetBeat, parsed.totalBeats || targetBeat));
          moveCursorToBeat(parsed, pausedStartBeats);

          var cursorBeatEstimate = pausedStartBeats;
          if (window.Tone && window.Tone.Transport && window.Tone.Transport.state === "started") {
            var elapsedSeconds = Math.max(0, window.Tone.Transport.seconds || 0);
            cursorBeatEstimate = sessionStartBeats + (elapsedSeconds * (sessionTempo / 60));
          }

          var debugText = "Seek debug | token=" + (clickedToken || "n/a") +
            " | source=" + mappingSource +
            " | targetBeat=" + pausedStartBeats.toFixed(3) +
            " | cursorBeat~=" + cursorBeatEstimate.toFixed(3);
          updateSeekDebugOverlay(debugText);
          if (typeof ctx.debugLog === "function") {
            ctx.debugLog(debugText);
          }

          ctx.setStatus("Cursor moved. Next playback starts from the selected position.");
        });
      }

      function refreshMixerChannelsFromCurrentScore() {
        var xml = ctx.getCurrentPlaybackXml ? ctx.getCurrentPlaybackXml() : "";
        if (!xml) {
          return;
        }

        try {
          var parsed = filterParsedByVisibleChannels(parseMusicXmlForPlayback(xml));
          rebuildMixerUi(parsed.channels || []);
          baseTempoForDisplay = parsed.tempo || baseTempoForDisplay;
          updateSpeedUi();
        } catch (_error) {
          // Keep previous mixer state if parsing fails.
        }
      }

      function stopPlayback() {
        if (!window.Tone) {
          return;
        }

        clearSpeedRetimeTimer();

        if (window.Tone.Transport && window.Tone.Transport.state === "started") {
          var elapsedSeconds = Math.max(0, window.Tone.Transport.seconds || 0);
          var elapsedBeats = elapsedSeconds * (sessionTempo / 60);
          pausedStartBeats = Math.min(sessionTotalBeats || Infinity, sessionStartBeats + elapsedBeats);
        }

        clearPlaybackTimer();
        clearCursorTimers();
        window.Tone.Transport.stop();
        window.Tone.Transport.cancel(0);
        releaseAllChannels();
        setPlaying(false);
        ctx.setStatus("Playback stopped.");
      }

      function playCurrentScore() {
        if (!window.Tone) {
          ctx.setStatus("Tone.js is unavailable. Playback cannot start.");
          return;
        }

        if (!audioUnlocked) {
          ctx.setStatus("Click Enable Audio before starting playback.");
          return;
        }

        var playbackXml = ctx.getCurrentPlaybackXml();
        if (!playbackXml) {
          ctx.setStatus("No playable MusicXML loaded. Render a .xml or .musicxml file first.");
          return;
        }

        if (lastPlaybackXml !== playbackXml) {
          pausedStartBeats = 0;
          sessionStartBeats = 0;
          sessionTotalBeats = 0;
          lastPlaybackXml = playbackXml;
        }

        var parsed;
        try {
          parsed = filterParsedByVisibleChannels(parseMusicXmlForPlayback(playbackXml));
        } catch (error) {
          console.error(error);
          ctx.setStatus("Unable to parse this score for playback.");
          return;
        }

        var renderableName = ctx.getCurrentRenderableName();

        if (!parsed.events.length) {
          ctx.setStatus("No notes found for playback in currently visible instruments for " + renderableName + ".");
          return;
        }

        var effectiveTempo = parsed.tempo * getPlaybackRate();
        baseTempoForDisplay = parsed.tempo;
        updateSpeedUi();
        var startBeat = Math.max(0, Math.min(pausedStartBeats, parsed.totalBeats));

        Promise.resolve()
          .then(function () {
            ensureMixerChannels(parsed.channels || []);
            clearPlaybackTimer();
            window.Tone.Transport.stop();
            window.Tone.Transport.cancel(0);
            window.Tone.Transport.position = 0;
            window.Tone.Transport.bpm.value = effectiveTempo;

            sessionStartBeats = startBeat;
            sessionTempo = effectiveTempo;
            sessionTotalBeats = parsed.totalBeats;

            parsed.events.forEach(function (event) {
              if (event.startBeats + 0.0001 < startBeat) {
                return;
              }

              var channel = synthByChannel[event.channelId] || ensureChannelSynth(event.channelId || "default");
              window.Tone.Transport.schedule(function (time) {
                channel.synth.triggerAttackRelease(event.note, event.durationBeats * (60 / effectiveTempo), time);
              }, (event.startBeats - startBeat) * (60 / effectiveTempo));
            });

            scheduleCursorPlayback(parsed, effectiveTempo, startBeat);
            window.Tone.Transport.start();
            setPlaying(true);
            ctx.setStatus("Playing " + renderableName + " at " + Math.round(effectiveTempo) + " BPM...");

            playbackTimerId = window.setTimeout(function () {
              pausedStartBeats = 0;
              sessionStartBeats = 0;
              sessionTotalBeats = 0;
              resetCursorPlayback();
              setPlaying(false);
              ctx.setStatus("Playback finished for " + renderableName + ".");
              playbackTimerId = 0;
            }, ((parsed.totalBeats - startBeat) * (60 / effectiveTempo) + 0.2) * 1000);
          })
          .catch(function (error) {
            console.error(error);
            ctx.setStatus("Playback start failed. Interact with the page and try again.");
          });
      }

      function enableAudio() {
        if (!window.Tone) {
          ctx.setStatus("Tone.js is unavailable. Audio cannot be enabled.");
          return;
        }

        window.Tone.start()
          .then(function () {
            if (window.Tone.context && window.Tone.context.state !== "running") {
              return window.Tone.context.resume();
            }
          })
          .then(function () {
            // Delay channel synth creation until we know score parts.
            setAudioUnlocked(true);
            ctx.setStatus("Audio enabled. You can now play the score.");
          })
          .catch(function (error) {
            console.error(error);
            ctx.setStatus("Audio enabling failed. Click Enable Audio again.");
          });
      }

      setPlayAvailability(false);
      setAudioUnlocked(false);
      updateSpeedUi();
      refreshMixerChannelsFromCurrentScore();
      bindSheetClickToCursor();

      if (ctx.speedSlider) {
        ctx.speedSlider.addEventListener("input", function () {
          updateSpeedUi();

          if (!isTransportRunning()) {
            return;
          }

          clearSpeedRetimeTimer();
          speedRetimeTimerId = window.setTimeout(function () {
            speedRetimeTimerId = 0;
            restartPlaybackAtCurrentBeat();
          }, 60);
        });
      }

      return {
        setPlayAvailability: setPlayAvailability,
        stopPlayback: stopPlayback,
        playCurrentScore: playCurrentScore,
        enableAudio: enableAudio
      };
    }
  };
})();
