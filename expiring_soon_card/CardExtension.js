sap.ui.define([
  "sap/ui/integration/Extension"
], function (Extension) {
  "use strict";

  return Extension.extend("expiring_soon_card.CardExtension", {

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
          var today = new Date();
          today.setHours(0, 0, 0, 0);

          var aAssessments = Array.isArray(oData.assessments)
            ? oData.assessments
            : [];

          // Only certifications that are overdue or almost expired
          aAssessments = aAssessments.filter(function (oItem) {
            if (!oItem.status || oItem.status.type !== "Certification") {
              return false;
            }
            var sStatusId = oItem.status.statusId;
            return sStatusId === "O" || oItem.almostExpired === true;
          });

          // Sort: overdue first, then by validUntil ascending (earliest expiry first)
          aAssessments.sort(function (a, b) {
            var aOverdue = a.status && a.status.statusId === "O";
            var bOverdue = b.status && b.status.statusId === "O";
            if (aOverdue !== bOverdue) {
              return aOverdue ? -1 : 1;
            }
            var aDate = a.validUntil ? new Date(a.validUntil) : new Date(9999, 0);
            var bDate = b.validUntil ? new Date(b.validUntil) : new Date(9999, 0);
            return aDate - bDate;
          });

          var aItems = aAssessments.map(function (oItem) {
            var sValidUntil = oItem.validUntil
              ? oItem.validUntil.slice(0, 10)
              : "";

            var bOverdue = oItem.status && oItem.status.statusId === "O";

            // Calculate days overdue or days until expiry
            var sDaysText = "";
            if (sValidUntil) {
              var oExpiry = new Date(sValidUntil);
              oExpiry.setHours(0, 0, 0, 0);
              var iDiff = Math.round((oExpiry - today) / (1000 * 60 * 60 * 24));
              if (iDiff < 0) {
                sDaysText = Math.abs(iDiff) + " day(s) overdue";
              } else if (iDiff === 0) {
                sDaysText = "Expires today";
              } else {
                sDaysText = "Expires in " + iDiff + " day(s)";
              }
            }

            return {
              title: (oItem.competence && oItem.competence.externalName) || oItem.competenceId,
              description: sValidUntil ? "Valid until: " + sValidUntil : "",
              infoText: sDaysText,
              infoState: bOverdue ? "Error" : "Warning",
              highlight: bOverdue ? "Error" : "Warning"
            };
          });

          var iOverdue = aItems.filter(function (i) { return i.highlight === "Error"; }).length;

          return {
            defaultFullName: oData.defaultFullName || "",
            statusText: iOverdue + " overdue · " + aItems.length + " total",
            items: aItems
          };
        })
        .catch(function () {
          return {
            defaultFullName: "",
            statusText: "—",
            items: []
          };
        });
    }

  });
});