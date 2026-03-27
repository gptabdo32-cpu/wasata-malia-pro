export { COOKIE_NAME, ONE_YEAR_MS, AXIOS_TIMEOUT_MS, UNAUTHED_ERR_MSG, NOT_ADMIN_ERR_MSG } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  try {
    // Get OAuth portal URL from environment or use default
    let oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
    
    // Validate and fallback to default if not provided
    if (!oauthPortalUrl || typeof oauthPortalUrl !== 'string' || oauthPortalUrl.trim() === '') {
      oauthPortalUrl = "https://auth.manus.im";
    }
    
    // Ensure the URL has a protocol
    if (!oauthPortalUrl.startsWith('http://') && !oauthPortalUrl.startsWith('https://')) {
      oauthPortalUrl = `https://${oauthPortalUrl}`;
    }
    
    const appId = import.meta.env.VITE_APP_ID || "default-app-id";
    const redirectUri = `${window.location.origin}/api/oauth/callback`;

    const statePayload = {
      redirectUri,
      issuedAt: Date.now(),
      nonce:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    };

    const state = btoa(JSON.stringify(statePayload));

    // Construct the URL safely
    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", String(appId));
    url.searchParams.set("redirectUri", String(redirectUri));
    url.searchParams.set("state", String(state));
    url.searchParams.set("type", "signIn");

    return url.toString();
  } catch (error) {
    console.error('Error generating login URL:', error);
    // Return a safe fallback URL or throw with more context
    throw new Error(`Failed to generate login URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
