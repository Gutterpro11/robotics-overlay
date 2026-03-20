(function () {
  window.overlayState = {};
  let pollTimer = null;

  function toMap(rows) {
    const map = {};
    rows.forEach(row => {
      if (row && row.key) map[row.key] = row.value;
    });
    return map;
  }

  function normalizePayload(payload) {
    if (!payload) return {};
    if (Array.isArray(payload)) return toMap(payload);
    if (payload.rows && Array.isArray(payload.rows)) return toMap(payload.rows);
    if (payload.data && Array.isArray(payload.data)) return toMap(payload.data);
    return payload;
  }

  window.overlayDataCallback = function (payload) {
    window.overlayState = normalizePayload(payload);
    renderAll();
  };

  function loadScriptData() {
    const base = window.OVERLAY_SCRIPT_URL;
    if (!base || base.indexOf("PASTE_YOUR_APPS_SCRIPT_URL_HERE") !== -1) return;
    const existing = document.getElementById("overlay-data-script");
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.id = "overlay-data-script";
    script.src = base + (base.indexOf("?") >= 0 ? "&" : "?") + "_ts=" + Date.now();
    document.head.appendChild(script);
  }

  function fmtDiff(v) {
    const num = Number(v || 0);
    if (Number.isNaN(num)) return v || "";
    return (num > 0 ? "+" : "") + num;
  }

  function text(id, value, fallback="") {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = (value ?? fallback) === "" ? fallback : value;
  }

  function applyAccent() {
    const accent = (window.overlayState.accent_color || window.OVERLAY_THEME.accent || "#FF6B35").replace(/^([^#])/, "#$1");
    document.documentElement.style.setProperty("--accent", accent);
  }

  function renderScoreboard() {
    const d = window.overlayState;
    text("eventTitle", d.event_title, "Tournament Overlay");
    text("matchMeta", [d.current_round, d.current_match_id].filter(Boolean).join(" • "));
    text("redTeam", d.current_red_team_name, "Red Alliance");
    text("blueTeam", d.current_blue_team_name, "Blue Alliance");
    text("redScore", d.current_red_score, "0");
    text("blueScore", d.current_blue_score, "0");
    text("statusPill", d.current_status, "Live");
    text("winnerValue", d.current_winner, "—");
    text("venueValue", [d.venue, d.event_date].filter(Boolean).join(" • "), "");
  }

  function renderLowerThird() {
    const d = window.overlayState;
    text("ltTitle", d.lower_third_line1, d.event_title || "Event update");
    const subtitle = [d.lower_third_line2, d.featured_team_name ? "Featured: " + d.featured_team_name : ""]
      .filter(Boolean).join(" • ");
    text("ltSubtitle", subtitle, "");
  }

  function renderNextMatch() {
    const d = window.overlayState;
    text("nextRound", d.next_match_round, "Next");
    text("nextMatchId", d.next_match_id, "");
    text("nextTeams", [d.next_red_team_name, d.next_blue_team_name].filter(Boolean).join(" vs "), "");
  }

  function renderStandings() {
    const tbody = document.getElementById("standingsBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    for (let i = 1; i <= 8; i++) {
      const team = window.overlayState["standing_" + i + "_team_name"];
      if (!team) continue;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="rank">${i}</td>
        <td class="team">${team}</td>
        <td>${window.overlayState["standing_" + i + "_wins"] || 0}</td>
        <td>${window.overlayState["standing_" + i + "_losses"] || 0}</td>
        <td>${fmtDiff(window.overlayState["standing_" + i + "_diff"] || 0)}</td>
      `;
      tbody.appendChild(tr);
    }
  }

  function renderFeatureCard() {
    const d = window.overlayState;
    text("featureTeam", d.featured_team_name, d.current_red_team_name || "");
    text("featureOrg", [d.featured_team_org, d.featured_team_city].filter(Boolean).join(" • "), "");
    text("featureId", d.featured_team_id ? "#" + d.featured_team_id : "");
  }

  function renderAll() {
    applyAccent();
    renderScoreboard();
    renderLowerThird();
    renderNextMatch();
    renderStandings();
    renderFeatureCard();
  }

  window.addEventListener("DOMContentLoaded", function () {
    renderAll();
    loadScriptData();
    clearInterval(pollTimer);
    pollTimer = setInterval(loadScriptData, Number(window.OVERLAY_REFRESH_MS || 3000));
  });
})();
