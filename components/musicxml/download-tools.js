(function () {
  "use strict";

  function loadScriptOnce(url) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector("script[src='" + url + "']");
      if (existing) {
        if (window.jspdf && window.jspdf.jsPDF) {
          resolve();
          return;
        }
        existing.addEventListener("load", function () { resolve(); }, { once: true });
        existing.addEventListener("error", function () { reject(new Error("Failed to load " + url)); }, { once: true });
        return;
      }

      var script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error("Failed to load " + url)); };
      document.head.appendChild(script);
    });
  }

  function ensureJsPdfLoaded() {
    if (window.jspdf && window.jspdf.jsPDF) {
      return Promise.resolve();
    }

    var candidates = [
      "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
      "https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js"
    ];

    var index = 0;
    function tryNext() {
      if (index >= candidates.length) {
        return Promise.reject(new Error("jsPDF unavailable"));
      }
      var candidate = candidates[index];
      index += 1;
      return loadScriptOnce(candidate)
        .then(function () {
          if (window.jspdf && window.jspdf.jsPDF) {
            return;
          }
          return tryNext();
        })
        .catch(function () {
          return tryNext();
        });
    }

    return tryNext();
  }

  function svgElementToPng(svgElement, scale) {
    return new Promise(function (resolve, reject) {
      try {
        var serializer = new XMLSerializer();
        var svgText = serializer.serializeToString(svgElement);

        if (svgText.indexOf("xmlns=") < 0) {
          svgText = svgText.replace("<svg", "<svg xmlns=\"http://www.w3.org/2000/svg\"");
        }
        if (svgText.indexOf("xmlns:xlink=") < 0) {
          svgText = svgText.replace("<svg", "<svg xmlns:xlink=\"http://www.w3.org/1999/xlink\"");
        }

        var width = Math.max(1, Math.round(svgElement.getBoundingClientRect().width || svgElement.clientWidth || 1));
        var height = Math.max(1, Math.round(svgElement.getBoundingClientRect().height || svgElement.clientHeight || 1));
        var svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
        var svgUrl = URL.createObjectURL(svgBlob);
        var image = new Image();

        image.onload = function () {
          try {
            var renderScale = scale || 2;
            var canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(width * renderScale));
            canvas.height = Math.max(1, Math.round(height * renderScale));
            var ctx = canvas.getContext("2d");

            if (!ctx) {
              URL.revokeObjectURL(svgUrl);
              reject(new Error("Canvas unavailable"));
              return;
            }

            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(svgUrl);

            resolve({
              dataUrl: canvas.toDataURL("image/png"),
              canvas: canvas,
              renderScale: renderScale,
              width: canvas.width,
              height: canvas.height
            });
          } catch (innerError) {
            URL.revokeObjectURL(svgUrl);
            reject(innerError);
          }
        };

        image.onerror = function () {
          URL.revokeObjectURL(svgUrl);
          reject(new Error("Failed to rasterize SVG"));
        };

        image.src = svgUrl;
      } catch (error) {
        reject(error);
      }
    });
  }

  function exportRenderedScoreAsPdf(ctx, baseName) {
    var jsPDFCtor = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDFCtor) {
      return Promise.reject(new Error("jsPDF unavailable"));
    }

    var svgPages = ctx.container
      ? Array.prototype.slice.call(ctx.container.querySelectorAll("svg"))
      : [];

    if (!svgPages.length) {
      return Promise.reject(new Error("No rendered score pages found"));
    }

    var doc = null;
    var pageMarginX = 18;
    var pageMarginY = 18;

    function median(values) {
      if (!values.length) {
        return 0;
      }
      var sorted = values.slice().sort(function (a, b) { return a - b; });
      var mid = Math.floor(sorted.length / 2);
      if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
      }
      return sorted[mid];
    }

    function mergeNearbyBands(bands, imageHeight) {
      if (bands.length < 2) {
        return bands;
      }

      var heights = bands.map(function (band) {
        return band.bottom - band.top;
      }).filter(function (h) {
        return h > 0;
      });

      var medianBandHeight = median(heights) || 40;
      // Merge only tightly coupled staves (e.g., piano RH/LH), not whole systems.
      var mergeGap = Math.max(12, Math.min(Math.floor(medianBandHeight * 0.9), Math.floor(imageHeight * 0.035)));

      var merged = [];
      var current = { top: bands[0].top, bottom: bands[0].bottom };

      for (var i = 1; i < bands.length; i += 1) {
        var next = bands[i];
        if (next.top - current.bottom <= mergeGap) {
          current.bottom = Math.max(current.bottom, next.bottom);
        } else {
          merged.push(current);
          current = { top: next.top, bottom: next.bottom };
        }
      }

      merged.push(current);

      // Guardrail: if everything got collapsed into one huge block, keep original bands.
      if (merged.length === 1 && bands.length > 1) {
        var mergedHeight = merged[0].bottom - merged[0].top;
        if (mergedHeight > imageHeight * 0.72) {
          return bands;
        }
      }

      return merged;
    }

    function getOrientation(imageInfo) {
      return imageInfo.width >= imageInfo.height ? "landscape" : "portrait";
    }

    function detectSystemBandsFromRaster(imageInfo) {
      var canvas = imageInfo.canvas;
      if (!canvas) {
        return [];
      }

      var ctx2d = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx2d) {
        return [];
      }

      var width = canvas.width;
      var height = canvas.height;
      if (width < 2 || height < 2) {
        return [];
      }

      var pixels = ctx2d.getImageData(0, 0, width, height).data;
      var xStep = Math.max(1, Math.floor(width / 1400));
      var sampledColumns = Math.max(1, Math.floor(width / xStep));
      var rowInkThreshold = Math.max(2, Math.floor(sampledColumns * 0.012));
      var rowInk = new Array(height);

      for (var y = 0; y < height; y += 1) {
        var inkCount = 0;
        var rowBase = y * width * 4;

        for (var x = 0; x < width; x += xStep) {
          var idx = rowBase + (x * 4);
          var alpha = pixels[idx + 3];
          if (alpha < 16) {
            continue;
          }

          var r = pixels[idx];
          var g = pixels[idx + 1];
          var b = pixels[idx + 2];

          if (r < 245 || g < 245 || b < 245) {
            inkCount += 1;
          }
        }

        rowInk[y] = inkCount;
      }

      var bands = [];
      var gapTolerance = Math.max(8, Math.floor(height * 0.003));
      var padding = 8;
      var inBand = false;
      var bandStart = 0;
      var lastInkY = 0;

      for (var y2 = 0; y2 < height; y2 += 1) {
        var hasInk = rowInk[y2] >= rowInkThreshold;

        if (hasInk) {
          if (!inBand) {
            inBand = true;
            bandStart = y2;
          }
          lastInkY = y2;
          continue;
        }

        if (inBand && y2 - lastInkY > gapTolerance) {
          var top = Math.max(0, bandStart - padding);
          var bottom = Math.min(height, lastInkY + padding);
          if (bottom - top > 16) {
            bands.push({ top: top, bottom: bottom });
          }
          inBand = false;
        }
      }

      if (inBand) {
        var topFinal = Math.max(0, bandStart - padding);
        var bottomFinal = Math.min(height, lastInkY + padding);
        if (bottomFinal - topFinal > 16) {
          bands.push({ top: topFinal, bottom: bottomFinal });
        }
      }

      return mergeNearbyBands(bands, height);
    }

    function detectSystemBands(svgElement, renderScale, imageHeight, imageInfo) {
      var rasterBands = detectSystemBandsFromRaster(imageInfo);
      if (rasterBands.length) {
        return rasterBands;
      }

      var systems = Array.prototype.slice.call(svgElement.querySelectorAll("g.vf-system"));
      var bands = [];

      if (systems.length) {
        systems.forEach(function (system) {
          try {
            var box = system.getBBox();
            bands.push({
              top: Math.max(0, Math.floor(box.y * renderScale)),
              bottom: Math.min(imageHeight, Math.ceil((box.y + box.height) * renderScale))
            });
          } catch (_error) {
            // Ignore invalid boxes and fallback below if needed.
          }
        });
      }

      if (!bands.length) {
        var staves = Array.prototype.slice.call(svgElement.querySelectorAll("g.vf-stave"));
        var staffBoxes = [];

        staves.forEach(function (stave) {
          try {
            var staffBox = stave.getBBox();
            if (staffBox.height > 0) {
              staffBoxes.push(staffBox);
            }
          } catch (_error) {
            // Ignore invalid boxes.
          }
        });

        if (staffBoxes.length) {
          staffBoxes.sort(function (a, b) {
            return a.y - b.y;
          });

          var medianHeight = staffBoxes[Math.floor(staffBoxes.length / 2)].height || 40;
          var newSystemThreshold = medianHeight * 2.2;
          var current = {
            top: staffBoxes[0].y,
            bottom: staffBoxes[0].y + staffBoxes[0].height,
            lastY: staffBoxes[0].y
          };

          for (var i = 1; i < staffBoxes.length; i += 1) {
            var box = staffBoxes[i];
            if (box.y - current.lastY > newSystemThreshold) {
              bands.push({
                top: Math.max(0, Math.floor(current.top * renderScale)),
                bottom: Math.min(imageHeight, Math.ceil(current.bottom * renderScale))
              });
              current = {
                top: box.y,
                bottom: box.y + box.height,
                lastY: box.y
              };
            } else {
              current.bottom = Math.max(current.bottom, box.y + box.height);
              current.lastY = box.y;
            }
          }

          bands.push({
            top: Math.max(0, Math.floor(current.top * renderScale)),
            bottom: Math.min(imageHeight, Math.ceil(current.bottom * renderScale))
          });
        }
      }

      bands.sort(function (a, b) {
        return a.top - b.top;
      });

      return bands.filter(function (band) {
        return band.bottom > band.top;
      });
    }

    function computePageSlices(imageInfo, svgElement, maxHeightPx) {
      var renderScale = imageInfo.renderScale || 2;
      var bands = detectSystemBands(svgElement, renderScale, imageInfo.height, imageInfo);
      var slices = [];

      if (!bands.length) {
        var cursor = 0;
        while (cursor < imageInfo.height) {
          var next = Math.min(imageInfo.height, cursor + maxHeightPx);
          slices.push({ start: cursor, end: next });
          cursor = next;
        }
        return slices;
      }

      var pageStart = 0;
      var pageBottom = 0;

      bands.forEach(function (band, index) {
        var bandTop = Math.max(0, Math.floor(band.top));
        var bandBottom = Math.min(imageInfo.height, Math.ceil(band.bottom));

        if (index === 0) {
          pageStart = 0;
          pageBottom = bandBottom;
          return;
        }

        if (bandBottom - pageStart <= maxHeightPx) {
          pageBottom = bandBottom;
          return;
        }

        slices.push({
          start: pageStart,
          end: Math.max(pageStart + 1, pageBottom)
        });

        pageStart = bandTop;
        pageBottom = bandBottom;
      });

      if (pageBottom > pageStart) {
        slices.push({
          start: pageStart,
          end: Math.max(pageStart + 1, Math.min(imageInfo.height, pageBottom))
        });
      }

      return slices;
    }

    function addRasterToPdfPages(imageInfo, orientation, svgElement) {
      if (!doc) {
        doc = new jsPDFCtor({ orientation: orientation, unit: "pt", format: "a4" });
      } else {
        doc.addPage("a4", orientation === "landscape" ? "l" : "p");
      }

      var pageWidth = doc.internal.pageSize.getWidth();
      var pageHeight = doc.internal.pageSize.getHeight();
      var maxWidth = pageWidth - (pageMarginX * 2);
      var maxHeight = pageHeight - (pageMarginY * 2);

      var bands = detectSystemBands(svgElement, imageInfo.renderScale || 2, imageInfo.height, imageInfo);
      var tallestSystemHeight = bands.reduce(function (max, band) {
        return Math.max(max, band.bottom - band.top);
      }, 0);

      var scale = maxWidth / imageInfo.width;
      if (tallestSystemHeight > 0) {
        scale = Math.min(scale, maxHeight / tallestSystemHeight);
      }
      var fixedScale = scale;
      var sourceSliceHeight = Math.max(1, Math.floor(maxHeight / scale));
      var slices = computePageSlices(imageInfo, svgElement, sourceSliceHeight);

      slices.forEach(function (slice, sliceIndex) {
        var currentSliceHeight = Math.max(1, slice.end - slice.start);

        if (sliceIndex > 0) {
          doc.addPage("a4", orientation === "landscape" ? "l" : "p");
          pageWidth = doc.internal.pageSize.getWidth();
          pageHeight = doc.internal.pageSize.getHeight();
          maxWidth = pageWidth - (pageMarginX * 2);
        }

        var sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = imageInfo.width;
        sliceCanvas.height = currentSliceHeight;
        var sliceCtx = sliceCanvas.getContext("2d");
        if (!sliceCtx) {
          return Promise.reject(new Error("Canvas unavailable for PDF slicing"));
        }

        sliceCtx.fillStyle = "#ffffff";
        sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        sliceCtx.drawImage(
          imageInfo.canvas,
          0,
          slice.start,
          imageInfo.width,
          currentSliceHeight,
          0,
          0,
          imageInfo.width,
          currentSliceHeight
        );

        var drawWidth = imageInfo.width * fixedScale;
        var drawHeight = currentSliceHeight * fixedScale;
        var x = pageMarginX;
        var y = pageMarginY;

        doc.addImage(sliceCanvas.toDataURL("image/png"), "PNG", x, y, drawWidth, drawHeight, undefined, "FAST");
      });

      return Promise.resolve();
    }

    function addPageImage(index) {
      if (index >= svgPages.length) {
        if (!doc) {
          return Promise.reject(new Error("No pages available for PDF export"));
        }
        doc.save(baseName + ".pdf");
        ctx.setStatus("Downloaded " + baseName + ".pdf.");
        return Promise.resolve();
      }

      return svgElementToPng(svgPages[index], 2)
        .then(function (imageInfo) {
          var orientation = getOrientation(imageInfo);
          return addRasterToPdfPages(imageInfo, orientation, svgPages[index])
            .then(function () {
              return addPageImage(index + 1);
            });
        });
    }

    return addPageImage(0);
  }

  function getXmlForExport(ctx) {
    var xml = "";

    try {
      xml = ctx.getEditorContent();
    } catch (_error) {
      xml = "";
    }

    if (!xml) {
      var scoreRenderer = ctx.getScoreRenderer ? ctx.getScoreRenderer() : null;
      if (scoreRenderer && typeof scoreRenderer.getLastRenderedXml === "function") {
        xml = scoreRenderer.getLastRenderedXml() || "";
      }
    }

    return xml;
  }

  function getBaseFileName(sampleSelectValue) {
    if (!sampleSelectValue) {
      return "modified-score";
    }

    return sampleSelectValue.replace(/\.(xml|musicxml|mxl)$/i, "") + "-modified";
  }

  window.DownloadTools = {
    init: function (ctx) {
      function downloadModifiedMusicXml() {
        var xml = getXmlForExport(ctx);
        if (!xml) {
          ctx.setStatus("Nothing to export yet. Render or edit a score first.");
          return;
        }

        var sampleName = ctx.sampleSelect && ctx.sampleSelect.value ? ctx.sampleSelect.value : "";
        var fileName = getBaseFileName(sampleName) + ".musicxml";

        var blob = new Blob([xml], { type: "application/vnd.recordare.musicxml+xml;charset=utf-8" });
        var objectUrl = URL.createObjectURL(blob);
        var anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(objectUrl);

        ctx.setStatus("Downloaded " + fileName + ".");
      }

      function downloadModifiedMusicXmlPdf() {
        var xml = getXmlForExport(ctx);
        if (!xml) {
          ctx.setStatus("Nothing to export yet. Render or edit a score first.");
          return;
        }

        var sampleName = ctx.sampleSelect && ctx.sampleSelect.value ? ctx.sampleSelect.value : "";
        var baseName = getBaseFileName(sampleName);

        ctx.setStatus("Preparing PDF export...");

        ensureJsPdfLoaded()
          .then(function () {
            return ctx.osmd.load(xml)
              .then(function () {
                ctx.osmd.render();
              })
              .then(function () {
                return exportRenderedScoreAsPdf(ctx, baseName);
              });
          })
          .catch(function () {
            ctx.setStatus("PDF export unavailable. Ensure a score is rendered and jsPDF can be loaded.");
          });
      }

      return {
        downloadModifiedMusicXml: downloadModifiedMusicXml,
        downloadModifiedMusicXmlPdf: downloadModifiedMusicXmlPdf
      };
    }
  };
})();
