import { useMemo, useState } from "react";
import SearchableSelect from "./SearchableSelect";

const today = new Date().toISOString().slice(0, 10);
const DEFAULT_TYPES = { replacements: true, topups: true, lubrication: true, other: true, samples: true };
const TYPE_LABELS = { replacements: "Replacement", topups: "Top-up / leakage", lubrication: "Greasing / lubrication", other: "Other activity", samples: "Oil analysis sample" };
const FILTER_LABELS = { replacements: "Replacements", topups: "Top-ups / leakage", lubrication: "Greasing / lubrication", other: "Other activities", samples: "Oil samples and lab results" };
const escCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export default function EquipmentHistory({ activities, oils, equipment, components, lubricants, labelEquipment, labelComponent, labelLubricant, fmtDate }) {
  const [equipmentId, setEquipmentId] = useState("");
  const [componentId, setComponentId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(today);
  const [types, setTypes] = useState(DEFAULT_TYPES);
  const [downloaded, setDownloaded] = useState(false);

  const events = useMemo(() => {
    if (!equipmentId) return [];
    const inRange = (date) => Boolean(date) && (!from || date >= from) && (!to || date <= to);
    const result = [];
    activities.filter((row) => row.equipment_id === equipmentId && (!componentId || row.component_id === componentId) && inRange(row.activity_date)).forEach((row) => {
      const text = `${row.activity_type || ""} ${row.reason || ""}`.toLowerCase();
      const kind = /replacement|oil.?change/.test(text) ? "replacements" : /top.?up|leak/.test(text) ? "topups" : /greas|lubricat/.test(text) ? "lubrication" : "other";
      if (types[kind]) result.push({ id: `activity-${row.id}`, date: row.activity_date, kind, row });
    });
    if (types.samples) oils.filter((row) => row.equipment_id === equipmentId && (!componentId || row.component_id === componentId) && inRange(row.sample_date)).forEach((row) => result.push({ id: `sample-${row.id}`, date: row.sample_date, kind: "samples", row }));
    return result.sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.id.localeCompare(b.id));
  }, [activities, oils, equipmentId, componentId, from, to, types]);

  function downloadExtract() {
    if (!equipmentId || !events.length) return;
    const headers = ["Date", "Record type", "Sample ID", "Equipment", "Component", "Running hours", "Person", "Quantity", "Unit", "Lubricant", "Viscosity at 40 C", "Viscosity at 100 C", "Water %", "Karl Fischer water mg/kg", "Iron mg/kg", "Copper mg/kg", "Chromium mg/kg", "Lead mg/kg", "Silicon mg/kg", "TAN mg KOH/g", "Status", "Recommendation", "Lab report number", "Attachment filename", "Reason / remarks"];
    const lines = events.map(({ date, kind, row }) => {
      const sample = kind === "samples";
      return [date, TYPE_LABELS[kind], sample ? row.sample_id : "", labelEquipment(equipment, row.equipment_id), labelComponent(equipment, components, row.component_id), sample ? (row.oil_hours || row.running_hours) : row.running_hours, sample ? (row.tested_by || row.reviewed_by || row.initiated_by) : row.technician_name, sample ? "" : row.quantity, sample ? "" : row.quantity_unit, sample ? "" : labelLubricant(lubricants, row.lubricant_id), sample ? row.viscosity : "", sample ? row.viscosity_100c : "", sample ? row.water_pct : "", sample ? row.karl_fischer_water : "", sample ? row.iron : "", sample ? row.copper : "", sample ? row.chromium : "", sample ? row.lead : "", sample ? row.silicon : "", sample ? row.tan : "", sample ? row.status : "", sample ? row.recommendation : "", sample ? row.laboratory_report_no : "", sample ? row.report_attachment_name : "", sample ? row.remarks : [row.reason, row.remarks].filter(Boolean).join(" · ")].map(escCsv).join(",");
    });
    const csv = `\uFEFF${[headers.map(escCsv).join(","), ...lines].join("\r\n")}`;
    const blobUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    const equipmentNo = equipment.find((item) => item.id === equipmentId)?.sap_equipment_no || "equipment";
    link.href = blobUrl;
    link.download = `lubrication-history-${String(equipmentNo).replace(/[^a-z0-9_-]/gi, "-")}-${from || "all-dates"}-to-${to || "all-dates"}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    setDownloaded(true);
  }

  return <>
    <section className="module-panel equipment-history-panel">
      <div className="module-panel-head"><div><h2>Equipment history extract</h2><p>Filter an equipment or component record, review the timeline here, then download the extract as a spreadsheet-ready CSV.</p></div></div>
      <div className="history-report-controls">
        <label className="field"><span>Equipment</span><SearchableSelect value={equipmentId} onChange={(value) => { setEquipmentId(value); setComponentId(""); setDownloaded(false); }} options={equipment.map((item) => ({ value: item.id, label: `${item.sap_equipment_no} — ${item.description}` }))} placeholder="Select equipment" searchPlaceholder="Search equipment number or name"/></label>
        <label className="field"><span>Component</span><SearchableSelect value={componentId} onChange={(value) => { setComponentId(value); setDownloaded(false); }} options={components.filter((item) => item.equipment_id === equipmentId).map((item) => ({ value: item.id, label: item.component_name }))} placeholder={equipmentId ? "All components" : "Select equipment first"} disabled={!equipmentId} searchPlaceholder="Search component"/></label>
        <label className="field"><span>From date (optional)</span><input type="date" max={to || undefined} value={from} onChange={(event) => { setFrom(event.target.value); setDownloaded(false); }}/></label>
        <label className="field"><span>To date</span><input type="date" min={from || undefined} value={to} onChange={(event) => { setTo(event.target.value); setDownloaded(false); }}/></label>
      </div>
      <div className="history-kind-options">{Object.entries(FILTER_LABELS).map(([key, label]) => <label key={key}><input type="checkbox" checked={types[key]} onChange={(event) => { setTypes((current) => ({ ...current, [key]: event.target.checked })); setDownloaded(false); }}/><span>{label}</span></label>)}</div>
      <div className="history-extract-action"><span>{equipmentId ? `${events.length} matching records · newest first` : "Select an equipment to view its history."}</span><button type="button" className="primary-button" onClick={downloadExtract} disabled={!equipmentId || !events.length}>Download history extract</button></div>
      {downloaded && <p className="history-download-confirmation" role="status">Your history extract has been downloaded as a CSV file.</p>}
      {!equipmentId ? <div className="module-empty"><p>Select equipment to see its activity and oil-sample history.</p></div> : <div className="history-events-scroll" role="region" aria-label="Equipment history timeline" tabIndex={0}>
        {events.map(({ id, date, kind, row }) => {
          const sample = kind === "samples";
          const details = sample
            ? [`Viscosity 40°C ${row.viscosity || "—"}`, `Viscosity 100°C ${row.viscosity_100c || "—"}`, `Water ${row.water_pct || row.karl_fischer_water || "—"}`, `KF ${row.karl_fischer_water || "—"}`, `Fe ${row.iron || "—"}`, `Cu ${row.copper || "—"}`, `Cr ${row.chromium || "—"}`, `Pb ${row.lead || "—"}`, `Si ${row.silicon || "—"}`, `TAN ${row.tan || "—"}`].join(" · ")
            : [row.reason?.replaceAll("_", " ") || row.activity_type || "Activity", row.remarks].filter(Boolean).join(" · ");
          return <article className="history-event" key={id}><time>{fmtDate(date)}</time><div><strong>{sample ? `Oil sample ${row.sample_id || ""}` : TYPE_LABELS[kind]}</strong><span>{labelComponent(equipment, components, row.component_id)} · {sample ? `Tested by ${row.tested_by || row.reviewed_by || row.initiated_by || "—"}` : `Performed by ${row.technician_name || "—"}`}</span><p>{details}</p><small>Running hours: {row.oil_hours || row.running_hours || "—"} h{sample ? ` · Status: ${row.status || "—"} · ${row.recommendation || ""} · Lab report: ${row.laboratory_report_no || "—"}` : ` · Quantity: ${row.quantity || "—"} ${row.quantity_unit || ""}`}</small>{sample && row.report_attachment_name && <small>Saved lab report: {row.report_attachment_name}</small>}</div></article>;
        })}
        {!events.length && <div className="module-empty"><p>No records match this date range and event selection.</p></div>}
      </div>}
    </section>
  </>;
}
