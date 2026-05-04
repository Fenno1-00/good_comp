sap.ui.define([
  "sap/ui/integration/Extension"
], function (Extension) {
  "use strict";

  return Extension.extend("assessment_detail_card.CardExtension", {

    onDataChanged: function () {
      var oCard = this.getCard();
      var oModel = oCard.getModel();
      if (!oModel) { return; }

      var oData = oModel.getData() || {};
      var aAll = Array.isArray(oData.assessments) ? oData.assessments : [];

      // Keep only assessments relevant for the selected role
      var aFiltered = aAll.filter(function (o) {
        return o.isRoleRelevant === true;
      });

      oModel.setProperty("/assessments", aFiltered);
      oModel.setProperty("/statusText", aFiltered.length + " item(s)");
    }

  });
});
