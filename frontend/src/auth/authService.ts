import { API_BASE_URL, setSessionTokens } from '../services/api';
import { storageGetItem, storageRemoveItem } from './authStorage';

export type AuthUser = {
  _id: string;
  name: string;
  email: string;
  role: string;
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

export type OtpResult = {
  success: boolean;
  message: string;
  code?: AuthFailureCode;
  email?: string;
};

const SESSION_KEY = 'forensic_timeline_session';

const getSession = async (): Promise<AuthUser | null> => {
  try {
    const stored = await storageGetItem(SESSION_KEY);
    if (!stored) {
      return null;
    }
    const payload = JSON.parse(stored) as { user?: AuthUser };
    return payload?.user || null;
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

    await setSessionTokens(
      data.data.user,
      data.data.accessToken,
      data.data.refreshToken
    );

    return {
      success: true,
      user: data.data.user,
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
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
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

    // Signup always returns OTP_SENT - user must verify OTP before logging in
    return {
      success: false,
      code: 'otp_sent',
      message: data.message || 'OTP sent to your email. Please verify your account.',
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

const verifyOtp = async (email: string, otpCode: string): Promise<OtpResult> => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = otpCode.trim();

  if (!cleanEmail || !cleanOtp) {
    return {
      success: false,
      code: 'missing_fields',
      message: 'Email and OTP code are required.',
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: cleanEmail, otpCode: cleanOtp }),
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

    return {
      success: true,
      message: data.message || 'Account verified successfully.',
      email: cleanEmail,
    };
  } catch {
    return {
      success: false,
      code: 'network_error',
      message: 'Unable to connect to authentication server.',
    };
  }
};

const resendOtp = async (email: string): Promise<OtpResult> => {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail) {
    return {
      success: false,
      code: 'missing_fields',
      message: 'Email is required.',
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: cleanEmail }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        code: data.code || 'otp_not_found',
        message: data.message || 'Failed to resend OTP.',
        email: cleanEmail,
      };
    }

    return {
      success: true,
      message: data.message || 'OTP resent successfully.',
      email: cleanEmail,
    };
  } catch {
    return {
      success: false,
      code: 'network_error',
      message: 'Unable to connect to authentication server.',
    };
  }
};

const signOut = async () => {
  await storageRemoveItem(SESSION_KEY);
};

export const authService = {
  getSession,
  login,
  signUp,
  verifyOtp,
  resendOtp,
  signOut,
};