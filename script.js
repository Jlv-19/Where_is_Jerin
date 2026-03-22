const API_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vRtlqew4y-ItcDKx2kA6Ua1RDh-2PlT6XmY4yCKDeCBuzUlruW27SE_nXEWUF62la36h0tZFa8ln63r/pub?output=csv";

async function loadData() {
    try {
        const res = await fetch(API_URL);
        const text = await res.text();   // ✅ FIX: CSV is text

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
        document.body.innerHTML = "<h3>Error loading data</h3>";
    }
}

/* ---------------- CSV PARSER ---------------- */
function parseCSV(text) {
    const lines = text.trim().split("\n");
    const headers = lines.shift().split(",");

    return lines.map(line => {
        const values = line.split(",");
        let obj = {};

        headers.forEach((h, i) => {
            obj[h.trim()] = values[i] ? values[i].trim() : "";
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

    renderCard("yesterday", data, formatDate(yesterday));
    renderCard("today", data, formatDate(today));
    renderCard("tomorrow", data, formatDate(tomorrow));
}

function renderCard(id, data, date) {
    const container = document.getElementById(id);
    if (!container) return;

    const filtered = data.filter(d => normalizeDate(d.Date) === date);

    const dayName = new Date(date).toLocaleDateString(undefined, {
        weekday: "long"
    });

    container.innerHTML = `<h3>${dayName}</h3>`;

    if (filtered.length === 0) {
        container.innerHTML += `<p>No visits</p>`;
        return;
    }

    filtered.sort((a, b) => a.Shift.localeCompare(b.Shift));

    filtered.forEach(item => {
        const lastVisit = getLastVisitDays(data, item.Society, date);
        const totalVisits = getVisitCount(data, item.Society);

        container.innerHTML += `
            <div class="card ${item.Shift.toLowerCase()}">
                <strong>${item.Society}</strong>
                <span class="badge ${item.Status.toLowerCase()}">${item.Status}</span>

                <div class="stat">Shift: ${item.Shift}</div>
                <div class="stat">Last visit: ${lastVisit}</div>
                <div class="stat">Total visits: ${totalVisits}</div>
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
            <div class="card">
                <strong>${item.Society}</strong>
                <div>${normalizeDate(item.Date)}</div>
                <div>Shift: ${item.Shift}</div>
                <div class="badge ${item.Status.toLowerCase()}">${item.Status}</div>
            </div>
        `;
    });
}

/* ---------------- HELPERS ---------------- */
function normalizeDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return "";
    return d.toISOString().split("T")[0];
}

function formatDate(d) {
    return d.toISOString().split("T")[0];
}

function getVisitCount(data, society) {
    return data.filter(d => d.Society === society).length;
}

function getLastVisitDays(data, society, currentDate) {
    const past = data
        .filter(d =>
            d.Society === society &&
            normalizeDate(d.Date) < currentDate
        )
        .sort((a, b) => new Date(b.Date) - new Date(a.Date));

    if (past.length === 0) return "First visit";

    const last = new Date(past[0].Date);
    const current = new Date(currentDate);

    const diff = Math.floor(
        (current - last) / (1000 * 60 * 60 * 24)
    );

    return diff + " days ago";
}

/* ---------------- SUMMARY ---------------- */
function showSummary(data) {
    const total = data.length;
    const societies = new Set(data.map(d => d.Society)).size;

    const el = document.getElementById("summary");
    if (!el) return;

    el.innerHTML = `
        <strong>Total Visits:</strong> ${total} <br>
        <strong>Societies:</strong> ${societies}
    `;
}

/* ---------------- LAST UPDATED ---------------- */
function updateLastUpdated() {
    const now = new Date();

    const formatted = now.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
    });

    const el = document.getElementById("time");
    if (!el) return;

    el.innerText = "Last synced: " + formatted;
}

/* ---------------- START ---------------- */
loadData();
