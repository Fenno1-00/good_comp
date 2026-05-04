sap.ui.define([
  "sap/ui/integration/Extension"
], function (Extension) {
  "use strict";

  return Extension.extend("profile_summary_card.CardExtension", {

    getData: function () {
      var oCard = this.getCard();

      return oCard.resolveDestination("comp_mat_card")
        .then(function (sBaseUrl) {
          return fetch(sBaseUrl + "/icv/employees/me", {
            headers: { "Accept": "application/json" }
          });
        })
        .then(function (oResponse) {
          if (!oResponse.ok) {
            throw new Error(oResponse.status);
          }
          return oResponse.json();
        })
        .then(function (oData) {
          var aAssessments = Array.isArray(oData.assessments)
            ? oData.assessments
            : [];

          // Certification stats
          var aCerts = aAssessments.filter(function (o) {
            return o.status && o.status.type === "Certification";
          });
          var iCompliant  = aCerts.filter(function (o) { return o.status && o.status.statusId === "C"; }).length;
          var iOverdue    = aCerts.filter(function (o) { return o.status && o.status.statusId === "O"; }).length;
          var iExpiring   = aCerts.filter(function (o) { return o.almostExpired === true && o.status && o.status.statusId !== "O"; }).length;

          // Competency stats
          var aComps = aAssessments.filter(function (o) {
            return o.status && o.status.type === "Competency";
          });
          var iOnTrack  = aComps.filter(function (o) { return Number(o.gap) >= 0; }).length;
          var iWithGap  = aComps.filter(function (o) { return Number(o.gap) < 0; }).length;

          return {
            defaultFullName: oData.defaultFullName || "",
            jobCode:         oData.jobCode         || "",
            department:      oData.department      || "",
            division:        oData.division        || "",
            location:        oData.location        || "",
            managerName:     (oData.manager && oData.manager.defaultFullName) || "",

            totalCerts:           String(aCerts.length),
            compliantCerts:       String(iCompliant),
            overdueCerts:         String(iOverdue),
            expiringSoon:         String(iExpiring),
            overdueState:         iOverdue  > 0 ? "Error"   : "None",
            expiringState:        iExpiring > 0 ? "Warning" : "None",

            totalCompetencies:    String(aComps.length),
            onTrackCompetencies:  String(iOnTrack),
            withGapCompetencies:  String(iWithGap),
            gapState:             iWithGap  > 0 ? "Warning" : "None"
          };
        })
        .catch(function () {
          return {
            defaultFullName: "", jobCode: "", department: "", division: "",
            location: "", managerName: "",
            totalCerts: "—", compliantCerts: "—", overdueCerts: "—", expiringSoon: "—",
            overdueState: "None", expiringState: "None",
            totalCompetencies: "—", onTrackCompetencies: "—", withGapCompetencies: "—",
            gapState: "None"
          };
        });
    }

  });
});