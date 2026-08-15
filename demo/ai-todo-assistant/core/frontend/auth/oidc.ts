interface OidcMetadata {
  authorization_endpoint: string;
  token_endpoint: string;
}
const accessTokenKey = "aifa.oidc.access-token";
const verifierKey = "aifa.oidc.pkce-verifier";
const stateKey = "aifa.oidc.state";
let metadataPromise: Promise<OidcMetadata> | undefined;

function configuration() {
  return {
    issuer: import.meta.env.VITE_OIDC_ISSUER_URL as string | undefined,
    clientId: import.meta.env.VITE_OIDC_CLIENT_ID as string | undefined,
    audience: import.meta.env.VITE_OIDC_AUDIENCE as string | undefined,
    redirectUri:
      (import.meta.env.VITE_OIDC_REDIRECT_URI as string | undefined) ??
      `${window.location.origin}${window.location.pathname}`,
  };
}
async function metadata(): Promise<OidcMetadata> {
  const { issuer } = configuration();
  if (!issuer) throw new Error("OIDC is not configured for this browser build");
  metadataPromise ??= fetch(
    `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`,
  ).then(async (response) => {
    if (!response.ok) throw new Error("Unable to load OIDC metadata");
    return (await response.json()) as OidcMetadata;
  });
  return metadataPromise;
}
function randomBase64Url(bytes = 32): string {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...value))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function getAccessToken(): string | undefined {
  return window.sessionStorage.getItem(accessTokenKey) ?? undefined;
}
export function isOidcConfigured(): boolean {
  const { issuer, clientId } = configuration();
  return Boolean(issuer && clientId);
}
export async function beginSignIn(): Promise<void> {
  const config = configuration();
  if (!config.clientId) throw new Error("OIDC client ID is not configured");
  const [provider, verifier, state] = await Promise.all([
    metadata(),
    Promise.resolve(randomBase64Url(64)),
    Promise.resolve(randomBase64Url()),
  ]);
  sessionStorage.setItem(verifierKey, verifier);
  sessionStorage.setItem(stateKey, state);
  const authorization = new URL(provider.authorization_endpoint);
  authorization.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid profile offline_access",
    state,
    code_challenge: await sha256Base64Url(verifier),
    code_challenge_method: "S256",
    ...(config.audience ? { audience: config.audience } : {}),
  }).toString();
  window.location.assign(authorization);
}
export async function completeSignIn(): Promise<boolean> {
  const callback = new URL(window.location.href);
  const code = callback.searchParams.get("code");
  if (!code) return Boolean(getAccessToken());
  const expectedState = sessionStorage.getItem(stateKey);
  if (!expectedState || callback.searchParams.get("state") !== expectedState)
    throw new Error("OIDC callback state did not match");
  const verifier = sessionStorage.getItem(verifierKey);
  const config = configuration();
  if (!verifier || !config.clientId) throw new Error("OIDC PKCE state is missing");
  const provider = await metadata();
  const response = await fetch(provider.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      code,
      code_verifier: verifier,
    }),
  });
  if (!response.ok) throw new Error("OIDC code exchange failed");
  const tokens = (await response.json()) as { access_token?: string };
  if (!tokens.access_token) throw new Error("OIDC response did not include an access token");
  sessionStorage.setItem(accessTokenKey, tokens.access_token);
  sessionStorage.removeItem(verifierKey);
  sessionStorage.removeItem(stateKey);
  callback.searchParams.delete("code");
  callback.searchParams.delete("state");
  callback.searchParams.delete("session_state");
  window.history.replaceState({}, document.title, callback);
  return true;
}
