sap.ui.define([
  "sap/ui/integration/Extension",
  "sap/m/Popover",
  "sap/m/List",
  "sap/m/StandardListItem"
], function (Extension, Popover, List, StandardListItem) {
  "use strict";

  var SHARED_ROLE_FILTER_KEY = "competencycards.sharedRoleFilter";

  function getSharedRoleId() {
    try {
      return window.localStorage.getItem(SHARED_ROLE_FILTER_KEY) || "";
    } catch (oError) {
      return "";
    }
  }

  return Extension.extend("certification_assessments_card.CardExtension", {

    _oGroupedData: null,
    _oPopover: null,
    _sCurrentRoleId: "",

    init: function () {
      this._fnSharedRoleChange = this._handleSharedRoleChange.bind(this);

      if (typeof window !== "undefined") {
        window.addEventListener("storage", this._fnSharedRoleChange);
        window.addEventListener("competencycards:sharedRoleFilterChanged", this._fnSharedRoleChange);
      }
    },

    exit: function () {
      if (typeof window !== "undefined" && this._fnSharedRoleChange) {
        window.removeEventListener("storage", this._fnSharedRoleChange);
        window.removeEventListener("competencycards:sharedRoleFilterChanged", this._fnSharedRoleChange);
      }
    },

    _handleSharedRoleChange: function (oEvent) {
      var sRoleId;
      var oCard = this.getCard();

      if (!oCard) {
        return;
      }

      if (oEvent.type === "storage") {
        if (oEvent.key !== SHARED_ROLE_FILTER_KEY) {
          return;
        }

        sRoleId = oEvent.newValue || "";
      } else {
        sRoleId = oEvent.detail && oEvent.detail.roleId || "";
      }

      if (sRoleId === this._sCurrentRoleId) {
        return;
      }

      this._sCurrentRoleId = sRoleId;
      oCard.refreshData();
    },

    /* ==========================
       Chart slice click handler
       ========================== */
    onChartSelect: function (oEvent) {
      console.log("clicked", oEvent);

      var sGroup = oEvent.getParameter("parameters").label;

      if (!this._oGroupedData) {
        return;
      }

      var aItems = this._oGroupedData[sGroup] || [];
      var oSource = oEvent.getSource() || this.getCard();

      // sort by validUntil (optional)
      aItems.sort(function (a, b) {
        return new Date(a.validUntil || 0) - new Date(b.validUntil || 0);
      });

      // create or reuse popover
      if (!this._oPopover) {
        this._oPopover = new Popover({
          contentMinWidth: "320px",
          placement: "Auto"
        });
      }

      this._oPopover.removeAllContent();

      var oList = new List({
        noDataText: "No certifications found",
        items: aItems.map(function (oItem) {
          return new StandardListItem({
            title: oItem.title,
            description: oItem.status,
            info: oItem.validUntil
              ? new Date(oItem.validUntil).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric"
                })
              : "",
            icon: oItem.icon
          });
        })
      });

      this._oPopover.addContent(oList);
      this._oPopover.setTitle(sGroup + " (" + aItems.length + ")");

      this._oPopover.openBy(oSource);
    },

    /* ==========================
       Data preparation
       ========================== */
    getData: function () {
      var oCard = this.getCard();
      var oExt = this;
      var sSharedRoleId = getSharedRoleId();

      this._sCurrentRoleId = sSharedRoleId;

      return oCard.resolveDestination("comp_mat_card")
        .then(function (sBaseUrl) {
          var sUrl = sBaseUrl.replace(/\/$/, "") + "/icv/employees/me";

          if (sSharedRoleId) {
            sUrl += "?targetRoles=" + encodeURIComponent(sSharedRoleId);
          }

          return fetch(sUrl, {
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

          // only certifications
          aAssessments = aAssessments.filter(function (oItem) {
            return oItem.status && oItem.status.type === "Certification";
          });

          var oGrouped = {
            "On Track": [],
            "Minor Gap": [],
            "Major Gap": []
          };

          var oCounts = {
            "On Track": 0,
            "Minor Gap": 0,
            "Major Gap": 0
          };

          aAssessments.forEach(function (oItem) {
            var iGap = Number(oItem.gap);

            var sGroup =
              iGap >= 0 ? "On Track" :
              iGap === -1 ? "Minor Gap" :
              "Major Gap";

            oCounts[sGroup]++;

            oGrouped[sGroup].push({
              title: oItem.competence
                ? oItem.competence.externalName
                : oItem.competenceId,
              status: oItem.status.statusName,
              validUntil: oItem.validUntil || null,
              icon: oItem.status.statusIcon || "sap-icon://document"
            });
          });

          oExt._oGroupedData = oGrouped;

          return {
            defaultFullName: oData.defaultFullName || "",
            gapSummary: [
              { label: "On Track",  count: oCounts["On Track"] },
              { label: "Minor Gap", count: oCounts["Minor Gap"] },
              { label: "Major Gap", count: oCounts["Major Gap"] }
            ]
          };
        })
        .catch(function () {

          oExt._oGroupedData = {
            "On Track": [],
            "Minor Gap": [],
            "Major Gap": []
          };

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