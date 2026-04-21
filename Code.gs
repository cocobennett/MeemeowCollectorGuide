// 1. Keep the include function at the top level so it's always accessible
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
      .getContent();
}

function doGet(e) {
  const service = getOAuthService();
  const template = HtmlService.createTemplateFromFile('Index');
  
  // 1. Get the current URL
  const currentUrl = ScriptApp.getService().getUrl();
  
  // 2. Save it to UserProperties manually (this is safe and won't expire)
  PropertiesService.getUserProperties().setProperty('last_tracker_url', currentUrl);
  
  let firstName = "Guest";
  let isLoggedIn = false;

  if (service.hasAccess()) {
    try {
      const response = UrlFetchApp.fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: 'Bearer ' + service.getAccessToken() }
      });
      const user = JSON.parse(response.getContentText());
      firstName = user.given_name || user.email.split('@')[0];
      isLoggedIn = true;
    } catch (err) {
      isLoggedIn = true;
    }
  }

  template.userName = firstName;
  template.isLoggedIn = isLoggedIn;
  template.loginUrl = service.getAuthorizationUrl(); // No manual state here!

  return template.evaluate()
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// This is the "Engine" that manages the login
function getOAuthService() {
  return OAuth2.createService('MeeMeow')
      .setAuthorizationBaseUrl('https://accounts.google.com/o/oauth2/auth')
      .setTokenUrl('https://accounts.google.com/o/oauth2/token')
      .setClientId('506773740918-8lcb5s2g46m0pv9u2uq6mp2uvh09dcie.apps.googleusercontent.com')
      .setClientSecret('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')
      .setCallbackFunction('authCallback')
      .setPropertyStore(PropertiesService.getUserProperties())
      .setScope('https://www.googleapis.com/auth/userinfo.email');
}

function authCallback(request) {
  const service = getOAuthService();
  const authorized = service.handleCallback(request);
  
  if (authorized) {
    const url = PropertiesService.getUserProperties().getProperty('last_tracker_url') || 
                ScriptApp.getService().getUrl().replace('/usercallback', '/exec');
    
    return HtmlService.createHtmlOutput(`
    <div style="
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
          height: 80vh; 
          font-family: 'Comic Sans MS', cursive; 
          background-color: #FFC0CB; 
          text-align: center;
          padding: 20px;">
          <div style="background: white; padding: 30px; border-radius: 20px; border: 4px solid #B0E0E6;">
            <h2 style="color: #555;">Yay! You're logged in! 🐾</h2>
            <a href="${url}" target="_top" style="
              display: inline-block;
              margin-top: 20px;
              padding: 12px 25px;
              background-color: #B0E0E6;
              color: white;
              text-decoration: none;
              border-radius: 25px;
              font-weight: bold;
              box-shadow: 0 4px #88d0d9;">
              Go to My Tracker ✨
            </a>
          </div>
        </div>
    `);
  } else {
    return HtmlService.createHtmlOutput('Access Denied. 😿');
  }
}

function getMeeMeows() {
  const service = getOAuthService();
  let userEmail = "";
  
  // 1. Safely try to get the email
  if (service.hasAccess()) {
    try {
      const response = UrlFetchApp.fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: 'Bearer ' + service.getAccessToken() }
      });
      userEmail = JSON.parse(response.getContentText()).email.toLowerCase().trim();
    } catch (e) {
      console.log("Could not get user email: " + e);
      // If API fails, we just continue with userEmail = ""
    }
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName("MasterList");
  const userSheet = ss.getSheetByName("UserData");
  
  // 2. Fetch the data regardless of login status
  const masterData = masterSheet.getDataRange().getValues();
  let ownedItems = [];

  if (userEmail !== "") {
    try {
      const userData = userSheet.getDataRange().getValues();
      ownedItems = userData
        .filter(row => {
          const rowEmail = row[0] ? row[0].toString().toLowerCase().trim() : "";
          return rowEmail === userEmail;
        })
        .map(row => row[1].toString().trim() + "|" + row[3].toString().trim());
    } catch(e) {
      console.log("Error fetching user data: " + e);
    }
  }

  // 3. Map the data for the UI
  const finalData = masterData.map((row, index) => {
    if (index === 0) return [...row, "OwnedForms"]; 
    
    let catName = row[0];
    let url = row[5] || "";
    
    if (typeof url === 'string' && url.indexOf("drive.google.com") > -1) {
      url = url.replace("file/d/", "uc?export=view&id=").replace("/view?usp=sharing", "").replace("/view", "");
    }
    
    const myOwnedFormsForThisCat = ownedItems
      .filter(item => item.startsWith(catName + "|"))
      .map(item => item.split("|")[1]);

    return [row[0], row[1], row[2], row[3], row[4], url, myOwnedFormsForThisCat];
  });

  return finalData; // This will now never be null
}

function toggleOwned(meemeowId, form) {
  const service = getOAuthService();
  
  // 1. Get the email from the OAuth service, not the Session
  if (!service.hasAccess()) {
    throw new Error("You must be logged in to save your collection! 🐾");
  }
  
  const response = UrlFetchApp.fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: 'Bearer ' + service.getAccessToken() }
  });
  const userEmail = JSON.parse(response.getContentText()).email;
  
  // 2. Now proceed with saving to the sheet
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName("UserData");
  const now = new Date();
  userSheet.appendRow([userEmail, meemeowId, "Owned", form, now]);
  
  return true;
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

function logout() {
  const service = getOAuthService();
  service.reset(); //
  return ScriptApp.getService().getUrl();
}