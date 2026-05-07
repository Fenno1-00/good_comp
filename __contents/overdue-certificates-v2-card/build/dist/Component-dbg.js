sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
  "use strict";

  var TRAINING_APP_URL_PREFIX = "https://flexso-consumer-dev.launchpad.cfapps.eu10.hana.ondemand.com/site?siteId=c527b1f3-011c-44f0-9e42-0374d6614bdf#training-proficiency?sap-app-origin-hint=c107c03c-5919-4e30-be0b-e218a3b69760&/";
  var TRAINING_APP_URL_SUFFIX = "/40021/0038/?";

  function createViewData(mOptions) {
    var oOptions = mOptions || {};

    return {
      busy: oOptions.busy !== false,
      fullName: oOptions.fullName || "",
      summaryText: oOptions.summaryText || "",
      overdueCount: oOptions.overdueCount || 0,
      trainingHtmlText: oOptions.trainingHtmlText || "",
      trainingUrl: oOptions.trainingUrl || "",
      trainingMessage: oOptions.trainingMessage || "",
      items: oOptions.items || [],
      error: oOptions.error || ""
    };
  }

  function escapeHtml(sValue) {
    return String(sValue || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeTrainingUserId(vCandidate) {
    var sCandidate = vCandidate === null || vCandidate === undefined ? "" : String(vCandidate).trim();

    if (!sCandidate || /\s|@/.test(sCandidate)) {
      return "";
    }

    return /^[A-Za-z0-9._-]+$/.test(sCandidate) ? sCandidate : "";
  }

  function extractTrainingUserId(oData, aAssessments) {
    var aCandidates = [
      oData && oData.userId,
      oData && oData.username,
      oData && oData.personIdExternal,
      oData && oData.employeeId,
      oData && oData.user && oData.user.userId,
      oData && oData.user && oData.user.username
    ];
    var sCandidate;
    var iIndex;

    (aAssessments || []).some(function (oItem) {
      aCandidates.push(
        oItem && oItem.userId,
        oItem && oItem.user && oItem.user.userId,
        oItem && oItem.user && oItem.user.username
      );

      return aCandidates.length >= 12;
    });

    for (iIndex = 0; iIndex < aCandidates.length; iIndex += 1) {
      sCandidate = normalizeTrainingUserId(aCandidates[iIndex]);

      if (sCandidate) {
        return sCandidate;
      }
    }

    return "";
  }

  function createTrainingUrl(sUserId) {
    if (!sUserId) {
      return "";
    }

    return TRAINING_APP_URL_PREFIX + encodeURIComponent(sUserId) + TRAINING_APP_URL_SUFFIX;
  }

  function createTrainingHtmlText(sTrainingUrl, sTrainingMessage) {
    if (sTrainingUrl) {
      return "Open training app: <a href=\"" + escapeHtml(sTrainingUrl) + "\" target=\"_blank\">View training profile</a>";
    }

    if (sTrainingMessage) {
      return "Open training app: " + escapeHtml(sTrainingMessage);
    }

    return "";
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

  return UIComponent.extend("competencycards.overdueCertificatesV2.Component", {
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
          var sTrainingUserId = extractTrainingUserId(oData, aAssessments);
          var sTrainingUrl = createTrainingUrl(sTrainingUserId);
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
            trainingHtmlText: createTrainingHtmlText(sTrainingUrl, sTrainingUrl ? "" : "Training profile unavailable"),
            trainingUrl: sTrainingUrl,
            trainingMessage: sTrainingUrl ? "" : "Training profile unavailable",
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