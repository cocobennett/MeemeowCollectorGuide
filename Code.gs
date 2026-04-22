function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function doGet(e) {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * SECURE ACCOUNT SYSTEM
 */
function hashPassword(password, salt) {
  const combined = password + salt;
  const signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, combined);
  return signature.map(byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('');
}

function registerUser(email, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Accounts") || ss.insertSheet("Accounts");
  const cleanEmail = email.toLowerCase().trim();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === cleanEmail) throw new Error("This email is already registered! 🐾");
  }
  
  const salt = Utilities.getUuid(); 
  const hash = hashPassword(password, salt);
  sheet.appendRow([cleanEmail, hash, salt, new Date()]);
  return "Yay! Account created. Now you can Login! ✨";
}

function loginUser(email, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Accounts");
  if (!sheet) throw new Error("No accounts found. Please register first!");
  
  const data = sheet.getDataRange().getValues();
  const cleanEmail = email.toLowerCase().trim();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === cleanEmail) {
      if (hashPassword(password, data[i][2]) === data[i][1]) {
        return { email: cleanEmail, name: cleanEmail.split('@')[0] };
      }
    }
  }
  throw new Error("Invalid email or password. 🐾");
}

/**
 * DATA FETCHING
 */
function getMeeMeows(userEmail) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName("MasterList");
  const userSheet = ss.getSheetByName("UserData");
  const masterData = masterSheet.getDataRange().getValues();
  
  let ownedItems = [];
  if (userEmail) {
    const userData = userSheet.getDataRange().getValues();
    ownedItems = userData
      .filter(row => row[0] && row[0].toString().toLowerCase() === userEmail.toLowerCase())
      .map(row => row[1].toString().trim() + "|" + row[3].toString().trim());
  }

  return masterData.map((row, index) => {
    if (index === 0) return [...row, "OwnedForms"];
    let url = (row[5] || "").toString();
    if (url.includes("drive.google.com")) {
      url = url.replace("file/d/", "uc?export=view&id=").replace(/\/view.*$/, "");
    }
    const myOwnedForms = ownedItems
      .filter(item => item.startsWith(row[0] + "|"))
      .map(item => item.split("|")[1]);
    return [row[0], row[1], row[2], row[3], row[4], url, myOwnedForms];
  });
}

function toggleOwned(userEmail, meemeowId, form) {
  if (!userEmail) throw new Error("Login required! 🐾");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName("UserData");
  userSheet.appendRow([userEmail, meemeowId, "Owned", form, new Date()]);
  return true;
}

function sendContactEmail(userEmail, description) {
  MailApp.sendEmail({
    to: "cocoscreations1130@gmail.com",
    subject: "🐾 MeeMeow Tracker Feedback",
    body: `From: ${userEmail}\nMessage: ${description}`,
    replyTo: userEmail
  });
}