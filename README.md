# SME Loan Eligibility — ML Predictor

A mini ML project using Flask (Python backend) and HTML/CSS/JS (frontend) to predict SME loan eligibility across 5 borrower types using 4 machine learning models.

## Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Frontend  | HTML5, CSS3, Vanilla JavaScript                 |
| Backend   | Python Flask                                    |
| ML Models | Scikit-learn (Random Forest, Decision Tree, Logistic Regression, Gradient Boosting) |
| Data      | Synthetically generated dataset (2000 samples)  |

## ML Models Used

1. **Random Forest** — Ensemble of decision trees, best overall accuracy
2. **Decision Tree** — Simple interpretable tree-based classifier
3. **Logistic Regression** — Linear classifier with probability output
4. **Gradient Boosting** — Sequential boosting for high accuracy

## Borrower Categories

- 🌾 **Farmer / Agri** — KCC, NABARD-style loans
- 🚀 **Startup** — MUDRA, DPIIT/Startup India
- 🏢 **Existing Business** — PSB, working capital loans
- 👩 **Women Entrepreneur** — Stree Shakti, Annapurna
- 🏭 **Micro / MSME** — Udyam-registered, PMEGP

## Features Used in Model

| Feature       | Type    | Description                        |
|---------------|---------|------------------------------------|
| age           | int     | Applicant age                      |
| cibil         | int     | Credit score (300–900)             |
| income        | int     | Annual income in ₹                 |
| loan_amount   | int     | Requested loan in ₹                |
| business_age  | int     | Years in business                  |
| land_owned    | 0/1     | Owns agricultural land             |
| gst_filed     | 0/1     | GST returns filed                  |
| udyam_reg     | 0/1     | Udyam registration done            |
| dpiit_reg     | 0/1     | DPIIT / Startup India registered   |
| shg_member    | 0/1     | SHG membership                     |
| women_owned   | 0/1     | Women own ≥51%                     |
| turnover      | int     | Annual turnover in ₹               |
| itr_filed     | 0/1     | ITR filed                          |
| existing_loan | 0/1     | Active loan exists                 |
| category      | int     | Borrower type (0–4)                |

## How to Run

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Start the Flask server
python app.py

# 3. Open browser
# http://localhost:5000
```

## API Endpoint

**POST /predict**
```json
{
  "category": "farmer",
  "model": "Random Forest",
  "age": 35,
  "cibil": 720,
  "income": 600000,
  "loan_amount": 300000,
  "land_owned": 1
}
```

**Response:**
```json
{
  "eligible": true,
  "confidence": 91.4,
  "model": "Random Forest",
  "accuracy": 93.5,
  "reasons": ["All primary eligibility criteria met.", "CIBIL score 720 is satisfactory."],
  "all_accuracies": {
    "Random Forest": 93.5,
    "Decision Tree": 89.2,
    "Logistic Regression": 85.1,
    "Gradient Boosting": 92.8
  }
}
```

## Project Structure

```
sme_loan_project/
├── app.py                  # Flask app + ML model training
├── requirements.txt
├── README.md
├── templates/
│   └── index.html          # Main UI page
└── static/
    ├── css/
    │   └── style.css       # Styling
    └── js/
        └── main.js         # Frontend logic
```
