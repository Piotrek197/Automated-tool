const screenshotmachine = require("screenshotmachine");
const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const TOKEN_PATH = "token.json";

function authorize(credentials, callback, image_name) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );
  let img_name = image_name;

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback, image_name);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client, img_name);
  });
}

function getAccessToken(oAuth2Client, callback, name) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

  console.log("Authorize this app by visiting this url:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question("Enter the code from that page here: ", (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error("Error retrieving access token", err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log("Token stored to", TOKEN_PATH);
      });
      callback(oAuth2Client, name);
    });
  });
}

function uploadFile(auth, name) {
  const drive = google.drive({ version: "v3", auth });
  var fileMetadata = {
    name: name,
    parents: ["**************************"], //id of folder in google drive
  };
  var media = {
    mimeType: "image/jpeg",
    body: fs.createReadStream("./screenshots/" + name),
  };

  drive.files.create(
    {
      resource: fileMetadata,
      media: media,
      fields: "id",
    },
    function (err) {
      if (err) {
        // Handle error
        console.error(err);
      } else {
        console.log("Screenshot saved in google drive :P");
      }
    }
  );
} //upload file function

const customerKey = "******";
const secretPhrase = "";

const options = (url) => {
  return {
    url: url,
    dimension: "1920x1080",
    device: "desktop",
    format: "jpg",
    cacheLimit: "0",
    delay: "200",
    zoom: "100",
  };
};

const websites = [
  { id: 1, src: "https://ifunded.de/en/", name: "iFunded" },
  { id: 2, src: "https://www.propertypartner.co", name: "Property Partner" },
  { id: 3, src: "https://propertymoose.co.uk/", name: "Property Moose" },
  { id: 4, src: "https://www.homegrown.co.uk/", name: "Homegrown" },
  { id: 5, src: "https://www.realtymogul.com/", name: "Realty Mogul" },
];

websites.forEach((website) => {
  let apiUrl = screenshotmachine.generateScreenshotApiUrl(
    customerKey,
    secretPhrase,
    options(website.src)
  );

  var output = `${website.id}_${website.name}.jpg`;

  screenshotmachine.readScreenshot(apiUrl).pipe(
    fs.createWriteStream("./screenshots/" + output).on("close", function () {
      console.log("Screenshot saved as " + output);

      //  Load client secrets from a local file.
      fs.readFile("credentials.json", (err, content) => {
        if (err) return console.log("Error loading client secret file:", err);

        //if ok, upload image :)
        authorize(JSON.parse(content), uploadFile, output);
      });
    })
  );
});
