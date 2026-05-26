import { API_BASE_URL } from '../services/api';

export type AuthUser = {
  _id: string;
  name: string;
  email: string;
  role: string;
  isVerified?: boolean;
  createdAt?: string;
};

export type SignUpInput = {
  name: string;
  email: string;
  password: string;
};

export type AuthFailureCode =
  | 'missing_fields'
  | 'weak_password'
  | 'login_failed'
  | 'signup_failed'
  | 'network_error'
  | 'account_not_found'
  | 'account_not_verified'
  | 'invalid_password'
  | 'account_exists'
  | 'otp_sent'
  | 'invalid_otp'
  | 'otp_expired'
  | 'otp_not_found'
  | 'invalid_email'
  | 'invalid_email_domain'
  | 'already_verified'
  | 'unknown_error';

export type AuthResult =
  | {
      success: true;
      user: AuthUser;
      message: string;
    }
  | {
      success: false;
      code: AuthFailureCode;
      message: string;
      email?: string;
    };

const SESSION_KEY = 'forensic_timeline_user';

const saveSession = async (user: AuthUser) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
};

const clearSession = async () => {
  localStorage.removeItem(SESSION_KEY);
};

const getSession = async (): Promise<AuthUser | null> => {
  try {
    const storedUser = localStorage.getItem(SESSION_KEY);

    if (!storedUser) {
      return null;
    }

    return JSON.parse(storedUser) as AuthUser;
  } catch {
    return null;
  }
};

const login = async (email: string, password: string): Promise<AuthResult> => {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail || !password.trim()) {
    return {
      success: false,
      code: 'missing_fields',
      message: 'Email and password are required.',
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: cleanEmail,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        code: data.code || 'login_failed',
        message: data.message || 'Login failed.',
        email: data.data?.email || cleanEmail,
      };
    }

    await saveSession(data.data);

    return {
      success: true,
      user: data.data,
      message: data.message || 'Login successful.',
    };
  } catch {
    return {
      success: false,
      code: 'network_error',
      message: 'Unable to connect to authentication server.',
    };
  }
};

const signUp = async (input: SignUpInput): Promise<AuthResult> => {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password.trim();

  if (!name || !email || !password) {
    return {
      success: false,
      code: 'missing_fields',
      message: 'Name, email and password are required.',
    };
  }

  const strongPasswordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

if (!strongPasswordRegex.test(password)) {
  return {
    success: false,
    code: 'weak_password',
    message:
      'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
  };
}

  try {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        code: data.code || 'signup_failed',
        message: data.message || 'Signup failed.',
        email,
      };
    }

    // Signup does not login user directly.
    // It sends OTP and moves user to verification screen.
    return {
      success: false,
      code: 'otp_sent',
      message: data.message || 'OTP sent to your email.',
      email,
    };
  } catch {
    return {
      success: false,
      code: 'network_error',
      message: 'Unable to connect to authentication server.',
    };
  }
};

const verifyOtp = async (email: string, otpCode: string): Promise<AuthResult> => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = otpCode.trim();

  if (!cleanEmail || !cleanOtp) {
    return {
      success: false,
      code: 'missing_fields',
      message: 'Email and OTP are required.',
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: cleanEmail,
        otpCode: cleanOtp,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        code: data.code || 'invalid_otp',
        message: data.message || 'OTP verification failed.',
        email: cleanEmail,
      };
    }

    // Important:
    // Do NOT save session here.
    // After OTP verification, user should go to Login page.
    return {
      success: true,
      user: data.data,
      message: data.message || 'Account verified successfully.',
    };
  } catch {
    return {
      success: false,
      code: 'network_error',
      message: 'Unable to connect to authentication server.',
    };
  }
};

const resendOtp = async (
  email: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
      }),
    });

    const data = await response.json();

    return {
      success: response.ok,
      message: data.message || 'OTP request completed.',
    };
  } catch {
    return {
      success: false,
      message: 'Unable to connect to authentication server.',
    };
  }
};

const signOut = async () => {
  await clearSession();
};

export const authService = {
  getSession,
  login,
  signUp,
  verifyOtp,
  resendOtp,
  signOut,
};