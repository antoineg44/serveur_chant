(function () {
  "use strict";

  window.EditorWindow = {
    init: function (ctx) {
      function setEditorContent(xmlString) {
        if (ctx.xmlEditor) {
          ctx.xmlEditor.value = xmlString || "";
        }
      }

      function getEditorContent() {
        if (!ctx.xmlEditor) {
          return "";
        }
        return ctx.xmlEditor.value.replace(/^\uFEFF/, "").trim();
      }

      function parseEditorXmlDoc() {
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
        return new XMLSerializer().serializeToString(xmlDoc);
      }

      return {
        setEditorContent: setEditorContent,
        getEditorContent: getEditorContent,
        parseEditorXmlDoc: parseEditorXmlDoc,
        serializeXmlDoc: serializeXmlDoc
      };
    }
  };
})();
