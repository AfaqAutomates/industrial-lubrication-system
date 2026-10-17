
import { useState } from "react";
import "./index.css";

const navigation = [
  { section: "WORKSPACE", items: ["Dashboard", "Equipment", "Components", "Lubrication Points"] },
  { section: "LUBRICATION", items: ["Work Schedule", "Activities", "Running Hours", "Oil Analysis"] },
  { section: "RESOURCES", items: ["Lubricant Master", "Inventory", "Reports"] },
  { section: "SYSTEM", items: ["Alerts", "User Management", "Settings"] },
];

const equipment = [
  { id: "DEMO-001", name: "Coal Mill 1", area: "Raw Mill", criticality: "High", status: "Active" },
  { id: "DEMO-002", name: "Cement Mill 1", area: "Cement Mill", criticality: "High", status: "Active" },
  { id: "DEMO-003", name: "Main Air Compressor", area: "Utilities", criticality: "Medium", status: "Active" },
  { id: "DEMO-004", name: "Packing Conveyor", area: "Packing Plant", criticality: "Low", status: "Inactive" },
];

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [search, setSearch] = useState("");

  const visibleEquipment = equipment.filter((item) =>
    `${item.id} ${item.name} ${item.area}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">L</div>
          <div>
            <strong>LUBRICATION</strong>
            <span>RELIABILITY SYSTEM</span>
          </div>
        </div>

        <div className="plant-selector">
          <span className="plant-icon">⌂</span>
          <div>
            <small>PLANT WORKSPACE</small>
            <strong>Plant Overview</strong>
          </div>
          <span className="chevron">⌄</span>
        </div>

        <nav className="navigation">
          {navigation.map((group) => (
            <div className="nav-group" key={group.section}>
              <div className="nav-heading">{group.section}</div>
              {group.items.map((item) => (
                <button
                  key={item}
                  className={`nav-item ${activePage === item ? "selected" : ""}`}
                  onClick={() => setActivePage(item)}
                >
                  <span className="nav-dot" />
                  {item}
                  {item === "Alerts" && <span className="nav-count">!</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="connection-dot" />
          <div>
            <strong>Application preview</strong>
            <span>Demo data · Not connected</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Lubrication System</span>
            <span className="breadcrumb-separator">/</span>
            <strong>{activePage}</strong>
          </div>
          <div className="topbar-right">
            <span className="environment-label">LOCAL PREVIEW</span>
            <div className="avatar">A</div>
            <div className="user-label">
              <strong>Administrator</strong>
              <span>Preview account</span>
            </div>
          </div>
        </header>

        <section className="page-content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow">INDUSTRIAL RELIABILITY PLATFORM</div>
              <h1>{activePage}</h1>
              <p className="subtitle">
                {activePage === "Dashboard"
                  ? "Monitor lubrication activities, equipment and maintenance priorities."
                  : `Your ${activePage.toLowerCase()} workspace. This is a demonstration screen.`}
              </p>
            </div>
            <div className="date-label">
              <span className="date-icon">◷</span>
              System overview
            </div>
          </div>

          {activePage === "Dashboard" ? (
            <>
              <div className="notice">
                <span className="notice-icon">i</span>
                <div>
                  <strong>Initial application preview</strong>
                  <p>
                    The figures and equipment below are sample data. No live
                    plant records have been loaded yet.
                  </p>
                </div>
              </div>

              <div className="section-title-row">
                <div>
                  <h2>Plant overview</h2>
                  <p>Your key lubrication indicators at a glance.</p>
                </div>
                <span className="sample-tag">SAMPLE DATA</span>
              </div>

              <div className="stats-grid">
                <article className="stat-card">
                  <div className="stat-top">
                    <span>Total equipment</span>
                    <span className="stat-icon blue">▤</span>
                  </div>
                  <div className="stat-number">—</div>
                  <div className="stat-foot">Awaiting equipment records</div>
                </article>
                <article className="stat-card">
                  <div className="stat-top">
                    <span>Lubrication points</span>
                    <span className="stat-icon violet">◎</span>
                  </div>
                  <div className="stat-number">—</div>
                  <div className="stat-foot">Awaiting point setup</div>
                </article>
                <article className="stat-card">
                  <div className="stat-top">
                    <span>Overdue tasks</span>
                    <span className="stat-icon amber">◷</span>
                  </div>
                  <div className="stat-number">—</div>
                  <div className="stat-foot">Scheduling not configured</div>
                </article>
                <article className="stat-card">
                  <div className="stat-top">
                    <span>Open alerts</span>
                    <span className="stat-icon red">!</span>
                  </div>
                  <div className="stat-number">—</div>
                  <div className="stat-foot">Monitoring not configured</div>
                </article>
              </div>

              <div className="section-title-row equipment-heading">
                <div>
                  <h2>Equipment register preview</h2>
                  <p>Example layout for your future equipment register.</p>
                </div>
                <button className="secondary-button" onClick={() => setActivePage("Equipment")}>
                  View equipment →
                </button>
              </div>

              <div className="table-card">
                <div className="table-toolbar">
                  <div>
                    <strong>Equipment overview</strong>
                    <span>Demonstration records only</span>
                  </div>
                  <input
                    className="search-input"
                    placeholder="Search sample equipment..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>SAP EQUIPMENT #</th>
                        <th>DESCRIPTION</th>
                        <th>AREA</th>
                        <th>CRITICALITY</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleEquipment.map((item) => (
                        <tr key={item.id}>
                          <td className="equipment-id">{item.id}</td>
                          <td>{item.name}</td>
                          <td>{item.area}</td>
                          <td>
                            <span className={`criticality ${item.criticality.toLowerCase()}`}>
                              <span /> {item.criticality}
                            </span>
                          </td>
                          <td>
                            <span className={`status ${item.status.toLowerCase()}`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {visibleEquipment.length === 0 && (
                        <tr>
                          <td colSpan="5" className="empty-state">
                            No matching sample equipment found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="table-footer">
                  <span>Demo records · Not saved to the database</span>
                  <span>{visibleEquipment.length} sample records</span>
                </div>
              </div>

              <div className="bottom-grid">
                <div className="info-card">
                  <div className="info-icon">↗</div>
                  <div>
                    <h3>Running-hour monitoring</h3>
                    <p>
                      Future support for SAP COOISPI imports and equipment
                      relationships.
                    </p>
                  </div>
                  <span className="coming-soon">PLANNED</span>
                </div>
                <div className="info-card">
                  <div className="info-icon">✓</div>
                  <div>
                    <h3>Lubrication execution</h3>
                    <p>
                      Future technician workflows, task history and QR codes.
                    </p>
                  </div>
                  <span className="coming-soon">PLANNED</span>
                </div>
              </div>
            </>
          ) : (
            <div className="placeholder-panel">
              <div className="placeholder-icon">▤</div>
              <h2>{activePage}</h2>
              <p>
                This module has a place in the application navigation. Its
                forms, database connection and permissions will be built in
                the relevant development stage.
              </p>
              <button className="primary-button" onClick={() => setActivePage("Dashboard")}>
                Return to dashboard
              </button>
            </div>
          )}

          <footer className="page-footer">
            <span>Industrial Lubrication Management &amp; Reliability System</span>
            <span>Foundation build · Demo mode</span>
          </footer>
        </section>
      </main>
    </div>
  );
}

export default App;
