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
 * DATA FETCHING & LIST MANAGEMENT
 */
function getMeeMeows(userEmail) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName("MasterList");
  const userSheet = ss.getSheetByName("UserData");
  const listsSheet = ss.getSheetByName("UserLists") || ss.insertSheet("UserLists");
  
  const masterData = masterSheet.getDataRange().getValues();
  
  let userData = [];
  let userLists = ["Collected"]; // Default base list
  
  if (userEmail) {
    const cleanEmail = userEmail.toLowerCase().trim();
    
    // Fetch user's catalog data
    const allUserData = userSheet.getDataRange().getValues();
    userData = allUserData.filter(row => row[0] && row[0].toString().toLowerCase() === cleanEmail);
    
    // Fetch custom lists
    const allLists = listsSheet.getDataRange().getValues();
    const customLists = allLists.filter(row => row[0] && row[0].toString().toLowerCase() === cleanEmail)
                                .map(row => row[1].toString().trim());
    
    // Combine unique lists
    userLists = [...new Set([...userLists, ...customLists])];
  }

  const cats = masterData.map((row, index) => {
    if (index === 0) return [...row, "UserForms"];
    
    let url = (row[5] || "").toString();
    if (url.includes("drive.google.com")) {
      url = url.replace("file/d/", "uc?export=view&id=").replace(/\/view.*$/, "");
    }
    
    // Map forms to their specific lists for this cat
    const myForms = {};
    if (userData.length > 0) {
        userData.forEach(uRow => {
            if (uRow[1].toString().trim() === row[0].toString().trim()) {
                const listName = uRow[2].toString().trim();
                const formName = uRow[3].toString().trim();
                if (!myForms[formName]) myForms[formName] = [];
                myForms[formName].push(listName);
            }
        });
    }
    
    return [row[0], row[1], row[2], row[3], row[4], url, myForms];
  });
  
  return { cats: cats, lists: userLists };
}

function updateCatLists(userEmail, meemeowId, form, listsToAdd, listsToRemove) {
  if (!userEmail) throw new Error("Login required! 🐾");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName("UserData");
  const listsSheet = ss.getSheetByName("UserLists") || ss.insertSheet("UserLists");
  const cleanEmail = userEmail.toLowerCase().trim();
  
  // 1. Handle New List Creation
  const allListsData = listsSheet.getDataRange().getValues();
  const existingUserLists = allListsData.filter(row => row[0].toString().toLowerCase() === cleanEmail)
                                        .map(row => row[1].toString().trim().toLowerCase());
  
  listsToAdd.forEach(list => {
    if (!existingUserLists.includes(list.toLowerCase())) {
       listsSheet.appendRow([cleanEmail, list.trim(), new Date()]);
       existingUserLists.push(list.toLowerCase());
    }
  });

  const data = userSheet.getDataRange().getValues();
  
  // 2. Remove Unchecked Lists
  if (listsToRemove.length > 0) {
    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][0].toString().toLowerCase() === cleanEmail && 
          data[i][1].toString() === meemeowId && 
          data[i][3].toString() === form) {
          
          if (listsToRemove.includes(data[i][2].toString().trim())) {
              userSheet.deleteRow(i + 1);
          }
      }
    }
  }
  
  // 3. Add Checked Lists (Verify it doesn't already exist to prevent dupes)
  const updatedData = userSheet.getDataRange().getValues(); 
  
  listsToAdd.forEach(list => {
    const exists = updatedData.some(row => 
        row[0].toString().toLowerCase() === cleanEmail && 
        row[1].toString() === meemeowId && 
        row[2].toString() === list && 
        row[3].toString() === form
    );
    if (!exists) {
        userSheet.appendRow([cleanEmail, meemeowId, list.trim(), form, new Date()]);
    }
  });
  
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