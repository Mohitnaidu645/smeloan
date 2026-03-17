let currentCat = "farmer";

const catGroups = {
  farmer:   ["grp-common","grp-farmer"],
  startup:  ["grp-common","grp-startup"],
  existing: ["grp-common","grp-existing"],
  women:    ["grp-common","grp-women"],
  msme:     ["grp-common","grp-msme"],
};

// Next-steps advice per category & verdict
const NEXT_STEPS = {
  approved: {
    title: "🎉 You're likely eligible! Here's what to do next:",
    steps: {
      farmer:   ["Visit your nearest SBI / cooperative bank branch","Carry your land documents, Aadhaar, PAN and bank passbook","Ask for Kisan Credit Card (KCC) or NABARD Agri loan","Loan can be approved within 7–14 working days"],
      startup:  ["Apply on psbloansin59minutes.com for fast in-principle approval","Keep your DPIIT certificate, PAN, Aadhaar and business plan ready","You can also apply under PM MUDRA Yojana (no collateral needed)","Approval typically takes 5–10 working days"],
      existing: ["Apply on psbloansin59minutes.com using your GST + ITR","Keep 2 years of audited accounts + 12 months bank statements","Banks like SBI, HDFC, ICICI have dedicated SME desks","Loan can be disbursed in 7–15 working days"],
      women:    ["Visit nearest PSB (SBI, PNB, Canara Bank) for Stree Shakti scheme","Carry Aadhaar, PAN, business proof and ownership documents","SHG membership can speed up your approval","Special 0.5% interest concession available for women borrowers"],
      msme:     ["Register on udyamregistration.gov.in first (free, 10 minutes)","Apply via psbloansin59minutes.com for fast approval","Keep GST returns, Udyam certificate and bank statements ready","CGTMSE scheme gives collateral-free loans up to Rs.5 crore"],
    }
  },
  rejected: {
    title: "💡 Not eligible yet — but here's how to fix it:",
    steps: {
      farmer:   ["Improve your CIBIL score: pay all EMIs and credit card dues on time","Ensure land is registered in your name (not just family possession)","Apply for a smaller loan amount first to build credit history","Try a co-applicant (spouse or family member) to strengthen the application"],
      startup:  ["Register under Startup India (DPIIT) — it's free and boosts eligibility","Reduce loan amount — MUDRA Shishu starts from just Rs.50,000","Close any existing loans before applying","Build CIBIL by using a secured credit card for 6 months"],
      existing: ["Start filing GST returns immediately — it's the #1 factor for business loans","File your ITR for the last 2 years — even if business was small","Maintain a clean bank account with regular transactions","Consider a small MUDRA loan first to build lending history"],
      women:    ["Ensure ownership documents clearly show 51%+ women stake","Join a local SHG (Self Help Group) — it greatly improves rural loan access","Build CIBIL by paying phone/electricity bills via credit card","Annapurna scheme needs no CIBIL — only a guarantor and business proof"],
      msme:     ["Register on Udyam (free at udyamregistration.gov.in) — mandatory for MSME loans","File GST returns for at least 3–6 months before applying","Improve CIBIL by clearing overdue payments","Try microfinance institutions (Ujjivan, Aye Finance) which have lower CIBIL thresholds"],
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  setupCatTabs();
  setupForm();
  showGroups("farmer");
});

function setupCatTabs() {
  document.querySelectorAll(".ctab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".ctab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentCat = btn.dataset.cat;
      showGroups(currentCat);
      hideResult();
    });
  });
}

function showGroups(cat) {
  document.querySelectorAll(".field-group").forEach(g => g.classList.add("hidden"));
  (catGroups[cat] || ["grp-common"]).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove("hidden");
  });
}

function setupForm() {
  document.getElementById("loanForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res  = await fetch("/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(collectPayload()),
      });
      const data = await res.json();
      renderResult(data);
    } catch {
      alert("Could not connect to server. Make sure Flask is running:\n\npython app.py");
    } finally {
      setLoading(false);
    }
  });
}

function collectPayload() {
  const vi = id => { const el = document.getElementById(id); return el ? parseInt(el.value) || 0 : 0; };
  const vc = id => { const el = document.getElementById(id); return el && el.checked ? 1 : 0; };
  const base = { category: currentCat, age: vi("age"), cibil: vi("cibil"), income: vi("income"), loan_amount: vi("loan_amount") };
  if (currentCat === "farmer")   { base.land_owned = vc("land_owned"); }
  if (currentCat === "startup")  { base.dpiit_reg = vc("dpiit_reg"); base.existing_loan = vc("existing_loan"); }
  if (currentCat === "existing") { base.business_age = vi("business_age"); base.turnover = vi("turnover"); base.gst_filed = vc("gst_filed"); base.itr_filed = vc("itr_filed"); }
  if (currentCat === "women")    { base.women_owned = vc("women_owned"); base.shg_member = vc("shg_member"); }
  if (currentCat === "msme")     { base.business_age = vi("msme_business_age"); base.turnover = vi("msme_turnover"); base.udyam_reg = vc("udyam_reg"); base.gst_filed = vc("msme_gst"); }
  return base;
}

function renderResult(data) {
  const sec = document.getElementById("resultSection");
  sec.classList.remove("hidden");

  const eligible = data.eligible;
  const prob     = data.prob_eligible;
  const cat      = data.category;

  // ── Verdict card ──────────────────────────────────────────────────────
  const vc2 = document.getElementById("verdictCard");
  vc2.className = "verdict-card " + (eligible ? "approved" : "rejected");

  document.getElementById("verdictIcon").textContent  = eligible ? "✅" : "❌";
  document.getElementById("verdictTitle").textContent = eligible ? "You are Eligible!" : "Not Eligible Right Now";
  document.getElementById("verdictSub").textContent   = eligible
    ? "Your profile meets the key criteria for an SME loan in this category."
    : "Your profile has some gaps. See below for exactly what to fix.";

  document.getElementById("vpVal").textContent = prob + "%";
  setTimeout(() => { document.getElementById("vpBar").style.width = prob + "%"; }, 100);

  // ── Checklist ─────────────────────────────────────────────────────────
  const list = document.getElementById("clList");
  list.innerHTML = "";
  document.getElementById("clTitle").textContent = eligible ? "✔ What looks good" : "⚠ Issues found in your application";

  (data.reasons || []).forEach(r => {
    const li = document.createElement("li");
    // Classify the reason
    const isOk  = eligible && !r.toLowerCase().includes("below") && !r.toLowerCase().includes("low") && !r.toLowerCase().includes("required") && !r.toLowerCase().includes("must");
    const isIssue = !eligible && (r.toLowerCase().includes("low") || r.toLowerCase().includes("mandatory") || r.toLowerCase().includes("required") || r.toLowerCase().includes("below") || r.toLowerCase().includes("exceeds") || r.toLowerCase().includes("must"));
    const isTip = r.toLowerCase().includes("probability") || r.toLowerCase().includes("improves") || r.toLowerCase().includes("unlocks") || r.toLowerCase().includes("verified") || r.toLowerCase().includes("confirmed");

    li.className = isIssue ? "issue" : (isTip ? "tip" : (isOk ? "ok" : "ok"));
    const icon = isIssue ? "❌" : (isTip ? "💡" : "✅");
    li.innerHTML = `<span class="ci">${icon}</span><span>${r}</span>`;
    list.appendChild(li);
  });

  // ── Next steps ────────────────────────────────────────────────────────
  const ns = eligible ? NEXT_STEPS.approved : NEXT_STEPS.rejected;
  const steps = ns.steps[cat] || ns.steps["msme"];
  document.getElementById("nsTitle").textContent = ns.title;
  const nsBody = document.getElementById("nsBody");
  const ul = document.createElement("ul");
  ul.className = "ns-steps";
  steps.forEach((s, i) => {
    ul.innerHTML += `<li><span class="ns-n">${i+1}</span><span>${s}</span></li>`;
  });
  nsBody.innerHTML = "";
  nsBody.appendChild(ul);

  sec.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setLoading(on) {
  const btn = document.getElementById("submitBtn");
  btn.querySelector(".btn-text").classList.toggle("hidden", on);
  btn.querySelector(".btn-icon").classList.toggle("hidden", on);
  btn.querySelector(".btn-loader").classList.toggle("hidden", !on);
  btn.disabled = on;
}

function hideResult() {
  document.getElementById("resultSection").classList.add("hidden");
}
