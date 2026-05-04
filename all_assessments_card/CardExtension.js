sap.ui.define([
  "sap/ui/integration/Extension"
], function (Extension) {
  "use strict";

  // Module-level cache — survives any internal card lifecycle
  var _cache = {
    assessments: [],
    fullName: "",
    loaded: false,
    activeFilter: "all"
  };

  return Extension.extend("all_assessments_card.CardExtension", {

    onCardReady: function () {
      var oExt = this;

      // attachAction fires when any Custom actionsStrip button is pressed.
      // Store the filter and call refreshData() — this re-invokes getData()
      // which returns filtered data from the cache (no network request).
      this.attachAction(function (oEvent) {
        var sType = oEvent.getParameter("type");
        var oParams = oEvent.getParameter("parameters");

        if (sType === "Custom" && oParams && oParams.filterType !== undefined) {
          _cache.activeFilter = oParams.filterType;
          oExt.getCard().refreshData();
        }
      });
    },

    getData: function () {
      var oExt = this;
      var oCard = this.getCard();

      // If data is already cached, skip the network request and return filtered result
      if (_cache.loaded) {
        return Promise.resolve(oExt._buildResult(_cache.activeFilter));
      }

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
          _cache.assessments = Array.isArray(oData.assessments) ? oData.assessments : [];
          _cache.fullName = oData.defaultFullName || "";
          _cache.loaded = true;
          return oExt._buildResult(_cache.activeFilter);
        })
        .catch(function () {
          _cache.assessments = [];
          _cache.loaded = false;
          return { defaultFullName: "", statusText: "0 assessments", items: [] };
        });
    },

    _buildResult: function (sFilterType) {
      var aAssessments = _cache.assessments.slice();

      if (sFilterType === "Certification") {
        aAssessments = aAssessments.filter(function (oItem) {
          return oItem.status && oItem.status.scaleName === "Certification";
        });
      } else if (sFilterType === "Competency") {
        aAssessments = aAssessments.filter(function (oItem) {
          return oItem.status && oItem.status.scaleName !== "Certification";
        });
      }

      var aItems = aAssessments.map(function (oItem) {
        var bIsCert = oItem.status && oItem.status.isCert;
        var iGap = Number(oItem.gap);

        var sDescription = bIsCert
          ? (oItem.validUntil ? "Valid until: " + oItem.validUntil.slice(0, 10) : "")
          : (iGap >= 0 ? "On Track" : iGap === -1 ? "Minor Gap" : "Major Gap");

        var sIconColor = (oItem.status && oItem.status.iconColor) || "noColor";
        var sHighlight =
          sIconColor === "red"    ? "Error"   :
          sIconColor === "orange" ? "Warning" :
          sIconColor === "green"  ? "Success" : "None";

        return {
          title: (oItem.competence && oItem.competence.externalName) || oItem.competenceId,
          description: sDescription,
          infoText: (oItem.status && oItem.status.statusName) || "",
          highlight: sHighlight,
          icon: (oItem.status && oItem.status.statusIcon) || ""
        };
      });

      var sLabel =
        sFilterType === "Certification" ? "certification(s)" :
        sFilterType === "Competency"    ? "competenc(y/ies)" :
        "assessment(s)";

      return {
        defaultFullName: _cache.fullName,
        statusText: aItems.length + " " + sLabel,
        items: aItems
      };
    }

  });
});