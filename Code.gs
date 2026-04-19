function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Coco\'s MeeMeow Tracker')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getMeeMeows() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName("MasterList");
  const userSheet = ss.getSheetByName("UserData");
  
  const masterData = masterSheet.getDataRange().getValues();
  const userEmail = Session.getActiveUser().getEmail();
  
  // 1. Get all names the current user has already collected
  let ownedNames = [];
  try {
    const userData = userSheet.getDataRange().getValues();
    ownedNames = userData
      .filter(row => row[0] === userEmail)
      .map(row => row[1]); // Assuming Name is in the second column of UserData
  } catch(e) { /* Sheet might be empty, that's okay! */ }

  // 2. Clean links and add the "IsOwned" flag to the data
  const finalData = masterData.map((row, index) => {
    if (index === 0) return [...row, "IsOwned"]; // Header
    
    // Fix Drive links (Column F / Index 5)
    let url = row[5];
    if (typeof url === 'string' && url.indexOf("drive.google.com") > -1) {
      url = url.replace("file/d/", "uc?export=view&id=").replace("/view?usp=sharing", "").replace("/view", "");
    }
    
    // Check if this specific cat name is in our "owned" list
    const isOwned = ownedNames.includes(row[0]);
    return [row[0], row[1], row[2], row[3], row[4], url, isOwned];
  });
  
  return finalData;
}

// Function to save a user's choice
function toggleOwned(meemeowId) {
  var userEmail = Session.getActiveUser().getEmail();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("UserData");
  sheet.appendRow([userEmail, meemeowId, "Owned"]);
}

// Helper function to include other files (CSS/JS)
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
      .getContent();
}

function doGet() {
  const template = HtmlService.createTemplateFromFile('Index');
  
  let firstName = "My"; // Default fallback
  
  try {
    // This fetches the "Given Name" from the user's Google Profile
    const me = People.People.get('people/me', {personFields: 'names'});
    firstName = me.names[0].givenName;
  } catch (e) {
    // If the People API isn't enabled or fails, we use the first part of their email
    const email = Session.getActiveUser().getEmail();
    firstName = email.split('@')[0];
    firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  }

  // Pass the name into the HTML template
  template.userName = firstName;

  return template.evaluate()
    .setTitle(firstName + "'s MeeMeow Tracker")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
