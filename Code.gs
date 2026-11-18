const CONFIG = {
  SHEET_NAME: "Attendance",
  SIGNATURE_FOLDER: "Kids Kingdom Signatures",
  TIMEZONE: "Africa/Johannesburg",
  MAX_SIGNATURE_SIZE: 500000,
  MAX_NAME_LENGTH: 100,
  MAX_PHONE_LENGTH: 25,
  MAX_CHILD_AGE: 9
};

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

function doGet(e) {
  const page = e && e.parameter && e.parameter.page;
  
  if (page === "signout") {
    return HtmlService
      .createHtmlOutputFromFile("SignOut")
      .addMetaTag("viewport", "width=device-width, initial-scale=1")
      .setTitle("Kid's Kingdom - Sign Out");
  }

  if (page === "dashboard") {
    return HtmlService
      .createHtmlOutputFromFile("Dashboard")
      .addMetaTag("viewport", "width=device-width, initial-scale=1")
      .setTitle("Kid's Kingdom - Teacher Dashboard");
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

function submitAttendance(data) {
  const lock = LockService.getScriptLock();
  let signatureFile = null;

  try {
    lock.waitLock(15000);
    if (!data) throw new Error("No data received.");

    const parentName = String(data.parentName || "").trim();
    const parentPhone = String(data.parentPhone || "").trim();

    if (!parentName || !parentPhone) {
      throw new Error("Please enter parent/guardian details.");
    }

    if (parentName.length > CONFIG.MAX_NAME_LENGTH) {
      throw new Error("Parent name is too long.");
    }

    if (parentPhone.length > CONFIG.MAX_PHONE_LENGTH || !/^[0-9+()\-\s]+$/.test(parentPhone)) {
      throw new Error("Please enter a valid phone number.");
    }

    const rawChildren = Array.isArray(data.children) ? data.children : [];
    if (rawChildren.length === 0) {
      throw new Error("Please add at least one child.");
    }

    const validatedChildren = rawChildren.map(function(child, idx) {
      const cName = String(child.childName || "").trim();
      const cAgeStr = String(child.childAge ?? "").trim();
      const cAge = Number(cAgeStr);

      if (!cName || cAgeStr === "" || isNaN(cAge)) {
        throw new Error("Please complete all details for Child #" + (idx + 1) + ".");
      }
      if (cName.length > CONFIG.MAX_NAME_LENGTH) {
        throw new Error("Name for Child #" + (idx + 1) + " is too long.");
      }
      if (!Number.isInteger(cAge) || cAge < 0 || cAge > CONFIG.MAX_CHILD_AGE) {
        throw new Error("Please enter a valid age (0-" + CONFIG.MAX_CHILD_AGE + ") for " + cName + ".");
      }
      return { childName: cName, childAge: cAge };
    });

    const bytes = validateSignature(data.signature);
    const folder = getSignatureFolder();
    
    signatureFile = folder.createFile(
      Utilities.newBlob(bytes, "image/png", "signin_" + Utilities.getUuid() + ".png")
    );

    const sigId = signatureFile.getId();
    const timestamp = new Date();
    const sheet = getDatabaseSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
    
    validatedChildren.forEach(function(child) {
      sheet.appendRow([
        timestamp,
        parentName,
        parentPhone,
        child.childName,
        child.childAge,
        sigId,
        "",
        "",
        "Signed In"
      ]);
    });

    SpreadsheetApp.flush();
    return {
      success: true,
      count: validatedChildren.length,
      message: "Signed in successfully!"
    };

  } catch (error) {
    if (signatureFile) try { signatureFile.setTrashed(true); } catch(e){}
    throw new Error(error.message || "Submission failed.");
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function getSignedInsToday() {
  const sheet = getDatabaseSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  const todayStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd");
  
  const activeChildren = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const timestamp = row[0];
    const status = row[8];

    if (timestamp) {
      const rowDateStr = Utilities.formatDate(new Date(timestamp), CONFIG.TIMEZONE, "yyyy-MM-dd");
      if (rowDateStr === todayStr && status === "Signed In") {
        activeChildren.push({
          rowIndex: i + 1,
          childName: row[3],
          parentName: row[1],
          parentPhone: row[2]
        });
      }
    }
  }

  return activeChildren;
}

function processSignOut(data) {
  const lock = LockService.getScriptLock();
  let signatureFile = null;

  try {
    lock.waitLock(15000);
    if (!data) throw new Error("Invalid sign-out request.");

    const rawIndices = Array.isArray(data.rowIndices)
      ? data.rowIndices
      : (data.rowIndex ? [data.rowIndex] : []);

    if (rawIndices.length === 0) {
      throw new Error("Please select at least one child to sign out.");
    }

    const bytes = validateSignature(data.signature);
    const folder = getSignatureFolder();

    signatureFile = folder.createFile(
      Utilities.newBlob(bytes, "image/png", "signout_" + Utilities.getUuid() + ".png")
    );

    const sigId = signatureFile.getId();
    const now = new Date();
    const sheet = getDatabaseSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);

    rawIndices.forEach(function(idx) {
      const rowIndex = Number(idx);
      if (rowIndex > 1) {
        sheet.getRange(rowIndex, 7, 1, 3).setValues([[now, sigId, "Signed Out"]]);
      }
    });

    SpreadsheetApp.flush();
    return {
      success: true,
      count: rawIndices.length,
      message: "Signed out successfully!"
    };

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

function getDashboardData() {
  const sheet = getDatabaseSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  const todayStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd");

  const currentlyIn = [];
  const checkedOut = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const timestamp = row[0];
    const status = row[8];

    if (timestamp) {
      const rowDateStr = Utilities.formatDate(new Date(timestamp), CONFIG.TIMEZONE, "yyyy-MM-dd");
      
      if (rowDateStr === todayStr) {
        const record = {
          childName: row[3],
          childAge: row[4],
          parentName: row[1],
          parentPhone: row[2],
          signInTime: Utilities.formatDate(new Date(timestamp), CONFIG.TIMEZONE, "HH:mm"),
          signOutTime: row[6] ? Utilities.formatDate(new Date(row[6]), CONFIG.TIMEZONE, "HH:mm") : "—"
        };

        if (status === "Signed In") {
          currentlyIn.push(record);
        } else {
          checkedOut.push(record);
        }
      }
    }
  }

  return {
    date: Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "EEEE, MMMM d, yyyy"),
    currentlyIn: currentlyIn,
    checkedOut: checkedOut
  };
}
