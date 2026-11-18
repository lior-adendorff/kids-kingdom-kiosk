const CONFIG = {
  SHEET_NAME: "Attendance",
  SIGNATURE_FOLDER: "Kids Kingdom Signatures",
  TIMEZONE: "Africa/Johannesburg",
  MAX_SIGNATURE_SIZE: 500000,
  MAX_NAME_LENGTH: 100,
  MAX_PHONE_LENGTH: 25,
  MAX_CHILD_AGE: 18
};

/**
 * Run this function once from the Apps Script editor to set up headers.
 */
function setupDatabase() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error(
      "Could not find the spreadsheet. Open Apps Script from your Google Sheet."
    );
  }

  PropertiesService.getScriptProperties().setProperty(
    "SPREADSHEET_ID",
    spreadsheet.getId()
  );

  spreadsheet.setSpreadsheetTimeZone(CONFIG.TIMEZONE);

  let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAME);
  }

  const headers = [
    "Timestamp",
    "ParentName",
    "ParentPhone",
    "ChildName",
    "ChildAge",
    "SignatureFileID",
    "SignOutTimestamp",
    "SignOutSignatureFileID",
    "Status"
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  sheet.getRange("A:A").setNumberFormat("dd/MM/yyyy HH:mm:ss");
  sheet.getRange("G:G").setNumberFormat("dd/MM/yyyy HH:mm:ss");

  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 180);
  sheet.setColumnWidth(3, 140);
  sheet.setColumnWidth(4, 180);
  sheet.setColumnWidth(5, 90);
  sheet.setColumnWidth(6, 220);
  sheet.setColumnWidth(7, 160);
  sheet.setColumnWidth(8, 220);
  sheet.setColumnWidth(9, 120);

  getSignatureFolder();

  return "Setup completed successfully!";
}

function getDatabaseSpreadsheet() {
  const spreadsheetId = PropertiesService
    .getScriptProperties()
    .getProperty("SPREADSHEET_ID");

  if (!spreadsheetId) {
    throw new Error("Database not configured. Run setupDatabase() first.");
  }

  return SpreadsheetApp.openById(spreadsheetId);
}

function getSignatureFolder() {
  const properties = PropertiesService.getScriptProperties();
  const folderId = properties.getProperty("SIGNATURE_FOLDER_ID");

  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (error) {}
  }

  const folder = DriveApp.createFolder(CONFIG.SIGNATURE_FOLDER);
  properties.setProperty("SIGNATURE_FOLDER_ID", folder.getId());
  return folder;
}

/**
 * Routes requests: ?page=signout loads SignOut.html, otherwise Index.html
 */
function doGet(e) {
  const page = e && e.parameter && e.parameter.page;
  
  if (page === "signout") {
    return HtmlService
      .createHtmlOutputFromFile("SignOut")
      .addMetaTag("viewport", "width=device-width, initial-scale=1")
      .setTitle("Kid's Kingdom - Sign Out");
  }

  return HtmlService
    .createHtmlOutputFromFile("Index")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setTitle("Kid's Kingdom - Sign In");
}

function validateSignature(signature) {
  const sigString = String(signature || "");
  const match = sigString.match(/^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/);

  if (!match) throw new Error("The signature image is invalid.");
  if (sigString.length > CONFIG.MAX_SIGNATURE_SIZE) throw new Error("The signature image is too large.");

  let bytes;
  try {
    bytes = Utilities.base64Decode(match[1]);
  } catch (error) {
    throw new Error("The signature image could not be read.");
  }

  if (bytes.length < 8) throw new Error("The signature image is invalid.");
  
  const pngHeader = [137, 80, 78, 71, 13, 10, 26, 10];
  const isValidPng = pngHeader.every((val, idx) => (bytes[idx] & 0xFF) === val);
  if (!isValidPng) throw new Error("The signature image is invalid.");

  return bytes;
}

/**
 * Validates and records sign-in data.
 */
function submitAttendance(data) {
  const lock = LockService.getScriptLock();
  let signatureFile = null;

  try {
    lock.waitLock(15000);
    if (!data) throw new Error("No data received.");

    const parentName = String(data.parentName || "").trim();
    const parentPhone = String(data.parentPhone || "").trim();
    const childName = String(data.childName || "").trim();
    const childAge = Number(data.childAge);

    if (!parentName || !parentPhone || !childName ||isNaN(childAge)) {
      throw new Error("Please complete all required fields.");
    }

    const bytes = validateSignature(data.signature);
    const folder = getSignatureFolder();
    
    signatureFile = folder.createFile(
      Utilities.newBlob(bytes, "image/png", "signin_" + Utilities.getUuid() + ".png")
    );

    const sheet = getDatabaseSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
    
    sheet.appendRow([
      new Date(),
      parentName,
      parentPhone,
      childName,
      childAge,
      signatureFile.getId(),
      "",
      "",
      "Signed In"
    ]);

    SpreadsheetApp.flush();
    return { success: true, message: "Signed in successfully!" };

  } catch (error) {
    if (signatureFile) try { signatureFile.setTrashed(true); } catch(e){}
    throw new Error(error.message || "Submission failed.");
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

/**
 * Returns a list of children signed in today who haven't been signed out yet.
 */
function getSignedInsToday() {
  const sheet = getDatabaseSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  const todayStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd");
  
  const activeChildren = [];

  // Skip header row (index 0)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const timestamp = row[0];
    const status = row[8]; // Column I

    if (timestamp) {
      const rowDateStr = Utilities.formatDate(new Date(timestamp), CONFIG.TIMEZONE, "yyyy-MM-dd");
      if (rowDateStr === todayStr && status === "Signed In") {
        activeChildren.push({
          rowIndex: i + 1, // 1-based sheet row index
          childName: row[3],
          parentName: row[1],
          parentPhone: row[2]
        });
      }
    }
  }

  return activeChildren;
}

/**
 * Processes the sign-out action for a selected child.
 */
function processSignOut(data) {
  const lock = LockService.getScriptLock();
  let signatureFile = null;

  try {
    lock.waitLock(15000);
    if (!data || !data.rowIndex) throw new Error("Invalid sign-out request.");

    const bytes = validateSignature(data.signature);
    const folder = getSignatureFolder();

    signatureFile = folder.createFile(
      Utilities.newBlob(bytes, "image/png", "signout_" + Utilities.getUuid() + ".png")
    );

    const sheet = getDatabaseSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
    const rowIndex = Number(data.rowIndex);

    // Update columns G (SignOutTimestamp), H (SignOutSignatureFileID), I (Status)
    sheet.getRange(rowIndex, 7).setValue(new Date());
    sheet.getRange(rowIndex, 8).setValue(signatureFile.getId());
    sheet.getRange(rowIndex, 9).setValue("Signed Out");

    SpreadsheetApp.flush();
    return { success: true, message: "Child signed out successfully!" };

  } catch (error) {
    if (signatureFile) try { signatureFile.setTrashed(true); } catch(e){}
    throw new Error(error.message || "Sign-out failed.");
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function testConnection() {
  const spreadsheet = getDatabaseSpreadsheet();
  const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
  return { success: true, worksheet: sheet.getName(), message: "Connection successful!" };
}
