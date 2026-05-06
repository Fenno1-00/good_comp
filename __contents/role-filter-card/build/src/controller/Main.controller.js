sap.ui.define([
  "sap/ui/core/mvc/Controller"
], function (Controller) {
  "use strict";

  return Controller.extend("competencycards.roleFilter.controller.Main", {
    onRoleChange: function (oEvent) {
      this.getOwnerComponent().onRoleChange(oEvent.getSource().getSelectedKey());
    }
  });
});