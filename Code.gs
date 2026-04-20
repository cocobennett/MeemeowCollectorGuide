// 1. Keep the include function at the top level so it's always accessible
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
      .getContent();
}

// 2. Use ONE combined doGet function
function doGet() {
  const template = HtmlService.createTemplateFromFile('Index');
  
  let firstName = "My"; 
  
  try {
    // Fills the "Given Name" from Google Profile
    const me = People.People.get('people/me', {personFields: 'names'});
    firstName = me.names[0].givenName;
  } catch (e) {
    const email = Session.getActiveUser().getEmail();
    firstName = email.split('@')[0];
    firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  }

  // Pass variables to the HTML template
  template.userName = firstName;

  return template.evaluate()
    .setTitle(firstName + "'s MeeMeow Tracker")
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
