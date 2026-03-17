from flask import Flask, request, jsonify, render_template
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import random

app = Flask(__name__)

# ── Real-world eligibility rules (based on RBI / SIDBI / MUDRA / Startup India guidelines) ──
#
# MUDRA Loan categories (Pradhan Mantri MUDRA Yojana):
#   Shishu  : up to Rs.50,000
#   Kishore : Rs.50,001 – Rs.5,00,000
#   Tarun   : Rs.5,00,001 – Rs.10,00,000
#   TarunPlus: Rs.10,00,001 – Rs.20,00,000 (only for prior Tarun repayers)
#
# Key real-world facts encoded here:
#   1. NO minimum CIBIL score in MUDRA scheme — but score < 500 raises red flags
#   2. No collateral required for MUDRA loans
#   3. DPIIT registration is NOT mandatory for startup loans — it's a bonus
#   4. GST mandatory only if turnover > Rs.40L (goods) or Rs.20L (services)
#   5. Udyam registration is recommended but not compulsory for small MSME/MUDRA
#   6. Existing loan is NOT auto-reject — FOIR (Fixed Obligation to Income Ratio) must be < 50%
#   7. Women entrepreneurs get preferential treatment (lower rate, easier approval)
#   8. Age: 18–65 for most; 21+ for startup category
#   9. Agri/KCC loans require land ownership or tenancy proof
#   10. Business vintage >= 1 year for existing business / MSME loans
# ─────────────────────────────────────────────────────────────────────────────

def generate_dataset(n=5000):
    random.seed(42)
    np.random.seed(42)
    rows = []
    categories = ["farmer", "startup", "existing", "women", "msme"]

    for _ in range(n):
        cat           = random.choice(categories)
        age           = np.random.randint(18, 66)
        cibil         = np.random.randint(300, 900)
        income        = np.random.randint(60000, 6000000)    # Rs.60K – Rs.60L
        loan_amount   = np.random.randint(10000, 2000000)    # up to Rs.20L
        business_age  = np.random.randint(0, 20)
        land_owned    = np.random.choice([0, 1])
        gst_filed     = np.random.choice([0, 1])
        udyam_reg     = np.random.choice([0, 1])
        dpiit_reg     = np.random.choice([0, 1])
        shg_member    = np.random.choice([0, 1])
        women_owned   = 1 if cat == "women" else np.random.choice([0, 1])
        turnover      = np.random.randint(0, 10000000)
        itr_filed     = np.random.choice([0, 1])
        existing_loan = np.random.choice([0, 1])

        # FOIR: existing EMI estimated as 10% of income if loan exists
        estimated_emi  = loan_amount * 0.02        # rough EMI ~2% of principal/month
        existing_emi   = income * 0.10 if existing_loan else 0
        foir           = (estimated_emi + existing_emi) / (income / 12) if income > 0 else 1.0

        cat_enc = categories.index(cat)

        # ── Real eligibility logic per category ──────────────────────────────

        if cat == "farmer":
            # KCC / PM Kisan / MUDRA agri-allied
            # Requires: land or tenancy proof, age 18-65, loan within limits
            # CIBIL not mandatory but < 500 is a red flag
            # No default history assumed (no variable for it here)
            eligible = int(
                land_owned == 1
                and 18 <= age <= 65
                and loan_amount <= 1500000          # Rs.15L limit for agri-allied MUDRA
                and cibil >= 500                    # soft floor — banks use internal scoring
                and foir < 0.60                     # slightly relaxed for farmers
            )

        elif cat == "startup":
            # Startup India Seed Fund / MUDRA Tarun / SIDBI startup loans
            # DPIIT is a BONUS (unlocks Seed Fund), NOT mandatory
            # CIBIL soft floor ~580 if no DPIIT; lower bar with DPIIT
            # Age >= 21, no existing default, FOIR < 50%
            # Loan up to Rs.10L (MUDRA Tarun) or Rs.20L (Seed Fund with DPIIT)
            mudra_limit  = 1000000                  # Rs.10L without DPIIT
            seed_limit   = 2000000                  # Rs.20L with DPIIT registration
            max_loan     = seed_limit if dpiit_reg else mudra_limit
            cibil_needed = 550 if dpiit_reg else 600   # DPIIT lowers bar slightly
            eligible = int(
                age >= 21
                and loan_amount <= max_loan
                and cibil >= cibil_needed
                and foir < 0.50
                # existing loan allowed if FOIR is OK — not auto-blocked
            )

        elif cat == "existing":
            # Existing business loan — MSME / working capital / term loan
            # Requires: business vintage >= 1 yr, GST if turnover > threshold,
            # CIBIL >= 650 (banks are stricter for established businesses),
            # turnover >= Rs.2L (basic viability), FOIR < 50%
            gst_turnover_threshold = 2000000        # Rs.20L services threshold
            gst_required = int(turnover >= gst_turnover_threshold)
            gst_ok = (gst_filed == 1) if gst_required else True   # exempt if below threshold
            eligible = int(
                business_age >= 1
                and cibil >= 650
                and gst_ok
                and turnover >= 200000              # Rs.2L minimum viability
                and foir < 0.50
                and 18 <= age <= 65
            )

        elif cat == "women":
            # Mahila Udyam Nidhi / MUDRA women / Stree Shakti
            # Women must own >= 51%, age 18-65, CIBIL >= 500 (relaxed),
            # FOIR < 55% (preferential), loan up to Rs.10L
            eligible = int(
                women_owned == 1
                and 18 <= age <= 65
                and cibil >= 500                    # relaxed for women schemes
                and loan_amount <= 1000000          # Rs.10L limit
                and foir < 0.55                     # slightly relaxed FOIR for women
            )

        else:  # msme
            # MSME loans — MUDRA / CGTMSE / PSB loans in 59 min
            # Udyam registration is RECOMMENDED not mandatory for MUDRA
            # GST only if turnover exceeds threshold
            # CIBIL >= 650 preferred, business age >= 1 yr
            gst_turnover_threshold = 4000000        # Rs.40L goods threshold
            gst_required = int(turnover >= gst_turnover_threshold)
            gst_ok = (gst_filed == 1) if gst_required else True
            # Udyam reg gives a small boost but is NOT a hard block
            cibil_needed = 620 if udyam_reg else 680   # Udyam lowers bar slightly
            eligible = int(
                business_age >= 1
                and cibil >= cibil_needed
                and gst_ok
                and foir < 0.50
                and 18 <= age <= 65
            )

        rows.append([age, cibil, income, loan_amount, business_age, land_owned,
                     gst_filed, udyam_reg, dpiit_reg, shg_member, women_owned,
                     turnover, itr_filed, existing_loan, foir, cat_enc, eligible])

    cols = ["age", "cibil", "income", "loan_amount", "business_age", "land_owned",
            "gst_filed", "udyam_reg", "dpiit_reg", "shg_member", "women_owned",
            "turnover", "itr_filed", "existing_loan", "foir", "category", "eligible"]
    return pd.DataFrame(rows, columns=cols)


# ── Train Gradient Boosting model ─────────────────────────────────────────────
MODEL   = None
SCALER  = StandardScaler()
METRICS = {}

FEATURE_COLS = ["age", "cibil", "income", "loan_amount", "business_age", "land_owned",
                "gst_filed", "udyam_reg", "dpiit_reg", "shg_member", "women_owned",
                "turnover", "itr_filed", "existing_loan", "foir", "category"]

def train_model():
    global MODEL, SCALER, METRICS
    df = generate_dataset(5000)
    X  = df[FEATURE_COLS]
    y  = df["eligible"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    X_train_s = SCALER.fit_transform(X_train)
    X_test_s  = SCALER.transform(X_test)

    MODEL = GradientBoostingClassifier(
        n_estimators=200, max_depth=4, learning_rate=0.08,
        subsample=0.85, random_state=42
    )
    MODEL.fit(X_train_s, y_train)

    y_pred   = MODEL.predict(X_test_s)
    acc      = accuracy_score(y_test, y_pred)
    rep      = classification_report(y_test, y_pred, output_dict=True)
    cm       = confusion_matrix(y_test, y_pred).tolist()
    pos_rate = round(float(y.mean()) * 100, 1)

    METRICS = {
        "accuracy":         round(acc * 100, 2),
        "precision":        round(rep["1"]["precision"] * 100, 2),
        "recall":           round(rep["1"]["recall"]    * 100, 2),
        "f1_score":         round(rep["1"]["f1-score"]  * 100, 2),
        "confusion_matrix": cm,
        "train_size":       int(len(X_train)),
        "test_size":        int(len(X_test)),
        "n_features":       int(len(FEATURE_COLS)),
        "pos_rate":         pos_rate,
    }
    print(f"GBM Trained — Acc:{METRICS['accuracy']}%  "
          f"P:{METRICS['precision']}%  R:{METRICS['recall']}%  "
          f"F1:{METRICS['f1_score']}%  +class:{pos_rate}%")

train_model()


# ── Feature builder (now includes FOIR calculation) ───────────────────────────
CAT_MAP = {"farmer": 0, "startup": 1, "existing": 2, "women": 3, "msme": 4}

def build_features(data):
    cat          = data.get("category", "msme")
    income       = max(int(data.get("income", 300000)), 1)
    loan_amount  = int(data.get("loan_amount", 500000))
    existing_loan= int(data.get("existing_loan", 0))

    estimated_emi = loan_amount * 0.02
    existing_emi  = income * 0.10 if existing_loan else 0
    foir          = (estimated_emi + existing_emi) / (income / 12)

    row = {
        "age":           int(data.get("age", 30)),
        "cibil":         int(data.get("cibil", 650)),
        "income":        income,
        "loan_amount":   loan_amount,
        "business_age":  int(data.get("business_age", 2)),
        "land_owned":    int(data.get("land_owned", 0)),
        "gst_filed":     int(data.get("gst_filed", 0)),
        "udyam_reg":     int(data.get("udyam_reg", 0)),
        "dpiit_reg":     int(data.get("dpiit_reg", 0)),
        "shg_member":    int(data.get("shg_member", 0)),
        "women_owned":   int(data.get("women_owned", 0)),
        "turnover":      int(data.get("turnover", 0)),
        "itr_filed":     int(data.get("itr_filed", 0)),
        "existing_loan": existing_loan,
        "foir":          round(foir, 4),
        "category":      CAT_MAP.get(cat, 4),
    }
    return pd.DataFrame([row], columns=FEATURE_COLS), foir


# ── Reason engine reflecting real-world rules ────────────────────────────────
def build_reasons(data, eligible, prob_eligible, foir):
    reasons  = []
    issues   = []
    positives= []

    cat   = data.get("category", "msme")
    cibil = int(data.get("cibil", 0))
    age   = int(data.get("age", 0))
    la    = int(data.get("loan_amount", 0))
    ba    = int(data.get("business_age", 0))
    to    = int(data.get("turnover", 0))
    inc   = int(data.get("income", 1))
    dpiit = int(data.get("dpiit_reg", 0))
    udyam = int(data.get("udyam_reg", 0))
    gst   = int(data.get("gst_filed", 0))
    land  = int(data.get("land_owned", 0))
    women = int(data.get("women_owned", 0))
    ex_ln = int(data.get("existing_loan", 0))

    foir_pct = round(foir * 100, 1)

    # ── Age ──
    if age < 18:
        issues.append(f"Age {age} is below the minimum of 18 years.")
    elif age < 21 and cat == "startup":
        issues.append(f"Age {age} — startup loans require applicant to be at least 21.")
    elif age > 65:
        issues.append(f"Age {age} exceeds the maximum of 65 years for most schemes.")
    else:
        positives.append(f"Age {age} is within the eligible 18–65 range.")

    # ── CIBIL — explain the real rule ──
    if cibil < 500:
        issues.append(
            f"CIBIL score {cibil} is very low. While MUDRA has no official minimum, "
            f"most banks require at least 500+ to approve. Build your score first."
        )
    elif cibil < 600:
        issues.append(
            f"CIBIL {cibil} is borderline. MUDRA loans have no official minimum, "
            f"but a score of 650+ improves your chances significantly."
        )
    elif cibil >= 700:
        positives.append(f"CIBIL score {cibil} is strong — well above lender expectations.")
    else:
        positives.append(f"CIBIL score {cibil} is acceptable for this loan category.")

    # ── FOIR (Fixed Obligation to Income Ratio) ──
    foir_limit = 0.55 if cat == "women" else (0.60 if cat == "farmer" else 0.50)
    if foir > foir_limit:
        issues.append(
            f"Your estimated FOIR is {foir_pct}% — lenders prefer under "
            f"{int(foir_limit*100)}%. Consider a smaller loan amount or increasing income."
        )
    elif foir > 0.40:
        issues.append(
            f"FOIR {foir_pct}% is moderate. Banks prefer under 40% for comfortable approval."
        )
    else:
        positives.append(f"FOIR {foir_pct}% is healthy — well within lender comfort zone.")

    # ── Existing loan — real rule: FOIR-based, not auto-block ──
    if ex_ln:
        if foir > foir_limit:
            issues.append(
                "Active loan + new loan pushes FOIR too high. "
                "Reduce loan amount or close existing loan to improve ratio."
            )
        else:
            positives.append(
                "Active loan exists but FOIR is within limits — not an automatic disqualifier."
            )

    # ── Category-specific checks ──
    if cat == "farmer":
        if not land:
            issues.append(
                "Land ownership or tenancy proof is required for agricultural loans (KCC / MUDRA agri-allied)."
            )
        else:
            positives.append("Land ownership confirmed — collateral requirement met for agri loan.")
        if la > 1500000:
            issues.append(
                f"Loan Rs.{la:,} exceeds the Rs.15 lakh MUDRA agri-allied limit. "
                f"For larger amounts, approach NABARD or KCC with collateral."
            )

    elif cat == "startup":
        max_loan = 2000000 if dpiit else 1000000
        if la > max_loan:
            issues.append(
                f"Loan Rs.{la:,} exceeds Rs.{max_loan:,} limit for startup category. "
                + ("Register with DPIIT (free) to access up to Rs.20L Startup India Seed Fund."
                   if not dpiit else "Consider splitting into tranches.")
            )
        if dpiit:
            positives.append(
                "DPIIT registration unlocks Startup India Seed Fund (up to Rs.20L) "
                "and priority lending under Stand-Up India."
            )
        else:
            issues.append(
                "DPIIT/Startup India registration is free at startupindia.gov.in — "
                "it is NOT mandatory but increases your loan limit and lowers interest rates."
            )
        positives.append(
            "Note: MUDRA has NO official minimum CIBIL score — your business plan "
            "and repayment capacity matter more than the score."
        )

    elif cat == "existing":
        if ba < 1:
            issues.append("Business must be at least 1 year old for existing business loans.")
        else:
            positives.append(f"Business vintage of {ba} year(s) meets lender requirements.")
        gst_threshold = 2000000
        if to >= gst_threshold and not gst:
            issues.append(
                f"Turnover Rs.{to:,} exceeds Rs.20L — GST registration and filing is legally "
                f"required and mandatory for loan approval."
            )
        elif to < gst_threshold:
            positives.append(
                f"Turnover Rs.{to:,} is below the GST threshold — you are legally exempt from GST filing."
            )
        else:
            positives.append("GST compliance confirmed — strengthens lender credibility.")
        if to < 200000:
            issues.append(
                f"Turnover Rs.{to:,} is very low. Lenders need at least Rs.2L annual turnover "
                f"to assess business viability."
            )

    elif cat == "women":
        if not women:
            issues.append(
                "Women entrepreneur schemes (Mahila Udyam Nidhi, Stree Shakti) require "
                "at least 51% women ownership. Update ownership records."
            )
        else:
            positives.append(
                "Women-owned business qualifies for preferential interest rates "
                "(0.25–0.50% lower) under Mahila Udyam Nidhi and MUDRA women schemes."
            )
        if la > 1000000:
            issues.append(
                f"Loan Rs.{la:,} exceeds the Rs.10L limit for most women entrepreneur schemes. "
                f"For higher amounts, apply under general MSME category."
            )

    elif cat == "msme":
        if ba < 1:
            issues.append("Business must be at least 1 year old for MSME loans.")
        else:
            positives.append(f"Business vintage of {ba} year(s) meets MSME lending criteria.")
        gst_threshold = 4000000
        if to >= gst_threshold and not gst:
            issues.append(
                f"Turnover Rs.{to:,} exceeds Rs.40L — GST filing is legally mandatory "
                f"and required for MSME loan approval."
            )
        elif to < gst_threshold:
            positives.append(
                f"Turnover Rs.{to:,} is below Rs.40L GST threshold — you may be GST-exempt."
            )
        if udyam:
            positives.append(
                "Udyam registration qualifies you for CGTMSE guarantee coverage (collateral-free loans), "
                "priority sector lending, and PSB Loans in 59 Minutes."
            )
        else:
            issues.append(
                "Udyam registration is FREE at udyamregistration.gov.in — while not mandatory for MUDRA, "
                "it unlocks CGTMSE guarantee cover and faster processing."
            )

    # Compile final reasons
    reasons.extend([f"✓ {p}" for p in positives])
    reasons.extend([f"✗ {i}" for i in issues])

    if not issues:
        reasons.append(
            f"All primary criteria satisfied. Approval probability: {prob_eligible}%. "
            f"Apply via Udyamimitra.in or your nearest PSB branch."
        )
    return reasons, issues


# ── Routes ────────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    feats, foir = build_features(data)
    feats_s = SCALER.transform(feats)

    pred  = MODEL.predict(feats_s)[0]
    proba = MODEL.predict_proba(feats_s)[0]

    eligible      = bool(pred)
    confidence    = round(float(max(proba)) * 100, 1)
    prob_eligible = round(float(proba[1]) * 100, 1)
    foir_pct      = round(foir * 100, 1)

    reasons, issues = build_reasons(data, eligible, prob_eligible, foir)

    return jsonify({
        "eligible":      eligible,
        "confidence":    confidence,
        "prob_eligible": prob_eligible,
        "foir":          foir_pct,
        "model":         "Gradient Boosting (GBM)",
        "metrics":       METRICS,
        "reasons":       reasons,
        "issues_count":  len(issues),
        "category":      data.get("category", "msme"),
        "note": (
            "MUDRA loans have NO official minimum CIBIL score requirement. "
            "Decisions are based on repayment capacity, business viability, and FOIR."
        )
    })

@app.route("/model_info", methods=["GET"])
def model_info():
    return jsonify({"metrics": METRICS, "model": "Gradient Boosting (GBM)"})

@app.route("/scheme_info", methods=["GET"])
def scheme_info():
    """Returns real-world scheme details for frontend reference."""
    return jsonify({
        "mudra": {
            "shishu":    {"min": 0,       "max": 50000,   "note": "Easiest to approve, no collateral"},
            "kishore":   {"min": 50001,   "max": 500000,  "note": "Moderate scrutiny"},
            "tarun":     {"min": 500001,  "max": 1000000, "note": "Higher scrutiny, ITR preferred"},
            "tarun_plus":{"min": 1000001, "max": 2000000, "note": "Only for prior Tarun repayers"},
        },
        "cibil_note": "No official CIBIL minimum under MUDRA scheme. Banks may internally prefer 650+.",
        "gst_note":   "GST mandatory only if turnover > Rs.40L (goods) or Rs.20L (services).",
        "dpiit_note": "DPIIT registration is FREE and recommended but NOT mandatory for MUDRA.",
        "udyam_note": "Udyam registration is FREE and unlocks CGTMSE cover. Not mandatory for MUDRA.",
        "foir_note":  "Fixed Obligation to Income Ratio should be under 50% for comfortable approval.",
        "apply_at":   ["https://www.udyamimitra.in", "https://www.mudra.org.in",
                       "https://www.startupindia.gov.in"],
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)
