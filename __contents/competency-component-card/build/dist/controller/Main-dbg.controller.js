sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/Popover",
  "sap/m/List",
  "sap/m/StandardListItem"
], function (Controller, Popover, List, StandardListItem) {
  "use strict";

  return Controller.extend("competencycards.competencyComponent.controller.Main", {
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

    _onChartClick: function (oEvent) {
      var oBucketNode = this._findBucketNode(oEvent.target);

      if (!oBucketNode) {
        return;
      }

      this._openBucketPopover(oBucketNode.getAttribute("data-gap-bucket"));
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

    _openBucketPopover: function (sBucketKey) {
      var oViewModel = this.getView().getModel("view");
      var aItems = oViewModel.getProperty("/bucketItems/" + sBucketKey) || [];
      var oChartHtml = this.byId("chartHtml");
      var mLabelByBucket = {
        lessThanMinusOne: this.getView().getModel("i18n").getResourceBundle().getText("GAP_LT_MINUS_ONE"),
        equalMinusOne: this.getView().getModel("i18n").getResourceBundle().getText("GAP_EQ_MINUS_ONE"),
        greaterOrEqualZero: this.getView().getModel("i18n").getResourceBundle().getText("GAP_GTE_ZERO")
      };

      if (!this._oPopover) {
        this._oList = new List({
          noDataText: this.getView().getModel("i18n").getResourceBundle().getText("NO_DATA")
        });
        this._oPopover = new Popover({
          contentWidth: "18rem",
          placement: "Auto",
          content: [this._oList]
        });
        this.getView().addDependent(this._oPopover);
      }

      this._oList.destroyItems();
      aItems.forEach(function (oItem) {
        this._oList.addItem(new StandardListItem({
          title: oItem.title,
          description: oItem.description
        }));
      }.bind(this));

      this._oPopover.setTitle(mLabelByBucket[sBucketKey] + " (" + aItems.length + ")");

      if (oChartHtml) {
        this._oPopover.openBy(oChartHtml);
      }
    }
  });
});