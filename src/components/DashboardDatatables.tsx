'use client'

import { useEffect, useState } from "react";
import { data, json } from "../../data/dashboard_data";
import { DataTables } from "survey-analytics/survey.analytics.datatables.js";
import { Model } from "survey-core";
import $ from "jquery";
import "datatables.net/js/jquery.dataTables.js";
import "datatables.net-dt/js/dataTables.dataTables.js";
import "datatables.net-buttons/js/dataTables.buttons.js";
import "datatables.net-buttons/js/buttons.print.js";
import "datatables.net-buttons/js/buttons.html5.js";
import "datatables.net-colreorder/js/dataTables.colReorder.js";
import "datatables.net-rowgroup/js/dataTables.rowGroup.js";
import "datatables.net-colreorder-dt/css/colReorder.dataTables.css";
import "survey-analytics/survey.analytics.datatables.css";

export default function DashboardDatatables() {
  let [vizPanel, setVizPanel] = useState<DataTables>();

  if (!vizPanel) {
    DataTables.initJQuery($);
    const survey = new Model(json);
    vizPanel = new DataTables(survey, data);
    setVizPanel(vizPanel);
  }

  useEffect(() => {
    vizPanel?.render("summaryContainer");
  }, [vizPanel]);

  return <div style={{ height: "80vh", width: "100%" }} id="summaryContainer"></div>;
}
