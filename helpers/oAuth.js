const axios = require("axios");
const { google } = require("googleapis");
const fs = require("fs");
const keys = require("../keys.json");

const CLIENTS_SECRET_FILE_PATH = "./keys.json";
const TOKEN_PATH = "./token.json";
const REFRESH_TOKEN_PATH = "./refresh_token.json";

const createOAuthClient = async () => {
  try {
    const keyContent = await fs.promises.readFile(CLIENTS_SECRET_FILE_PATH);
    const credentials = JSON.parse(keyContent);
    const { client_secret, client_id, redirect_uris } = credentials.web;
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );
    console.log("o auth client created: ", oAuth2Client);
    return oAuth2Client;
  } catch (err) {
    console.error("Error creating OAuth client:", err);
    throw err; // Rethrow the error to propagate it
  }
};

const generateOAuthURL = async () => {
  try {
    const content = await fs.promises.readFile(CLIENTS_SECRET_FILE_PATH);
    const credentials = JSON.parse(content);
    const { client_secret, client_id, redirect_uris } = credentials.web;
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );
    const authUrl = await oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/calendar"],
    });
    console.log("Auth URL: ", authUrl);
    return authUrl;
  } catch (err) {
    console.error("Error loading client secret file:", err);
    throw err;
  }
};

const getAccessTokenFromAuth = (authCode) => {
  const data = {
    code: authCode, // this code comes from the api "/auth/oauth/callback?code=authCode"
    client_id: keys.web.client_id,
    client_secret: keys.web.client_secret,
    redirect_uri: keys.web.redirect_uris[0],
    grant_type: "authorization_code",
  };

  axios
    .post("https://oauth2.googleapis.com/token", data)
    .then((response) => {
      const token = response.data;
      const refresh_token = token.refresh_token;
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
      });
      fs.writeFile(
        REFRESH_TOKEN_PATH,
        JSON.stringify({ refresh_token }),
        (err) => {
          if (err) return console.error(err);
        }
      );
    })
    .catch((error) => {
      console.error("Error:", error.response.data);
    });
};

const getAccessTokenFromRefreshToken = async () => {
  const ref_token = require("../refresh_token.json");
  const data = {
    client_id: keys.web.client_id,
    client_secret: keys.web.client_secret,
    refresh_token: ref_token.refresh_token,
    grant_type: "refresh_token",
  };

  axios
    .post("https://oauth2.googleapis.com/token", data)
    .then((response) => {
      const token = response.data;
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
      });
    })
    .catch((error) => {
      console.error("Error:", error.response.data);
    });
};

module.exports = {
  createOAuthClient,
  generateOAuthURL,
  getAccessTokenFromAuth,
  getAccessTokenFromRefreshToken,
};
