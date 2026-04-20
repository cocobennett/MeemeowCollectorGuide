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
  const userEmail = Session.getActiveUser().getEmail();
  
  // Get owned items as a combined string "Name|Form" for easy checking
  let ownedItems = [];
  try {
    const userData = userSheet.getDataRange().getValues();
    ownedItems = userData
      .filter(row => row[0] === userEmail)
      .map(row => row[1] + "|" + row[3]); // Name is index 1, Form is index 3
  } catch(e) {}

  const finalData = masterData.map((row, index) => {
    if (index === 0) return [...row, "OwnedForms"]; 
    
    let url = row[5];
    if (typeof url === 'string' && url.indexOf("drive.google.com") > -1) {
      url = url.replace("file/d/", "uc?export=view&id=").replace("/view?usp=sharing", "").replace("/view", "");
    }
    
    // Pass the list of owned forms for this specific cat back to the UI
    const myOwnedForms = ownedItems
      .filter(item => item.startsWith(row[0] + "|"))
      .map(item => item.split("|")[1]);

    return [row[0], row[1], row[2], row[3], row[4], url, myOwnedForms];
  });
  
  return finalData;
}

// Updated to accept the specific form
function toggleOwned(meemeowId, form) {
  const userEmail = Session.getActiveUser().getEmail();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("UserData");
  const now = new Date();
  sheet.appendRow([userEmail, meemeowId, "Owned", form, now]);
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
