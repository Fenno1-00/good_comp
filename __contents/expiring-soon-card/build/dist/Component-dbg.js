sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
  "use strict";

  function createViewData(mOptions) {
    var oOptions = mOptions || {};

    return {
      busy: oOptions.busy !== false,
      fullName: oOptions.fullName || "",
      summaryText: oOptions.summaryText || "",
      statusText: oOptions.statusText || "",
      statusState: oOptions.statusState || "None",
      overdueCount: oOptions.overdueCount || 0,
      expiringCount: oOptions.expiringCount || 0,
      items: oOptions.items || [],
      error: oOptions.error || ""
    };
  }

  function formatDateValue(sDateValue) {
    if (!sDateValue) {
      return "";
    }

    return new Date(sDateValue).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  function createExpiryInfo(oItem, oToday) {
    var oExpiryDate;
    var iDiff;

    if (!oItem.validUntil) {
      return "No expiry date";
    }

    oExpiryDate = new Date(oItem.validUntil);
    oExpiryDate.setHours(0, 0, 0, 0);
    iDiff = Math.round((oExpiryDate - oToday) / (1000 * 60 * 60 * 24));

    if (iDiff < 0) {
      return Math.abs(iDiff) + " day(s) overdue";
    }

    if (iDiff === 0) {
      return "Expires today";
    }

    return "Expires in " + iDiff + " day(s)";
  }

  return UIComponent.extend("competencycards.expiring.Component", {
    metadata: {
      manifest: "json"
    },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);
      this.setModel(new JSONModel(createViewData()), "view");
    },

    onCardReady: function (oCard) {
      this._oCard = oCard;
      this._loadData();
    },

    _loadData: function () {
      var oViewModel = this.getModel("view");

      oViewModel.setData(createViewData({
        busy: true
      }));

      return this._oCard.resolveDestination("comp_mat_card")
        .then(function (sBaseUrl) {
          return fetch(sBaseUrl.replace(/\/$/, "") + "/icv/employees/me", {
            headers: {
              "Accept": "application/json"
            }
          });
        })
        .then(function (oResponse) {
          if (!oResponse.ok) {
            throw new Error("Request failed: " + oResponse.status);
          }

          return oResponse.json();
        })
        .then(function (oData) {
          var oToday = new Date();
          var aAssessments = Array.isArray(oData.assessments) ? oData.assessments : [];
          var aItems;
          var iOverdue;
          var iExpiringSoon;

          oToday.setHours(0, 0, 0, 0);

          aItems = aAssessments.filter(function (oItem) {
            if (!oItem.status || oItem.status.type !== "Certification") {
              return false;
            }

            return oItem.status.statusId === "O" || oItem.almostExpired === true;
          }).sort(function (oItemA, oItemB) {
            var bOverdueA = oItemA.status && oItemA.status.statusId === "O";
            var bOverdueB = oItemB.status && oItemB.status.statusId === "O";
            var oDateA = oItemA.validUntil ? new Date(oItemA.validUntil) : new Date(8640000000000000);
            var oDateB = oItemB.validUntil ? new Date(oItemB.validUntil) : new Date(8640000000000000);

            if (bOverdueA !== bOverdueB) {
              return bOverdueA ? -1 : 1;
            }

            return oDateA - oDateB;
          }).map(function (oItem) {
            var bOverdue = oItem.status && oItem.status.statusId === "O";

            return {
              title: oItem.competence && oItem.competence.externalName || oItem.competenceId || "Unknown",
              subtitle: oItem.validUntil ? "Valid until " + formatDateValue(oItem.validUntil) : "No expiry date",
              infoText: createExpiryInfo(oItem, oToday),
              state: bOverdue ? "Error" : "Warning"
            };
          });

          iOverdue = aItems.filter(function (oItem) {
            return oItem.state === "Error";
          }).length;
          iExpiringSoon = aItems.length - iOverdue;

          oViewModel.setData(createViewData({
            busy: false,
            fullName: oData.defaultFullName || "",
            summaryText: aItems.length ? "Priority renewals for the next review window" : "No immediate renewal actions",
            statusText: iOverdue > 0 ? "Action needed" : aItems.length ? "Monitor closely" : "All clear",
            statusState: iOverdue > 0 ? "Error" : aItems.length ? "Warning" : "Success",
            overdueCount: iOverdue,
            expiringCount: iExpiringSoon,
            items: aItems
          }));
        })
        .catch(function () {
          oViewModel.setData(createViewData({
            busy: false,
            error: "Failed to load data"
          }));
        });
    }
  });
});