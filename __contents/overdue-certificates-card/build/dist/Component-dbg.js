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
      overdueCount: oOptions.overdueCount || 0,
      items: oOptions.items || [],
      error: oOptions.error || ""
    };
  }

  function formatDateValue(sDateValue) {
    if (!sDateValue) {
      return "No expiry date";
    }

    return new Date(sDateValue).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  function createOverdueText(sDateValue, oToday) {
    var oExpiryDate;
    var iDiff;

    if (!sDateValue) {
      return "Expiry date missing";
    }

    oExpiryDate = new Date(sDateValue);
    oExpiryDate.setHours(0, 0, 0, 0);
    iDiff = Math.round((oToday - oExpiryDate) / (1000 * 60 * 60 * 24));

    if (iDiff <= 0) {
      return "Overdue";
    }

    return iDiff + " day(s) overdue";
  }

  return UIComponent.extend("competencycards.overdueCertificates.Component", {
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

          oToday.setHours(0, 0, 0, 0);

          aItems = aAssessments.filter(function (oItem) {
            return oItem &&
              oItem.status &&
              oItem.status.type === "Certification" &&
              oItem.status.statusId === "O";
          }).sort(function (oItemA, oItemB) {
            var oDateA = oItemA.validUntil ? new Date(oItemA.validUntil) : new Date(0);
            var oDateB = oItemB.validUntil ? new Date(oItemB.validUntil) : new Date(0);

            return oDateA - oDateB;
          }).map(function (oItem) {
            return {
              title: oItem.competence && oItem.competence.externalName || oItem.competenceId || "Unknown certificate",
              subtitle: "Expired on " + formatDateValue(oItem.validUntil),
              infoText: createOverdueText(oItem.validUntil, oToday)
            };
          });

          oViewModel.setData(createViewData({
            busy: false,
            fullName: oData.defaultFullName || "",
            summaryText: aItems.length ? "Certificates that require renewal now" : "No overdue certificates",
            overdueCount: aItems.length,
            items: aItems
          }));
        })
        .catch(function () {
          oViewModel.setData(createViewData({
            busy: false,
            error: "Failed to load overdue certificates"
          }));
        });
    }
  });
});