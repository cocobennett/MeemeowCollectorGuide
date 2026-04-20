// 1. Keep the include function at the top level so it's always accessible
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
      .getContent();
}

function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  
  // Try to get the user's email
  // Note: This only works if they've authorized the app!
  const userEmail = Session.getActiveUser().getEmail();
  
  let firstName = "Guest";
  let isLoggedIn = false;

  if (userEmail) {
    isLoggedIn = true;
    try {
      const me = People.People.get('people/me', {personFields: 'names'});
      firstName = me.names[0].givenName;
    } catch (err) {
      firstName = userEmail.split('@')[0];
    }
  }

  template.userName = firstName;
  template.isLoggedIn = isLoggedIn;
  
  // This helps the login link work correctly
  template.loginUrl = ScriptApp.getService().getUrl();

  return template.evaluate()
      .setTitle(firstName + "'s MeeMeow Tracker")
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ... keep your getMeeMeows and toggleOwned functions below ...

function getMeeMeows() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName("MasterList");
  const userSheet = ss.getSheetByName("UserData");
  
  const masterData = masterSheet.getDataRange().getValues();
  const userEmail = Session.getActiveUser().getEmail().toLowerCase().trim();
  
  let ownedItems = [];
  try {
    const userData = userSheet.getDataRange().getValues();
    // 1. Better filter: handle empty emails and trim whitespace
    // Inside getMeeMeows in Code.gs
ownedItems = userData
  .filter(row => {
    const rowEmail = row[0] ? row[0].toString().toLowerCase().trim() : "";
    return userEmail !== "" && rowEmail === userEmail;
  })
  .map(row => {
    // We combine Name (index 1) and Form (index 3)
    // .toString().trim() ensures "6 plush" stays consistent
    return row[1].toString().trim() + "|" + row[3].toString().trim();
  });
  } catch(e) {
    console.log("Error fetching user data: " + e);
  }

  const finalData = masterData.map((row, index) => {
    if (index === 0) return [...row, "OwnedForms"]; 
    
    let catName = row[0]; // The name of the cat from MasterList
    let url = row[5];
    
    if (typeof url === 'string' && url.indexOf("drive.google.com") > -1) {
      url = url.replace("file/d/", "uc?export=view&id=").replace("/view?usp=sharing", "").replace("/view", "");
    }
    
    // 2. Match based on the catName collected above
    const myOwnedFormsForThisCat = ownedItems
      .filter(item => item.startsWith(catName + "|"))
      .map(item => item.split("|")[1]);

    return [row[0], row[1], row[2], row[3], row[4], url, myOwnedFormsForThisCat];
  });
  
  return finalData;
}

function toggleOwned(meemeowId, form) {
  const userEmail = Session.getActiveUser().getEmail();
  
  // If no email, we can't save! 
  if (!userEmail || userEmail === "") {
    throw new Error("You must be logged in to save your collection! 🐾");
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName("UserData");
  const now = new Date();
  
  // Add the row to your Google Sheet
  userSheet.appendRow([userEmail, meemeowId, "Owned", form, now]);
  
  return true; // Tell the UI it worked!
}

// Add this to the bottom of Code.gs
function sendContactEmail(userEmail, description) {
  const myEmail = "cocoscreations1130@gmail.com";
  const subject = "🐾 MeeMeow Tracker Feedback";
  
  const body = `
    New message from your MeeMeow Tracker!
    
    From: ${userEmail}
    Message: ${description}
  `;
  
  MailApp.sendEmail({
    to: myEmail,
    subject: subject,
    body: body,
    replyTo: userEmail 
  });
}
