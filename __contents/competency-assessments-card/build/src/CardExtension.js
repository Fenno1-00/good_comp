sap.ui.define([
  "sap/ui/integration/Extension",
  "sap/m/Popover",
  "sap/m/List",
  "sap/m/StandardListItem"
], function (Extension, Popover, List, StandardListItem) {
  "use strict";

  return Extension.extend("competency_assessments_card.CardExtension", {

    _oGroupedData: null,
    _oPopover: null,

    onDataChanged: function () {
      var oCard = this.getCard();
      var oModel = oCard.getModel();
      if (!oModel) { return; }

      var oData = oModel.getData() || {};
      var aAssessments = (Array.isArray(oData.assessments) ? oData.assessments : [])
        .filter(function (o) { return o.status && o.status.type === "Competency" && o.isRoleRelevant === true; });

      var oGrouped = { "On Track": [], "Minor Gap": [], "Major Gap": [] };
      var oCounts  = { "On Track": 0,  "Minor Gap": 0,  "Major Gap": 0 };

      aAssessments.forEach(function (o) {
        var iGap = Number(o.gap);
        var sGroup = iGap >= 0 ? "On Track" : iGap === -1 ? "Minor Gap" : "Major Gap";
        oCounts[sGroup]++;
        oGrouped[sGroup].push(o.competence ? o.competence.externalName : o.competenceId);
      });

      this._oGroupedData = oGrouped;

      oModel.setProperty("/totalText", aAssessments.length + " competencies");
      oModel.setProperty("/gapSummary", [
        { label: "On Track",  count: oCounts["On Track"] },
        { label: "Minor Gap", count: oCounts["Minor Gap"] },
        { label: "Major Gap", count: oCounts["Major Gap"] }
      ]);
    },

    onAction: function (oEvent) {
      var oParams = oEvent.getParameters();
      if (oParams.type !== "UI5_CHART_ITEM_SELECT") {
        return;
      }

      oEvent.preventDefault();

      var aData = oParams.data;
      if (!aData || !aData.length || !this._oGroupedData) {
        return;
      }

      var sLabel = aData[0]["Gap Status"];
      var aItems = this._oGroupedData[sLabel] || [];
      var oSource = oParams.actionSource || this.getCard();

      if (this._oPopover) {
        this._oPopover.destroy();
      }

      var oList = new List({
        noDataText: "No competencies",
        items: aItems.map(function (sName) {
          return new StandardListItem({ title: sName });
        })
      });

      this._oPopover = new Popover({
        title: sLabel + " (" + aItems.length + ")",
        contentMinWidth: "260px",
        content: [oList]
      });

      this._oPopover.openBy(oSource);
    }
  });
});