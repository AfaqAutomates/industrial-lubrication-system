import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "./lib/supabase";
import OilReportIntake from "./OilReportIntake";
import LubricationReport from "./LubricationReport";
import UserAccessManager from "./UserAccessManager";
import SearchableSelect from "./SearchableSelect";

const emptyActivity = {
  equipment_id: "", component_id: "", requirement_id: "", activity_type: "lubrication",
  activity_date: new Date().toISOString().slice(0, 10), running_hours: "", lubricant_id: "",
  quantity: "", quantity_unit: "L", reason: "routine", condition_before: "",
  condition_after: "", technician_name: "", sap_notification_no: "", remarks: "", status: "completed",
};
const emptyOil = {
  sample_id: "", equipment_id: "", component_id: "", sample_date: new Date().toISOString().slice(0, 10),
  running_hours: "", oil_hours: "", lubricant_id: "", sample_point: "", laboratory: "", laboratory_report_no: "",
  customer_name: "", cell_number: "", land_line_number: "", batch_number: "", equipment_name: "", equipment_make: "",
  equipment_model: "", equipment_serial_no: "", oil_top_up_volume: "", oil_sump_capacity: "", oil_condition: "",
  reason_for_testing: "", initiated_by: "", initiated_date: "", tested_by: "", reviewed_by: "", approved_by: "", approval_date: "", approval_running_hours: "", receiving_date: "", receiving_time: "", reported_product_grade: "",
  appearance: "", color: "", density_15c: "", crackle: "", blotter_spot_test: "", flash_point_coc: "",
  flash_point_pmcc: "", flash_point_seta: "", fuel_dilution: "", viscosity: "", viscosity_100c: "",
  viscosity_index: "", apparent_viscosity_minus15c: "", treat_rate: "", water_pct: "", karl_fischer_water: "", tan: "", tbn: "", iron: "", copper: "",
  chromium: "", lead: "", silicon: "", sodium: "", aluminium: "", tin: "", zinc: "", calcium: "",
  magnesium: "", oxidation: "", nitration: "", pentane_insolubles: "", copper_corrosion_100c: "",
  foam_tendency_seq1: "", foam_tendency_seq2: "", foam_tendency_seq3: "", particle_count: "",
  iso_code: "", pq_index: "", status: "normal", recommendation: "", reviewer: "", remarks: "",
};const emptyInventory = { lubricant_id: "", store_location: "", unit: "L", minimum_stock: "", critical_stock: "", current_stock: "" };

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}
function number(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
function labelEquipment(equipment, id) { const e = equipment.find(x => x.id === id); return e ? `${e.sap_equipment_no} — ${e.description}` : "—"; }
function labelComponent(equipment, components, id) { const c = components.find(x => x.id === id); if (!c) return "—"; const e = equipment.find(x => x.id === c.equipment_id); return `${e?.sap_equipment_no || "—"} — ${c.component_name}`; }
function labelLubricant(lubricants, id) { const l = lubricants.find(x => x.id === id); return l ? [l.product_code, l.product_name, l.grade].filter(Boolean).join(" — ") : "—"; }
function Badge({ value, tone }) { return <span className={`module-badge ${tone || String(value || "").toLowerCase().replaceAll(" ", "-")}`}>{value}</span>; }
function ModulePanel({ title, subtitle, action, children }) { return <section className="module-panel"><div className="module-panel-head"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>{children}</section>; }
function ModuleForm({ title, subtitle, onClose, children, onSubmit, saving, saveText = "Save" }) { return <section className="module-form"><div className="module-form-head"><div><div className="card-kicker">DATA ENTRY</div><h2>{title}</h2><p>{subtitle}</p></div><button type="button" className="close-button" onClick={onClose}>×</button></div><form onSubmit={onSubmit}>{children}<div className="module-form-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "Saving..." : saveText}</button></div></form></section>; }
function MField({ label, full, children }) { return <label className={`field ${full ? "full" : ""}`}><span>{label}</span>{children}</label>; }

export default function RemainingModules({ page, profile, canEdit, equipment, components, lubricants, requirements, relationships, refresh, setNotice, setError }) {
  const [runningRows, setRunningRows] = useState([]);
  const [imports, setImports] = useState([]);
  const [resourceMappings, setResourceMappings] = useState([]);
  const [activities, setActivities] = useState([]);
  const [moduleLookups, setModuleLookups] = useState(null);
  const [oils, setOils] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [inventoryTx, setInventoryTx] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [settings, setSettings] = useState([]);
  const [procurement, setProcurement] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [moduleLoading, setModuleLoading] = useState(true);
  const [moduleLoadError, setModuleLoadError] = useState("");
  const moduleLoadRequestRef = useRef(null);

  const [activityForm, setActivityForm] = useState(emptyActivity);
  const [oilForm, setOilForm] = useState(emptyOil);
  const [reportFile, setReportFile] = useState(null);
  const [inventoryForm, setInventoryForm] = useState(emptyInventory);
  const [showActivity, setShowActivity] = useState(false);
  const [showOil, setShowOil] = useState(false);
  function updateOilField(name, value) { setOilForm((current) => ({ ...current, [name]: value })); }
  const [showInventory, setShowInventory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activitySearch, setActivitySearch] = useState("");
  const [oilSearch, setOilSearch] = useState("");
  const [alertFilter, setAlertFilter] = useState("open");
  const [inventorySearch, setInventorySearch] = useState("");
  const [runningImport, setRunningImport] = useState(null);
  const [runningMapping, setRunningMapping] = useState({ equipment: "", hours: "", date: "" });
  const [resourceSelections, setResourceSelections] = useState({});
  const [runningPreview, setRunningPreview] = useState([]);
  const [runningFileName, setRunningFileName] = useState("");
  const [settingDraft, setSettingDraft] = useState({});

function ModuleLoadingState({ title, detail, onRetry }) {
  return <div className="module-loading-screen" role="status" aria-live="polite">
    <div className="module-loading-card"><span className="workspace-spinner"/><strong>{title}</strong><span>{detail}</span>{onRetry && <button type="button" className="secondary-button" onClick={onRetry}>Try again</button>}</div>
  </div>;
}
  async function writeAudit(module, recordId, action, newData) {
    try {
      const { data } = await supabase.auth.getUser();
      await supabase.from("audit_log").insert({ module, record_id: recordId || null, action, new_data: newData || null, changed_by: data?.user?.id || null });
    } catch (_) { /* Audit failure must not block the operational transaction. */ }
  }

  async function loadModuleData() {
    if (moduleLoadRequestRef.current) return moduleLoadRequestRef.current;
    const request = (async () => {
      setModuleLoading(true);
      setModuleLoadError("");
      try {
        const admin = profile?.role === "master_admin";
        const canRead = (module) => admin || profile?.module_permissions?.[module] === true || ["view", "edit"].includes(profile?.module_permissions?.[module]);
        const needsAny = (modules) => admin || modules.some(canRead);
        const emptyResult = () => Promise.resolve({ data: [], error: null });
        const lookupRequest = ["Activities", "Oil Analysis", "Running Hours"].includes(page) && canRead(page) ? supabase.rpc("get_module_reference_lookups") : Promise.resolve({ data: null, error: null });
        const resourceMapRequest = page === "Running Hours" && canRead("Running Hours") ? supabase.from("cooispi_resource_mappings").select("id,resource_reference,resource_reference_key,equipment_id").order("resource_reference") : emptyResult();
        const [rh, imp, act, oa, inv, tx, al, pf, st, pr, lookups, resourceMapResult] = await Promise.all([
          needsAny(["Running Hours", "Work Schedule", "Reports", "Alerts"]) ? supabase.from("running_hours_records").select("*").order("period_to", { ascending: false }).limit(5000) : emptyResult(),
          needsAny(["Running Hours", "Reports"]) ? supabase.from("running_hours_imports").select("*").order("imported_at", { ascending: false }).limit(50) : emptyResult(),
          needsAny(["Activities", "Work Schedule", "Reports", "Alerts"]) ? supabase.from("lubrication_activities").select("*").order("activity_date", { ascending: false }).limit(1000) : emptyResult(),
          needsAny(["Oil Analysis", "Reports", "Alerts"]) ? supabase.from("oil_analysis_samples").select("*").order("sample_date", { ascending: false }).limit(500) : emptyResult(),
          needsAny(["Inventory", "Reports", "Alerts"]) ? supabase.from("lubricant_inventory").select("*").order("updated_at", { ascending: false }) : emptyResult(),
          needsAny(["Inventory", "Reports"]) ? supabase.from("lubricant_inventory_transactions").select("*").order("transaction_date", { ascending: false }).limit(1000) : emptyResult(),
          canRead("Alerts") ? supabase.from("system_alerts").select("*").order("created_at", { ascending: false }).limit(500) : emptyResult(),
          admin ? supabase.from("profiles").select("id,email,full_name,role,is_active,module_permissions").order("full_name") : Promise.resolve({ data: [], error: null }),
          canRead("Settings") ? supabase.from("system_settings").select("*").order("setting_key") : emptyResult(),
          needsAny(["Inventory", "Reports"]) ? supabase.from("procurement_records").select("*").order("delivery_expected", { ascending: true }).limit(500) : emptyResult(),
          lookupRequest,
          resourceMapRequest,
        ]);
        const first = [rh, imp, act, oa, inv, tx, al, pf, st, pr, lookups, resourceMapResult].find((result) => result.error)?.error;
        if (first) throw new Error(first.message);
        setRunningRows(rh.data || []);
        setImports(imp.data || []);
        if (page === "Running Hours") setResourceMappings(resourceMapResult.data || []);
        setActivities(act.data || []);
        setOils(oa.data || []);
        setInventory(inv.data || []);
        setInventoryTx(tx.data || []);
        setAlerts(al.data || []);
        setProfiles(pf.data || []);
        if (["Activities", "Oil Analysis", "Running Hours"].includes(page)) setModuleLookups(lookups.data || { equipment: [], components: [], lubricants: [], requirements: [] });
        setSettings(st.data || []);
        setProcurement(pr.data || []);
        setLoaded(true);
      } catch (e) {
        setModuleLoadError(e.message || "Could not load module records.");
        setError(e.message || "Could not load module records.");
      } finally {
        setModuleLoading(false);
      }
    })();
    moduleLoadRequestRef.current = request;
    try { await request; }
    finally { if (moduleLoadRequestRef.current === request) moduleLoadRequestRef.current = null; }
  }  useEffect(() => { if (!loaded) loadModuleData(); }, [loaded]);

  const hoursByEquipment = useMemo(() => {
    const direct = {};
    runningRows.forEach(r => { direct[r.equipment_id] = (direct[r.equipment_id] || 0) + number(r.running_hours); });
    const byParent = {};
    relationships.filter(r => r.is_active && r.running_hours_rule === "inherit").forEach(r => {
      (byParent[r.parent_equipment_id] ||= []).push(r.child_equipment_id);
    });
    const resolved = { ...direct };
    const visiting = new Set();
    function resolve(id) {
      if (resolved[id] != null) return resolved[id];
      if (visiting.has(id)) return null;
      visiting.add(id);
      const parents = relationships.filter(r => r.is_active && r.child_equipment_id === id && r.running_hours_rule === "inherit");
      const parentHours = parents.map(r => resolve(r.parent_equipment_id)).filter(x => x != null);
      visiting.delete(id);
      if (parentHours.length) resolved[id] = Math.max(...parentHours);
      return resolved[id] ?? null;
    }
    equipment.forEach(e => resolve(e.id));
    return resolved;
  }, [runningRows, relationships, equipment]);

  const scheduleRows = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return requirements.filter(r => r.is_active && r.approval_status === "approved").map(r => {
      const c = components.find(x => x.id === r.component_id); const eq = equipment.find(x => x.id === c?.equipment_id);
      if (!c || !eq) return null;
      const history = activities.filter(a => a.requirement_id === r.id && a.status === "completed").sort((a,b) => new Date(b.activity_date) - new Date(a.activity_date));
      const last = history[0];
      const currentHours = hoursByEquipment[eq.id] ?? null;
      const calendarDue = last?.activity_date && r.interval_days ? new Date(new Date(last.activity_date).getTime() + r.interval_days * 86400000) : (r.effective_from ? new Date(r.effective_from) : today);
      const hoursDue = last?.running_hours != null && r.interval_hours ? number(last.running_hours) + number(r.interval_hours) : (r.interval_hours ? currentHours : null);
      const calendarDays = calendarDue ? Math.ceil((calendarDue - today) / 86400000) : null;
      const hourDelta = hoursDue != null && currentHours != null ? hoursDue - currentHours : null;
      let status = "scheduled";
      let dueReason = "Calendar";
      if (r.frequency_basis === "running_hours") { dueReason = "Running hours"; status = hourDelta != null && hourDelta <= 0 ? "overdue" : hourDelta != null && hourDelta <= 50 ? "due-soon" : "scheduled"; }
      else if (r.frequency_basis === "calendar") { status = calendarDays <= 0 ? "overdue" : calendarDays <= 7 ? "due-soon" : "scheduled"; }
      else {
        const hourDue = hourDelta != null && hourDelta <= 0; const dateDue = calendarDays != null && calendarDays <= 0;
        status = hourDue || dateDue ? "overdue" : ((hourDelta != null && hourDelta <= 50) || (calendarDays != null && calendarDays <= 7)) ? "due-soon" : "scheduled";
        dueReason = hourDue && dateDue ? "Both" : hourDue ? "Running hours" : "Calendar";
      }
      return { ...r, component: c, equipment: eq, last, currentHours, calendarDue, hoursDue, status, dueReason, calendarDays, hourDelta };
    }).filter(Boolean).sort((a,b) => ({ overdue: 0, "due-soon": 1, scheduled: 2 }[a.status] - ({ overdue: 0, "due-soon": 1, scheduled: 2 }[b.status])));
  }, [requirements, components, equipment, activities, hoursByEquipment]);

  const derivedAlerts = useMemo(() => {
    const result = [];
    scheduleRows.filter(x => x.status === "overdue").forEach(x => result.push({ id: `schedule-${x.id}`, title: "Lubrication overdue", message: `${x.equipment.sap_equipment_no} / ${x.component.component_name} requires ${x.method || "lubrication"}.`, severity: "high", status: "open", source: "Work Schedule" }));
    inventory.forEach(i => { const stock = number(i.current_stock); if (i.critical_stock != null && stock <= number(i.critical_stock)) result.push({ id: `stock-${i.id}`, title: "Critical lubricant stock", message: `${labelLubricant(lubricants, i.lubricant_id)} is at ${stock} ${i.unit || "unit"}.`, severity: "critical", status: "open", source: "Inventory" }); else if (i.minimum_stock != null && stock <= number(i.minimum_stock)) result.push({ id: `stock-${i.id}`, title: "Low lubricant stock", message: `${labelLubricant(lubricants, i.lubricant_id)} is below minimum stock.`, severity: "medium", status: "open", source: "Inventory" }); });
    oils.filter(x => ["alarm", "critical", "warning"].includes(String(x.status).toLowerCase())).forEach(x => result.push({ id: `oil-${x.id}`, title: "Oil analysis attention", message: `${x.sample_id || "Sample"} for ${labelEquipment(equipment, x.equipment_id)} is ${x.status}.`, severity: String(x.status).toLowerCase() === "critical" ? "critical" : "high", status: "open", source: "Oil Analysis" }));
    return [...result, ...alerts];
  }, [scheduleRows, inventory, oils, alerts, lubricants, equipment]);

  async function saveActivity(e) {
    e.preventDefault(); if (!activityForm.equipment_id) return setError("Select an equipment record before saving the activity."); setSaving(true); setError("");
    try {
      const payload = { ...activityForm, equipment_id: activityForm.equipment_id, component_id: activityForm.component_id || null, requirement_id: activityForm.requirement_id || null, lubricant_id: activityForm.lubricant_id || null, running_hours: activityForm.running_hours === "" ? null : number(activityForm.running_hours), quantity: activityForm.quantity === "" ? null : number(activityForm.quantity) };
      const { error } = await supabase.from("lubrication_activities").insert(payload); if (error) throw new Error(error.message);
      setActivityForm(emptyActivity); setShowActivity(false); setNotice("Lubrication activity recorded."); await writeAudit("Activities", null, "create", payload); await loadModuleData();
    } catch (e2) { setError(e2.message); } finally { setSaving(false); }
  }
  async function saveOil(e) {
    e.preventDefault(); if (!oilForm.equipment_id) return setError("Select an equipment record before saving the oil-analysis sample."); setSaving(true); setError("");
    let attachmentPath = null;
    try {
      const payload = { ...oilForm, equipment_id: oilForm.equipment_id, component_id: oilForm.component_id || null, lubricant_id: oilForm.lubricant_id || null, running_hours: oilForm.running_hours === "" ? null : number(oilForm.running_hours), oil_hours: oilForm.oil_hours === "" ? null : number(oilForm.oil_hours) };
      if (reportFile) {
        const safeName = reportFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        attachmentPath = "reports/" + crypto.randomUUID() + "-" + safeName;
        const upload = await supabase.storage.from("oil-analysis-reports").upload(attachmentPath, reportFile, { contentType: reportFile.type, upsert: false });
        if (upload.error) throw new Error("Report upload failed: " + upload.error.message);
        payload.report_attachment_path = attachmentPath;
        payload.report_attachment_name = reportFile.name;
        payload.report_attachment_type = reportFile.type || "application/octet-stream";
        payload.report_attachment_size = reportFile.size;
      }
      const { error } = await supabase.from("oil_analysis_samples").insert(payload);
      if (error) {
        if (attachmentPath) await supabase.storage.from("oil-analysis-reports").remove([attachmentPath]);
        throw new Error(error.message);
      }
      setOilForm(emptyOil); setReportFile(null); setShowOil(false); setNotice("Oil-analysis sample and report saved."); await writeAudit("Oil Analysis", null, "create", payload); await loadModuleData();
    } catch (e2) { setError(e2.message); } finally { setSaving(false); }
  }
  async function openOilAttachment(item) {
    const { data, error } = await supabase.storage.from("oil-analysis-reports").createSignedUrl(item.report_attachment_path, 120);
    if (error) { setError(error.message); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }  async function saveInventory(e) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const payload = { ...inventoryForm, lubricant_id: inventoryForm.lubricant_id, minimum_stock: number(inventoryForm.minimum_stock), critical_stock: number(inventoryForm.critical_stock), current_stock: number(inventoryForm.current_stock), updated_at: new Date().toISOString() };
      const existing = inventory.find(x => x.lubricant_id === payload.lubricant_id && x.store_location === payload.store_location);
      if (existing && !window.confirm("Update the existing stock record for this lubricant and store?")) { setNotice("No changes made."); return; }
      const result = existing ? await supabase.from("lubricant_inventory").update(payload).eq("id", existing.id) : await supabase.from("lubricant_inventory").insert(payload);
      if (result.error) throw new Error(result.error.message);
      setInventoryForm(emptyInventory); setShowInventory(false); setNotice("Inventory balance saved."); await writeAudit("Inventory", existing?.id || null, existing ? "update" : "create", payload); await loadModuleData();
    } catch (e2) { setError(e2.message); } finally { setSaving(false); }
  }

  function parseRunningFile(file) {
    setRunningFileName(file.name); setRunningPreview([]); setRunningMapping({ equipment: "", hours: "", date: "" }); setResourceSelections({});
    const reader = new FileReader(); reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array" }); const sheet = wb.Sheets[wb.SheetNames[0]]; const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        setRunningPreview(rows.slice(0, 10)); setRunningImport(rows);
        const keys = rows.length ? Object.keys(rows[0]) : [];
        const find = terms => keys.find(k => terms.some(t => k.toLowerCase().includes(t))) || "";
        setRunningMapping({ equipment: find(["resource reference", "resource", "work center", "equipment", "equip", "aufnr", "sap"]), hours: find(["running hour", "run hour", "hours", "operating"]), date: find(["date", "period", "posting"]) });
      } catch (e2) { setError(`Could not read Excel file: ${e2.message}`); }
    }; reader.readAsArrayBuffer(file);
  }
  async function importRunningHours() {
    if (!runningImport?.length) return setError("Choose an Excel file first.");
    if (!runningMapping.equipment || !runningMapping.hours) return setError("Map the COOISPI Resource Reference and Running Hours columns before importing.");
    if (!sourceResourceReferences.length) return setError("The selected resource-reference column has no values to import.");
    if (unmappedResourceReferences.length) return setError(`Match every resource reference to a SAP equipment record first (${unmappedResourceReferences.length} still need a match).`);
    setSaving(true); setError("");
    try {
      const mappingRows = sourceResourceReferences.map((resource_reference) => ({ resource_reference, equipment_id: selectedEquipmentForReference(resource_reference), updated_at: new Date().toISOString() }));
      if (mappingRows.length) {
        const { error: mappingError } = await supabase.from("cooispi_resource_mappings").upsert(mappingRows, { onConflict: "resource_reference_key" });
        if (mappingError) throw new Error(`Could not save COOISPI resource mappings: ${mappingError.message}`);
      }
      const periodFrom = runningMapping.date ? runningImport.map(r => new Date(r[runningMapping.date])).filter(d => !Number.isNaN(d.getTime())).sort((a,b)=>a-b)[0] : new Date();
      const periodTo = runningMapping.date ? runningImport.map(r => new Date(r[runningMapping.date])).filter(d => !Number.isNaN(d.getTime())).sort((a,b)=>b-a)[0] : new Date();
      const { data: imp, error: impError } = await supabase.from("running_hours_imports").insert({ file_name: runningFileName, period_from: periodFrom?.toISOString().slice(0,10), period_to: periodTo?.toISOString().slice(0,10), total_rows: runningImport.length, import_status: "processing" }).select().single();
      if (impError) throw new Error(impError.message);
      const grouped = new Map(); let unmatched = 0;
      runningImport.forEach((row) => { const resource = String(row[runningMapping.equipment] ?? "").trim(); const equipmentId = selectedEquipmentForReference(resource); const hours = number(row[runningMapping.hours]); if (!equipmentId || !resource) { unmatched++; return; } grouped.set(equipmentId, (grouped.get(equipmentId) || 0) + hours); });
      const equipmentById = new Map(resourceEquipment.map((item) => [item.id, item]));
      const records = [...grouped.entries()].map(([equipment_id, hours]) => ({ import_id: imp.id, equipment_id, sap_equipment_no: equipmentById.get(equipment_id)?.sap_equipment_no || equipment.find(x => x.id === equipment_id)?.sap_equipment_no, period_from: periodFrom?.toISOString().slice(0,10), period_to: periodTo?.toISOString().slice(0,10), running_hours: hours, source_type: "sap_period", source_file: runningFileName }));
      if (records.length) { const { error } = await supabase.from("running_hours_records").upsert(records, { onConflict: "equipment_id,period_from,period_to" }); if (error) throw new Error(error.message); }
      const { error: updateError } = await supabase.from("running_hours_imports").update({ matched_rows: runningImport.length - unmatched, unmatched_rows: unmatched, import_status: "completed" }).eq("id", imp.id); if (updateError) throw new Error(updateError.message);
      setNotice(`Running-hours import completed: ${records.length} equipment matched, ${unmatched} rows unmatched.`); await writeAudit("Running Hours", imp.id, "import", { file_name: runningFileName, matched: records.length, unmatched }); setRunningImport(null); setRunningPreview([]); setRunningFileName(""); await loadModuleData();
    } catch (e2) { setError(e2.message); } finally { setSaving(false); }
  }
  async function acknowledgeAlert(item) {
    if (saving || moduleLoading) return;
    const existing = alerts.find(x => x.id === item.id);
    if (!existing) { setNotice("This is a live calculated alert; it will clear automatically when the condition is corrected."); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("system_alerts").update({ status: "acknowledged", acknowledged_at: new Date().toISOString() }).eq("id", item.id);
      if (error) throw new Error(error.message);
      setNotice("Alert acknowledged.");
      await loadModuleData();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }
  async function saveSetting(key) {
    if (saving || moduleLoading) return;
    const value = settingDraft[key];
    const existing = settings.find(x => x.setting_key === key);
    if (existing && !window.confirm("Save changes to this system setting?")) { setNotice("No changes made."); return; }
    setSaving(true);
    try {
      const result = existing
        ? await supabase.from("system_settings").update({ setting_value: value, updated_at: new Date().toISOString() }).eq("id", existing.id)
        : await supabase.from("system_settings").insert({ setting_key: key, setting_value: value });
      if (result.error) throw new Error(result.error.message);
      setNotice("Setting saved.");
      await writeAudit("Settings", existing?.id || null, existing ? "update" : "create", { setting_key: key, setting_value: value });
      await loadModuleData();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }
  async function saveUserPermissions(id, permissions) {
    if (saving || moduleLoading || profile?.role !== "master_admin") return;
    if (!window.confirm("Save the module access changes for this account?")) { setNotice("No changes made."); return; }
    setSaving(true);
    try {
      const { error } = await supabase.rpc("set_user_module_permissions", { target_profile_id: id, requested_permissions: permissions });
      if (error) throw new Error(error.message);
      setNotice("Module access updated.");
      await writeAudit("User Management", id, "update", { module_permissions: permissions });
      await loadModuleData();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }
  async function toggleUserActive(id, active) {
    if (saving || moduleLoading || profile?.role !== "master_admin") return;
    const user = profiles.find((item) => item.id === id);
    const action = active ? "enable this account's login" : "disable this account's login";
    if (!window.confirm(`Are you sure you want to ${action}${user?.email ? ` for ${user.email}` : ""}?`)) { setNotice("No changes made."); return; }
    setSaving(true);
    try {
      const { error } = await supabase.rpc("set_user_account_active", { target_profile_id: id, account_active: active });
      if (error) throw new Error(error.message);
      setNotice(active ? "Account login enabled." : "Account login disabled.");
      await writeAudit("User Management", id, active ? "enable_login" : "disable_login", { is_active: active });
      await loadModuleData();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }
  const activityEquipment = moduleLookups?.equipment || equipment;
  const activityComponents = moduleLookups?.components || components;
  const activityLubricants = moduleLookups?.lubricants || lubricants;
  const activityRequirements = moduleLookups?.requirements || requirements;
  const resourceEquipment = moduleLookups?.equipment || equipment;
  const normalizeResourceReference = (value) => String(value ?? "").trim().toLowerCase();
  const sourceResourceReferences = [...new Set((runningImport || []).map((row) => String(row[runningMapping.equipment] ?? "").trim()).filter(Boolean))];
  const savedResourceMap = new Map(resourceMappings.map((item) => [item.resource_reference_key || normalizeResourceReference(item.resource_reference), item.equipment_id]));
  const equipmentByReference = new Map(resourceEquipment.map((item) => [normalizeResourceReference(item.sap_equipment_no), item.id]));
  function selectedEquipmentForReference(reference) {
    const key = normalizeResourceReference(reference);
    return resourceSelections[key] || savedResourceMap.get(key) || equipmentByReference.get(key) || "";
  }
  const unmappedResourceReferences = sourceResourceReferences.filter((reference) => !selectedEquipmentForReference(reference));
  const filteredActivities = activities.filter(a => [labelEquipment(activityEquipment,a.equipment_id), labelComponent(activityEquipment,activityComponents,a.component_id), a.activity_type, a.technician_name, a.sap_notification_no, a.remarks].join(" ").toLowerCase().includes(activitySearch.toLowerCase()));
  const filteredOils = oils.filter(o => [o.sample_id, labelEquipment(equipment,o.equipment_id), labelComponent(equipment,components,o.component_id), o.laboratory, o.status, o.recommendation].join(" ").toLowerCase().includes(oilSearch.toLowerCase()));
  const filteredInventory = inventory.filter(i => [labelLubricant(lubricants,i.lubricant_id), i.store_location, i.unit].join(" ").toLowerCase().includes(inventorySearch.toLowerCase()));

  if (moduleLoading || saving) return <ModuleLoadingState title={moduleLoading ? (loaded ? "Refreshing module data…" : "Loading module data…") : "Saving your change…"} detail="Please wait. This screen is temporarily locked to prevent duplicate requests."/>;
  if (!loaded && moduleLoadError) return <ModuleLoadingState title="Could not load module data" detail={moduleLoadError} onRetry={loadModuleData}/>;

  if (page === "Work Schedule") return <>
    <ModulePanel title="Lubrication work schedule" subtitle={`${scheduleRows.length} approved requirements evaluated against current calendar and running hours.`} action={<button className="secondary-button" onClick={loadModuleData} disabled={moduleLoading}>{moduleLoading ? "Refreshing…" : "Refresh schedule"}</button>}>
      <div className="schedule-summary"><div><b>{scheduleRows.filter(x=>x.status==="overdue").length}</b><span>Overdue</span></div><div><b>{scheduleRows.filter(x=>x.status==="due-soon").length}</b><span>Due soon</span></div><div><b>{scheduleRows.filter(x=>x.status==="scheduled").length}</b><span>Scheduled</span></div></div>
      <div className="table-wrap"><table><thead><tr><th>EQUIPMENT</th><th>COMPONENT</th><th>ACTIVITY</th><th>DUE DATE</th><th>DUE HOURS</th><th>CURRENT HOURS</th><th>TRIGGER</th><th>STATUS</th></tr></thead><tbody>{scheduleRows.map(x=><tr key={x.id}><td><strong>{x.equipment.sap_equipment_no}</strong><small className="cell-sub">{x.equipment.description}</small></td><td>{x.component.component_name}</td><td>{x.method || "Lubrication"}</td><td>{fmtDate(x.calendarDue)}</td><td>{x.hoursDue == null ? "—" : `${Math.round(x.hoursDue)} h`}</td><td>{x.currentHours == null ? "—" : `${Math.round(x.currentHours)} h`}</td><td>{x.dueReason}</td><td><Badge value={x.status} tone={x.status}/></td></tr>)}</tbody></table></div>
    </ModulePanel>
  </>;

  if (page === "Activities") return <>
    {showActivity && <ModuleForm title="Record lubrication activity" subtitle="Record actual work independently of whether an SAP notification exists." onClose={()=>setShowActivity(false)} onSubmit={saveActivity} saving={saving} saveText="Record activity"><div className="module-form-grid"><MField label="Equipment"><SearchableSelect value={activityForm.equipment_id} onChange={(value)=>setActivityForm({...activityForm,equipment_id:value,component_id:""})} options={activityEquipment.filter(x=>x.status==="active").map(x=>({value:x.id,label:`${x.sap_equipment_no} — ${x.description}`}))} placeholder="Select equipment" searchPlaceholder="Search SAP number or equipment name…"/></MField><MField label="Component"><select value={activityForm.component_id} onChange={e=>setActivityForm({...activityForm,component_id:e.target.value})}><option value="">Select component</option>{activityComponents.filter(x=>x.equipment_id===activityForm.equipment_id).map(x=><option key={x.id} value={x.id}>{x.component_name}</option>)}</select></MField><MField label="Requirement"><select value={activityForm.requirement_id} onChange={e=>setActivityForm({...activityForm,requirement_id:e.target.value})}><option value="">Not linked</option>{activityRequirements.filter(x=>x.component_id===activityForm.component_id && x.is_active).map(x=><option key={x.id} value={x.id}>{x.method || "Lubrication requirement"}</option>)}</select></MField><MField label="Activity type"><select value={activityForm.activity_type} onChange={e=>setActivityForm({...activityForm,activity_type:e.target.value})}>{["lubrication","greasing","top_up","oil_replacement","inspection","oil_level_check","condition_check","other"].map(x=><option key={x} value={x}>{x.replaceAll("_"," ")}</option>)}</select></MField><MField label="Activity date"><input type="date" required value={activityForm.activity_date} onChange={e=>setActivityForm({...activityForm,activity_date:e.target.value})}/></MField><MField label="Running hours"><input type="number" min="0" step="0.1" value={activityForm.running_hours} onChange={e=>setActivityForm({...activityForm,running_hours:e.target.value})}/></MField><MField label="Lubricant"><select value={activityForm.lubricant_id} onChange={e=>setActivityForm({...activityForm,lubricant_id:e.target.value})}><option value="">Not specified</option>{activityLubricants.filter(x=>x.status==="active").map(x=><option key={x.id} value={x.id}>{labelLubricant(activityLubricants,x.id)}</option>)}</select></MField><MField label="Quantity"><input type="number" min="0" step="any" value={activityForm.quantity} onChange={e=>setActivityForm({...activityForm,quantity:e.target.value})}/></MField><MField label="Unit"><input value={activityForm.quantity_unit} onChange={e=>setActivityForm({...activityForm,quantity_unit:e.target.value})}/></MField><MField label="Reason"><select value={activityForm.reason} onChange={e=>setActivityForm({...activityForm,reason:e.target.value})}>{["routine","inspection_finding","emergency","corrective_action","low_oil_level","leakage","oil_analysis_recommendation","other"].map(x=><option key={x} value={x}>{x.replaceAll("_"," ")}</option>)}</select></MField><MField label="Technician / performer"><input value={activityForm.technician_name} onChange={e=>setActivityForm({...activityForm,technician_name:e.target.value})}/></MField><MField label="SAP Notification #"><input value={activityForm.sap_notification_no} onChange={e=>setActivityForm({...activityForm,sap_notification_no:e.target.value})}/></MField><MField label="Condition before"><input value={activityForm.condition_before} onChange={e=>setActivityForm({...activityForm,condition_before:e.target.value})}/></MField><MField label="Condition after"><input value={activityForm.condition_after} onChange={e=>setActivityForm({...activityForm,condition_after:e.target.value})}/></MField><MField label="Remarks" full><textarea rows="3" value={activityForm.remarks} onChange={e=>setActivityForm({...activityForm,remarks:e.target.value})}/></MField></div></ModuleForm>}
    <ModulePanel title="Lubrication activities" subtitle={`${filteredActivities.length} activity records`} action={<div className="module-toolbar"><input placeholder="Search activities..." value={activitySearch} onChange={e=>setActivitySearch(e.target.value)}/><button className="primary-button" onClick={()=>setShowActivity(true)}>+ Record activity</button></div>}><div className="table-wrap"><table><thead><tr><th>DATE</th><th>EQUIPMENT</th><th>COMPONENT</th><th>ACTIVITY</th><th>LUBRICANT</th><th>QTY</th><th>RUNNING HOURS</th><th>TECHNICIAN</th><th>SAP NOTIFICATION</th><th>STATUS</th></tr></thead><tbody>{filteredActivities.map(a=><tr key={a.id}><td>{fmtDate(a.activity_date)}</td><td><strong>{labelEquipment(activityEquipment,a.equipment_id)}</strong></td><td>{labelComponent(activityEquipment,activityComponents,a.component_id)}</td><td>{a.activity_type?.replaceAll("_"," ")}</td><td>{labelLubricant(activityLubricants,a.lubricant_id)}</td><td>{a.quantity == null ? "—" : `${a.quantity} ${a.quantity_unit || ""}`}</td><td>{a.running_hours == null ? "—" : `${a.running_hours} h`}</td><td>{a.technician_name || "—"}</td><td>{a.sap_notification_no || "—"}</td><td><Badge value={a.status}/></td></tr>)}</tbody></table></div></ModulePanel>
  </>;

  if (page === "Running Hours") return <>
    <ModulePanel title="SAP COOISPI running-hours import" subtitle="Match each COOISPI Resource Reference to its SAP equipment number. Saved mappings are reused on later imports; equipment relationships continue to apply in the background." action={<label className="primary-button file-button">Choose Excel<input type="file" accept=".xlsx,.xls,.csv" hidden onChange={e=>e.target.files?.[0]&&parseRunningFile(e.target.files[0])}/></label>}>
      {runningImport && <>
        <div className="import-meta"><strong>{runningFileName}</strong><span>{runningImport.length} rows detected</span></div>
        <div className="module-form-grid">
          <MField label="COOISPI Resource Reference column"><select value={runningMapping.equipment} onChange={e=>{setRunningMapping({...runningMapping,equipment:e.target.value});setResourceSelections({});}}><option value="">Select resource column</option>{Object.keys(runningImport[0] || {}).map(k=><option key={k}>{k}</option>)}</select></MField>
          <MField label="Running Hours column"><select value={runningMapping.hours} onChange={e=>setRunningMapping({...runningMapping,hours:e.target.value})}><option value="">Select column</option>{Object.keys(runningImport[0] || {}).map(k=><option key={k}>{k}</option>)}</select></MField>
          <MField label="Date / period column (optional)"><select value={runningMapping.date} onChange={e=>setRunningMapping({...runningMapping,date:e.target.value})}><option value="">No date column</option>{Object.keys(runningImport[0] || {}).map(k=><option key={k}>{k}</option>)}</select></MField>
        </div>
        {runningMapping.equipment && <div className="resource-map-panel"><div className="resource-map-title"><div><strong>Match COOISPI resources to SAP equipment</strong><span>Each reference is saved and reused automatically on the next import.</span></div><b>{unmappedResourceReferences.length ? `${unmappedResourceReferences.length} need matching` : `${sourceResourceReferences.length} ready`}</b></div><div className="resource-map-list">{sourceResourceReferences.map(reference=>{const key=normalizeResourceReference(reference);const isSaved=savedResourceMap.has(key);return <div className="resource-map-row" key={key}><div className="resource-map-ref"><strong>{reference}</strong><small>{isSaved ? "Saved mapping" : "New reference"}</small></div><SearchableSelect value={selectedEquipmentForReference(reference)} onChange={value=>setResourceSelections(current=>({...current,[key]:value}))} options={resourceEquipment.map(item=>({value:item.id,label:`${item.sap_equipment_no} — ${item.description}`}))} placeholder="Select SAP equipment" searchPlaceholder="Search SAP number or equipment name…" emptyText="No equipment found"/></div>})}</div></div>}
        <div className="form-actions-inline"><button className="primary-button" onClick={importRunningHours} disabled={saving || !runningMapping.equipment || !runningMapping.hours || !sourceResourceReferences.length || unmappedResourceReferences.length>0}>{saving ? "Importing…" : "Save mappings and import"}</button></div>
        <div className="table-wrap"><table><thead><tr>{Object.keys(runningPreview[0] || {}).slice(0,8).map(k=><th key={k}>{k}</th>)}</tr></thead><tbody>{runningPreview.map((r,i)=><tr key={i}>{Object.keys(r).slice(0,8).map(k=><td key={k}>{String(r[k])}</td>)}</tr>)}</tbody></table></div>
      </>}
      {!runningImport && <div className="module-empty"><strong>Resource-reference mapping</strong><p>Upload the COOISPI Excel file, select its Resource Reference column, then link each unique reference to the SAP Equipment #. For example, map COALM02 to 751-RM-01 once; that link will be reused automatically on future imports.</p></div>}
    </ModulePanel>
    <div className="module-grid-2"><ModulePanel title="Current running hours" subtitle="Direct SAP hours plus inherited relationship logic"><div className="table-wrap"><table><thead><tr><th>EQUIPMENT</th><th>SAP HOURS</th><th>CALCULATED HOURS</th><th>SOURCE</th></tr></thead><tbody>{equipment.filter(x=>x.status==="active").map(e=>{const directRows=runningRows.filter(r=>r.equipment_id===e.id); const directTotal=directRows.reduce((sum,r)=>sum+number(r.running_hours),0); const calc=hoursByEquipment[e.id]; return <tr key={e.id}><td><strong>{e.sap_equipment_no}</strong><small className="cell-sub">{e.description}</small></td><td>{directRows.length ? `${Math.round(directTotal)} h` : "—"}</td><td>{calc == null ? "—" : <strong>{Math.round(calc)} h</strong>}</td><td>{directRows.length ? "SAP COOISPI" : "Relationship inheritance"}</td></tr>})}</tbody></table></div></ModulePanel><ModulePanel title="Import history" subtitle="Every running-hours import remains traceable"><div className="table-wrap"><table><thead><tr><th>FILE</th><th>PERIOD</th><th>ROWS</th><th>MATCHED</th><th>UNMATCHED</th><th>STATUS</th></tr></thead><tbody>{imports.map(i=><tr key={i.id}><td>{i.file_name}</td><td>{fmtDate(i.period_from)} – {fmtDate(i.period_to)}</td><td>{i.total_rows}</td><td>{i.matched_rows ?? "—"}</td><td>{i.unmatched_rows ?? "—"}</td><td><Badge value={i.import_status}/></td></tr>)}</tbody></table></div></ModulePanel></div>
  </>;

  if (page === "Oil Analysis") return <>
    {showOil && <ModuleForm title="Enter oil-analysis sample" subtitle="Upload a lab report to suggest values, review them, then save the report with the sample." onClose={()=>{setShowOil(false);setReportFile(null);setOilForm(emptyOil);}} onSubmit={saveOil} saving={saving} saveText="Save sample and report">
      <div className="oil-analysis-form">
        <section className="oil-analysis-section"><h3>Scan report</h3><OilReportIntake onFileSelected={setReportFile} onExtracted={(fields)=>{const next={...fields};if(fields.equipment_name){const q=fields.equipment_name.toLowerCase();const found=equipment.find(x=>String(x.sap_equipment_no||"").toLowerCase()===q||String(x.description||"").toLowerCase().includes(q));if(found)next.equipment_id=found.id;}if(fields.reported_product_grade){const q=fields.reported_product_grade.toLowerCase().replace(/[^a-z0-9]/g,"");const found=lubricants.find(x=>[x.grade,x.product_name,x.product_code].some(v=>String(v||"").toLowerCase().replace(/[^a-z0-9]/g,"").includes(q)));if(found)next.lubricant_id=found.id;}setOilForm(current=>({...current,...next}));}}/></section>
        <section className="oil-analysis-section"><h3>Sample and equipment details</h3><div className="module-form-grid">
          <MField label="Sample ID"><input required value={oilForm.sample_id} onChange={e=>updateOilField("sample_id",e.target.value)}/></MField>
          <MField label="Sample date"><input type="date" required value={oilForm.sample_date} onChange={e=>updateOilField("sample_date",e.target.value)}/></MField>
          <MField label="Equipment"><SearchableSelect value={oilForm.equipment_id} onChange={(value)=>setOilForm({...oilForm,equipment_id:value,component_id:""})} options={(moduleLookups?.equipment || equipment).filter(x=>x.status==="active").map(x=>({value:x.id,label:`${x.sap_equipment_no} — ${x.description}`}))} placeholder="Select equipment" searchPlaceholder="Search SAP number or equipment name…"/></MField>
          <MField label="Equipment / machine name on report"><input value={oilForm.equipment_name} onChange={e=>updateOilField("equipment_name",e.target.value)}/></MField>
          <MField label="Component"><select value={oilForm.component_id} onChange={e=>updateOilField("component_id",e.target.value)}><option value="">Not specified</option>{components.filter(x=>x.equipment_id===oilForm.equipment_id).map(x=><option key={x.id} value={x.id}>{x.component_name}</option>)}</select></MField>
          <MField label="Equipment running hours"><input type="number" value={oilForm.running_hours} onChange={e=>updateOilField("running_hours",e.target.value)}/></MField>
          <MField label="Oil running hours"><input type="number" value={oilForm.oil_hours} onChange={e=>updateOilField("oil_hours",e.target.value)}/></MField>
          <MField label="Lubricant in app"><select value={oilForm.lubricant_id} onChange={e=>updateOilField("lubricant_id",e.target.value)}><option value="">Not specified</option>{lubricants.map(x=><option key={x.id} value={x.id}>{labelLubricant(lubricants,x.id)}</option>)}</select></MField>
          <MField label="Product name / grade on report"><input value={oilForm.reported_product_grade} onChange={e=>updateOilField("reported_product_grade",e.target.value)}/></MField>
          <MField label="Make"><input value={oilForm.equipment_make} onChange={e=>updateOilField("equipment_make",e.target.value)}/></MField>
          <MField label="Model"><input value={oilForm.equipment_model} onChange={e=>updateOilField("equipment_model",e.target.value)}/></MField>
          <MField label="Serial number"><input value={oilForm.equipment_serial_no} onChange={e=>updateOilField("equipment_serial_no",e.target.value)}/></MField>
          <MField label="Sample point"><input value={oilForm.sample_point} onChange={e=>updateOilField("sample_point",e.target.value)}/></MField>
          <MField label="Customer"><input value={oilForm.customer_name} onChange={e=>updateOilField("customer_name",e.target.value)}/></MField>
          <MField label="Cell number"><input value={oilForm.cell_number} onChange={e=>updateOilField("cell_number",e.target.value)}/></MField>
          <MField label="Land line number"><input value={oilForm.land_line_number} onChange={e=>updateOilField("land_line_number",e.target.value)}/></MField>
          <MField label="Batch number"><input value={oilForm.batch_number} onChange={e=>updateOilField("batch_number",e.target.value)}/></MField>
          <MField label="Oil top-up volume"><input value={oilForm.oil_top_up_volume} onChange={e=>updateOilField("oil_top_up_volume",e.target.value)}/></MField>
          <MField label="Oil sump capacity"><input value={oilForm.oil_sump_capacity} onChange={e=>updateOilField("oil_sump_capacity",e.target.value)}/></MField>
          <MField label="Oil condition"><select value={oilForm.oil_condition} onChange={e=>updateOilField("oil_condition",e.target.value)}><option value="">Unknown</option><option>Used oil</option><option>Fresh oil</option></select></MField>
          <MField label="Laboratory"><input value={oilForm.laboratory} onChange={e=>updateOilField("laboratory",e.target.value)}/></MField>
          <MField label="Laboratory report / sample number"><input value={oilForm.laboratory_report_no} onChange={e=>updateOilField("laboratory_report_no",e.target.value)}/></MField>
          <MField label="Reason for testing"><input value={oilForm.reason_for_testing} onChange={e=>updateOilField("reason_for_testing",e.target.value)}/></MField>
          <MField label="Initiated by"><input value={oilForm.initiated_by} onChange={e=>updateOilField("initiated_by",e.target.value)}/></MField><MField label="Initiated date"><input type="date" value={oilForm.initiated_date} onChange={e=>updateOilField("initiated_date",e.target.value)}/></MField><MField label="Tested by"><input value={oilForm.tested_by} onChange={e=>updateOilField("tested_by",e.target.value)}/></MField><MField label="Reviewed by"><input value={oilForm.reviewed_by} onChange={e=>updateOilField("reviewed_by",e.target.value)}/></MField><MField label="Approved by"><input value={oilForm.approved_by} onChange={e=>updateOilField("approved_by",e.target.value)}/></MField><MField label="Approval date"><input type="date" value={oilForm.approval_date} onChange={e=>updateOilField("approval_date",e.target.value)}/></MField><MField label="Approval running hours"><input value={oilForm.approval_running_hours} onChange={e=>updateOilField("approval_running_hours",e.target.value)}/></MField>
          <MField label="Receiving date"><input type="date" value={oilForm.receiving_date} onChange={e=>updateOilField("receiving_date",e.target.value)}/></MField>
          <MField label="Receiving time"><input value={oilForm.receiving_time} onChange={e=>updateOilField("receiving_time",e.target.value)}/></MField>
        </div></section>

        <section className="oil-analysis-section"><h3>Laboratory results</h3><p>Values retain their report units and qualifiers (for example, &lt;1.00). Confirm OCR suggestions against the scan.</p><div className="module-form-grid">
          <MField label="Appearance"><input value={oilForm.appearance} onChange={e=>updateOilField("appearance",e.target.value)}/></MField>
          <MField label="Color"><input value={oilForm.color} onChange={e=>updateOilField("color",e.target.value)}/></MField>
          <MField label="Density at 15°C (kg/L)"><input value={oilForm.density_15c} onChange={e=>updateOilField("density_15c",e.target.value)}/></MField>
          <MField label="Crackle test"><input value={oilForm.crackle} onChange={e=>updateOilField("crackle",e.target.value)}/></MField>
          <MField label="Blotter spot test"><input value={oilForm.blotter_spot_test} onChange={e=>updateOilField("blotter_spot_test",e.target.value)}/></MField>
          <MField label="Acid number / TAN (mg KOH/g)"><input value={oilForm.tan} onChange={e=>updateOilField("tan",e.target.value)}/></MField>
          <MField label="Base number / TBN (mg KOH/g)"><input value={oilForm.tbn} onChange={e=>updateOilField("tbn",e.target.value)}/></MField>
          <MField label="Viscosity at 40°C (mm²/s)"><input value={oilForm.viscosity} onChange={e=>updateOilField("viscosity",e.target.value)}/></MField>
          <MField label="Viscosity at 100°C (mm²/s)"><input value={oilForm.viscosity_100c} onChange={e=>updateOilField("viscosity_100c",e.target.value)}/></MField>
          <MField label="Viscosity index"><input value={oilForm.viscosity_index} onChange={e=>updateOilField("viscosity_index",e.target.value)}/></MField><MField label="Apparent viscosity at -15°C"><input value={oilForm.apparent_viscosity_minus15c} onChange={e=>updateOilField("apparent_viscosity_minus15c",e.target.value)}/></MField><MField label="Treat rate"><input value={oilForm.treat_rate} onChange={e=>updateOilField("treat_rate",e.target.value)}/></MField>
          <MField label="Water (% vol)"><input value={oilForm.water_pct} onChange={e=>updateOilField("water_pct",e.target.value)}/></MField>
          <MField label="Karl Fischer water (mg/kg)"><input value={oilForm.karl_fischer_water} onChange={e=>updateOilField("karl_fischer_water",e.target.value)}/></MField>
          <MField label="Fuel dilution (vol %)"><input value={oilForm.fuel_dilution} onChange={e=>updateOilField("fuel_dilution",e.target.value)}/></MField>
          <MField label="Flash point COC (°C)"><input value={oilForm.flash_point_coc} onChange={e=>updateOilField("flash_point_coc",e.target.value)}/></MField>
          <MField label="Flash point PMCC (°C)"><input value={oilForm.flash_point_pmcc} onChange={e=>updateOilField("flash_point_pmcc",e.target.value)}/></MField>
          <MField label="Flash point Setaflash (°C)"><input value={oilForm.flash_point_seta} onChange={e=>updateOilField("flash_point_seta",e.target.value)}/></MField>
          <MField label="Oxidation / ageing"><input value={oilForm.oxidation} onChange={e=>updateOilField("oxidation",e.target.value)}/></MField>
          <MField label="Nitration"><input value={oilForm.nitration} onChange={e=>updateOilField("nitration",e.target.value)}/></MField>
          <MField label="Iron (mg/kg)"><input value={oilForm.iron} onChange={e=>updateOilField("iron",e.target.value)}/></MField>
          <MField label="Copper (mg/kg)"><input value={oilForm.copper} onChange={e=>updateOilField("copper",e.target.value)}/></MField>
          <MField label="Chromium (mg/kg)"><input value={oilForm.chromium} onChange={e=>updateOilField("chromium",e.target.value)}/></MField>
          <MField label="Lead (mg/kg)"><input value={oilForm.lead} onChange={e=>updateOilField("lead",e.target.value)}/></MField>
          <MField label="Silicon (mg/kg)"><input value={oilForm.silicon} onChange={e=>updateOilField("silicon",e.target.value)}/></MField>
          <MField label="Sodium (mg/kg)"><input value={oilForm.sodium} onChange={e=>updateOilField("sodium",e.target.value)}/></MField>
          <MField label="Aluminium (mg/kg)"><input value={oilForm.aluminium} onChange={e=>updateOilField("aluminium",e.target.value)}/></MField>
          <MField label="Tin (mg/kg)"><input value={oilForm.tin} onChange={e=>updateOilField("tin",e.target.value)}/></MField>
          <MField label="Zinc (mg/kg)"><input value={oilForm.zinc} onChange={e=>updateOilField("zinc",e.target.value)}/></MField>
          <MField label="Calcium (mg/kg)"><input value={oilForm.calcium} onChange={e=>updateOilField("calcium",e.target.value)}/></MField>
          <MField label="Magnesium (mg/kg)"><input value={oilForm.magnesium} onChange={e=>updateOilField("magnesium",e.target.value)}/></MField>
          <MField label="Pentane insolubles (% mass)"><input value={oilForm.pentane_insolubles} onChange={e=>updateOilField("pentane_insolubles",e.target.value)}/></MField>
          <MField label="Copper corrosion (100°C, 3 h)"><input value={oilForm.copper_corrosion_100c} onChange={e=>updateOilField("copper_corrosion_100c",e.target.value)}/></MField>
          <MField label="Foam tendency, sequence I"><input value={oilForm.foam_tendency_seq1} onChange={e=>updateOilField("foam_tendency_seq1",e.target.value)}/></MField>
          <MField label="Foam tendency, sequence II"><input value={oilForm.foam_tendency_seq2} onChange={e=>updateOilField("foam_tendency_seq2",e.target.value)}/></MField>
          <MField label="Foam tendency, sequence III"><input value={oilForm.foam_tendency_seq3} onChange={e=>updateOilField("foam_tendency_seq3",e.target.value)}/></MField>
          <MField label="Particle count"><input value={oilForm.particle_count} onChange={e=>updateOilField("particle_count",e.target.value)}/></MField>
          <MField label="ISO cleanliness code"><input value={oilForm.iso_code} onChange={e=>updateOilField("iso_code",e.target.value)}/></MField>
          <MField label="PQ index"><input value={oilForm.pq_index} onChange={e=>updateOilField("pq_index",e.target.value)}/></MField>
          <MField label="Status"><select value={oilForm.status} onChange={e=>updateOilField("status",e.target.value)}><option>normal</option><option>warning</option><option>alarm</option><option>critical</option></select></MField>
          <MField label="Recommendation"><input value={oilForm.recommendation} onChange={e=>updateOilField("recommendation",e.target.value)}/></MField>
          <MField label="Reviewer"><input value={oilForm.reviewer} onChange={e=>updateOilField("reviewer",e.target.value)}/></MField>
          <MField label="Remarks" full><textarea rows="3" value={oilForm.remarks} onChange={e=>updateOilField("remarks",e.target.value)}/></MField>
        </div></section>
      </div>
    </ModuleForm>}
    <ModulePanel title="Oil analysis" subtitle={filteredOils.length + " samples"} action={<div className="module-toolbar"><input placeholder="Search samples..." value={oilSearch} onChange={e=>setOilSearch(e.target.value)}/><button className="primary-button" onClick={()=>{setOilForm(emptyOil);setReportFile(null);setShowOil(true);}}>+ Add sample</button></div>}>
      <div className="oil-kpis"><div><b>{oils.length}</b><span>Samples</span></div><div><b>{oils.filter(x=>x.status==="normal").length}</b><span>Normal</span></div><div><b>{oils.filter(x=>x.status==="warning").length}</b><span>Warning</span></div><div><b>{oils.filter(x=>["alarm","critical"].includes(x.status)).length}</b><span>Alarm / Critical</span></div></div>
      <div className="table-wrap"><table><thead><tr><th>SAMPLE</th><th>DATE</th><th>EQUIPMENT</th><th>COMPONENT</th><th>LAB</th><th>VISCOSITY 40°C</th><th>VISCOSITY 100°C</th><th>IRON</th><th>WATER</th><th>STATUS</th><th>REPORT</th></tr></thead><tbody>
        {filteredOils.map(o=><tr key={o.id}><td><strong>{o.sample_id}</strong></td><td>{fmtDate(o.sample_date)}</td><td>{labelEquipment(equipment,o.equipment_id)}</td><td>{labelComponent(equipment,components,o.component_id)}</td><td>{o.laboratory || "—"}</td><td>{o.viscosity || "—"}</td><td>{o.viscosity_100c || "—"}</td><td>{o.iron || "—"}</td><td>{o.water_pct || o.karl_fischer_water || o.water || "—"}</td><td><Badge value={o.status}/></td><td>{o.report_attachment_path ? <button className="table-action" onClick={()=>openOilAttachment(o)}>{o.report_attachment_name || "Open scan"}</button> : "—"}</td></tr>)}
      </tbody></table></div>
    </ModulePanel>
  </>;  if (page === "Inventory") return <>
    {showInventory && <ModuleForm title="Set lubricant stock" subtitle="Maintain the current stock snapshot and thresholds for a store location." onClose={()=>setShowInventory(false)} onSubmit={saveInventory} saving={saving} saveText="Save stock"><div className="module-form-grid"><MField label="Lubricant"><select required value={inventoryForm.lubricant_id} onChange={e=>setInventoryForm({...inventoryForm,lubricant_id:e.target.value})}><option value="">Select lubricant</option>{lubricants.filter(x=>x.status==="active").map(x=><option key={x.id} value={x.id}>{labelLubricant(lubricants,x.id)}</option>)}</select></MField><MField label="Store location"><input value={inventoryForm.store_location} onChange={e=>setInventoryForm({...inventoryForm,store_location:e.target.value})} placeholder="e.g. Central Lubricant Store"/></MField><MField label="Unit"><input value={inventoryForm.unit} onChange={e=>setInventoryForm({...inventoryForm,unit:e.target.value})}/></MField><MField label="Current stock"><input type="number" step="any" value={inventoryForm.current_stock} onChange={e=>setInventoryForm({...inventoryForm,current_stock:e.target.value})}/></MField><MField label="Minimum stock"><input type="number" step="any" value={inventoryForm.minimum_stock} onChange={e=>setInventoryForm({...inventoryForm,minimum_stock:e.target.value})}/></MField><MField label="Critical stock"><input type="number" step="any" value={inventoryForm.critical_stock} onChange={e=>setInventoryForm({...inventoryForm,critical_stock:e.target.value})}/></MField></div></ModuleForm>}
    <ModulePanel title="Lubricant inventory" subtitle="Current stock, minimum stock and material risk visibility" action={<div className="module-toolbar"><input placeholder="Search inventory..." value={inventorySearch} onChange={e=>setInventorySearch(e.target.value)}/><button className="primary-button" onClick={()=>setShowInventory(true)}>+ Set stock</button></div>}><div className="inventory-kpis"><div><b>{inventory.length}</b><span>Stock items</span></div><div><b>{inventory.filter(x=>number(x.current_stock)<=number(x.minimum_stock)).length}</b><span>Low stock</span></div><div><b>{inventory.filter(x=>number(x.current_stock)<=number(x.critical_stock)).length}</b><span>Critical stock</span></div><div><b>{procurement.filter(x=>!["Closed","Cancelled","Fully Received"].includes(x.status)).length}</b><span>Open procurement</span></div></div><div className="table-wrap"><table><thead><tr><th>LUBRICANT</th><th>STORE</th><th>CURRENT</th><th>MINIMUM</th><th>CRITICAL</th><th>OPEN PROCUREMENT</th><th>STATUS</th></tr></thead><tbody>{filteredInventory.map(i=>{const p=procurement.filter(x=>x.item_code===lubricants.find(l=>l.id===i.lubricant_id)?.product_code && !["Closed","Cancelled","Fully Received"].includes(x.status)).reduce((s,x)=>s+number(x.quantity),0); const status=number(i.current_stock)<=number(i.critical_stock)?"critical":number(i.current_stock)<=number(i.minimum_stock)?"low":"healthy"; return <tr key={i.id}><td><strong>{labelLubricant(lubricants,i.lubricant_id)}</strong></td><td>{i.store_location || "—"}</td><td>{i.current_stock} {i.unit}</td><td>{i.minimum_stock} {i.unit}</td><td>{i.critical_stock} {i.unit}</td><td>{p ? `${p} ${i.unit}` : "—"}</td><td><Badge value={status} tone={status}/></td></tr>})}</tbody></table></div></ModulePanel>
  </>;

  if (page === "Alerts") {
    const visible = derivedAlerts.filter(a => alertFilter === "all" || String(a.status).toLowerCase() === alertFilter);
    return <ModulePanel title="Alerts and attention" subtitle="Actionable schedule, oil-analysis, inventory and data-quality signals." action={<select className="alert-filter" value={alertFilter} onChange={e=>setAlertFilter(e.target.value)}><option value="open">Open</option><option value="acknowledged">Acknowledged</option><option value="all">All</option></select>}><div className="alert-summary"><div><b>{derivedAlerts.filter(x=>x.status==="open").length}</b><span>Open</span></div><div><b>{derivedAlerts.filter(x=>x.severity==="critical").length}</b><span>Critical</span></div><div><b>{derivedAlerts.filter(x=>x.source==="Work Schedule").length}</b><span>Schedule</span></div><div><b>{derivedAlerts.filter(x=>x.source==="Inventory").length}</b><span>Inventory</span></div></div><div className="alert-list">{visible.map(a=><div className="alert-row" key={a.id}><div className={`alert-severity ${a.severity}`}/><div className="alert-main"><strong>{a.title}</strong><p>{a.message}</p><small>{a.source || "System"}</small></div><Badge value={a.status}/>{a.status === "open" && <button className="table-action" onClick={()=>acknowledgeAlert(a)} disabled={saving || moduleLoading}>{saving ? "Saving…" : "Acknowledge"}</button>}</div>)}{!visible.length && <div className="module-empty"><strong>No alerts in this view</strong><p>The system will show attention items here as schedule, oil-analysis and inventory conditions change.</p></div>}</div></ModulePanel>;
  }

  if (page === "Reports") return <LubricationReport activities={activities} oils={oils} scheduleRows={scheduleRows} inventory={inventory} equipment={equipment} components={components} lubricants={lubricants} labelEquipment={labelEquipment} labelComponent={labelComponent} labelLubricant={labelLubricant} fmtDate={fmtDate} number={number}/>;

  if (page === "User Management") return profile?.role === "master_admin" ? <UserAccessManager profiles={profiles} saving={saving} moduleLoading={moduleLoading} onSave={saveUserPermissions} onToggleActive={toggleUserActive}/> : <div className="module-empty"><strong>Administrator access required</strong><p>This area is only available to master administrators.</p></div>;

  if (page === "Settings") return <><ModulePanel title="System configuration" subtitle="Admin-controlled settings that influence thresholds and application behavior."><div className="settings-grid">{["due_soon_days","running_hours_due_soon","default_quantity_unit","low_stock_alert_enabled","oil_analysis_alerts_enabled"].map(key=>{const s=settings.find(x=>x.setting_key===key); const value=settingDraft[key] ?? s?.setting_value ?? ""; return <div className="setting-card" key={key}><div><strong>{key.replaceAll("_"," ")}</strong><small>Application setting</small></div><input value={value} onChange={e=>setSettingDraft({...settingDraft,[key]:e.target.value})} disabled={!canEdit}/><button className="secondary-button" onClick={()=>saveSetting(key)} disabled={!canEdit || saving || moduleLoading}>{saving ? "Saving…" : "Save"}</button></div>;})}</div></ModulePanel><ModulePanel title="Configuration notes" subtitle="Keep engineering thresholds configurable rather than hard-coded."><div className="module-empty"><p>Oil-analysis limits, running-hour due-soon windows, stock thresholds and alert behavior should be controlled here or in their respective master-data screens.</p></div></ModulePanel></>;

  if (page === "Audit History") return <ModulePanel title="Audit history" subtitle="Important changes and import operations should remain traceable."><div className="module-empty"><strong>Audit trail foundation</strong><p>The audit table is ready for application actions. Existing modules can be extended to write old/new JSON snapshots for every material change.</p></div></ModulePanel>;

  return null;
}





