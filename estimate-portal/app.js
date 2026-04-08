(function () {
  "use strict";

  var cfg = window.__FIREBASE_CONFIG__;
  if (!cfg || !cfg.apiKey || cfg.apiKey === "YOUR_API_KEY") {
    document.getElementById("state-loading").classList.add("hidden");
    document.getElementById("state-error").classList.remove("hidden");
    document.getElementById("error-message").textContent =
      "Firebase is not configured. Copy firebase-config.example.js to firebase-config.js and add your web app keys.";
    return;
  }

  firebase.initializeApp(cfg);
  var db = firebase.firestore();

  function getEstimateIdFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get("id");
    if (id && id.trim()) return id.trim();
    var path = window.location.pathname.replace(/^\/+|\/+$/g, "");
    if (path && path !== "index.html") return path.split("/")[0];
    return null;
  }

  function formatMoney(amount, currency) {
    var n = Number(amount);
    if (Number.isNaN(n)) return String(amount);
    var code = currency && String(currency).trim() ? String(currency).trim() : "USD";
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: code }).format(n);
    } catch (e) {
      return code + " " + n.toFixed(2);
    }
  }

  function show(elId) {
    document.getElementById(elId).classList.remove("hidden");
  }

  function hide(elId) {
    document.getElementById(elId).classList.add("hidden");
  }

  function renderEstimate(data) {
    hide("state-loading");
    hide("state-error");
    show("state-estimate");

    var title = data.title || "Your estimate";
    document.getElementById("title").textContent = title;

    document.getElementById("customer-name").textContent = data.customerName || "—";
    document.getElementById("customer-email").textContent = data.email || "—";

    var notes = data.notes;
    if (notes != null && String(notes).trim() !== "") {
      document.getElementById("notes").textContent = String(notes);
      document.getElementById("notes-wrap").classList.remove("hidden");
    }

    var currency = data.currency || "USD";
    var items = data.lineItems;
    var listEl = document.getElementById("line-items");
    listEl.innerHTML = "";

    if (Array.isArray(items) && items.length) {
      items.forEach(function (row) {
        var li = document.createElement("li");
        li.className = "line-item";
        var desc = document.createElement("p");
        desc.className = "line-desc";
        desc.textContent = row.description != null ? String(row.description) : "Item";
        var amt = document.createElement("p");
        amt.className = "line-amt";
        amt.textContent = formatMoney(row.amount, currency);
        li.appendChild(desc);
        li.appendChild(amt);
        listEl.appendChild(li);
      });
    } else {
      var li = document.createElement("li");
      li.className = "line-item";
      var p = document.createElement("p");
      p.className = "line-desc muted";
      p.textContent = "No line items.";
      li.appendChild(p);
      listEl.appendChild(li);
    }

    var totalFormatted = formatMoney(data.total, currency);
    document.getElementById("header-total").textContent = totalFormatted;
    document.getElementById("subtotal").textContent = formatMoney(data.subtotal, currency);
    document.getElementById("tax").textContent = formatMoney(data.tax, currency);
    document.getElementById("total").textContent = totalFormatted;

    var status = data.status || "pending";
    var approveBtn = document.getElementById("approve-btn");
    var pendingMsg = document.getElementById("status-pending");
    var approvedMsg = document.getElementById("status-approved");

    if (status === "approved") {
      pendingMsg.classList.add("hidden");
      approvedMsg.classList.remove("hidden");
      approveBtn.classList.add("hidden");
    } else {
      approvedMsg.classList.add("hidden");
      pendingMsg.classList.remove("hidden");
      approveBtn.classList.remove("hidden");
      approveBtn.disabled = false;
    }
  }

  function showError(msg) {
    hide("state-loading");
    hide("state-estimate");
    document.getElementById("state-error").classList.remove("hidden");
    document.getElementById("error-message").textContent = msg;
  }

  var estimateId = getEstimateIdFromUrl();
  if (!estimateId) {
    showError("Missing estimate link. Use the full URL we sent you (it includes a unique id).");
    return;
  }

  var approveBtn = document.getElementById("approve-btn");
  var approveErr = document.getElementById("approve-error");

  db.collection("estimates")
    .doc(estimateId)
    .get()
    .then(function (snap) {
      if (!snap.exists) {
        showError("We could not find this estimate. It may have been removed or the link is incorrect.");
        return;
      }
      renderEstimate(snap.data());
    })
    .catch(function (err) {
      console.error(err);
      showError("Something went wrong loading your estimate. Please try again later.");
    });

  approveBtn.addEventListener("click", function () {
    approveErr.classList.add("hidden");
    approveErr.textContent = "";
    approveBtn.disabled = true;

    var ref = db.collection("estimates").doc(estimateId);
    ref
      .update({
        status: "approved",
        approvedAt: firebase.firestore.FieldValue.serverTimestamp()
      })
      .then(function () {
        return ref.get();
      })
      .then(function (snap) {
        if (snap.exists) renderEstimate(snap.data());
      })
      .catch(function (err) {
        console.error(err);
        approveBtn.disabled = false;
        approveErr.textContent =
          err.code === "permission-denied"
            ? "You cannot approve this estimate (already approved or permission denied)."
            : "Could not record approval. Please try again.";
        approveErr.classList.remove("hidden");
      });
  });
})();
