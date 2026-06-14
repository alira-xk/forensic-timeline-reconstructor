import { storageGetItem, storageSetItem } from '../auth/authStorage';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

const SESSION_KEY = 'forensic_timeline_session';
let authTokenProvider: (() => Promise<string | null>) | null = null;
const CLERK_TOKEN_RETRY_DELAY_MS = 200;
const CLERK_TOKEN_RETRY_ATTEMPTS = 10;

type SessionPayload = {
  user: { _id: string };
  accessToken: string;
  refreshToken: string;
};

const getSessionPayload = async (): Promise<SessionPayload | null> => {
  try {
    const stored = await storageGetItem(SESSION_KEY);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored) as SessionPayload;
  } catch {
    return null;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (authTokenProvider) {
    for (let attempt = 0; attempt < CLERK_TOKEN_RETRY_ATTEMPTS; attempt += 1) {
      const token = await authTokenProvider();
      if (token) {
        return token;
      }

      if (attempt < CLERK_TOKEN_RETRY_ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, CLERK_TOKEN_RETRY_DELAY_MS));
      }
    }

    return null;
  }

  const session = await getSessionPayload();
  return session?.accessToken || null;
};

export const setAuthTokenProvider = (
  provider: (() => Promise<string | null>) | null
) => {
  authTokenProvider = provider;
};

export const setSessionTokens = async (
  user: SessionPayload['user'],
  accessToken: string,
  refreshToken: string
) => {
  await storageSetItem(
    SESSION_KEY,
    JSON.stringify({ user, accessToken, refreshToken })
  );
};

const refreshAccessToken = async () => {
  if (authTokenProvider) {
    return null;
  }

  const session = await getSessionPayload();
  if (!session?.refreshToken) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });

  const data = await response.json();
  if (!response.ok || !data?.data?.accessToken) {
    return null;
  }

  await setSessionTokens(session.user, data.data.accessToken, data.data.refreshToken);
  return data.data.accessToken as string;
};

export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const accessToken = await getAccessToken();

  if (authTokenProvider && !accessToken) {
    throw new Error('Authentication session is still starting. Please try again.');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(options.headers || {}),
  } as Record<string, string>;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (response.status === 401 && data?.code === 'TOKEN_EXPIRED') {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...headers,
          Authorization: `Bearer ${refreshedToken}`,
        },
      });

      const retryData = await retryResponse.json();
      if (!retryResponse.ok) {
        throw new Error(retryData.message || 'API request failed');
      }
      return retryData;
    }
  }

  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }

  return data;
};
