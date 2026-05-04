sap.ui.define([
  "sap/ui/integration/Extension"
], function (Extension) {
  "use strict";

  return Extension.extend("certifications_list_card.CardExtension", {

    getData: function () {
      var oCard = this.getCard();

      return oCard.resolveDestination("comp_mat_card")
        .then(function (sBaseUrl) {
          return fetch(sBaseUrl + "/icv/employees/me", {
            headers: { "Accept": "application/json" }
          });
        })
        .then(function (oResponse) {
          if (!oResponse.ok) {
            throw new Error(oResponse.status);
          }
          return oResponse.json();
        })
        .then(function (oData) {
          var aAssessments = Array.isArray(oData.assessments)
            ? oData.assessments
            : [];

          // Only certifications
          aAssessments = aAssessments.filter(function (oItem) {
            return oItem.status && oItem.status.type === "Certification";
          });

          var aItems = aAssessments.map(function (oItem) {
            var sValidUntil = oItem.validUntil
              ? oItem.validUntil.slice(0, 10)
              : "";

            var sIconColor = (oItem.status && oItem.status.iconColor) || "noColor";
            var sHighlight =
              sIconColor === "red"    ? "Error"   :
              sIconColor === "orange" ? "Warning" :
              sIconColor === "green"  ? "Success" :
              "None";

            return {
              title: (oItem.competence && oItem.competence.externalName) || oItem.competenceId,
              description: sValidUntil ? "Valid until: " + sValidUntil : "",
              infoText: (oItem.status && oItem.status.statusName) || "",
              highlight: sHighlight
            };
          });

          return {
            defaultFullName: oData.defaultFullName || "",
            statusText: aItems.length + " certification(s)",
            items: aItems
          };
        })
        .catch(function () {
          return {
            defaultFullName: "",
            statusText: "0 certification(s)",
            items: []
          };
        });
    }

  });
});