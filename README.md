# Kid's Kingdom — Digital Sign-In, Sign-Out & Teacher Dashboard

A responsive, tablet-first attendance, digital signature, and classroom management web application built on **Google Apps Script**, **Google Sheets**, and **Google Drive**. Designed for **Kid's Kingdom (Pretoria International Christian Church)** to streamline Sunday morning child drop-off, pickup, and live classroom allocation.

---

## ✨ Features

* **Three Dedicated Interfaces:**
  * **Sign-In Kiosk (`Index.html`):** Captures Parent/Guardian details, supports adding **multiple children** in a single submission, and records one touch/stylus digital signature applied across all siblings.
  * **Sign-Out Kiosk (`SignOut.html`):** Dynamically fetches only children currently signed in for the day, allowing parents to tap **multiple child tabs** and sign once to complete pickup.
  * **Teacher Dashboard (`Dashboard.html`):** Live auto-refreshing overview showing headcount stats, emergency contact badges, and automatic **Classroom Breakdown cards** sorted by customizable age ranges (`Infants: 0-3 yrs`, `Toddlers: 4-6 yrs`, `Children: 7-9 yrs`).
* **HTML5 Canvas Signature Pad:** Smooth pointer-event drawing with automatic high-DPI scaling, PNG header validation, and base64 decoding.
* **Automated Google Workspace Backend:**
  * Saves sign-in and sign-out signature images as `.png` files directly into a private Google Drive folder.
  * Logs timestamps (`Africa/Johannesburg`), attendance status (`Signed In` / `Signed Out`), and Drive file IDs to Google Sheets using `LockService` to prevent concurrent write collisions.
* **Kiosk Safety:** Built-in 60-second inactivity timer on the Sign-In and Sign-Out kiosks that automatically resets the form if left unattended.

---

## 📂 Project Structure

```text
├── Code.gs          # Google Apps Script backend (routing, validation, Sheets & Drive API)
├── Index.html       # Tablet Sign-In frontend UI (supports multiple children)
├── SignOut.html     # Tablet Sign-Out frontend UI (supports multi-select pickup)
├── Dashboard.html   # Live Teacher Dashboard with age-grouped classroom rosters
└── README.md        # Project documentation
```

---

## 🚀 Setup & Deployment Guide

### 1. Create the Google Sheet
1. Open [Google Sheets](https://sheets.google.com) and create a new blank spreadsheet.
2. Navigate to **Extensions > Apps Script**.

### 2. Add the Project Files
1. Copy the contents of `Code.gs` into the default `Code.gs` file in the Apps Script editor.
2. Click the **+** icon next to **Files** > select **HTML**, name it `Index` (creates `Index.html`), and paste the contents of `Index.html`.
3. Click the **+** icon next to **Files** > select **HTML**, name it `SignOut` (creates `SignOut.html`), and paste the contents of `SignOut.html`.
4. Click the **+** icon next to **Files** > select **HTML**, name it `Dashboard` (creates `Dashboard.html`), and paste the contents of `Dashboard.html`.
5. Save the project (**Ctrl + S**).

### 3. Initialize the Database
1. In the Apps Script top toolbar, select `setupDatabase` from the function dropdown and click **Run**.
2. Grant the necessary permissions when prompted.
3. This automatically creates the `Attendance` sheet tab, formats the columns (`Timestamp`, `ParentName`, `ParentPhone`, `ChildName`, `ChildAge`, `SignatureFileID`, `SignOutTimestamp`, `SignOutSignatureFileID`, `Status`), and creates the `Kids Kingdom Signatures` folder in your Google Drive.

### 4. Customize Classroom Age Ranges (Optional)
In `Dashboard.html` (around line 345 inside the `<script>` tag), you can customize the class names and age brackets at any time:

```javascript
const CLASSES_CONFIG = [
  { name: "Infants", minAge: 0, maxAge: 3 },
  { name: "Toddlers", minAge: 4, maxAge: 6 },
  { name: "Children", minAge: 7, maxAge: 9 }
];
```

### 5. Deploy as a Web App
1. Click **Deploy > New deployment**.
2. Select type: **Web app**.
3. Set **Execute as:** `Me`
4. Set **Who has access:** `Anyone` (or `Anyone with Google account` depending on your kiosk setup).
5. Click **Deploy** and copy your Web App URL.

---

## 🔗 Application URLs

* **Sign-In Kiosk:**
  ```text
  [https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec](https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec)
  ```
* **Sign-Out Kiosk:**
  ```text
  [https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?page=signout](https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?page=signout)
  ```
* **Teacher Dashboard:**
  ```text
  [https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?page=dashboard](https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?page=dashboard)
  ```

---

## 🛠️ Tech Stack
* **Frontend:** HTML5, CSS3 (Custom Properties, Grid/Flexbox, SVG), Vanilla JavaScript, HTML5 Canvas API
* **Backend:** Google Apps Script (`HtmlService`, `SpreadsheetApp`, `DriveApp`, `PropertiesService`, `LockService`)
