sap.ui.define([
  "sap/ui/integration/Extension"
], function (Extension) {
  "use strict";

  return Extension.extend("aggregated_score_card.CardExtension", {

    formatters: {

      roundScore: function (value) {
        return (Math.round((Number(value) || 0) * 100) / 100).toFixed(2);
      },

      headerState: function (value) {
        var f = Number(value) || 0;
        return f >= 70 ? "Good" : f >= 40 ? "Critical" : "Error";
      },

      itemState: function (value) {
        var f = Number(value) || 0;
        return f >= 70 ? "Success" : f >= 40 ? "Warning" : "Error";
      }

    }

  });
});