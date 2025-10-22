import { OAuth2Client } from "google-auth-library";

export async function GET() {
  try {
    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

    // Create a new OAuth2 client
    const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, APP_URL);

    // Set the refresh token
    oAuth2Client.setCredentials({
      refresh_token: REFRESH_TOKEN,
    });

    // Get a new access token
    const { token } = await oAuth2Client.getAccessToken();

    if (!token) {
      throw new Error("Failed to retrieve access token");
    }

    // Send the access token back to the client
    return new Response(JSON.stringify({ accessToken: token }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Access Token Error:", error.message);
    return new Response(JSON.stringify({ error: "Failed to get access token." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
