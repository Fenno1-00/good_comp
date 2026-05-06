sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
  "use strict";

  var SHARED_ROLE_FILTER_KEY = "competencycards.sharedRoleFilter";
  var SHARED_ROLE_FILTER_EVENT = "competencycards:sharedRoleFilterChanged";

  function getSharedRoleId() {
    try {
      return window.localStorage.getItem(SHARED_ROLE_FILTER_KEY) || "";
    } catch (oError) {
      return "";
    }
  }

  function setSharedRoleId(sRoleId) {
    try {
      if (sRoleId) {
        window.localStorage.setItem(SHARED_ROLE_FILTER_KEY, sRoleId);
      } else {
        window.localStorage.removeItem(SHARED_ROLE_FILTER_KEY);
      }
    } catch (oError) {
      return;
    }
  }

  return UIComponent.extend("competencycards.roleFilter.Component", {
    metadata: {
      manifest: "json"
    },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);
      this.setModel(new JSONModel(this._createViewData()), "view");
      this._onSharedRoleFilterChanged = this._handleSharedRoleFilterChanged.bind(this);

      if (typeof window !== "undefined") {
        window.addEventListener("storage", this._onSharedRoleFilterChanged);
        window.addEventListener(SHARED_ROLE_FILTER_EVENT, this._onSharedRoleFilterChanged);
      }
    },

    exit: function () {
      if (typeof window !== "undefined" && this._onSharedRoleFilterChanged) {
        window.removeEventListener("storage", this._onSharedRoleFilterChanged);
        window.removeEventListener(SHARED_ROLE_FILTER_EVENT, this._onSharedRoleFilterChanged);
      }
    },

    onCardReady: function (oCard) {
      this._oCard = oCard;
      this._loadRoles(getSharedRoleId());
    },

    onRoleChange: function (sRoleId) {
      this._syncSharedRoleFilter(sRoleId);
      this.getModel("view").setProperty("/selectedRoleId", sRoleId || "");
    },

    _handleSharedRoleFilterChanged: function (oEvent) {
      var sRoleId;
      var oViewModel = this.getModel("view");

      if (!oViewModel) {
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

      if (!sRoleId || oViewModel.getProperty("/selectedRoleId") === sRoleId) {
        return;
      }

      oViewModel.setProperty("/selectedRoleId", sRoleId);
    },

    _syncSharedRoleFilter: function (sRoleId) {
      if (typeof window === "undefined") {
        return;
      }

      setSharedRoleId(sRoleId);
      window.dispatchEvent(new CustomEvent(SHARED_ROLE_FILTER_EVENT, {
        detail: {
          roleId: sRoleId || ""
        }
      }));
    },

    _createViewData: function (mOptions) {
      var oOptions = mOptions || {};

      return {
        busy: oOptions.busy !== false,
        roles: oOptions.roles || [],
        selectedRoleId: oOptions.selectedRoleId || "",
        error: oOptions.error || ""
      };
    },

    _extractRoles: function (oData) {
      var mSeenRoleIds = Object.create(null);

      return (Array.isArray(oData.roles) ? oData.roles : []).reduce(function (aRoles, oRole) {
        var sRoleId = oRole && oRole.externalCode;

        if (!sRoleId || mSeenRoleIds[sRoleId]) {
          return aRoles;
        }

        mSeenRoleIds[sRoleId] = true;
        aRoles.push({
          key: sRoleId,
          title: oRole.externalName || sRoleId
        });

        return aRoles;
      }, []);
    },

    _loadRoles: function (sSelectedRoleId) {
      var oViewModel = this.getModel("view");

      oViewModel.setData(this._createViewData({
        busy: true,
        selectedRoleId: sSelectedRoleId
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
          var aRoles = this._extractRoles(oData);
          var sResolvedRoleId = sSelectedRoleId || oData.currentRoleId || oData.defaultRoleId || (aRoles[0] && aRoles[0].key) || "";

          oViewModel.setData(this._createViewData({
            busy: false,
            roles: aRoles,
            selectedRoleId: sResolvedRoleId
          }));

          if (sResolvedRoleId && getSharedRoleId() !== sResolvedRoleId) {
            this._syncSharedRoleFilter(sResolvedRoleId);
          }
        }.bind(this))
        .catch(function () {
          oViewModel.setData(this._createViewData({
            busy: false,
            selectedRoleId: sSelectedRoleId,
            error: "Failed to load data"
          }));
        }.bind(this));
    }
  });
});