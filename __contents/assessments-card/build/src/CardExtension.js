sap.ui.define([
  "sap/ui/integration/Extension"
], function (Extension) {
  "use strict";

  return Extension.extend("assessments_card.CardExtension", {

    _oGroupedData: null,

    getData: function () {
      var oCard = this.getCard();
      var oExtension = this;

      return oCard.resolveDestination("comp_mat_card")
        .then(function (sBaseUrl) {
          return fetch(sBaseUrl + "/icv/employees/me", {
            headers: { "Accept": "application/json" }
          });
        })
        .then(function (oResponse) {
          if (!oResponse.ok) {
            throw new Error("Request failed: " + oResponse.status);
          }
          return oResponse.json();
        })
        .then(function (oData) {
          var aAssessments = Array.isArray(oData.assessments) ? oData.assessments : [];

          var oGrouped = { "On Track": [], "Minor Gap": [], "Major Gap": [] };
          var oCounts  = { "On Track": 0,  "Minor Gap": 0,  "Major Gap": 0  };

          aAssessments.forEach(function (oItem) {
            var iGap = Number(oItem.gap);
            var sGroup = iGap >= 0 ? "On Track" : iGap === -1 ? "Minor Gap" : "Major Gap";
            oCounts[sGroup]++;
            oGrouped[sGroup].push(
              oItem.competence ? oItem.competence.externalName : oItem.competenceId
            );
          });

          oExtension._oGroupedData = oGrouped;

          return {
            defaultFullName: oData.defaultFullName || "",
            gapSummary: [
              { label: "On Track",  count: oCounts["On Track"]  },
              { label: "Minor Gap", count: oCounts["Minor Gap"] },
              { label: "Major Gap", count: oCounts["Major Gap"] }
            ]
          };
        })
        .catch(function (error) {
          console.error("Card data error:", error);
          oExtension._oGroupedData = { "On Track": [], "Minor Gap": [], "Major Gap": [] };
          return {
            defaultFullName: "",
            gapSummary: [
              { label: "On Track",  count: 0 },
              { label: "Minor Gap", count: 0 },
              { label: "Major Gap", count: 0 }
            ]
          };
        });
    }

  });
});