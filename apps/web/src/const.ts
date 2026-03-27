export { COOKIE_NAME, ONE_YEAR_MS, AXIOS_TIMEOUT_MS, UNAUTHED_ERR_MSG, NOT_ADMIN_ERR_MSG } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
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

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", String(appId));
  url.searchParams.set("redirectUri", String(redirectUri));
  url.searchParams.set("state", String(state));
  url.searchParams.set("type", "signIn");

  return url.toString();
};
