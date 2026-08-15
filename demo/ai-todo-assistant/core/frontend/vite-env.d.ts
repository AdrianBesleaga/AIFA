/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_EVENT_STREAM_URL?: string;
  readonly VITE_OIDC_ISSUER_URL?: string;
  readonly VITE_OIDC_CLIENT_ID?: string;
  readonly VITE_OIDC_AUDIENCE?: string;
  readonly VITE_OIDC_REDIRECT_URI?: string;
  readonly VITE_OIDC_SCOPES?: string;
}
