# Kid's Kingdom — Digital Sign-In & Sign-Out Kiosk

A responsive, tablet-first attendance and digital signature web application built on **Google Apps Script**, **Google Sheets**, and **Google Drive**. Designed for **Kid's Kingdom (Pretoria International Christian Church)** to streamline Sunday morning child drop-off and pickup.

---

## ✨ Features

* **Dual Kiosk Modes:**
  * **Sign-In Kiosk (`Index.html`):** Captures Parent/Guardian details, Child details, and a touch/stylus digital signature.
  * **Sign-Out Kiosk (`SignOut.html`):** Dynamically fetches only children currently signed in for the current day, displaying touch-friendly selection tabs for rapid pickup verification.
* **HTML5 Canvas Signature Pad:** Smooth pointer-event drawing with automatic high-DPI scaling, PNG header validation, and base64 decoding.
* **Automated Google Workspace Backend:**
  * Saves signature images as `.png` files directly into a private Google Drive folder.
  * Logs timestamps (`Africa/Johannesburg`), attendance status (`Signed In` / `Signed Out`), and Drive file IDs to Google Sheets using `LockService` to prevent concurrent write collisions.
* **Kiosk Safety:** Built-in 60-second inactivity timer that automatically resets the form if left unattended.

---

## 📂 Project Structure

```text
├── Code.gs        # Google Apps Script backend (routing, validation, Sheets & Drive API)
├── Index.html     # Tablet Sign-In frontend UI
├── SignOut.html   # Tablet Sign-Out frontend UI
└── README.md      # Project documentation
```

---

## 🚀 Setup & Deployment Guide

### 1. Create the Google Sheet
Open Google Sheets and create a new blank spreadsheet.

Navigate to **Extensions > Apps Script**.

### 2. Add the Project Files
Copy the contents of `Code.gs` into the default `Code.gs` file in the Apps Script editor.

Click the **+** icon next to **Files > select HTML**, name it `Index` (creates `Index.html`), and paste the contents of `Index.html`.

Click the **+** icon next to **Files > select HTML**, name it `SignOut` (creates `SignOut.html`), and paste the contents of `SignOut.html`.

Save the project (**Ctrl + S**).

### 3. Initialize the Database
In the Apps Script top toolbar, select `setupDatabase` from the function dropdown and click **Run**.

Grant the necessary permissions when prompted.

This automatically creates the Attendance sheet tab, formats the columns (`Timestamp`, `ParentName`, `ParentPhone`, `ChildName`, `ChildAge`, `SignatureFileID`, `SignOutTimestamp`, `SignOutSignatureFileID`, `Status`), and creates the Kids Kingdom Signatures folder in your Google Drive.

### 4. Deploy as a Web App
Click **Deploy > New deployment**.

Select type: **Web app**.

Set **Execute as:** `Me`

Set **Who has access:** `Anyone` (or `Anyone with Google account` depending on your kiosk setup).

Click **Deploy** and copy your Web App URL.

---

## 🔗 Kiosk URLs

### Sign-In Kiosk:
```text
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

### Sign-Out Kiosk:
```text
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?page=signout
```

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3 (Custom Properties, Grid/Flexbox, SVG), Vanilla JavaScript, HTML5 Canvas API
* **Backend:** Google Apps Script (`HtmlService`, `SpreadsheetApp`, `DriveApp`, `PropertiesService`, `LockService`)
