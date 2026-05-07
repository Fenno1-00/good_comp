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
      items: oOptions.items || [],
      error: oOptions.error || ""
    };
  }

  function getStatusState(sIconColor) {
    return sIconColor === "red"
      ? "Error"
      : sIconColor === "orange"
        ? "Warning"
        : sIconColor === "green"
          ? "Success"
          : "None";
  }

  function getConnectedText(oItem) {
    var sComment = (oItem.comment || "").trim();
    var sCurriculumId = oItem.curriculum && (oItem.curriculum.curriculumID || oItem.curriculum.externalCode);

    if (sComment) {
      if (sComment.indexOf("COURSE$$_$$") !== -1) {
        return "Connected: " + sComment
          .split(",")
          .map(function (sEntry) {
            return sEntry.replace("COURSE$$_$$", "").trim();
          })
          .filter(Boolean)
          .join(", ");
      }

      return "Comment: " + sComment;
    }

    if (sCurriculumId) {
      return "Connected: " + sCurriculumId;
    }

    if (oItem.competence && oItem.competence.cust_linkLMS) {
      return "Connected: LMS";
    }

    return "";
  }

  function createItem(oItem) {
    var sType = (oItem.status && (oItem.status.type || oItem.status.scaleName)) || "Assessment";
    var sConnectedText = getConnectedText(oItem);

    return {
      title: (oItem.competence && oItem.competence.externalName) || oItem.competenceId,
      detailText: sConnectedText
        ? "Type: " + sType + " | " + sConnectedText
        : "Type: " + sType,
      statusText: (oItem.status && oItem.status.statusName) || "Auto updated",
      statusState: getStatusState(oItem.status && oItem.status.iconColor)
    };
  }

  return UIComponent.extend("competencycards.autoUpdatedOverview.Component", {
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
          var aAssessments = Array.isArray(oData.assessments) ? oData.assessments : [];
          var aItems = aAssessments
            .filter(function (oItem) {
              return oItem.autoUpdated === true;
            })
            .map(createItem)
            .sort(function (oLeft, oRight) {
              return oLeft.title.localeCompare(oRight.title);
            });

          oViewModel.setData(createViewData({
            busy: false,
            fullName: oData.defaultFullName || "",
            summaryText: aItems.length + " auto-updated out of " + aAssessments.length + " total assessment(s)",
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