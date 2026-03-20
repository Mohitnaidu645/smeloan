"use strict";


let currentCat = "farmer";

const CAT_GROUPS = {
  farmer:   ["grp-common","grp-farmer"],
  startup:  ["grp-common","grp-startup"],
  existing: ["grp-common","grp-existing"],
  women:    ["grp-common","grp-women"],
  msme:     ["grp-common","grp-msme"],
};


const NEXT_STEPS = {
  approved: {
    emoji: "🎉",
    title: "Great news! Here's what to do next:",
    steps: {
      farmer: [
        "Visit your nearest SBI branch or cooperative bank and ask for the Kisan Credit Card (KCC).",
        "Carry originals + photocopies of: Land documents, Aadhaar, PAN card and bank passbook.",
        "You can also apply under NABARD Agri loan or PM Kisan scheme at your bank.",
        "Loan is typically approved within 7–14 working days after document verification.",
      ],
      startup: [
        "Apply online at psbloansin59minutes.com — get in-principle approval in under 1 hour.",
        "Documents needed: DPIIT certificate, PAN, Aadhaar, bank statements (6 months) and business plan.",
        "Alternatively apply under PM MUDRA Yojana — no collateral required for loans up to Rs.10 lakh.",
        "Approval usually takes 5–10 working days after document submission.",
      ],
      existing: [
        "Apply via psbloansin59minutes.com using your GST number and ITR for fast pre-approval.",
        "Prepare: 2 years audited balance sheet, P&L statement, 12 months bank statements.",
        "Visit SBI SME branch, HDFC Business Loan desk, or ICICI Bank for in-person processing.",
        "Working capital loan can be sanctioned in 7–15 working days.",
      ],
      women: [
        "Visit the nearest PSB (SBI, PNB, or Canara Bank) and ask for the Stree Shakti package.",
        "Carry: Aadhaar, PAN, business ownership proof showing 51%+ women stake, bank passbook.",
        "If you are an SHG member, your group can collectively apply for Mudra / JLG loans.",
        "You are entitled to a 0.5% interest rate concession under the Stree Shakti scheme.",
      ],
      msme: [
        "If not yet done, register free at udyamregistration.gov.in (takes 10 minutes).",
        "Apply via psbloansin59minutes.com — loans up to Rs.1 crore can be pre-approved quickly.",
        "Keep ready: Udyam certificate, GST returns (6 months), bank statements, ITR.",
        "CGTMSE provides collateral-free guarantee for loans up to Rs.5 crore — ask your bank.",
      ],
    },
  },
  rejected: {
    emoji: "💡",
    title: "Not eligible yet — here's exactly how to fix it:",
    steps: {
      farmer: [
        "Improve CIBIL score: pay all existing EMIs, credit card dues and utility bills on time for 6 months.",
        "Ensure agricultural land is formally registered in your name — possession alone is not enough.",
        "Apply for a smaller loan amount first (Rs.25,000–50,000 via KCC) to build repayment history.",
        "Add a co-applicant (spouse or adult child with income) to strengthen your application.",
      ],
      startup: [
        "Register free under Startup India / DPIIT at startupindia.gov.in — it significantly boosts eligibility.",
        "Close or prepay any existing active loans before applying for a new startup loan.",
        "Start small — MUDRA Shishu loans (up to Rs.50,000) have very low eligibility requirements.",
        "Use a secured credit card for 6 months and pay in full each month to build your CIBIL score.",
      ],
      existing: [
        "Start filing GST returns immediately — it is the single most important factor for business loans.",
        "File income tax returns for the last 2 years even if turnover was low — banks require this.",
        "Maintain a clean, active business bank account with regular transactions for at least 6 months.",
        "Try a small MUDRA Kishor loan (up to Rs.5 lakh) first to build a business credit history.",
      ],
      women: [
        "Ensure all business ownership documents clearly reflect 51% or more women ownership.",
        "Join a local SHG (Self Help Group) — members get group-guaranteed loans without CIBIL checks.",
        "Build credit by using a credit card for regular purchases and paying the full amount monthly.",
        "Annapurna Scheme (food catering) requires only a guarantor — no CIBIL score needed.",
      ],
      msme: [
        "Register on Udyam Registration portal (udyamregistration.gov.in) — it is free, takes 10 minutes, and is mandatory.",
        "File GST returns consistently for at least 3–6 months before approaching a bank.",
        "Pay off any overdue loan EMIs or credit card balances to improve your CIBIL score.",
        "Microfinance lenders like Ujjivan, Aye Finance, or Satin Creditcare have lower thresholds than PSBs.",
      ],
    },
  },
};


document.addEventListener("DOMContentLoaded", () => {
  setupCatCards();
  setupForm();
  showGroups("farmer");
});


function setupCatCards() {
  document.querySelectorAll(".cat-card").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".cat-card").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentCat = btn.dataset.cat;
      showGroups(currentCat);
      hideResult();
    });
  });
}

function showGroups(cat) {
  document.querySelectorAll(".form-card").forEach(g => g.classList.add("hidden"));
  (CAT_GROUPS[cat] || ["grp-common"]).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove("hidden");
  });
}


function toggleCard(id, on) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle("on", on);
}


function updateCibilMeter(val) {
  const v = Math.min(Math.max(parseInt(val) || 0, 300), 900);
  const pct = ((v - 300) / 600) * 100;
  const fill = document.getElementById("cibilFill");
  if (!fill) return;
  fill.style.width = pct + "%";
  if (v < 550)      fill.style.background = "#DC2626";
  else if (v < 650) fill.style.background = "#D97706";
  else if (v < 750) fill.style.background = "#16A34A";
  else              fill.style.background = "#1B4FD8";
}


function formatInr(n) {
  if (!n || isNaN(n)) return "";
  n = parseInt(n);
  if (n >= 10000000) return "= Rs." + (n / 10000000).toFixed(2) + " Crore";
  if (n >= 100000)   return "= Rs." + (n / 100000).toFixed(2) + " Lakh";
  if (n >= 1000)     return "= Rs." + (n / 1000).toFixed(1) + " Thousand";
  return "";
}

function showFormatted(inputId, hintId) {
  const val = document.getElementById(inputId)?.value;
  const hint = document.getElementById(hintId);
  if (hint) hint.textContent = formatInr(val);
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
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      renderResult(data);
    } catch (err) {
      alert("Could not connect to Flask server.\n\nMake sure it is running:\n\n  python app.py\n\nThen open: http:")
    } finally {
      setLoading(false);
    }
  });
}

function collectPayload() {
  const vi = id => { const el = document.getElementById(id); return el ? parseInt(el.value) || 0 : 0; };
  const vc = id => { const el = document.getElementById(id); return el && el.checked ? 1 : 0; };

  const base = {
    category:    currentCat,
    age:         vi("age"),
    cibil:       vi("cibil"),
    income:      vi("income"),
    loan_amount: vi("loan_amount"),
  };

  if (currentCat === "farmer")   { base.land_owned    = vc("land_owned"); }
  if (currentCat === "startup")  { base.dpiit_reg     = vc("dpiit_reg");  base.existing_loan = vc("existing_loan"); }
  if (currentCat === "existing") { base.business_age  = vi("business_age"); base.turnover = vi("turnover"); base.gst_filed = vc("gst_filed"); base.itr_filed = vc("itr_filed"); }
  if (currentCat === "women")    { base.women_owned   = vc("women_owned"); base.shg_member = vc("shg_member"); }
  if (currentCat === "msme")     { base.business_age  = vi("msme_business_age"); base.turnover = vi("msme_turnover"); base.udyam_reg = vc("udyam_reg"); base.gst_filed = vc("msme_gst"); }

  return base;
}


function renderResult(data) {
  const sec      = document.getElementById("resultSection");
  const eligible = data.eligible;
  const prob     = data.prob_eligible || 0;
  const cat      = data.category || currentCat;

  sec.classList.remove("hidden");

  
  const vw = document.getElementById("verdictWrap");
  vw.className = "verdict-wrap " + (eligible ? "approved" : "rejected");
  document.getElementById("verdictIconBig").textContent  = eligible ? "✅" : "❌";
  document.getElementById("verdictTitle").textContent    = eligible ? "You Are Eligible!" : "Not Eligible Right Now";
  document.getElementById("verdictSub").textContent      = eligible
    ? "Your profile meets the key criteria. See the steps below to apply for your loan."
    : "Your profile has a few gaps. The checklist below shows exactly what to fix.";

  
  document.getElementById("scorePct").textContent = prob + "%";
  const circumference = 326.7;
  const offset = circumference - (prob / 100) * circumference;
  setTimeout(() => {
    document.getElementById("ringFill").style.strokeDashoffset = offset;
  }, 100);

  
  const list  = document.getElementById("checkList");
  const title = document.getElementById("checkCardTitle");
  list.innerHTML = "";
  title.textContent = eligible ? "✔  What looks good in your application" : "⚠  Issues found — fix these to get approved";

  (data.reasons || []).forEach(reason => {
    const lower = reason.toLowerCase();
    const isIssue = !eligible && (
      lower.includes("low") || lower.includes("mandatory") || lower.includes("required") ||
      lower.includes("below") || lower.includes("exceeds") || lower.includes("must") ||
      lower.includes("too low") || lower.includes("minimum")
    );
    const isTip = lower.includes("probability") || lower.includes("improves") ||
      lower.includes("unlocks") || lower.includes("verified") || lower.includes("confirmed") ||
      lower.includes("strengthens");

    const cls  = isIssue ? "issue" : (isTip ? "tip" : "ok");
    const icon = isIssue ? "❌" : (isTip ? "💡" : "✅");

    const li = document.createElement("li");
    li.className = cls;
    li.innerHTML = `<span class="ci">${icon}</span><span>${reason}</span>`;
    list.appendChild(li);
  });

  
  const ns    = eligible ? NEXT_STEPS.approved : NEXT_STEPS.rejected;
  const steps = ns.steps[cat] || ns.steps["msme"];

  document.getElementById("stepsTitle").textContent = ns.emoji + "  " + ns.title;

  const sl = document.getElementById("stepsList");
  sl.innerHTML = "";
  steps.forEach((step, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="sn">${i + 1}</span><span class="st">${step}</span>`;
    sl.appendChild(li);
  });

  sec.scrollIntoView({ behavior: "smooth", block: "start" });
}


function resetForm() {
  document.getElementById("resultSection").classList.add("hidden");
  document.getElementById("loanForm").reset();

  
  const fill = document.getElementById("cibilFill");
  if (fill) fill.style.width = "0%";
  ["incomeFormatted","loanFormatted","turnoverFormatted","msme_turnoverFormatted"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
  });
  
  document.querySelectorAll(".toggle-card").forEach(tc => tc.classList.remove("on"));

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function hideResult() {
  document.getElementById("resultSection").classList.add("hidden");
}


function setLoading(on) {
  const btn  = document.getElementById("submitBtn");
  const text = btn.querySelector(".sb-text");
  const icon = btn.querySelector(".sb-icon");
  const ldr  = btn.querySelector(".sb-loader");
  text.classList.toggle("hidden", on);
  icon.classList.toggle("hidden", on);
  ldr.classList.toggle("hidden", !on);
  btn.disabled = on;
}
