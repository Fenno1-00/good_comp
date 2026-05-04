sap.ui.define([
  "sap/ui/integration/Extension"
], function (Extension) {
  "use strict";

  return Extension.extend("assessment_detail_card.GapListExtension", {

    _getSelectedRoleId: function () {
      var oCard = this.getCard();
      var oFiltersModel = oCard && oCard.getModel("filters");
      var sRoleId = oFiltersModel && oFiltersModel.getProperty("/roleId/value");

      if (!sRoleId && oCard && typeof oCard.getCombinedParameters === "function") {
        var oParams = oCard.getCombinedParameters() || {};
        sRoleId = oParams.roleId || oParams.targetRoles || "";
      }

      console.log("[AD2] selected roleId:", sRoleId || "(none)");
      return sRoleId || "";
    },

    _buildItems: function (aAssessments, sRoleId) {
      var aFiltered = aAssessments.filter(function (oItem) {
        var bRoleMatch = !sRoleId || oItem.targetRoleId === sRoleId;
        return bRoleMatch && oItem.isRoleRelevant === true;
      });

      var iPositive = aFiltered.filter(function (oItem) { return parseFloat(oItem.gap) > 0; }).length;
      var iMinusOne = aFiltered.filter(function (oItem) { return parseFloat(oItem.gap) === -1; }).length;
      var iCritical = aFiltered.filter(function (oItem) {
        var gap = parseFloat(oItem.gap);
        return !isNaN(gap) && gap < -1;
      }).length;

      console.log("[AD2] total assessments:", aAssessments.length);
      console.log("[AD2] role-relevant assessments:", aFiltered.length);
      console.log("[AD2] gap counts -> gap>0:", iPositive, "| gap=-1:", iMinusOne, "| gap<-1:", iCritical);

      return {
        statusText: aFiltered.length + " relevant assessments",
        items: [
          { title: "Gap > 0", infoText: String(iPositive) },
          { title: "Gap = -1", infoText: String(iMinusOne) },
          { title: "Gap < -1", infoText: String(iCritical) }
        ]
      };
    },

    onCardReady: function () {
      var oCard = this.getCard();
      console.log("[AD2] onCardReady");

      oCard.attachConfigurationChange(function (oEvent) {
        var oChanges = oEvent.getParameter("changes") || {};
        console.log("[AD2] configurationChange:", oChanges);

        if (Object.prototype.hasOwnProperty.call(oChanges, "/sap.card/configuration/filters/roleId/value")) {
          console.log("[AD2] role filter changed -> refreshData()", oChanges["/sap.card/configuration/filters/roleId/value"]);
          oCard.refreshData();
        }
      }, this);
    },

    getData: function () {
      var oCard = this.getCard();
      var sRoleId = this._getSelectedRoleId();
      var oExtension = this;

      return oCard.resolveDestination("comp_mat_card")
        .then(function (sBaseUrl) {
          var sUrl = sBaseUrl.replace(/\/$/, "") + "/icv/employees/me";

          if (sRoleId) {
            sUrl += "?targetRoles=" + encodeURIComponent(sRoleId);
          }

          console.log("[AD2] getData request:", sUrl);

          return fetch(sUrl, {
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
          var oResult = oExtension._buildItems(aAssessments, sRoleId);

          return {
            defaultFullName: oData.defaultFullName || "",
            statusText: oResult.statusText,
            items: oResult.items
          };
        })
        .catch(function (oError) {
          console.error("[AD2] getData failed", oError);

          return {
            defaultFullName: "",
            statusText: "0 relevant assessments",
            items: [
              { title: "Gap > 0", infoText: "0" },
              { title: "Gap = -1", infoText: "0" },
              { title: "Gap < -1", infoText: "0" }
            ]
          };
        });
    }

  });
});