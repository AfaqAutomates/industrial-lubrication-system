import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import RemainingModules from "./RemainingModules";
import "./index.css";

const navigation = [
  { section: "WORKSPACE", items: ["Dashboard", "Equipment", "Equipment Relationships", "Components"] },
  { section: "LUBRICATION", items: ["Lubrication Requirements", "Work Schedule", "Activities", "Running Hours", "Oil Analysis"] },
  { section: "RESOURCES", items: ["Lubricant Master", "Inventory", "Reports"] },
  { section: "SYSTEM", items: ["Alerts", "User Management", "Settings", "Audit History"] },
];

const pageMeta = {
  Dashboard: ["Overview", "Monitor your equipment register and lubrication setup."],
  Equipment: ["Asset register", "Manage SAP equipment records and lubrication criticality."],
  "Equipment Relationships": ["Runtime logic", "Define equipment dependencies and running-hours inheritance."],
  Components: ["Component register", "Manage machine components linked to SAP equipment."],
  "Lubrication Requirements": ["Lubrication master data", "Define approved lubrication activities, intervals, quantities and instructions."],
  "Lubricant Master": ["Lubricant master data", "Maintain the oils, greases and lubricant products used across the plant."],
  "Work Schedule": ["Planning", "Plan and review upcoming lubrication work."],
  Activities: ["Execution", "Record and monitor lubrication activities."],
  "Running Hours": ["Runtime data", "Manage equipment running-hour information and inheritance."],
  "Oil Analysis": ["Condition monitoring", "Review oil-analysis records and alerts."],
  Inventory: ["Materials", "Monitor lubricant stock and procurement information."],
  Reports: ["Analytics", "Review reliability and lubrication reports."],
  Alerts: ["Attention required", "Review system and lubrication alerts."],
  "User Management": ["Administration", "Manage controlled application users."],
  Settings: ["Configuration", "Manage application settings."],
  "Audit History": ["Governance", "Review important application changes and import operations."],
};

const emptyEquipmentForm = {
  sap_equipment_no: "", description: "", plant_id: "", area_id: "", functional_location: "",
  equipment_type: "", status: "active", lubrication_criticality: "medium", lubrication_notes: "",
};
const emptyRelationshipForm = {
  parent_equipment_id: "", child_equipment_ids: [], relationship_type: "runs_with",
  running_hours_rule: "inherit", notes: "",
};
const emptyComponentForm = {
  equipment_id: "", component_name: "", component_type: "", description: "", criticality: "medium", status: "active", remarks: "",
};
const emptyRequirementForm = {
  component_id: "", lubricant_id: "", activity_name: "Oil level check", frequency_basis: "either",
  interval_hours: "", interval_days: "", quantity: "", quantity_unit: "L", method: "",
  source_reference: "", revision: "", effective_from: "", approval_status: "draft", instructions: "",
};
const emptyLubricantForm = {
  product_code: "", product_name: "", manufacturer: "", lubricant_type: "Oil", grade: "",
  base_oil: "", thickener: "", nlgi_grade: "", description: "", status: "active",
};

function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    equipment: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5V3h10v2M8 10h8M8 14h5"/></>,
    link: <><path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1"/><path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1"/></>,
    component: <><circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/></>,
    oil: <><path d="M12 3s6 6.2 6 10a6 6 0 1 1-12 0c0-3.8 6-10 6-10Z"/><path d="M9 14c.5 1.4 1.4 2 3 2"/></>,
    schedule: <><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M8 14h3M8 17h5"/></>,
    activity: <><path d="M4 12h4l2-6 4 12 2-6h4"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    flask: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7 16h10"/></>,
    box: <><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/></>,
    report: <><path d="M5 20V10M12 20V4M19 20v-7"/><path d="M3 20h18"/></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    users: <><circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5M14 16c3-.5 6 .9 6 4"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .3 2l.1.1-2 2-.1-.1a1.8 1.8 0 0 0-2-.3 1.8 1.8 0 0 0-1.1 1.7V21h-3v-.2a1.8 1.8 0 0 0-1.1-1.7 1.8 1.8 0 0 0-2 .3l-.1.1-2-2 .1-.1a1.8 1.8 0 0 0 .3-2 1.8 1.8 0 0 0-1.7-1.1H3v-3h.2a1.8 1.8 0 0 0 1.7-1.1 1.8 1.8 0 0 0-.3-2l-.1-.1 2-2 .1.1a1.8 1.8 0 0 0 2 .3A1.8 1.8 0 0 0 9.7 5V3h3v.2a1.8 1.8 0 0 0 1.1 1.7 1.8 1.8 0 0 0 2-.3l.1-.1 2 2-.1.1a1.8 1.8 0 0 0-.3 2 1.8 1.8 0 0 0 1.7 1.1H21v3h-.2a1.8 1.8 0 0 0-1.4 1.3Z"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    edit: <><path d="m4 16-.8 4.8L8 20l11-11-4-4L4 16Z"/><path d="m13 6 4 4"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    chevron: <path d="m8 10 4 4 4-4"/>,
    filter: <><path d="M4 5h16M7 12h10M10 19h4"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.grid}</svg>;
}

function Dashboard() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [plants, setPlants] = useState([]);
  const [areas, setAreas] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [totalEquipmentCount, setTotalEquipmentCount] = useState(0);
  const [activeEquipmentCount, setActiveEquipmentCount] = useState(0);
  const [relationships, setRelationships] = useState([]);
  const [components, setComponents] = useState([]);
  const [lubricants, setLubricants] = useState([]);
  const [requirements, setRequirements] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyEquipmentForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState(null);

  const [relationshipForm, setRelationshipForm] = useState(emptyRelationshipForm);
  const [childPickerOpen, setChildPickerOpen] = useState(false);
  const [childEquipmentSearch, setChildEquipmentSearch] = useState("");
  const [savingRelationship, setSavingRelationship] = useState(false);
  const [deactivatingRelationshipId, setDeactivatingRelationshipId] = useState(null);

  const [componentSearch, setComponentSearch] = useState("");
  const [componentStatusFilter, setComponentStatusFilter] = useState("all");
  const [showComponentForm, setShowComponentForm] = useState(false);
  const [componentForm, setComponentForm] = useState(emptyComponentForm);
  const [editingComponentId, setEditingComponentId] = useState(null);
  const [savingComponent, setSavingComponent] = useState(false);
  const [deactivatingComponentId, setDeactivatingComponentId] = useState(null);

  const [requirementSearch, setRequirementSearch] = useState("");
  const [requirementStatusFilter, setRequirementStatusFilter] = useState("all");
  const [showRequirementForm, setShowRequirementForm] = useState(false);
  const [requirementForm, setRequirementForm] = useState(emptyRequirementForm);
  const [editingRequirementId, setEditingRequirementId] = useState(null);
  const [savingRequirement, setSavingRequirement] = useState(false);
  const [deactivatingRequirementId, setDeactivatingRequirementId] = useState(null);

  const [lubricantSearch, setLubricantSearch] = useState("");
  const [lubricantStatusFilter, setLubricantStatusFilter] = useState("all");
  const [showLubricantForm, setShowLubricantForm] = useState(false);
  const [lubricantForm, setLubricantForm] = useState(emptyLubricantForm);
  const [editingLubricantId, setEditingLubricantId] = useState(null);
  const [savingLubricant, setSavingLubricant] = useState(false);
  const [deactivatingLubricantId, setDeactivatingLubricantId] = useState(null);

  const [loading, setLoading] = useState(true);
  const loadDataRequestRef = useRef(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [toast, setToast] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    function closeOnEscape(event) { if (event.key === "Escape") setMobileNavOpen(false); }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileNavOpen]);

  useEffect(() => {
    const message = error || notice;
    if (!message) { setToast(null); return undefined; }
    setToast({ type: error ? "error" : "success", message });
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [error, notice]);

  // Fetch every equipment row in pages because Supabase commonly limits each response to 1,000 rows.
  async function fetchAllEquipment() {
    const pageSize = 1000;
    const allEquipment = [];
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("equipment")
        .select("id, sap_equipment_no, description, plant_id, area_id, functional_location, equipment_type, status, lubrication_criticality, lubrication_notes")
        .order("sap_equipment_no")
        .range(from, from + pageSize - 1);

      if (error) return { data: null, error };
      const page = data || [];
      allEquipment.push(...page);

      if (page.length < pageSize) break;
      from += pageSize;
    }

    return { data: allEquipment, error: null };
  }

  async function loadData() {
    if (loadDataRequestRef.current) return loadDataRequestRef.current;
    const request = (async () => {
      setLoading(true);
      try {
        const [plantResult, areaResult, equipmentResult, relationshipResult, componentResult, lubricantResult, requirementResult, totalCountResult, activeCountResult] = await Promise.all([
          supabase.from("plants").select("id, code, name").eq("is_active", true).order("name"),
          supabase.from("areas").select("id, plant_id, code, name").eq("is_active", true).order("name"),
          fetchAllEquipment(),
          supabase.from("equipment_relationships").select("id, parent_equipment_id, child_equipment_id, relationship_type, running_hours_rule, notes, is_active, created_at").order("created_at", { ascending: false }),
          supabase.from("components").select("id, equipment_id, component_name, component_type, description, criticality, status, remarks, created_at").order("component_name"),
          supabase.from("lubricants").select("id, product_code, product_name, manufacturer, lubricant_type, grade, base_oil, thickener, nlgi_grade, description, status, created_at, updated_at").order("product_name"),
          supabase.from("lubrication_requirements").select("id, component_id, lubrication_point_id, lubricant_id, frequency_basis, interval_hours, interval_days, quantity, quantity_unit, method, source_reference, revision, effective_from, approved_by, approval_status, is_active, instructions, created_at, updated_at").order("created_at", { ascending: false }),
          supabase.from("equipment").select("id", { count: "exact", head: true }),
          supabase.from("equipment").select("id", { count: "exact", head: true }).eq("status", "active"),
        ]);
        const firstError = [plantResult, areaResult, equipmentResult, relationshipResult, componentResult, lubricantResult, requirementResult, totalCountResult, activeCountResult].find((result) => result.error)?.error;
        if (firstError) throw new Error(firstError.message);
        setPlants(plantResult.data || []);
        setAreas(areaResult.data || []);
        setEquipment(equipmentResult.data || []);
        setTotalEquipmentCount(totalCountResult.count ?? 0);
        setActiveEquipmentCount(activeCountResult.count ?? 0);
        setRelationships(relationshipResult.data || []);
        setComponents(componentResult.data || []);
        setLubricants(lubricantResult.data || []);
        setRequirements(requirementResult.data || []);
      } catch (e) {
        setError(e.message || "Unable to load database records.");
      } finally {
        setLoading(false);
      }
    })();
    loadDataRequestRef.current = request;
    try { await request; }
    finally { if (loadDataRequestRef.current === request) loadDataRequestRef.current = null; }
  }
  useEffect(() => { loadData(); }, []);

  const activeEquipment = useMemo(() => equipment.filter((x) => x.status === "active"), [equipment]);
  const activeComponents = useMemo(() => components.filter((x) => x.status === "active"), [components]);
  const activeLubricants = useMemo(() => lubricants.filter((x) => x.status === "active"), [lubricants]);
  const selectedAreas = useMemo(() => areas.filter((a) => a.plant_id === form.plant_id), [areas, form.plant_id]);

  const filteredEquipment = useMemo(() => equipment.filter((item) => {
    const text = [item.sap_equipment_no, item.description, item.functional_location, item.equipment_type, plants.find((p) => p.id === item.plant_id)?.name, areas.find((a) => a.id === item.area_id)?.name].join(" ").toLowerCase();
    return text.includes(search.toLowerCase()) && (statusFilter === "all" || item.status === statusFilter);
  }), [equipment, search, statusFilter, plants, areas]);

  const filteredComponents = useMemo(() => components.filter((item) => {
    const e = equipment.find((x) => x.id === item.equipment_id);
    const text = [item.component_name, item.component_type, item.description, item.criticality, item.status, item.remarks, e?.sap_equipment_no, e?.description].join(" ").toLowerCase();
    return text.includes(componentSearch.toLowerCase()) && (componentStatusFilter === "all" || item.status === componentStatusFilter);
  }), [components, equipment, componentSearch, componentStatusFilter]);

  const filteredLubricants = useMemo(() => lubricants.filter((item) => {
    const text = [item.product_code, item.product_name, item.manufacturer, item.lubricant_type, item.grade, item.base_oil, item.thickener, item.nlgi_grade, item.description, item.status].filter(Boolean).join(" ").toLowerCase();
    return text.includes(lubricantSearch.toLowerCase()) && (lubricantStatusFilter === "all" || item.status === lubricantStatusFilter);
  }), [lubricants, lubricantSearch, lubricantStatusFilter]);

  const filteredRequirements = useMemo(() => requirements.filter((item) => {
    const c = components.find((x) => x.id === item.component_id); const e = c ? equipment.find((x) => x.id === c.equipment_id) : null; const l = lubricants.find((x) => x.id === item.lubricant_id);
    const text = [c?.component_name, e?.sap_equipment_no, e?.description, l?.product_name, l?.product_code, l?.grade, item.method, item.source_reference, item.approval_status, item.frequency_basis, item.instructions].join(" ").toLowerCase();
    const recordStatus = item.is_active ? "active" : "inactive";
    return text.includes(requirementSearch.toLowerCase()) && (requirementStatusFilter === "all" || recordStatus === requirementStatusFilter);
  }), [requirements, components, equipment, lubricants, requirementSearch, requirementStatusFilter]);

  const componentTypeSuggestions = useMemo(() => [...new Set(components.map((x) => x.component_type).filter(Boolean))].sort(), [components]);

  function clearMessages() { setError(""); setNotice(""); }
  function go(page) { setActivePage(page); setMobileNavOpen(false); clearMessages(); setSearch(""); setStatusFilter("all"); }
  function updateForm(e) { const { name, value } = e.target; setForm((p) => ({ ...p, [name]: value, ...(name === "plant_id" ? { area_id: "" } : {}) })); }

  async function saveEquipment(e) {
    e.preventDefault(); if (editingId && !window.confirm("Save changes to this equipment record?")) { clearMessages(); setNotice("No changes made."); return; } setSaving(true); clearMessages();
    try {
      const payload = { sap_equipment_no: form.sap_equipment_no.trim(), description: form.description.trim(), plant_id: form.plant_id, area_id: form.area_id || null, functional_location: form.functional_location.trim() || null, equipment_type: form.equipment_type.trim() || null, status: form.status, lubrication_criticality: form.lubrication_criticality, lubrication_notes: form.lubrication_notes.trim() || null };
      if (!payload.sap_equipment_no || !payload.description || !payload.plant_id) throw new Error("SAP Equipment #, Description and Plant are required.");
      const result = editingId ? await supabase.from("equipment").update(payload).eq("id", editingId) : await supabase.from("equipment").insert(payload);
      if (result.error) throw new Error(result.error.message);
      setNotice(editingId ? "Equipment updated successfully." : "Equipment saved successfully."); setShowForm(false); setEditingId(null); setForm(emptyEquipmentForm); await loadData();
    } catch (e) { setError(e.message || "Unable to save equipment."); } finally { setSaving(false); }
  }
  function editEquipment(item) { setEditingId(item.id); setForm({ sap_equipment_no: item.sap_equipment_no || "", description: item.description || "", plant_id: item.plant_id || "", area_id: item.area_id || "", functional_location: item.functional_location || "", equipment_type: item.equipment_type || "", status: item.status || "active", lubrication_criticality: item.lubrication_criticality || "medium", lubrication_notes: item.lubrication_notes || "" }); clearMessages(); setShowForm(true); }
  async function deactivateEquipment(item) { if (!window.confirm(`Mark ${item.sap_equipment_no} as inactive?`)) return; setDeactivatingId(item.id); clearMessages(); try { const { error } = await supabase.from("equipment").update({ status: "inactive" }).eq("id", item.id); if (error) throw new Error(error.message); setNotice("Equipment marked inactive."); await loadData(); } catch (e) { setError(e.message); } finally { setDeactivatingId(null); } }

  function updateRelationshipForm(e) {
    const { name, value } = e.target;
    if (name === "parent_equipment_id") {
      setRelationshipForm((current) => ({ ...current, parent_equipment_id: value, child_equipment_ids: current.child_equipment_ids.filter((id) => id !== value) }));
      setChildPickerOpen(false);
      return;
    }
    setRelationshipForm((current) => ({ ...current, [name]: value }));
  }
  function toggleChildEquipment(id) {
    setRelationshipForm((current) => {
      const selected = new Set(current.child_equipment_ids);
      if (selected.has(id)) selected.delete(id); else selected.add(id);
      return { ...current, child_equipment_ids: [...selected] };
    });
  }
  function selectVisibleChildEquipment() {
    const query = childEquipmentSearch.trim().toLowerCase();
    const visibleIds = activeEquipment.filter((item) => item.id !== relationshipForm.parent_equipment_id
      && (!query || [item.sap_equipment_no, item.description, item.functional_location].join(" ").toLowerCase().includes(query))).map((item) => item.id);
    setRelationshipForm((current) => ({ ...current, child_equipment_ids: [...new Set([...current.child_equipment_ids, ...visibleIds])] }));
  }
  async function saveRelationship(e) {
    e.preventDefault(); setSavingRelationship(true); clearMessages();
    try {
      const { parent_equipment_id, child_equipment_ids, relationship_type, running_hours_rule, notes } = relationshipForm;
      if (!parent_equipment_id || !child_equipment_ids.length) throw new Error("Select a parent and at least one child equipment record.");
      if (child_equipment_ids.includes(parent_equipment_id)) throw new Error("Parent equipment cannot also be selected as a child.");
      if (!["inherit", "independent", "custom"].includes(running_hours_rule)) throw new Error("Invalid running-hours rule. Select Inherit, Independent, or Custom.");
      const duplicates = child_equipment_ids.filter((childId) => relationships.some((item) => item.is_active && item.parent_equipment_id === parent_equipment_id && item.child_equipment_id === childId));
      if (duplicates.length) {
        const labels = duplicates.map((id) => equipment.find((item) => item.id === id)?.sap_equipment_no || "selected equipment");
        throw new Error("An active relationship already exists for: " + labels.join(", ") + ". Remove those selections and save the remaining equipment.");
      }
      const rows = child_equipment_ids.map((child_equipment_id) => ({
        parent_equipment_id, child_equipment_id, relationship_type, running_hours_rule,
        notes: notes.trim() || null, is_active: true,
      }));
      const { error } = await supabase.from("equipment_relationships").insert(rows);
      if (error) throw new Error(error.message);
      const savedCount = rows.length;
      setRelationshipForm(emptyRelationshipForm); setChildPickerOpen(false); setChildEquipmentSearch("");
      setNotice(savedCount + (savedCount === 1 ? " equipment relationship saved successfully." : " equipment relationships saved successfully."));
      await loadData();
    } catch (e) { setError(e.message || "Unable to save the relationships."); } finally { setSavingRelationship(false); }
  }  async function deactivateRelationship(item) { if (!window.confirm("Deactivate this equipment relationship? The record will be retained.")) return; setDeactivatingRelationshipId(item.id); clearMessages(); try { const { error } = await supabase.from("equipment_relationships").update({ is_active: false }).eq("id", item.id); if (error) throw new Error(error.message); setNotice("Equipment relationship deactivated."); await loadData(); } catch (e) { setError(e.message); } finally { setDeactivatingRelationshipId(null); } }

  function updateComponentForm(e) { const { name, value } = e.target; setComponentForm((p) => ({ ...p, [name]: value })); }
  function startNewComponent() { setComponentForm(emptyComponentForm); setEditingComponentId(null); clearMessages(); setShowComponentForm(true); }
  function editComponent(item) { setComponentForm({ equipment_id: item.equipment_id || "", component_name: item.component_name || "", component_type: item.component_type || "", description: item.description || "", criticality: item.criticality || "medium", status: item.status || "active", remarks: item.remarks || "" }); setEditingComponentId(item.id); clearMessages(); setShowComponentForm(true); }
  async function saveComponent(e) { e.preventDefault(); if (editingComponentId && !window.confirm("Save changes to this component?")) { clearMessages(); setNotice("No changes made."); return; } setSavingComponent(true); clearMessages(); try { const payload = { equipment_id: componentForm.equipment_id, component_name: componentForm.component_name.trim(), component_type: componentForm.component_type.trim() || null, description: componentForm.description.trim() || null, criticality: componentForm.criticality, status: componentForm.status, remarks: componentForm.remarks.trim() || null }; if (!payload.equipment_id || !payload.component_name) throw new Error("Equipment and Component Name are required."); const result = editingComponentId ? await supabase.from("components").update(payload).eq("id", editingComponentId) : await supabase.from("components").insert(payload); if (result.error) throw new Error(result.error.message); setNotice(editingComponentId ? "Component updated successfully." : "Component saved successfully."); setShowComponentForm(false); setEditingComponentId(null); setComponentForm(emptyComponentForm); await loadData(); } catch (e) { setError(e.message); } finally { setSavingComponent(false); } }
  async function deactivateComponent(item) { if (!window.confirm(`Mark "${item.component_name}" as inactive?`)) return; setDeactivatingComponentId(item.id); clearMessages(); try { const { error } = await supabase.from("components").update({ status: "inactive" }).eq("id", item.id); if (error) throw new Error(error.message); setNotice("Component marked inactive."); await loadData(); } catch (e) { setError(e.message); } finally { setDeactivatingComponentId(null); } }

  function updateRequirementForm(e) { const { name, value } = e.target; setRequirementForm((p) => ({ ...p, [name]: value, ...(name === "frequency_basis" ? { interval_hours: value === "calendar" ? "" : p.interval_hours, interval_days: value === "running_hours" ? "" : p.interval_days } : {}) })); }
  function startNewRequirement() { setRequirementForm(emptyRequirementForm); setEditingRequirementId(null); clearMessages(); setShowRequirementForm(true); }
  function editRequirement(item) { setRequirementForm({ component_id: item.component_id || "", lubricant_id: item.lubricant_id || "", activity_name: item.method || "Oil level check", frequency_basis: item.frequency_basis || "either", interval_hours: item.interval_hours ?? "", interval_days: item.interval_days ?? "", quantity: item.quantity ?? "", quantity_unit: item.quantity_unit || "L", method: item.method || "", source_reference: item.source_reference || "", revision: item.revision || "", effective_from: item.effective_from || "", approval_status: item.approval_status || "draft", instructions: item.instructions || "" }); setEditingRequirementId(item.id); clearMessages(); setShowRequirementForm(true); }
  async function saveRequirement(e) {
    e.preventDefault(); if (editingRequirementId && !window.confirm("Save changes to this lubrication requirement?")) { clearMessages(); setNotice("No changes made."); return; } setSavingRequirement(true); clearMessages();
    try {
      if (!requirementForm.component_id) throw new Error("Please select a component.");
      const intervalDays = requirementForm.frequency_basis === "running_hours" ? null : Number(requirementForm.interval_days);
      const intervalHours = requirementForm.frequency_basis === "calendar" ? null : Number(requirementForm.interval_hours);
      if ((requirementForm.frequency_basis !== "running_hours" && (!intervalDays || intervalDays <= 0)) || (requirementForm.frequency_basis !== "calendar" && (!intervalHours || intervalHours <= 0))) throw new Error("Enter a valid positive interval for the selected schedule.");
      const payload = { component_id: requirementForm.component_id, lubrication_point_id: null, lubricant_id: requirementForm.lubricant_id || null, frequency_basis: requirementForm.frequency_basis, interval_hours: intervalHours, interval_days: intervalDays, quantity: requirementForm.quantity === "" ? null : Number(requirementForm.quantity), quantity_unit: requirementForm.quantity_unit.trim() || null, method: requirementForm.method.trim() || null, source_reference: requirementForm.source_reference.trim() || null, revision: requirementForm.revision.trim() || null, effective_from: requirementForm.effective_from || null, approval_status: requirementForm.approval_status, instructions: requirementForm.instructions.trim() || null };
      const result = editingRequirementId ? await supabase.from("lubrication_requirements").update(payload).eq("id", editingRequirementId) : await supabase.from("lubrication_requirements").insert(payload);
      if (result.error) throw new Error(result.error.message);
      setNotice(editingRequirementId ? "Lubrication requirement updated successfully." : "Lubrication requirement saved successfully."); setShowRequirementForm(false); setEditingRequirementId(null); setRequirementForm(emptyRequirementForm); await loadData();
    } catch (e) { setError(e.message); } finally { setSavingRequirement(false); }
  }
  async function deactivateRequirement(item) { if (!window.confirm("Deactivate this lubrication requirement? The record will be retained.")) return; setDeactivatingRequirementId(item.id); clearMessages(); try { const { error } = await supabase.from("lubrication_requirements").update({ is_active: false }).eq("id", item.id); if (error) throw new Error(error.message); setNotice("Lubrication requirement deactivated."); await loadData(); } catch (e) { setError(e.message); } finally { setDeactivatingRequirementId(null); } }

  function updateLubricantForm(e) { const { name, value } = e.target; setLubricantForm((p) => ({ ...p, [name]: value })); }
  function startNewLubricant() { setLubricantForm(emptyLubricantForm); setEditingLubricantId(null); clearMessages(); setShowLubricantForm(true); }
  function editLubricant(item) { setLubricantForm({ product_code: item.product_code || "", product_name: item.product_name || "", manufacturer: item.manufacturer || "", lubricant_type: item.lubricant_type || "Oil", grade: item.grade || "", base_oil: item.base_oil || "", thickener: item.thickener || "", nlgi_grade: item.nlgi_grade || "", description: item.description || "", status: item.status || "active" }); setEditingLubricantId(item.id); clearMessages(); setShowLubricantForm(true); }
  async function saveLubricant(e) { e.preventDefault(); if (editingLubricantId && !window.confirm("Save changes to this lubricant?")) { clearMessages(); setNotice("No changes made."); return; } setSavingLubricant(true); clearMessages(); try { const payload = { product_code: lubricantForm.product_code.trim() || null, product_name: lubricantForm.product_name.trim(), manufacturer: lubricantForm.manufacturer.trim() || null, lubricant_type: lubricantForm.lubricant_type.trim() || null, grade: lubricantForm.grade.trim() || null, base_oil: lubricantForm.base_oil.trim() || null, thickener: lubricantForm.thickener.trim() || null, nlgi_grade: lubricantForm.nlgi_grade.trim() || null, description: lubricantForm.description.trim() || null, status: lubricantForm.status, updated_at: new Date().toISOString() }; if (!payload.product_name) throw new Error("Product name is required."); const result = editingLubricantId ? await supabase.from("lubricants").update(payload).eq("id", editingLubricantId) : await supabase.from("lubricants").insert(payload); if (result.error) throw new Error(result.error.message); setNotice(editingLubricantId ? "Lubricant updated successfully." : "Lubricant saved successfully."); setShowLubricantForm(false); setEditingLubricantId(null); setLubricantForm(emptyLubricantForm); await loadData(); } catch (e) { setError(e.message); } finally { setSavingLubricant(false); } }
  async function deactivateLubricant(item) { if (!window.confirm(`Mark "${item.product_name}" as inactive?`)) return; setDeactivatingLubricantId(item.id); clearMessages(); try { const { error } = await supabase.from("lubricants").update({ status: "inactive", updated_at: new Date().toISOString() }).eq("id", item.id); if (error) throw new Error(error.message); setNotice("Lubricant marked inactive."); await loadData(); } catch (e) { setError(e.message); } finally { setDeactivatingLubricantId(null); } }

  function getEquipmentLabel(id) { const x = equipment.find((e) => e.id === id); return x ? `${x.sap_equipment_no} — ${x.description}` : "Equipment not found"; }
  function getComponentLabel(id) { const c = components.find((x) => x.id === id); if (!c) return "Component not found"; const e = equipment.find((x) => x.id === c.equipment_id); return `${e?.sap_equipment_no || "No equipment"} — ${c.component_name}`; }
  function getLubricantLabel(id) { const l = lubricants.find((x) => x.id === id); return l ? [l.product_code, l.product_name, l.grade].filter(Boolean).join(" — ") : "Not specified"; }
  function formatFrequency(item) { if (item.frequency_basis === "calendar") return `Every ${item.interval_days} days`; if (item.frequency_basis === "running_hours") return `Every ${item.interval_hours} running hours`; return `${item.interval_days} days or ${item.interval_hours} running hours`; }
  function pageIcon(page) { const map = { Dashboard: "grid", Equipment: "equipment", "Equipment Relationships": "link", Components: "component", "Lubrication Requirements": "schedule", "Work Schedule": "schedule", Activities: "activity", "Running Hours": "clock", "Oil Analysis": "flask", "Lubricant Master": "oil", Inventory: "box", Reports: "report", Alerts: "bell", "User Management": "users", Settings: "settings", "Audit History": "report" }; return map[page] || "grid"; }
  function openEquipmentForm() { setEditingId(null); setForm(emptyEquipmentForm); clearMessages(); setShowForm(true); }

  const workspaceBusy = loading || saving || savingRelationship || savingComponent || savingRequirement || savingLubricant || deactivatingId !== null || deactivatingRelationshipId !== null || deactivatingComponentId !== null || deactivatingRequirementId !== null || deactivatingLubricantId !== null;
  const meta = pageMeta[activePage] || ["Workspace", `Your ${activePage.toLowerCase()} workspace.`];

  return (
    <div className="app-shell" aria-busy={workspaceBusy}>
      {mobileNavOpen && <button type="button" className="mobile-nav-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}/>}
      {workspaceBusy && <div className="workspace-loading-overlay" role="status" aria-live="polite"><div className="workspace-loading-card"><span className="workspace-spinner"/><strong>{loading ? "Loading workspace data…" : "Working…"}</strong><span>{loading ? "Getting the latest equipment and lubrication records." : "Please wait while your change is saved."}</span></div></div>}
      {toast && <ToastNotice type={toast.type} message={toast.message} onClose={() => setToast(null)}/>}
      <aside className={"sidebar " + (mobileNavOpen ? "mobile-open" : "")}>
        <div className="brand"><div className="brand-mark">L</div><div><strong>LUBRICATION</strong><span>RELIABILITY SYSTEM</span></div></div>
        <div className="plant-selector"><div className="plant-icon"><Icon name="equipment" size={19}/></div><div><small>PLANT WORKSPACE</small><strong>Plant Overview</strong></div><Icon name="chevron" size={16}/></div>
        <nav className="navigation" id="app-navigation">
          {navigation.map((group) => <div className="nav-group" key={group.section}><div className="nav-heading">{group.section}</div>{group.items.map((item) => <button key={item} className={`nav-item ${activePage === item ? "selected" : ""}`} onClick={() => go(item)}><span className="nav-icon"><Icon name={pageIcon(item)} size={16}/></span><span>{item}</span>{item === "Alerts" && <span className="nav-count">!</span>}</button>)}</div>)}
        </nav>
        <div className="sidebar-footer"><span className="connection-dot"/><div><strong>Supabase connected</strong><span>Database-backed workspace</span></div></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><button type="button" className="mobile-menu-toggle" aria-label="Open navigation menu" aria-controls="app-navigation" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((open) => !open)}><span className="mobile-menu-lines" aria-hidden="true"><i/><i/><i/></span></button><div className="breadcrumb"><span>Lubrication System</span><span>/</span><strong>{activePage}</strong></div><div className="topbar-right"><span className="environment-label"><i/> LIVE DATABASE</span><div className="avatar">A</div><div className="user-label"><strong>Administrator</strong><span>Master admin workspace</span></div></div></header>
        <section className="page-content">
          <div className="page-heading"><div><div className="eyebrow">{meta[0].toUpperCase()}</div><h1>{activePage}</h1><p className="subtitle">{meta[1]}</p></div><div className="heading-actions">
            {activePage === "Equipment" && <button className="primary-button" onClick={openEquipmentForm}><Icon name="plus" size={17}/> Add equipment</button>}
            {activePage === "Components" && <button className="primary-button" onClick={startNewComponent}><Icon name="plus" size={17}/> Add component</button>}
            {activePage === "Lubricant Master" && <button className="primary-button" onClick={startNewLubricant}><Icon name="plus" size={17}/> Add lubricant</button>}
            {activePage === "Lubrication Requirements" && <button className="primary-button" onClick={startNewRequirement}><Icon name="plus" size={17}/> Add requirement</button>}
          </div></div>

          
          

          {activePage === "Dashboard" && <DashboardHome equipment={equipment} totalEquipmentCount={totalEquipmentCount} activeEquipmentCount={activeEquipmentCount} components={components} lubricants={lubricants} requirements={requirements} relationships={relationships} loading={loading} go={go} openEquipmentForm={openEquipmentForm} />}

          {activePage === "Equipment" && <>
            {showForm && <FormCard title={editingId ? "Edit equipment" : "Add equipment"} subtitle="Maintain the SAP equipment record and lubrication classification." onClose={() => { setShowForm(false); setEditingId(null); setForm(emptyEquipmentForm); }}>
              <form onSubmit={saveEquipment}><FormSection title="Equipment identity" hint="SAP-aligned master data"><div className="form-grid">
                <Field label="SAP Equipment #" required><input name="sap_equipment_no" value={form.sap_equipment_no} onChange={updateForm} placeholder="e.g. 10001234" required/></Field>
                <Field label="Description" required><input name="description" value={form.description} onChange={updateForm} placeholder="Equipment description" required/></Field>
                <Field label="Plant" required><select name="plant_id" value={form.plant_id} onChange={updateForm} required><option value="">Select plant</option>{plants.map((p) => <option key={p.id} value={p.id}>{p.code ? `${p.code} — ` : ""}{p.name}</option>)}</select></Field>
                <Field label="Area"><select name="area_id" value={form.area_id} onChange={updateForm} disabled={!form.plant_id}><option value="">Select area</option>{selectedAreas.map((a) => <option key={a.id} value={a.id}>{a.code ? `${a.code} — ` : ""}{a.name}</option>)}</select></Field>
                <Field label="Functional Location"><input name="functional_location" value={form.functional_location} onChange={updateForm} placeholder="SAP functional location"/></Field>
                <Field label="Equipment Type"><input name="equipment_type" value={form.equipment_type} onChange={updateForm} placeholder="e.g. Gearbox, Pump, Motor"/></Field>
              </div></FormSection><FormSection title="Lubrication classification" hint="Used for planning and reliability prioritization"><div className="form-grid">
                <Field label="Status"><select name="status" value={form.status} onChange={updateForm}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
                <Field label="Lubrication criticality"><select name="lubrication_criticality" value={form.lubrication_criticality} onChange={updateForm}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></Field>
                <Field label="Lubrication notes" full><textarea name="lubrication_notes" value={form.lubrication_notes} onChange={updateForm} placeholder="Add lubrication-related notes..." rows={3}/></Field>
              </div></FormSection><FormActions onCancel={() => { setShowForm(false); setEditingId(null); setForm(emptyEquipmentForm); }} saving={saving} saveText={editingId ? "Update equipment" : "Save equipment"}/></form>
            </FormCard>}
            <DataPanel title="Equipment register" subtitle={`${filteredEquipment.length} of ${equipment.length} records`} toolbar={<Toolbar search={search} setSearch={setSearch} placeholder="Search equipment..." filter={statusFilter} setFilter={setStatusFilter}/>}>
              {loading ? <Loading/> : filteredEquipment.length === 0 ? <Empty icon="equipment" title="No matching equipment" text="Change the search or status filter, or add a new equipment record." action={<button className="primary-button" onClick={openEquipmentForm}><Icon name="plus" size={16}/> Add equipment</button>}/> : <Table><thead><tr><Th>SAP EQUIPMENT #</Th><Th>DESCRIPTION</Th><Th>FUNCTIONAL LOCATION</Th><Th>PLANT / AREA</Th><Th>TYPE</Th><Th>CRITICALITY</Th><Th>STATUS</Th><Th>ACTIONS</Th></tr></thead><tbody>{filteredEquipment.map((item) => { const p = plants.find((x) => x.id === item.plant_id); const a = areas.find((x) => x.id === item.area_id); return <tr key={item.id}><td><strong className="primary-cell">{item.sap_equipment_no}</strong></td><td>{item.description}</td><td>{item.functional_location || "—"}</td><td>{[p?.name, a?.name].filter(Boolean).join(" / ") || "—"}</td><td>{item.equipment_type || "—"}</td><td><Criticality value={item.lubrication_criticality}/></td><td><Status value={item.status}/></td><td><Actions><button className="table-action" onClick={() => editEquipment(item)}><Icon name="edit" size={14}/> Edit</button>{item.status === "active" && <button className="table-action danger" onClick={() => deactivateEquipment(item)} disabled={deactivatingId === item.id}><Icon name="trash" size={14}/>{deactivatingId === item.id ? "Updating" : "Deactivate"}</button>}</Actions></td></tr>; })}</tbody></Table>}
            </DataPanel>
          </>}

          {activePage === "Equipment Relationships" && <>
            <div className="info-banner"><div className="banner-icon"><Icon name="link"/></div><div><strong>Running-hours inheritance</strong><p>Use relationships to tell the system which associated equipment follows the operating hours of a parent production asset.</p></div></div>
            <FormCard title="Create equipment relationships" subtitle="Select one parent and one or more child equipment records."><form onSubmit={saveRelationship}><FormSection title="Relationship definition" hint="One parent can be linked to several associated equipment records"><div className="relationship-builder"><div className="relationship-node"><span className="node-label">PARENT</span><select name="parent_equipment_id" value={relationshipForm.parent_equipment_id} onChange={updateRelationshipForm} required><option value="">Select parent equipment</option>{activeEquipment.map((x) => <option key={x.id} value={x.id}>{x.sap_equipment_no} — {x.description}</option>)}</select></div><div className="relationship-arrow"><Icon name="arrow" size={24}/><span>runs with</span></div><div className="relationship-node relationship-multi-select"><span className="node-label">CHILD / ASSOCIATED EQUIPMENT</span><button type="button" className="child-picker-trigger" disabled={!relationshipForm.parent_equipment_id} aria-expanded={childPickerOpen} onClick={() => setChildPickerOpen((open) => !open)}><span>{relationshipForm.child_equipment_ids.length ? relationshipForm.child_equipment_ids.length + " equipment selected" : relationshipForm.parent_equipment_id ? "Choose child equipment" : "Select a parent first"}</span><Icon name="chevron" size={16}/></button>{childPickerOpen && relationshipForm.parent_equipment_id && <div className="child-picker-menu"><div className="child-picker-tools"><input type="search" value={childEquipmentSearch} onChange={(event) => setChildEquipmentSearch(event.target.value)} placeholder="Search equipment..."/><button type="button" className="child-picker-text-button" onClick={selectVisibleChildEquipment}>Select visible</button><button type="button" className="child-picker-text-button" onClick={() => setRelationshipForm((current) => ({ ...current, child_equipment_ids: [] }))}>Clear</button></div><div className="child-picker-options">{activeEquipment.filter((x) => { const query = childEquipmentSearch.trim().toLowerCase(); return x.id !== relationshipForm.parent_equipment_id && (!query || [x.sap_equipment_no, x.description, x.functional_location].join(" ").toLowerCase().includes(query)); }).map((x) => <label className="child-picker-option" key={x.id}><input type="checkbox" checked={relationshipForm.child_equipment_ids.includes(x.id)} onChange={() => toggleChildEquipment(x.id)}/><span><strong>{x.sap_equipment_no}</strong><small>{x.description}</small></span></label>)}{activeEquipment.filter((x) => x.id !== relationshipForm.parent_equipment_id).length === 0 && <p className="child-picker-empty">No other active equipment available.</p>}</div><div className="child-picker-footer">Check as many children as needed. This list stays open while you select.</div></div>}{relationshipForm.child_equipment_ids.length > 0 && <div className="child-picker-selected">{relationshipForm.child_equipment_ids.map((id) => { const item = activeEquipment.find((x) => x.id === id); return item ? <span className="child-picker-chip" key={id}>{item.sap_equipment_no}<button type="button" aria-label={"Remove " + item.sap_equipment_no} onClick={() => toggleChildEquipment(id)}>×</button></span> : null; })}</div>}</div></div><div className="form-grid relationship-options"><Field label="Relationship type"><select name="relationship_type" value={relationshipForm.relationship_type} onChange={updateRelationshipForm}><option value="runs_with">Runs with</option><option value="driven_by">Driven by</option><option value="depends_on">Depends on</option><option value="associated">Associated equipment</option></select></Field><Field label="Running-hours rule"><select name="running_hours_rule" value={relationshipForm.running_hours_rule} onChange={updateRelationshipForm}><option value="inherit">Inherit parent running hours</option><option value="independent">Track independently</option><option value="custom">Custom rule</option></select></Field><Field label="Notes" full><textarea name="notes" value={relationshipForm.notes} onChange={updateRelationshipForm} rows={3} placeholder="Describe how the equipment operates together..."/></Field></div></FormSection><FormActions onCancel={() => { setRelationshipForm(emptyRelationshipForm); setChildPickerOpen(false); setChildEquipmentSearch(""); }} saving={savingRelationship} saveText="Save relationships" cancelText="Reset"/></form></FormCard>
            <DataPanel title="Equipment relationships" subtitle={`${relationships.filter((x) => x.is_active).length} active relationships`}><Table><thead><tr><Th>PARENT EQUIPMENT</Th><Th>CHILD EQUIPMENT</Th><Th>RELATIONSHIP</Th><Th>RUNNING-HOURS RULE</Th><Th>STATUS</Th><Th>ACTIONS</Th></tr></thead><tbody>{relationships.map((item) => <tr key={item.id}><td><strong>{getEquipmentLabel(item.parent_equipment_id)}</strong></td><td>{getEquipmentLabel(item.child_equipment_id)}</td><td><span className="soft-badge">{(item.relationship_type || "associated").replaceAll("_", " ")}</span></td><td><span className="runtime-rule"><span/> {item.running_hours_rule === "inherit" ? "Inherit parent hours" : item.running_hours_rule === "custom" ? "Custom rule" : "Track independently"}</span></td><td><Status value={item.is_active ? "active" : "inactive"}/></td><td>{item.is_active && <button className="table-action danger" onClick={() => deactivateRelationship(item)} disabled={deactivatingRelationshipId === item.id}><Icon name="trash" size={14}/>{deactivatingRelationshipId === item.id ? "Updating" : "Deactivate"}</button>}</td></tr>)}</tbody></Table></DataPanel>
          </>}

          {activePage === "Components" && <>
            {showComponentForm && <FormCard title={editingComponentId ? "Edit component" : "Add component"} subtitle="Link the component to its SAP equipment record." onClose={() => { setShowComponentForm(false); setEditingComponentId(null); setComponentForm(emptyComponentForm); }}><form onSubmit={saveComponent}><FormSection title="Component identity" hint="Equipment-linked component master data"><div className="form-grid"><Field label="SAP Equipment #" required full><select name="equipment_id" value={componentForm.equipment_id} onChange={updateComponentForm} required><option value="">Select equipment</option>{activeEquipment.map((x) => <option key={x.id} value={x.id}>{x.sap_equipment_no} — {x.description}</option>)}</select></Field><Field label="Component name" required><input name="component_name" value={componentForm.component_name} onChange={updateComponentForm} placeholder="e.g. Drive-end bearing" required/></Field><Field label="Component type"><input name="component_type" value={componentForm.component_type} onChange={updateComponentForm} placeholder="Bearing, Gearbox, Coupling" list="component-type-options"/><datalist id="component-type-options">{componentTypeSuggestions.map((x) => <option key={x} value={x}/>)}</datalist></Field><Field label="Criticality"><select name="criticality" value={componentForm.criticality} onChange={updateComponentForm}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></Field><Field label="Status"><select name="status" value={componentForm.status} onChange={updateComponentForm}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field><Field label="Description" full><textarea name="description" value={componentForm.description} onChange={updateComponentForm} rows={2} placeholder="Optional component details..."/></Field><Field label="Remarks" full><textarea name="remarks" value={componentForm.remarks} onChange={updateComponentForm} rows={2} placeholder="Additional notes..."/></Field></div></FormSection><FormActions onCancel={() => { setShowComponentForm(false); setEditingComponentId(null); setComponentForm(emptyComponentForm); }} saving={savingComponent} saveText={editingComponentId ? "Update component" : "Save component"}/></form></FormCard>}
            <DataPanel title="Component register" subtitle={`${filteredComponents.length} of ${components.length} records`} toolbar={<Toolbar search={componentSearch} setSearch={setComponentSearch} placeholder="Search components..." filter={componentStatusFilter} setFilter={setComponentStatusFilter}/>}>
              {loading ? <Loading/> : filteredComponents.length === 0 ? <Empty icon="component" title="No matching components" text="Add a component and link it to registered equipment." action={<button className="primary-button" onClick={startNewComponent}><Icon name="plus" size={16}/> Add component</button>}/> : <Table><thead><tr><Th>SAP EQUIPMENT #</Th><Th>EQUIPMENT</Th><Th>COMPONENT</Th><Th>TYPE</Th><Th>CRITICALITY</Th><Th>STATUS</Th><Th>ACTIONS</Th></tr></thead><tbody>{filteredComponents.map((item) => { const e = equipment.find((x) => x.id === item.equipment_id); return <tr key={item.id}><td><strong className="primary-cell">{e?.sap_equipment_no || "—"}</strong></td><td>{e?.description || "—"}</td><td><strong>{item.component_name}</strong></td><td>{item.component_type || "—"}</td><td><Criticality value={item.criticality}/></td><td><Status value={item.status}/></td><td><Actions><button className="table-action" onClick={() => editComponent(item)}><Icon name="edit" size={14}/> Edit</button>{item.status === "active" && <button className="table-action danger" onClick={() => deactivateComponent(item)} disabled={deactivatingComponentId === item.id}><Icon name="trash" size={14}/>{deactivatingComponentId === item.id ? "Updating" : "Deactivate"}</button>}</Actions></td></tr>; })}</tbody></Table>}
            </DataPanel>
          </>}

          {activePage === "Lubricant Master" && <>
            {showLubricantForm && <FormCard title={editingLubricantId ? "Edit lubricant" : "Add lubricant"} subtitle="Maintain product identity, technical properties and status." onClose={() => { setShowLubricantForm(false); setEditingLubricantId(null); setLubricantForm(emptyLubricantForm); }}><form onSubmit={saveLubricant}><FormSection title="Product identity" hint="Core lubricant master data"><div className="form-grid"><Field label="Product code"><input name="product_code" value={lubricantForm.product_code} onChange={updateLubricantForm} placeholder="e.g. LUB-001"/></Field><Field label="Product name" required><input name="product_name" value={lubricantForm.product_name} onChange={updateLubricantForm} placeholder="Enter lubricant product name" required/></Field><Field label="Manufacturer"><input name="manufacturer" value={lubricantForm.manufacturer} onChange={updateLubricantForm} placeholder="e.g. Shell, Mobil, Total"/></Field><Field label="Lubricant type"><select name="lubricant_type" value={lubricantForm.lubricant_type} onChange={updateLubricantForm}><option>Oil</option><option>Grease</option><option>Hydraulic Oil</option><option>Gear Oil</option><option>Turbine Oil</option><option>Compressor Oil</option><option>Other</option></select></Field><Field label="Grade / viscosity"><input name="grade" value={lubricantForm.grade} onChange={updateLubricantForm} placeholder="e.g. ISO VG 220, SAE 40"/></Field><Field label="Base oil"><input name="base_oil" value={lubricantForm.base_oil} onChange={updateLubricantForm} placeholder="Mineral, PAO, Ester"/></Field></div></FormSection><FormSection title="Technical properties" hint="Useful for lubricant selection and compatibility"><div className="form-grid"><Field label="Thickener"><input name="thickener" value={lubricantForm.thickener} onChange={updateLubricantForm} placeholder="e.g. Lithium, Calcium Sulfonate"/></Field><Field label="NLGI grade"><select name="nlgi_grade" value={lubricantForm.nlgi_grade} onChange={updateLubricantForm}><option value="">Not specified</option>{["000","00","0","1","2","3","4","5","6"].map((x) => <option key={x} value={x}>NLGI {x}</option>)}</select></Field><Field label="Status"><select name="status" value={lubricantForm.status} onChange={updateLubricantForm}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field><Field label="Description / remarks" full><textarea name="description" value={lubricantForm.description} onChange={updateLubricantForm} rows={3} placeholder="Specifications, approvals, compatibility or other product details..."/></Field></div></FormSection><FormActions onCancel={() => { setShowLubricantForm(false); setEditingLubricantId(null); setLubricantForm(emptyLubricantForm); }} saving={savingLubricant} saveText={editingLubricantId ? "Update lubricant" : "Save lubricant"}/></form></FormCard>}
            <DataPanel title="Lubricant register" subtitle={`${filteredLubricants.length} of ${lubricants.length} products`} toolbar={<Toolbar search={lubricantSearch} setSearch={setLubricantSearch} placeholder="Search lubricants..." filter={lubricantStatusFilter} setFilter={setLubricantStatusFilter}/>}>
              {loading ? <Loading/> : filteredLubricants.length === 0 ? <Empty icon="oil" title="No matching lubricants" text="Add a lubricant product or adjust the search and status filter." action={<button className="primary-button" onClick={startNewLubricant}><Icon name="plus" size={16}/> Add lubricant</button>}/> : <Table><thead><tr><Th>PRODUCT CODE</Th><Th>PRODUCT NAME</Th><Th>MANUFACTURER</Th><Th>TYPE</Th><Th>GRADE</Th><Th>BASE OIL</Th><Th>THICKENER / NLGI</Th><Th>STATUS</Th><Th>ACTIONS</Th></tr></thead><tbody>{filteredLubricants.map((item) => <tr key={item.id}><td><strong className="primary-cell">{item.product_code || "—"}</strong></td><td><strong>{item.product_name}</strong></td><td>{item.manufacturer || "—"}</td><td><span className="soft-badge">{item.lubricant_type || "—"}</span></td><td>{item.grade || "—"}</td><td>{item.base_oil || "—"}</td><td>{[item.thickener, item.nlgi_grade ? `NLGI ${item.nlgi_grade}` : null].filter(Boolean).join(" / ") || "—"}</td><td><Status value={item.status}/></td><td><Actions><button className="table-action" onClick={() => editLubricant(item)}><Icon name="edit" size={14}/> Edit</button>{item.status === "active" && <button className="table-action danger" onClick={() => deactivateLubricant(item)} disabled={deactivatingLubricantId === item.id}><Icon name="trash" size={14}/>{deactivatingLubricantId === item.id ? "Updating" : "Deactivate"}</button>}</Actions></td></tr>)}</tbody></Table>}
            </DataPanel>
          </>}

          {activePage === "Lubrication Requirements" && <>
            {showRequirementForm && <FormCard title={editingRequirementId ? "Edit lubrication requirement" : "Add lubrication requirement"} subtitle="Define the approved lubricant, schedule, quantity and application instructions." onClose={() => { setShowRequirementForm(false); setEditingRequirementId(null); setRequirementForm(emptyRequirementForm); }}><form onSubmit={saveRequirement}><FormSection title="Requirement definition" hint="Connect the component to an approved lubrication task"><div className="form-grid"><Field label="Component" required full><select name="component_id" value={requirementForm.component_id} onChange={updateRequirementForm} required><option value="">Select component</option>{activeComponents.map((x) => <option key={x.id} value={x.id}>{getComponentLabel(x.id)}</option>)}</select></Field><Field label="Lubricant product" full><select name="lubricant_id" value={requirementForm.lubricant_id} onChange={updateRequirementForm}><option value="">Not specified</option>{activeLubricants.map((x) => <option key={x.id} value={x.id}>{getLubricantLabel(x.id)}</option>)}</select></Field><Field label="Frequency basis" required><select name="frequency_basis" value={requirementForm.frequency_basis} onChange={updateRequirementForm} required><option value="either">Calendar or running hours</option><option value="calendar">Calendar days</option><option value="running_hours">Running hours</option></select></Field>{requirementForm.frequency_basis !== "running_hours" && <Field label="Interval (days)" required><input type="number" min="1" step="1" name="interval_days" value={requirementForm.interval_days} onChange={updateRequirementForm} placeholder="e.g. 30" required/></Field>}{requirementForm.frequency_basis !== "calendar" && <Field label="Interval (running hours)" required><input type="number" min="1" step="1" name="interval_hours" value={requirementForm.interval_hours} onChange={updateRequirementForm} placeholder="e.g. 500" required/></Field>}<Field label="Quantity"><input type="number" min="0" step="any" name="quantity" value={requirementForm.quantity} onChange={updateRequirementForm} placeholder="e.g. 2"/></Field><Field label="Quantity unit"><select name="quantity_unit" value={requirementForm.quantity_unit} onChange={updateRequirementForm}><option value="L">Litre (L)</option><option value="mL">Millilitre (mL)</option><option value="kg">Kilogram (kg)</option><option value="g">Gram (g)</option><option value="pump">Pump strokes</option><option value="other">Other</option></select></Field><Field label="Application method"><input name="method" value={requirementForm.method} onChange={updateRequirementForm} placeholder="e.g. Grease gun, oil bath"/></Field><Field label="Source reference"><input name="source_reference" value={requirementForm.source_reference} onChange={updateRequirementForm} placeholder="Manual or document reference"/></Field><Field label="Revision"><input name="revision" value={requirementForm.revision} onChange={updateRequirementForm} placeholder="e.g. Rev. 01"/></Field><Field label="Effective from"><input type="date" name="effective_from" value={requirementForm.effective_from} onChange={updateRequirementForm}/></Field><Field label="Approval status"><select name="approval_status" value={requirementForm.approval_status} onChange={updateRequirementForm}><option value="draft">Draft</option><option value="pending">Pending approval</option><option value="approved">Approved</option></select></Field><Field label="Instructions / remarks" full><textarea name="instructions" value={requirementForm.instructions} onChange={updateRequirementForm} rows={4} placeholder="Application instructions, precautions and acceptance criteria..."/></Field></div></FormSection><FormActions onCancel={() => { setShowRequirementForm(false); setEditingRequirementId(null); setRequirementForm(emptyRequirementForm); }} saving={savingRequirement} saveText={editingRequirementId ? "Update requirement" : "Save requirement"}/></form></FormCard>}
            <DataPanel title="Lubrication requirements register" subtitle={`${filteredRequirements.length} of ${requirements.length} requirements`} toolbar={<Toolbar search={requirementSearch} setSearch={setRequirementSearch} placeholder="Search requirements..." filter={requirementStatusFilter} setFilter={setRequirementStatusFilter}/>}>
              {loading ? <Loading/> : filteredRequirements.length === 0 ? <Empty icon="schedule" title="No matching requirements" text="Add a requirement to define the lubrication schedule for a component." action={<button className="primary-button" onClick={startNewRequirement}><Icon name="plus" size={16}/> Add requirement</button>}/> : <Table><thead><tr><Th>COMPONENT</Th><Th>LUBRICANT</Th><Th>FREQUENCY</Th><Th>QUANTITY</Th><Th>METHOD</Th><Th>APPROVAL</Th><Th>STATUS</Th><Th>ACTIONS</Th></tr></thead><tbody>{filteredRequirements.map((item) => <tr key={item.id}><td><strong>{getComponentLabel(item.component_id)}</strong></td><td>{getLubricantLabel(item.lubricant_id)}</td><td><span className="frequency-cell">{formatFrequency(item)}</span></td><td>{item.quantity == null ? "—" : `${item.quantity} ${item.quantity_unit || ""}`}</td><td>{item.method || "—"}</td><td><Approval value={item.approval_status}/></td><td><Status value={item.is_active ? "active" : "inactive"}/></td><td><Actions><button className="table-action" onClick={() => editRequirement(item)}><Icon name="edit" size={14}/> Edit</button>{item.is_active && <button className="table-action danger" onClick={() => deactivateRequirement(item)} disabled={deactivatingRequirementId === item.id}><Icon name="trash" size={14}/>{deactivatingRequirementId === item.id ? "Updating" : "Deactivate"}</button>}</Actions></td></tr>)}</tbody></Table>}
            </DataPanel>
          </>}

          {["Work Schedule", "Activities", "Running Hours", "Oil Analysis", "Inventory", "Reports", "Alerts", "User Management", "Settings", "Audit History"].includes(activePage) && <RemainingModules page={activePage} equipment={equipment} components={components} lubricants={lubricants} requirements={requirements} relationships={relationships} refresh={loadData} setNotice={setNotice} setError={setError}/>}          
          <footer className="page-footer"><span>Industrial Lubrication Management & Reliability System</span><span>Plant workspace • Supabase connected</span></footer>
        </section>
      </main>
    </div>
  );
}

function DashboardHome({ equipment, totalEquipmentCount, activeEquipmentCount, components, lubricants, requirements, relationships, loading, go, openEquipmentForm }) {
  const [activities, setActivities] = useState([]);
  const [oils, setOils] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [runningRows, setRunningRows] = useState([]);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadMetrics() {
      const results = await Promise.all([
        supabase.from("lubrication_activities").select("*").order("activity_date", { ascending: false }).limit(1000),
        supabase.from("oil_analysis_samples").select("*").order("sample_date", { ascending: false }).limit(500),
        supabase.from("lubricant_inventory").select("*").order("updated_at", { ascending: false }),
        supabase.from("running_hours_records").select("*").order("period_to", { ascending: false }).limit(5000),
      ]);
      if (cancelled) return;
      setActivities(results[0].data || []);
      setOils(results[1].data || []);
      setInventory(results[2].data || []);
      setRunningRows(results[3].data || []);
      setMetricsError(results.some((result) => result.error) ? "Some indicators could not load. Check access to activity, oil analysis, inventory, and running-hours records." : "");
      setMetricsLoading(false);
    }
    loadMetrics();
    return () => { cancelled = true; };
  }, []);

  const hoursByEquipment = useMemo(() => {
    const n = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
    const resolved = {};
    runningRows.forEach((row) => { resolved[row.equipment_id] = (resolved[row.equipment_id] || 0) + n(row.running_hours); });
    const visiting = new Set();
    function resolve(id) {
      if (resolved[id] != null) return resolved[id];
      if (visiting.has(id)) return null;
      visiting.add(id);
      const parents = relationships.filter((r) => r.is_active && r.child_equipment_id === id && r.running_hours_rule === "inherit").map((r) => resolve(r.parent_equipment_id)).filter((v) => v != null);
      visiting.delete(id);
      if (parents.length) resolved[id] = Math.max(...parents);
      return resolved[id] ?? null;
    }
    equipment.forEach((item) => resolve(item.id));
    return resolved;
  }, [runningRows, relationships, equipment]);

  const scheduleRows = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const n = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
    return requirements.filter((r) => r.is_active && r.approval_status === "approved").map((r) => {
      const component = components.find((c) => c.id === r.component_id);
      const asset = equipment.find((e) => e.id === component?.equipment_id);
      if (!component || !asset) return null;
      const last = activities.filter((a) => a.requirement_id === r.id && a.status === "completed").sort((a, b) => new Date(b.activity_date) - new Date(a.activity_date))[0];
      const currentHours = hoursByEquipment[asset.id] ?? null;
      const dueDate = last?.activity_date && r.interval_days
        ? new Date(new Date(String(last.activity_date).slice(0, 10) + "T00:00:00").getTime() + r.interval_days * 86400000)
        : r.effective_from ? new Date(String(r.effective_from).slice(0, 10) + "T00:00:00") : today;
      const dueHours = last?.running_hours != null && r.interval_hours ? n(last.running_hours) + n(r.interval_hours) : r.interval_hours ? currentHours : null;
      const hasCalendarDue = Boolean(r.interval_days || r.effective_from);
      const daysLeft = Math.ceil((dueDate - today) / 86400000);
      const hoursLeft = dueHours != null && currentHours != null ? dueHours - currentHours : null;
      let status = "scheduled";
      let trigger = "Calendar";
      if (r.frequency_basis === "running_hours") {
        trigger = "Running hours";
        status = hoursLeft != null && hoursLeft <= 0 ? "overdue" : hoursLeft != null && hoursLeft <= 50 ? "due-soon" : "scheduled";
      } else if (r.frequency_basis === "calendar") {
        status = daysLeft <= 0 ? "overdue" : daysLeft <= 7 ? "due-soon" : "scheduled";
      } else {
        const hourDue = hoursLeft != null && hoursLeft <= 0;
        const dateDue = daysLeft <= 0;
        status = hourDue || dateDue ? "overdue" : (hoursLeft != null && hoursLeft <= 50) || daysLeft <= 7 ? "due-soon" : "scheduled";
        trigger = hourDue && dateDue ? "Both" : hourDue ? "Running hours" : "Calendar";
      }
      const wording = [r.method, r.instructions, r.source_reference, component.component_name].filter(Boolean).join(" ").toLowerCase();
      const replacement = ["replace", "replacement", "oil change", "change oil", "renewal"].some((word) => wording.includes(word));
      return { ...r, component, equipment: asset, dueDate, dueHours, daysLeft, hoursLeft, status, trigger, replacement, hasCalendarDue };
    }).filter(Boolean).sort((a, b) => ({ overdue: 0, "due-soon": 1, scheduled: 2 }[a.status] - ({ overdue: 0, "due-soon": 1, scheduled: 2 }[b.status])));
  }, [requirements, components, equipment, activities, hoursByEquipment]);

  const overdue = scheduleRows.filter((r) => r.status === "overdue");
  const dueSoon = scheduleRows.filter((r) => r.status === "due-soon");
  const replacements = scheduleRows.filter((r) => r.replacement && r.status !== "overdue" && ((r.hasCalendarDue && r.daysLeft >= 0 && r.daysLeft <= 30) || (r.hoursLeft != null && r.hoursLeft >= 0 && r.hoursLeft <= 200)));
  const oilAlerts = oils.filter((o) => ["warning", "alarm", "critical"].includes(String(o.status || "").toLowerCase()));
  const stockAlerts = inventory.filter((i) => i.minimum_stock != null && Number(i.current_stock || 0) <= Number(i.minimum_stock));
  const recent = activities.filter((a) => a.status === "completed").slice(0, 6);
  const high = equipment.filter((e) => e.lubrication_criticality === "high").length;
  const busy = loading || metricsLoading;
  const dateLabel = (value) => {
    if (!value) return "—";
    const d = new Date(String(value).slice(0, 10) + "T00:00:00");
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };
  const equipmentLabel = (id) => { const e = equipment.find((x) => x.id === id); return e ? e.sap_equipment_no + " — " + e.description : "Equipment not found"; };
  const lubricantLabel = (id) => { const l = lubricants.find((x) => x.id === id); return l ? [l.product_code, l.product_name, l.grade].filter(Boolean).join(" — ") : "—"; };
  const dueLabel = (r) => r.hasCalendarDue ? dateLabel(r.dueDate) : r.dueHours != null ? Math.round(r.dueHours).toLocaleString() + " h" : "Due date not set";

  return <>
    <div className="kpi-grid dashboard-kpi-grid">
      <Kpi icon="schedule" label="Overdue work" value={busy ? "…" : overdue.length} detail="Approved requirements past due" tone="amber"/>
      <Kpi icon="activity" label="Due soon" value={busy ? "…" : dueSoon.length} detail="Within 7 days or 50 running hours" tone="blue"/>
      <Kpi icon="oil" label="Replacement planning" value={busy ? "…" : replacements.length} detail="Within 30 days or 200 running hours" tone="violet"/>
      <Kpi icon="flask" label="Oil analysis alerts" value={busy ? "…" : oilAlerts.length} detail="Warning, alarm, or critical samples" tone="amber"/>
      <Kpi icon="box" label="Low stock items" value={busy ? "…" : stockAlerts.length} detail="At or below minimum stock" tone="green"/>
    </div>
    {metricsError && <div className="dashboard-data-note">{metricsError}</div>}
    <div className="dashboard-grid dashboard-grid-wide">
      <section className="panel">
        <PanelHeader title="Overdue and upcoming lubrication" subtitle="Approved work, sorted by due status" action={<button className="link-button" onClick={() => go("Work Schedule")}>Open work schedule <Icon name="arrow" size={15}/></button>}/>
        {busy ? <Loading/> : scheduleRows.filter((r) => r.status !== "scheduled").length === 0
          ? <DashboardEmpty title="No overdue or near-term work" text="Work within 7 days or 50 running hours will appear here."/>
          : <Table compact><thead><tr><Th>EQUIPMENT / COMPONENT</Th><Th>REQUIREMENT</Th><Th>DUE</Th><Th>TRIGGER</Th><Th>STATUS</Th></tr></thead><tbody>{scheduleRows.filter((r) => r.status !== "scheduled").slice(0, 8).map((r) => <tr key={r.id}><td><strong className="primary-cell">{r.equipment.sap_equipment_no}</strong><small className="cell-sub">{r.component.component_name}</small></td><td>{r.method || "Lubrication"}</td><td>{dueLabel(r)}</td><td>{r.trigger}</td><td><span className={"dashboard-pill " + r.status}>{r.status === "due-soon" ? "Due soon" : "Overdue"}</span></td></tr>)}</tbody></Table>}
      </section>
      <section className="panel">
        <PanelHeader title="Early replacement dues" subtitle="Replacement tasks due within 30 days or 200 running hours" action={<button className="link-button" onClick={() => go("Work Schedule")}>View schedule <Icon name="arrow" size={15}/></button>}/>
        {busy ? <Loading/> : replacements.length === 0 ? <DashboardEmpty title="No early replacement dues found" text="Approved requirements with replacement or oil change wording will appear as they approach due."/> :
          <div className="dashboard-list">{replacements.slice(0, 6).map((r) => <div className="dashboard-list-row" key={r.id}><div className="dashboard-list-main"><strong>{r.equipment.sap_equipment_no} · {r.component.component_name}</strong><span>{r.method || "Replacement"} · Due {dueLabel(r)}</span></div><span className={"dashboard-pill " + r.status}>{r.daysLeft >= 0 ? r.daysLeft + " days" : r.hoursLeft != null ? Math.max(0, Math.round(r.hoursLeft)) + " h left" : "Upcoming"}</span></div>)}</div>}
      </section>
      <section className="panel">
        <PanelHeader title="Oil analysis attention" subtitle="Samples that need review or follow-up" action={<button className="link-button" onClick={() => go("Oil Analysis")}>Open oil analysis <Icon name="arrow" size={15}/></button>}/>
        {busy ? <Loading/> : oilAlerts.length === 0 ? <DashboardEmpty title="No abnormal samples" text="Warning, alarm, and critical results will be listed here."/> :
          <div className="dashboard-list">{oilAlerts.slice(0, 6).map((o) => <div className="dashboard-list-row" key={o.id}><div className="dashboard-list-main"><strong>{o.sample_id || "Oil sample"} · {equipmentLabel(o.equipment_id)}</strong><span>{dateLabel(o.sample_date)}{o.recommendation ? " · " + o.recommendation : ""}</span></div><span className={"dashboard-pill " + String(o.status).toLowerCase()}>{o.status}</span></div>)}</div>}
      </section>
      <section className="panel">
        <PanelHeader title="Lubricant stock warnings" subtitle="Store items at or below minimum stock" action={<button className="link-button" onClick={() => go("Inventory")}>Open inventory <Icon name="arrow" size={15}/></button>}/>
        {busy ? <Loading/> : stockAlerts.length === 0 ? <DashboardEmpty title="Stock levels look healthy" text="Items at or below minimum stock will be listed here."/> :
          <div className="dashboard-list">{stockAlerts.slice(0, 6).map((i) => { const critical = i.critical_stock != null && Number(i.current_stock || 0) <= Number(i.critical_stock); return <div className="dashboard-list-row" key={i.id}><div className="dashboard-list-main"><strong>{lubricantLabel(i.lubricant_id)}</strong><span>{i.store_location || "Store not specified"} · {i.current_stock} {i.unit || ""} on hand · minimum {i.minimum_stock} {i.unit || ""}</span></div><span className={"dashboard-pill " + (critical ? "overdue" : "due-soon")}>{critical ? "Critical" : "Low"}</span></div>;})}</div>}
      </section>
      <section className="panel">
        <PanelHeader title="Recently completed work" subtitle="Latest completed lubrication activities" action={<button className="link-button" onClick={() => go("Activities")}>Open activities <Icon name="arrow" size={15}/></button>}/>
        {busy ? <Loading/> : recent.length === 0 ? <DashboardEmpty title="No completed activities yet" text="Recorded work will appear here with equipment and technician details."/> :
          <div className="dashboard-list">{recent.map((a) => <div className="dashboard-list-row" key={a.id}><div className="dashboard-list-main"><strong>{equipmentLabel(a.equipment_id)}</strong><span>{dateLabel(a.activity_date)} · {a.activity_type?.replaceAll("_", " ") || "Lubrication"} · {a.technician_name || "Technician not recorded"}</span></div><span className="dashboard-pill normal">Completed</span></div>)}</div>}
      </section>
      <section className="panel">
        <PanelHeader title="Equipment and setup" subtitle="Foundation records for the lubrication program"/>
        <div className="progress-list"><ProgressRow label="Active equipment" value={activeEquipmentCount} hint={totalEquipmentCount + " registered records"}/><ProgressRow label="Components" value={components.length} hint="Linked machine components"/><ProgressRow label="Lubricant master" value={lubricants.length} hint="Products in the master list"/><ProgressRow label="High-criticality equipment" value={high} hint="Assets needing priority focus" alert/></div>
        <div className="setup-note"><div><strong>Next setup step</strong><span>Review approved requirements and use clear replacement method names.</span></div><button className="secondary-button" onClick={() => go("Lubrication Requirements")}>Open requirements</button></div>
      </section>
      <section className="panel dashboard-equipment-panel">
        <PanelHeader title="Equipment overview" subtitle="Recently registered equipment" action={<button className="link-button" onClick={() => go("Equipment")}>View register <Icon name="arrow" size={15}/></button>}/>
        {loading ? <Loading/> : equipment.length === 0 ? <Empty icon="equipment" title="No equipment registered yet" text="Add your first equipment record to start the lubrication master setup." action={<button className="primary-button" onClick={openEquipmentForm}><Icon name="plus" size={16}/> Add equipment</button>}/> :
          <Table compact><thead><tr><Th>SAP EQUIPMENT #</Th><Th>DESCRIPTION</Th><Th>CRITICALITY</Th><Th>STATUS</Th></tr></thead><tbody>{equipment.slice(0, 6).map((e) => <tr key={e.id}><td><strong className="primary-cell">{e.sap_equipment_no}</strong></td><td>{e.description}</td><td><Criticality value={e.lubrication_criticality}/></td><td><Status value={e.status}/></td></tr>)}</tbody></Table>}
      </section>
    </div>
  </>;
}
function DashboardEmpty({ title, text }) { return <div className="dashboard-empty"><strong>{title}</strong><span>{text}</span></div>; }
function ToastNotice({ type, message, onClose }) {
  return <div className={"app-toast " + type} role={type === "error" ? "alert" : "status"} aria-live={type === "error" ? "assertive" : "polite"}>
    <span className="app-toast-icon">{type === "error" ? "!" : "✓"}</span>
    <span className="app-toast-message">{message}</span>
    <button type="button" onClick={onClose} aria-label="Dismiss notification">×</button>
  </div>;
}function Kpi({ icon, label, value, detail, tone }) { return <div className="kpi-card"><div className={`kpi-icon ${tone}`}><Icon name={icon}/></div><div className="kpi-label">{label}</div><div className="kpi-value">{value}</div><div className="kpi-detail">{detail}</div></div>; }
function ProgressRow({ label, value, hint, alert }) { return <div className="progress-row"><div className="progress-top"><strong>{label}</strong><b className={alert ? "text-danger" : ""}>{value}</b></div><div className="progress-track"><span style={{ width: `${Math.min(100, value > 0 ? 100 : 0)}%` }}/></div><small>{hint}</small></div>; }
function FormCard({ title, subtitle, onClose, children }) { return <section className="form-card"><div className="form-card-head"><div><div className="card-kicker">DATA ENTRY</div><h2>{title}</h2><p>{subtitle}</p></div>{onClose && <button className="close-button" type="button" onClick={onClose}><Icon name="close" size={18}/></button>}</div>{children}</section>; }
function FormSection({ title, hint, children }) { return <div className="form-section"><div className="form-section-head"><div><h3>{title}</h3><span>{hint}</span></div></div>{children}</div>; }
function Field({ label, required, full, children }) { return <label className={`field ${full ? "full" : ""}`}><span>{label}{required && <em> *</em>}</span>{children}</label>; }
function FormActions({ onCancel, saving, saveText, cancelText = "Cancel" }) { return <div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>{cancelText}</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "Saving..." : saveText}</button></div>; }
function DataPanel({ title, subtitle, toolbar, children }) { return <section className="data-panel"><PanelHeader title={title} subtitle={subtitle} right={toolbar}/>{children}</section>; }
function PanelHeader({ title, subtitle, action, right }) { return <div className="panel-header"><div><h2>{title}</h2><p>{subtitle}</p></div>{action || right}</div>; }
function Toolbar({ search, setSearch, placeholder, filter, setFilter }) { return <div className="toolbar"><div className="search-box"><Icon name="search" size={16}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={placeholder}/></div><div className="filter-box"><Icon name="filter" size={15}/><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div></div>; }
function Table({ children, compact }) { return <div className={`table-wrap ${compact ? "compact" : ""}`}><table>{children}</table></div>; }
function Th({ children }) { return <th>{children}</th>; }
function Actions({ children }) { return <div className="table-actions">{children}</div>; }
function Criticality({ value }) { const v = (value || "low").toLowerCase(); return <span className={`criticality-badge ${v}`}><i/>{v.charAt(0).toUpperCase() + v.slice(1)}</span>; }
function Status({ value }) { const active = String(value).toLowerCase() === "active"; return <span className={`status-badge ${active ? "active" : "inactive"}`}><i/>{active ? "Active" : "Inactive"}</span>; }
function Approval({ value }) { const v = value || "draft"; return <span className={`approval-badge ${v}`}><i/>{v.replaceAll("_", " ")}</span>; }
function Loading() { return <div className="loading-state"><span className="spinner"/><div><strong>Loading records</strong><small>Fetching current data from Supabase…</small></div></div>; }
function Empty({ icon, title, text, action }) { return <div className="empty-state"><div className="empty-icon"><Icon name={icon} size={25}/></div><strong>{title}</strong><p>{text}</p>{action}</div>; }
function Placeholder({ page, go }) { return <section className="placeholder"><div className="placeholder-icon"><Icon name={page === "Alerts" ? "bell" : page === "Running Hours" ? "clock" : page === "Reports" ? "report" : "settings"} size={30}/></div><div className="card-kicker">MODULE</div><h2>{page}</h2><p>This workspace is reserved for the next implementation stage. The modern shell, navigation, data-entry pattern and database-backed master-data modules are ready for expansion here.</p>{page === "Running Hours" && <button className="secondary-button" onClick={() => go("Equipment Relationships")}>Review equipment relationships</button>}</section>; }

export default Dashboard;







