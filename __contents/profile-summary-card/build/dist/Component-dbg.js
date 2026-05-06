sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
  "use strict";

  function getInitials(sName) {
    return (sName || "").split(/\s+/).filter(Boolean).slice(0, 2).map(function (sPart) {
      return sPart.charAt(0).toUpperCase();
    }).join("") || "?";
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

  function createViewData(mOptions) {
    var oOptions = mOptions || {};

    return {
      busy: oOptions.busy !== false,
      fullName: oOptions.fullName || "",
      initials: oOptions.initials || "?",
      relationLabel: oOptions.relationLabel || "EMPLOYEE",
      email: oOptions.email || "",
      userId: oOptions.userId || "",
      jobCode: oOptions.jobCode || "",
      department: oOptions.department || "",
      division: oOptions.division || "",
      location: oOptions.location || "",
      country: oOptions.country || "",
      hireDate: oOptions.hireDate || "",
      functionName: oOptions.functionName || "",
      managerName: oOptions.managerName || "",
      teamMembersSize: oOptions.teamMembersSize || "0",
      error: oOptions.error || ""
    };
  }

  return UIComponent.extend("competencycards.profile.Component", {
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
          oViewModel.setData(createViewData({
            busy: false,
            fullName: oData.defaultFullName || "",
            initials: getInitials(oData.defaultFullName),
            relationLabel: String(oData.relationToCurrentUser || "EMPLOYEE").toUpperCase(),
            email: oData.email || "",
            userId: String(oData.userId || ""),
            jobCode: oData.jobCode || "",
            department: oData.department || "",
            division: oData.division || "",
            location: oData.location || "",
            country: oData.country || "",
            hireDate: formatDateValue(oData.hireDate),
            functionName: oData.function || "",
            managerName: oData.manager && oData.manager.defaultFullName || "",
            teamMembersSize: String(oData.teamMembersSize || 0)
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