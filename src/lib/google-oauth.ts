import crypto from 'node:crypto';

export const GOOGLE_OAUTH_STATE_COOKIE = 'gb_google_oauth_state';
export const GOOGLE_OAUTH_NEXT_COOKIE = 'gb_google_oauth_next';

function cleanEnvValue(val?: string): string {
  if (!val) return '';
  return val.replace(/^["']|["']$/g, '').trim();
}

export function sanitizeRedirectPath(path: string | null | undefined): string {
  if (!path) return '/';
  if (path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\')) {
    return path;
  }
  return '/';
}

export function getGoogleOAuthConfig(): {
  clientId: string;
  clientSecret: string;
  isConfigured: boolean;
} {
  const clientId = cleanEnvValue(
    process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  );
  const clientSecret = cleanEnvValue(process.env.GOOGLE_CLIENT_SECRET);

  return {
    clientId,
    clientSecret,
    isConfigured: Boolean(clientId && clientSecret),
  };
}

export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function getAppOrigin(request: Request): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  const { origin } = new URL(request.url);
  return origin;
}

export function buildGoogleAuthorizationUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', params.clientId);
  authUrl.searchParams.set('redirect_uri', params.redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'select_account');
  authUrl.searchParams.set('state', params.state);
  return authUrl.toString();
}

export async function exchangeGoogleCodeForIdToken(params: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<{ idToken: string; accessToken?: string }> {
  const body = new URLSearchParams({
    code: params.code,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.id_token) {
    const errDetail =
      data.error_description || data.error || `HTTP ${response.status} from Google token endpoint`;
    throw new Error(`Google token exchange failed: ${errDetail}`);
  }

  return {
    idToken: data.id_token as string,
    accessToken: data.access_token as string | undefined,
  };
}
