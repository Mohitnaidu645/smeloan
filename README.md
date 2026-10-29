# SME Loan Eligibility Checker

A Flask application that estimates SME loan eligibility for five applicant categories. It combines a Gradient Boosting classifier with rule-based reasons and suggested next steps. The result is an informational estimate, not a lender approval.

## Features

- Eligibility verdict, estimated approval probability, FOIR, assessment reasons, and suggested next steps.
- PDF report download. Before export, enter the report owner, date, and optional personal notes.
- English and Hindi interface options.
- Light and dark themes, remembered in the browser.
- JSON validation and readable errors for invalid prediction and report requests.

## Requirements

The dependency versions in `requirements.txt` have been installed and tested with Python 3.14.2. Create and activate a virtual environment before installing them.

```bash
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
python -m pip install -r requirements.txt
python app.py
```

Open <http://localhost:5000>.

## Project Layout

```text
smeloan-main/
├── app.py                  # Flask routes, synthetic data, model and PDF generation
├── requirements.txt        # Runtime dependencies
├── README.md
├── templates/
│   └── index.html          # Eligibility form, result and report dialog
└── static/
    ├── css/
    │   └── style.css       # Responsive layout and theme variables
    └── js/
        └── main.js         # Form, result rendering, preferences and PDF download
```

## Endpoints

### `POST /predict`

Accepts JSON with `category` (`farmer`, `startup`, `existing`, `women`, or `msme`), `age`, `cibil`, `income`, and `loan_amount`. Category-specific details such as `land_owned`, `dpiit_reg`, `business_age`, `turnover`, `gst_filed`, `udyam_reg`, `women_owned`, and `existing_loan` are optional integer values or flags.

Returns a JSON eligibility result with the model, probability, reasons, and metrics. Invalid input returns a JSON error with HTTP 400.

### `POST /report`

Accepts the report owner's `name`, ISO-format `date`, optional `notes`, the `application` details, and the `result` returned by `/predict`. Returns an `application/pdf` attachment. Invalid report data returns a JSON error.

## Important

The model is trained at application startup on synthetic data. Its output is for demonstration and screening only; real eligibility, terms, and approval are determined by the lender. Do not treat the estimated probability as a guarantee.
