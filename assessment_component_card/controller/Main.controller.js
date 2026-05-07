sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/Popover",
  "sap/m/List",
  "sap/m/StandardListItem"
], function (Controller, Popover, List, StandardListItem) {
  "use strict";

  return Controller.extend("competencycards.assessmentComponentV2.controller.Main", {
    onInit: function () {
      this._onChartClickBound = this._onChartClick.bind(this);
    },

    onAfterRendering: function () {
      var oChartHtml = this.byId("chartHtml");

      if (!oChartHtml) {
        return;
      }

      oChartHtml.detachBrowserEvent("click", this._onChartClickBound);
      oChartHtml.attachBrowserEvent("click", this._onChartClickBound);
    },

    onExit: function () {
      var oChartHtml = this.byId("chartHtml");

      if (oChartHtml) {
        oChartHtml.detachBrowserEvent("click", this._onChartClickBound);
      }

      if (this._oPopover) {
        this._oPopover.destroy();
      }
    },

    onRoleChange: function (oEvent) {
      this.getOwnerComponent().onRoleChange(oEvent.getSource().getSelectedKey());
    },

    onLegendPress: function (oEvent) {
      var oListItem = oEvent.getParameter("listItem");
      var oContext = oListItem && oListItem.getBindingContext("view");
      var sBucketKey = oContext && oContext.getProperty("bucketKey");

      if (!sBucketKey) {
        return;
      }

      this._openBucketPopover(sBucketKey, oListItem);
    },

    _onChartClick: function (oEvent) {
      var oBucketNode = this._findBucketNode(oEvent.target);

      if (!oBucketNode) {
        return;
      }

      this._openBucketPopover(oBucketNode.getAttribute("data-gap-bucket"), this.byId("chartHtml"));
    },

    _findBucketNode: function (oTarget) {
      var oCurrentNode = oTarget && oTarget.nodeType === Node.TEXT_NODE ? oTarget.parentElement : oTarget;

      while (oCurrentNode) {
        if (oCurrentNode.getAttribute && oCurrentNode.getAttribute("data-gap-bucket")) {
          return oCurrentNode;
        }

        oCurrentNode = oCurrentNode.parentElement;
      }

      return null;
    },

    _getText: function (sKey, sDefaultText) {
      var oI18nModel = this.getView().getModel("i18n") || this.getOwnerComponent().getModel("i18n");
      var oResourceBundle = oI18nModel && oI18nModel.getResourceBundle && oI18nModel.getResourceBundle();

      return oResourceBundle ? oResourceBundle.getText(sKey) : sDefaultText;
    },

    _openBucketPopover: function (sBucketKey, oOpenControl) {
      var oView = this.getView();
      var oViewModel = oView.getModel("view");
      var aItems = oViewModel.getProperty("/bucketItems/" + sBucketKey) || [];
      var mLabelByBucket = {
        lessThanMinusOne: this._getText("GAP_LT_MINUS_ONE", "Gap < -1"),
        equalMinusOne: this._getText("GAP_EQ_MINUS_ONE", "Gap = -1"),
        greaterOrEqualZero: this._getText("GAP_GTE_ZERO", "Gap >= 0")
      };

      if (!this._oPopover) {
        this._oList = new List({
          noDataText: this._getText("NO_DATA", "No data available")
        });
        this._oPopover = new Popover({
          contentWidth: "18rem",
          placement: "Auto",
          content: [this._oList]
        });
        oView.addDependent(this._oPopover);
      }

      this._oList.destroyItems();
      aItems.forEach(function (oItem) {
        this._oList.addItem(new StandardListItem({
          title: oItem.title,
          description: oItem.description
        }));
      }.bind(this));

      this._oPopover.setTitle(mLabelByBucket[sBucketKey] + " (" + aItems.length + ")");

      if (oOpenControl) {
        this._oPopover.openBy(oOpenControl);
      }
    }
  });
});