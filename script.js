const API_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRtlqew4y-ItcDKx2kA6Ua1RDh-2PlT6XmY4yCKDeCBuzUlruW27SE_nXEWUF62la36h0tZFa8ln63r/pub?output=csv";

async function loadData() {
    try {
        const res = await fetch(API_URL);
        const text = await res.text();
        const data = parseCSV(text);

        if (document.getElementById("today")) {
            processDashboard(data);
            showSummary(data);
            updateLastUpdated();
        }

        if (document.getElementById("history")) {
            loadHistory(data);
        }
    } catch (err) {
        console.error("Data load error:", err);
        const errEl = document.getElementById("summary") || document.body;
        errEl.innerHTML = "<h3 style='color:#ef4444; text-align:center;'>⚠️ Error loading dynamic sheet data.</h3>";
    }
}

/* ---------------- CSV PARSER ---------------- */
function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length === 0) return [];
    const headers = lines.shift().split(",").map(h => h.trim());

    return lines.map(line => {
        const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        let obj = {};
        headers.forEach((h, i) => {
            let val = values[i] ? values[i].trim() : "";
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            obj[h] = val;
        });
        return obj;
    });
}

/* ---------------- DASHBOARD ---------------- */
function processDashboard(data) {
    const today = new Date();

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    renderCard("yesterday", data, formatDate(yesterday), "Yesterday");
    renderCard("today", data, formatDate(today), "Today");
    renderCard("tomorrow", data, formatDate(tomorrow), "Tomorrow");
}

function renderCard(id, data, dateString, displayLabel) {
    const container = document.getElementById(id);
    if (!container) return;

    const filtered = data.filter(d => normalizeDate(d.Date) === dateString);
    const dayName = new Date(dateString + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long" });

    container.innerHTML = `<h3>${displayLabel} <span class="day-subtext">(${dayName})</span></h3>`;

    if (filtered.length === 0) {
        container.innerHTML += `<p class="no-visits">No visits scheduled for this day.</p>`;
        return;
    }

    filtered.sort((a, b) => (a.Shift || "").localeCompare(b.Shift || ""));

    filtered.forEach(item => {
        const lastVisit = getLastVisitDays(data, item.Society, dateString);
        const totalVisits = getVisitCount(data, item.Society);

        container.innerHTML += `
            <div class="card-item ${item.Shift ? item.Shift.toLowerCase() : 'default'}">
                <div class="card-row">
                    <strong>🏢 ${item.Society}</strong>
                    <span class="badge ${(item.Status || 'pending').toLowerCase()}">${item.Status || 'Pending'}</span>
                </div>
                <div class="stat-grid">
                    <div class="stat"><b>Shift:</b> ${item.Shift || 'N/A'}</div>
                    <div class="stat"><b>Last:</b> ${lastVisit}</div>
                    <div class="stat"><b>Total:</b> ${totalVisits} visits</div>
                </div>
            </div>
        `;
    });
}

/* ---------------- HISTORY ---------------- */
function loadHistory(data) {
    const container = document.getElementById("history");
    if (!container) return;
    data.sort((a, b) => new Date(b.Date) - new Date(a.Date));
    container.innerHTML = "";

    data.forEach(item => {
        container.innerHTML += `
            <div class="card-item">
                <strong>🏢 ${item.Society}</strong>
                <div>📅 ${normalizeDate(item.Date)}</div>
                <div>🌅 Shift: ${item.Shift || 'N/A'}</div>
                <div class="badge ${(item.Status || 'pending').toLowerCase()}">${item.Status || 'Pending'}</div>
            </div>
        `;
    });
}

/* ---------------- HELPERS ---------------- */
function normalizeDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d)) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getVisitCount(data, society) {
    return data.filter(d => d.Society === society).length;
}

function getLastVisitDays(data, society, currentDate) {
    const past = data
        .filter(d => d.Society === society && normalizeDate(d.Date) < currentDate)
        .sort((a, b) => new Date(b.Date) - new Date(a.Date));

    if (past.length === 0) return "First visit";
    const last = new Date(normalizeDate(past[0].Date) + "T00:00:00");
    const current = new Date(currentDate + "T00:00:00");
    const diff = Math.floor((current - last) / (1000 * 60 * 60 * 24));
    return diff === 0 ? "Today" : `${diff}d ago`;
}

/* ---------------- SUMMARY ---------------- */
function showSummary(data) {
    const total = data.length;
    const societies = new Set(data.map(d => d.Society)).size;
    const el = document.getElementById("summary");
    if (!el) return;

    el.innerHTML = `
        <div class="summary-box">
            <div>📊 <b>Total Recorded Visits:</b> ${total}</div>
            <div>🏢 <b>Unique Societies:</b> ${societies}</div>
        </div>
    `;
}

/* ---------------- LIVE CLOCK & STATUS METRICS ---------------- */
function updateClock() {
    const now = new Date();
    const formatted = now.toLocaleString("en-IN", {
        weekday: "short", day: "2-digit", month: "short",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
    });
    const el = document.getElementById("datetime");
    if (el) el.textContent = formatted;
}

/* ---------------- SYNC METRICS ---------------- */
function updateLastUpdated() {
    const now = new Date();
    const el = document.getElementById("time");
    if (!el) return;
    el.textContent = "Synced: " + now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

/* ---------------- RUNNERS ---------------- */
loadData();
updateClock();
setInterval(updateClock, 1000);

// SELF-CONTAINED LOCAL STORAGE VISITOR COUNTER
function initializeCounter() {
    const counterEl = document.getElementById("visitCount");
    if (!counterEl) return;

    try {
        let totalViews = localStorage.getItem("dashboard_total_views");
        
        if (!totalViews) {
            totalViews = 1;
        } else {
            totalViews = parseInt(totalViews) + 1;
        }
        
        localStorage.setItem("dashboard_total_views", totalViews);
        counterEl.textContent = `${totalViews} views`;
        
    } catch (e) {
        counterEl.textContent = "1 view";
    }
}

initializeCounter();
