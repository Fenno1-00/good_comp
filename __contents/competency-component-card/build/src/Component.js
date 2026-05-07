sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/resource/ResourceModel"
], function (UIComponent, JSONModel, ResourceModel) {
  "use strict";

  var SHARED_ROLE_FILTER_KEY = "competencycards.sharedRoleFilter";
  var SHARED_ROLE_FILTER_EVENT = "competencycards:sharedRoleFilterChanged";

  function createBucketItems() {
    return {
      lessThanMinusOne: [],
      equalMinusOne: [],
      greaterOrEqualZero: []
    };
  }

  function createGapCounts() {
    return {
      lessThanMinusOne: 0,
      equalMinusOne: 0,
      greaterOrEqualZero: 0
    };
  }

  function createLegendItems(oGapCounts) {
    return [
      {
        bucketKey: "lessThanMinusOne",
        label: "Gap < -1",
        color: "#BB0000",
        count: oGapCounts.lessThanMinusOne
      },
      {
        bucketKey: "equalMinusOne",
        label: "Gap = -1",
        color: "#E9730C",
        count: oGapCounts.equalMinusOne
      },
      {
        bucketKey: "greaterOrEqualZero",
        label: "Gap >= 0",
        color: "#107E3E",
        count: oGapCounts.greaterOrEqualZero
      }
    ];
  }

  function createChartMarkup(oGapCounts) {
    var iTotal = oGapCounts.lessThanMinusOne + oGapCounts.equalMinusOne + oGapCounts.greaterOrEqualZero;
    var iSize = 216;
    var iCenter = 108;
    var iRadius = 64;
    var iStrokeWidth = 22;
    var fCircumference = 2 * Math.PI * iRadius;
    var fOffset = 0;
    var aSegments = [
      {
        key: "lessThanMinusOne",
        label: "Gap < -1",
        value: oGapCounts.lessThanMinusOne,
        color: "#BB0000"
      },
      {
        key: "equalMinusOne",
        label: "Gap = -1",
        value: oGapCounts.equalMinusOne,
        color: "#E9730C"
      },
      {
        key: "greaterOrEqualZero",
        label: "Gap >= 0",
        value: oGapCounts.greaterOrEqualZero,
        color: "#107E3E"
      }
    ];
    var aMarkup = [
      '<div style="display:flex;align-items:center;justify-content:center;gap:1.25rem;flex-wrap:wrap;padding:0.5rem 0.25rem;">',
      '<div style="display:flex;align-items:center;justify-content:center;width:' + iSize + 'px;height:' + iSize + 'px;border-radius:999px;background:radial-gradient(circle at 50% 45%, #ffffff 0%, #ffffff 48%, #f4f8fb 100%);box-shadow:0 14px 30px rgba(15,23,42,0.10);">',
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + iSize + '" height="' + iSize + '" viewBox="0 0 ' + iSize + ' ' + iSize + '">',
      '<circle cx="' + iCenter + '" cy="' + iCenter + '" r="' + iRadius + '" fill="none" stroke="#D5DADD" stroke-width="' + iStrokeWidth + '"/>',
      '<g transform="rotate(-90 ' + iCenter + ' ' + iCenter + ')">'
    ];

    if (iTotal > 0) {
      aSegments.forEach(function (oSegment) {
        var fLength;

        if (!oSegment.value) {
          return;
        }

        fLength = (oSegment.value / iTotal) * fCircumference;
        aMarkup.push(
          '<circle data-gap-bucket="' + oSegment.key + '" cx="' + iCenter + '" cy="' + iCenter + '" r="' + iRadius + '" fill="none" stroke="' + oSegment.color + '" stroke-width="' + iStrokeWidth + '" style="cursor:pointer;"',
          ' stroke-linecap="butt" stroke-dasharray="' + fLength.toFixed(3) + ' ' + (fCircumference - fLength).toFixed(3) + '"',
          ' stroke-dashoffset="' + (-fOffset).toFixed(3) + '"/>',
          ''
        );
        fOffset += fLength;
      });
    }

    aMarkup.push('</g>');
    aMarkup.push('<text x="' + iCenter + '" y="' + (iCenter - 8) + '" text-anchor="middle" font-family="72, Arial, sans-serif" font-size="34" font-weight="700" fill="#223548">' + iTotal + '</text>');
    aMarkup.push('<text x="' + iCenter + '" y="' + (iCenter + 18) + '" text-anchor="middle" font-family="72, Arial, sans-serif" font-size="13" fill="#5B738B">Total</text>');
    aMarkup.push('</svg>');
    aMarkup.push('</div>');
    aMarkup.push('</div>');

    return aMarkup.join('');
  }

  function formatValidUntil(sValidUntil) {
    if (!sValidUntil) {
      return "No validity date";
    }

    return "Valid until: " + sValidUntil.slice(0, 10);
  }

  function createBucketSummary(aAssessments) {
    return aAssessments.reduce(function (oSummary, oItem) {
      var iGap = Number(oItem.gap);
      var sBucketKey;

      if (isNaN(iGap)) {
        return oSummary;
      }

      if (iGap < -1) {
        sBucketKey = "lessThanMinusOne";
      } else if (iGap === -1) {
        sBucketKey = "equalMinusOne";
      } else {
        sBucketKey = "greaterOrEqualZero";
      }

      oSummary.gapCounts[sBucketKey] += 1;
      oSummary.bucketItems[sBucketKey].push({
        title: oItem.competence && oItem.competence.externalName || oItem.competenceId || "Unknown",
        description: [
          (oItem.status && oItem.status.statusName) || "",
          formatValidUntil(oItem.validUntil)
        ].filter(Boolean).join(" | ")
      });

      return oSummary;
    }, {
      gapCounts: createGapCounts(),
      bucketItems: createBucketItems()
    });
  }

  function createRoleCompetenceIdMap(oData, sRoleId) {
    var aRoles = Array.isArray(oData && oData.roles) ? oData.roles : [];
    var oRole = aRoles.find(function (oCurrentRole) {
      return oCurrentRole && oCurrentRole.externalCode === sRoleId && Array.isArray(oCurrentRole.competenceIds);
    });

    if (!oRole || !oRole.competenceIds.length) {
      return null;
    }

    return oRole.competenceIds.reduce(function (mRoleCompetenceIds, sCompetenceId) {
      if (sCompetenceId) {
        mRoleCompetenceIds[sCompetenceId] = true;
      }

      return mRoleCompetenceIds;
    }, Object.create(null));
  }

  function matchesCategory(oItem, sCategory, mRoleCompetenceIds) {
    var sStatusType = oItem && oItem.status && oItem.status.type;

    if (!oItem) {
      return false;
    }

    if (sCategory === "Certification") {
      return sStatusType === "Certification";
    }

    if (sCategory === "Competency") {
      if (sStatusType === "Certification") {
        return false;
      }

      if (mRoleCompetenceIds && !mRoleCompetenceIds[oItem.competenceId]) {
        return false;
      }

      return true;
    }

    return false;
  }

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

  return UIComponent.extend("competencycards.competencyComponent.Component", {
    metadata: {
      manifest: "json"
    },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);
      this.setModel(new JSONModel(this._createViewData()), "view");
      this.setModel(new ResourceModel({
        bundleName: "competencycards.competencyComponent.i18n.i18n"
      }), "i18n");
      this._onSharedRoleFilterChanged = this._handleSharedRoleFilterChanged.bind(this);

      if (typeof window !== "undefined") {
        window.addEventListener("storage", this._onSharedRoleFilterChanged);
        window.addEventListener(SHARED_ROLE_FILTER_EVENT, this._onSharedRoleFilterChanged);
      }
    },

    onCardReady: function (oCard) {
      this._oCard = oCard;
      this._loadData(getSharedRoleId());
    },

    exit: function () {
      if (typeof window !== "undefined" && this._onSharedRoleFilterChanged) {
        window.removeEventListener("storage", this._onSharedRoleFilterChanged);
        window.removeEventListener(SHARED_ROLE_FILTER_EVENT, this._onSharedRoleFilterChanged);
      }
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
        gapCounts: oOptions.gapCounts || createGapCounts(),
        bucketItems: oOptions.bucketItems || createBucketItems(),
        legendItems: oOptions.legendItems || createLegendItems(oOptions.gapCounts || createGapCounts()),
        chartMarkup: oOptions.chartMarkup || createChartMarkup(oOptions.gapCounts || createGapCounts()),
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
        roleTitle: oCurrentData.roleTitle,
        roles: oCurrentData.roles,
        selectedRoleId: sRequestedRoleId,
        hasRoleFilter: oCurrentData.hasRoleFilter,
        gapCounts: createGapCounts(),
        bucketItems: createBucketItems(),
        legendItems: createLegendItems(createGapCounts())
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
          var mRoleCompetenceIds = createRoleCompetenceIdMap(oData, sResolvedRoleId);

          if (!sRequestedRoleId && sResolvedRoleId) {
            oViewModel.setData(this._createViewData({
              busy: true,
              fullName: oData.defaultFullName || "",
              roleTitle: oSelectedRole.externalName || "",
              roles: aRoles,
              selectedRoleId: sResolvedRoleId,
              hasRoleFilter: aRoles.length > 1,
              gapCounts: createGapCounts(),
              bucketItems: createBucketItems(),
              legendItems: createLegendItems(createGapCounts())
            }));

            return this._loadData(sResolvedRoleId);
          }

          if (sResolvedRoleId && getSharedRoleId() !== sResolvedRoleId) {
            this._syncSharedRoleFilter(sResolvedRoleId);
          }

          var aAssessments = this._deduplicateAssessments(Array.isArray(oData.assessments) ? oData.assessments : [])
            .filter(function (oItem) {
              return matchesCategory(oItem, "Competency", mRoleCompetenceIds);
            });
          var oBucketSummary = createBucketSummary(aAssessments);

          oViewModel.setData(this._createViewData({
            busy: false,
            fullName: oData.defaultFullName || "",
            roleTitle: oSelectedRole.externalName || "",
            roles: aRoles,
            selectedRoleId: sResolvedRoleId,
            hasRoleFilter: aRoles.length > 1,
            gapCounts: oBucketSummary.gapCounts,
            bucketItems: oBucketSummary.bucketItems,
            legendItems: createLegendItems(oBucketSummary.gapCounts),
            chartMarkup: createChartMarkup(oBucketSummary.gapCounts)
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
            gapCounts: createGapCounts(),
            bucketItems: createBucketItems(),
            legendItems: createLegendItems(createGapCounts()),
            chartMarkup: createChartMarkup(createGapCounts()),
            error: "Failed to load data"
          }));
        }.bind(this));
    }
  });
});