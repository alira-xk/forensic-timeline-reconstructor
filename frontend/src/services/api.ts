export const API_BASE_URL = 'http://localhost:5000/api';

const SESSION_KEY = 'forensic_timeline_user';

const getLoggedInUserId = () => {
  try {
    const storedUser = localStorage.getItem(SESSION_KEY);

    if (!storedUser) {
      return '';
    }

    const user = JSON.parse(storedUser);
    return user?._id || '';
  } catch {
    return '';
  }
};

export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const userId = getLoggedInUserId();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }

  return data;
};