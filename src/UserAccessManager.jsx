import { useEffect, useState } from "react";

const ACCESS_MODULES = [
  ["Dashboard", "Dashboard"], ["Equipment", "Equipment"], ["Equipment Relationships", "Equipment Relationships"],
  ["Components", "Components"], ["Lubrication Requirements", "Lubrication Requirements"],
  ["Work Schedule", "Work Schedule"], ["Activities", "Activities"], ["Running Hours", "Running Hours"],
  ["Oil Analysis", "Oil Analysis"], ["Lubricant Master", "Lubricant Master"], ["Inventory", "Inventory"],
  ["Reports", "Reports"], ["Alerts", "Alerts"], ["Settings", "Settings"], ["Audit History", "Audit History"],
];

export default function UserAccessManager({ profiles, saving, moduleLoading, onSave, onToggleActive }) {
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);
  const [draft, setDraft] = useState({});

  useEffect(() => {
    const current = profiles.find((p) => p.id === openId);
    if (current) setDraft({ ...(current.module_permissions || {}) });
  }, [openId, profiles]);

  const visible = profiles.filter((p) => [p.full_name, p.email, p.role].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase()));
  function togglePage(page) { setDraft((current) => ({ ...current, [page]: !current[page] })); }

  return <section className="module-panel user-access-panel">
    <div className="module-panel-head"><div><h2>Registered accounts</h2><p>{profiles.length} account profiles · Open an account to manage its module access.</p></div><div className="module-toolbar"><input aria-label="Search users" placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)}/></div></div>
    <div className="user-access-list">
      {!visible.length && <div className="module-empty"><strong>No matching accounts</strong><p>Accounts appear here after they have an application profile.</p></div>}
      {visible.map((user) => {
        const isAdmin = user.role === "master_admin";
        const expanded = openId === user.id;
        const permissions = user.module_permissions || {};
        const changed = JSON.stringify(draft) !== JSON.stringify(permissions);
        return <article className={`user-access-card ${expanded ? "expanded" : ""}`} key={user.id}>
          <button type="button" className="user-access-summary" aria-expanded={expanded} onClick={() => setOpenId(expanded ? null : user.id)}>
            <span className="user-access-avatar">{String(user.full_name || user.email || "U").slice(0, 1).toUpperCase()}</span>
            <span className="user-access-identity"><strong>{user.full_name || "Name not set"}</strong><small>{user.email || "Email unavailable"}</small></span>
            <span className={`user-role-badge ${isAdmin ? "admin" : ""}`}>{isAdmin ? "Master admin · Full access" : user.role || "User"}</span>
            {!isAdmin && <span className={`user-account-status ${user.is_active ? "active" : "inactive"}`}>{user.is_active ? "Login enabled" : "Login disabled"}</span>}
            {!isAdmin && <span className="user-permission-count">{ACCESS_MODULES.filter(([key]) => permissions[key] === true).length} modules</span>}
            <span className="user-access-chevron" aria-hidden="true">{expanded ? "−" : "+"}</span>
          </button>
          {expanded && <div className="user-access-details">
            {isAdmin ? <div className="info-banner"><div className="banner-icon">i</div><div><strong>Administrator access is protected</strong><p>Master administrators always have full access. Their administrator role cannot be changed from this screen.</p></div></div> : <>
              <div className="user-access-detail-head"><div><strong>Module access</strong><span>Turn on only the sections this account should see in its navigation.</span></div><button type="button" className="secondary-button" onClick={() => setDraft(Object.fromEntries(ACCESS_MODULES.map(([key]) => [key, true])))}>Allow all modules</button></div>
              <div className="user-permission-grid">{ACCESS_MODULES.map(([key, label]) => <label className="user-permission-toggle" key={key}><span><strong>{label}</strong><small>{draft[key] ? "Allowed" : "Hidden from this user"}</small></span><input type="checkbox" role="switch" checked={draft[key] === true} onChange={() => togglePage(key)} aria-label={`${draft[key] ? "Deny" : "Allow"} ${label}`}/></label>)}</div>
              <div className="user-access-actions"><span>Changes apply when saved. User Management remains administrator-only.</span><div className="user-access-buttons"><button type="button" className="secondary-button" onClick={() => onToggleActive(user.id, !user.is_active)} disabled={saving || moduleLoading}>{user.is_active ? "Disable login" : "Enable login"}</button><button type="button" className="primary-button" onClick={() => onSave(user.id, draft)} disabled={!changed || saving || moduleLoading}>{saving ? "Saving…" : "Save module access"}</button></div></div>
            </>}
          </div>}
        </article>;
      })}
    </div>
  </section>;
}
