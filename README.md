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
