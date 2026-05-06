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

  function resolveIndicatorState(sColor, fValue) {
    if (sColor === "Good") {
      return "Success";
    }

    if (sColor === "Error") {
      return "Error";
    }

    if (typeof fValue === "number") {
      if (fValue >= 70) {
        return "Success";
      }

      if (fValue >= 40) {
        return "Warning";
      }
    }

    return "Warning";
  }

  function resolveAccentClass(sState) {
    if (sState === "Success") {
      return "good";
    }

    if (sState === "Error") {
      return "bad";
    }

    return "warn";
  }

  function resolveHeadline(fValue) {
    if (isNaN(fValue)) {
      return "Role readiness unavailable";
    }

    if (fValue >= 70) {
      return "Role readiness is strong";
    }

    if (fValue >= 40) {
      return "Role readiness needs attention";
    }

    return "Role readiness is at risk";
  }

  function resolveShortfall(fValue) {
    var fScore = isNaN(fValue) ? 0 : Math.max(0, Math.min(100, fValue));

    return (100 - fScore).toFixed(2);
  }

  return UIComponent.extend("competencycards.aggregated.Component", {
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
      this._loadData(getSharedRoleId());
    },

    onRoleChange: function (sRoleId, bSkipSync) {
      if (!bSkipSync) {
        this._syncSharedRoleFilter(sRoleId);
      }

      return this._loadData(sRoleId);
    },

    _handleSharedRoleFilterChanged: function (oEvent) {
      var sRoleId;
      var oViewModel = this.getModel("view");
      var oViewData = oViewModel && oViewModel.getData();

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

      if (!sRoleId || !oViewData || oViewData.selectedRoleId === sRoleId) {
        return;
      }

      this.onRoleChange(sRoleId, true);
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
        fullName: oOptions.fullName || "",
        roleTitle: oOptions.roleTitle || "",
        roles: oOptions.roles || [],
        selectedRoleId: oOptions.selectedRoleId || "",
        hasRoleFilter: !!oOptions.hasRoleFilter,
        score: oOptions.score || "0.00",
        scoreValue: oOptions.scoreValue || 0,
        scoreState: oOptions.scoreState || "None",
        statusText: oOptions.statusText || "",
        headline: oOptions.headline || "",
        shortfall: oOptions.shortfall || "100.00",
        accentClass: oOptions.accentClass || "warn",
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

    _mergeRoles: function (aExistingRoles, aNewRoles) {
      var mSeenRoleIds = Object.create(null);

      return (aExistingRoles || []).concat(aNewRoles || []).reduce(function (aRoles, oRole) {
        var sRoleId = oRole && oRole.key;

        if (!sRoleId || mSeenRoleIds[sRoleId]) {
          return aRoles;
        }

        mSeenRoleIds[sRoleId] = true;
        aRoles.push(oRole);
        return aRoles;
      }, []);
    },

    _buildRequestUrl: function (sBaseUrl, sRoleId) {
      var sUrl = sBaseUrl.replace(/\/$/, "") + "/icv/employees/me";

      if (sRoleId) {
        sUrl += "?targetRoles=" + encodeURIComponent(sRoleId);
      }

      return sUrl;
    },

    _loadData: function (sRoleId) {
      var oViewModel = this.getModel("view");
      var oCurrentData = oViewModel.getData() || {};
      var sRequestedRoleId = sRoleId || oCurrentData.selectedRoleId || "";

      oViewModel.setData(this._createViewData({
        busy: true,
        fullName: oCurrentData.fullName,
        roleTitle: oCurrentData.roleTitle,
        roles: oCurrentData.roles,
        selectedRoleId: sRequestedRoleId,
        hasRoleFilter: oCurrentData.hasRoleFilter,
        score: oCurrentData.score,
        scoreValue: oCurrentData.scoreValue,
        scoreState: oCurrentData.scoreState,
        statusText: oCurrentData.statusText,
        headline: oCurrentData.headline,
        shortfall: oCurrentData.shortfall,
        accentClass: oCurrentData.accentClass
      }));

      return this._oCard.resolveDestination("comp_mat_card")
        .then(function (sBaseUrl) {
          return fetch(this._buildRequestUrl(sBaseUrl, sRequestedRoleId), {
            headers: {
              "Accept": "application/json"
            }
          });
        }.bind(this))
        .then(function (oResponse) {
          if (!oResponse.ok) {
            throw new Error("Request failed: " + oResponse.status);
          }

          return oResponse.json();
        })
        .then(function (oData) {
          var aRoles = this._mergeRoles(oCurrentData.roles, this._extractRoles(oData));
          var sResolvedRoleId = sRequestedRoleId || oData.currentRoleId || oData.defaultRoleId || oCurrentData.selectedRoleId || (aRoles[0] && aRoles[0].key) || "";
          var oSelectedRole = (Array.isArray(oData.roles) ? oData.roles : []).find(function (oRole) {
            return oRole && oRole.externalCode === sResolvedRoleId;
          }) || {};
          var fScoreValue = Number(oSelectedRole.status && oSelectedRole.status.value);

          if (!sRequestedRoleId && sResolvedRoleId) {
            oViewModel.setData(this._createViewData({
              busy: true,
              fullName: oData.defaultFullName || "",
              roleTitle: oSelectedRole.externalName || "",
              roles: aRoles,
              selectedRoleId: sResolvedRoleId,
              hasRoleFilter: aRoles.length > 1
            }));

            return this._loadData(sResolvedRoleId);
          }

          if (sResolvedRoleId && getSharedRoleId() !== sResolvedRoleId) {
            this._syncSharedRoleFilter(sResolvedRoleId);
          }

          oViewModel.setData(this._createViewData({
            busy: false,
            fullName: oData.defaultFullName || "",
            roleTitle: oSelectedRole.externalName || "",
            roles: aRoles,
            selectedRoleId: sResolvedRoleId,
            hasRoleFilter: aRoles.length > 1,
            score: isNaN(fScoreValue) ? "0.00" : (Math.round(fScoreValue * 100) / 100).toFixed(2),
            scoreValue: isNaN(fScoreValue) ? 0 : Math.max(0, Math.min(100, fScoreValue)),
            scoreState: resolveIndicatorState(oSelectedRole.status && oSelectedRole.status.color, fScoreValue),
            statusText: oSelectedRole.status && oSelectedRole.status.text || "",
            headline: resolveHeadline(fScoreValue),
            shortfall: resolveShortfall(fScoreValue),
            accentClass: resolveAccentClass(resolveIndicatorState(oSelectedRole.status && oSelectedRole.status.color, fScoreValue))
          }));
        }.bind(this))
        .catch(function () {
          var oFailedData = oViewModel.getData() || {};

          oViewModel.setData(this._createViewData({
            busy: false,
            fullName: oFailedData.fullName,
            roleTitle: oFailedData.roleTitle,
            roles: oFailedData.roles,
            selectedRoleId: oFailedData.selectedRoleId,
            hasRoleFilter: oFailedData.hasRoleFilter,
            score: oFailedData.score,
            scoreValue: oFailedData.scoreValue,
            scoreState: oFailedData.scoreState,
            statusText: oFailedData.statusText,
            headline: oFailedData.headline,
            shortfall: oFailedData.shortfall,
            accentClass: oFailedData.accentClass,
            error: "Failed to load data"
          }));
        }.bind(this));
    }
  });
});