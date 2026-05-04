sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
  "use strict";

  function createGapCounts() {
    return {
      lessThanMinusOne: 0,
      equalMinusOne: 0,
      greaterOrEqualZero: 0
    };
  }

  return UIComponent.extend("competencycards.assessmentComponentV2.Component", {
    metadata: {
      manifest: "json"
    },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);
      this.setModel(new JSONModel(this._createViewData()), "view");
    },

    onCardReady: function (oCard) {
      this._oCard = oCard;
      this._loadData();
    },

    onRoleChange: function (sRoleId) {
      return this._loadData(sRoleId);
    },

    _createViewData: function (mOptions) {
      var oOptions = mOptions || {};

      return {
        busy: oOptions.busy !== false,
        fullName: oOptions.fullName || "",
        roles: oOptions.roles || [],
        selectedRoleId: oOptions.selectedRoleId || "",
        hasRoleFilter: !!oOptions.hasRoleFilter,
        gapCounts: oOptions.gapCounts || createGapCounts(),
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

    _deduplicateAssessments: function (aAssessments) {
      var mSeenAssessmentIds = Object.create(null);

      return aAssessments.filter(function (oItem) {
        var sAssessmentId = oItem && oItem.assessmentId;

        if (!sAssessmentId) {
          return true;
        }

        if (mSeenAssessmentIds[sAssessmentId]) {
          return false;
        }

        mSeenAssessmentIds[sAssessmentId] = true;
        return true;
      });
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
        roles: oCurrentData.roles,
        selectedRoleId: sRequestedRoleId,
        hasRoleFilter: oCurrentData.hasRoleFilter,
        gapCounts: createGapCounts()
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

          if (!sRequestedRoleId && sResolvedRoleId) {
            oViewModel.setData(this._createViewData({
              busy: true,
              fullName: oData.defaultFullName || "",
              roles: aRoles,
              selectedRoleId: sResolvedRoleId,
              hasRoleFilter: aRoles.length > 1,
              gapCounts: createGapCounts()
            }));

            return this._loadData(sResolvedRoleId);
          }

          var aAssessments = this._deduplicateAssessments(Array.isArray(oData.assessments) ? oData.assessments : []);
          var oGapCounts = aAssessments.reduce(function (oCounts, oItem) {
            var iGap = Number(oItem.gap);

            if (isNaN(iGap)) {
              return oCounts;
            }

            if (iGap < -1) {
              oCounts.lessThanMinusOne += 1;
            } else if (iGap === -1) {
              oCounts.equalMinusOne += 1;
            } else if (iGap >= 0) {
              oCounts.greaterOrEqualZero += 1;
            }

            return oCounts;
          }, createGapCounts());

          oViewModel.setData(this._createViewData({
            busy: false,
            fullName: oData.defaultFullName || "",
            roles: aRoles,
            selectedRoleId: sResolvedRoleId,
            hasRoleFilter: aRoles.length > 1,
            gapCounts: oGapCounts
          }));
        }.bind(this))
        .catch(function () {
          var oFailedData = oViewModel.getData() || {};

          oViewModel.setData(this._createViewData({
            busy: false,
            fullName: oFailedData.fullName,
            roles: oFailedData.roles,
            selectedRoleId: oFailedData.selectedRoleId,
            hasRoleFilter: oFailedData.hasRoleFilter,
            gapCounts: createGapCounts(),
            error: "Failed to load data"
          }));
        }.bind(this));
    }
  });
});