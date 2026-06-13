import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import {
  useAuth as useClerkAuth,
  useSignIn,
  useSignUp,
  useUser,
} from './clerkBindings';

import { API_BASE_URL, setAuthTokenProvider } from '../services/api';
import {
  AuthFailureCode,
  AuthResult,
  AuthUser,
  OtpResult,
  SignUpInput,
} from './authService';

type AuthContextValue = {
  user: AuthUser | null;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  signUp: (input: SignUpInput) => Promise<AuthResult>;
  verifyOtp: (email: string, otpCode: string) => Promise<OtpResult>;
  resendOtp: (email: string) => Promise<OtpResult>;
  requestPasswordReset: (email: string) => Promise<OtpResult>;
  resetPassword: (
    email: string,
    code: string,
    newPassword: string
  ) => Promise<OtpResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isInitializing: true,
  login: async () => ({
    success: false,
    code: 'missing_fields',
    message: 'Credential fields cannot be empty.',
  }),
  signUp: async () => ({
    success: false,
    code: 'missing_fields',
    message: 'All sign up fields are required.',
  }),
  verifyOtp: async () => ({
    success: false,
    message: 'OTP verification is unavailable.',
  }),
  resendOtp: async () => ({
    success: false,
    message: 'OTP resend is unavailable.',
  }),
  requestPasswordReset: async () => ({
    success: false,
    message: 'Password reset is unavailable.',
  }),
  resetPassword: async () => ({
    success: false,
    message: 'Password reset is unavailable.',
  }),
  signOut: async () => {},
});

const fallbackUserFromEmail = (email: string): AuthUser => ({
  _id: email,
  name: email.split('@')[0] || 'Investigator',
  email,
  role: 'investigator',
});

const splitDisplayName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || 'Investigator';
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : undefined;

  return { firstName, lastName };
};

const usernameFromEmail = (email: string) => {
  const username = email
    .trim()
    .toLowerCase()
    .replace('@', '_')
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  const normalized = username.length >= 4 ? username : `user_${username}`;
  return normalized.slice(0, 64);
};

const getWebAppBaseUrl = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return undefined;
  }

  const basePath = window.location.pathname.startsWith('/forensic-timeline-reconstructor')
    ? '/forensic-timeline-reconstructor/'
    : '/';

  return `${window.location.origin}${basePath}`;
};

const mapClerkUser = (clerkUser: any): AuthUser | null => {
  if (!clerkUser) {
    return null;
  }

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ||
    clerkUser.emailAddresses?.[0]?.emailAddress ||
    '';
  const name =
    clerkUser.fullName ||
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
    (email ? email.split('@')[0] : 'Investigator');

  return {
    _id: clerkUser.id,
    name,
    email,
    role: 'investigator',
    createdAt: clerkUser.createdAt ? String(clerkUser.createdAt) : undefined,
  };
};

const clerkErrorMessage = (error: any, fallback: string) => {
  return (
    error?.errors?.[0]?.longMessage ||
    error?.errors?.[0]?.message ||
    error?.message ||
    fallback
  );
};

const clerkErrorCode = (error: any, fallback: AuthFailureCode): AuthFailureCode => {
  const code = String(error?.errors?.[0]?.code || '').toLowerCase();

  if (code.includes('password')) return 'invalid_password';
  if (code.includes('identifier') || code.includes('not_found')) return 'account_not_found';
  if (code.includes('verification') || code.includes('code')) return 'invalid_otp';
  if (code.includes('exists') || code.includes('taken')) return 'account_exists';
  if (code.includes('email')) return 'invalid_email';

  return fallback;
};

const formatClerkMissingRequirements = (resource: any) => {
  const missingFields = [
    ...(Array.isArray(resource?.missingFields) ? resource.missingFields : []),
    ...(Array.isArray(resource?.missingRequirements) ? resource.missingRequirements : []),
  ];

  if (!missingFields.length) {
    return 'OTP verification is not complete.';
  }

  const labels = missingFields.map((field) =>
    String(field)
      .replace(/^profile_/, '')
      .replace(/_/g, ' ')
  );

  return `OTP verified, but Clerk still needs: ${labels.join(', ')}.`;
};

const hasMissingUsernameRequirement = (resource: any) => {
  const missingFields = [
    ...(Array.isArray(resource?.missingFields) ? resource.missingFields : []),
    ...(Array.isArray(resource?.missingRequirements) ? resource.missingRequirements : []),
  ];

  return missingFields.some((field) => String(field).toLowerCase().includes('username'));
};

const runPasswordSignIn = async (
  signIn: any,
  email: string,
  password: string
) => {
  if (typeof signIn.password === 'function') {
    const passwordAttempt = await signIn.password({
      emailAddress: email,
      password,
    });

    if ((passwordAttempt?.status || signIn.status) === 'complete') {
      return passwordAttempt;
    }
  }

  const createdAttempt = await signIn.create({ identifier: email });
  const createdStatus = createdAttempt?.status || signIn.status;

  if (
    createdStatus === 'needs_first_factor' &&
    typeof signIn.attemptFirstFactor === 'function'
  ) {
    return signIn.attemptFirstFactor({
      strategy: 'password',
      password,
    });
  }

  if (typeof signIn.attemptFirstFactor === 'function') {
    return signIn.attemptFirstFactor({
      strategy: 'password',
      password,
    });
  }

  return createdAttempt;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const clerkAuth = useClerkAuth();
  const { isLoaded, isSignedIn, getToken, signOut: clerkSignOut } = clerkAuth;
  const { user: clerkUser } = useUser();
  const signInResource = useSignIn();
  const signUpResource = useSignUp();
  const signInState = signInResource as any;
  const signUpState = signUpResource as any;

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isSyncingBackendUser, setIsSyncingBackendUser] = useState(false);

  const isInitializing = !isLoaded || isSyncingBackendUser;

  useEffect(() => {
    setAuthTokenProvider(() => getToken());

    return () => {
      setAuthTokenProvider(null);
    };
  }, [getToken]);

  const fetchBackendUser = async (token?: string | null) => {
    const activeToken = token || (await getToken());
    if (!activeToken) {
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${activeToken}`,
      },
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to sync Clerk user with API.');
    }

    return data.data?.user as AuthUser;
  };

  useEffect(() => {
    let isMounted = true;

    const syncUser = async () => {
      if (!isLoaded) {
        return;
      }

      if (!isSignedIn) {
        setUser(null);
        return;
      }

      setIsSyncingBackendUser(true);

      try {
        const backendUser = await fetchBackendUser();
        if (isMounted) {
          setUser(backendUser || mapClerkUser(clerkUser));
        }
      } catch {
        if (isMounted) {
          setUser(mapClerkUser(clerkUser));
        }
      } finally {
        if (isMounted) {
          setIsSyncingBackendUser(false);
        }
      }
    };

    syncUser();

    return () => {
      isMounted = false;
    };
  }, [isLoaded, isSignedIn, clerkUser?.id]);

  const login = async (email: string, password: string): Promise<AuthResult> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const signIn = signInState.signIn as any;
    const setActive = signInState.setActive;

    if (!cleanEmail || !cleanPassword) {
      return {
        success: false,
        code: 'missing_fields',
        message: 'Email and password are required.',
      };
    }

    if (!signInState.isLoaded || !signIn) {
      return {
        success: false,
        code: 'network_error',
        message: 'Authentication is still loading. Please try again.',
      };
    }

    try {
      const attempt = await runPasswordSignIn(signIn, cleanEmail, cleanPassword);

      const status = attempt?.status || signIn.status;
      const createdSessionId = attempt?.createdSessionId || signIn.createdSessionId;

      if (status !== 'complete' || !createdSessionId) {
        return {
          success: false,
          code: 'login_failed',
          message: 'Login needs another verification step in Clerk.',
          email: cleanEmail,
        };
      }

      await setActive?.({ session: createdSessionId });
      const token = await getToken();
      const syncedUser = await fetchBackendUser(token).catch(() => null);
      const nextUser = syncedUser || fallbackUserFromEmail(cleanEmail);
      setUser(nextUser);

      return {
        success: true,
        user: nextUser,
        message: 'Login successful.',
      };
    } catch (error: any) {
      return {
        success: false,
        code: clerkErrorCode(error, 'login_failed'),
        message: clerkErrorMessage(error, 'Login failed.'),
        email: cleanEmail,
      };
    }
  };

  const signUp = async (input: SignUpInput): Promise<AuthResult> => {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    const password = input.password.trim();
    const signUpAttempt = signUpState.signUp as any;
    const { firstName, lastName } = splitDisplayName(name);
    const username = usernameFromEmail(email);

    if (!name || !email || !password) {
      return {
        success: false,
        code: 'missing_fields',
        message: 'Name, email and password are required.',
      };
    }

    if (!signUpState.isLoaded || !signUpAttempt) {
      return {
        success: false,
        code: 'network_error',
        message: 'Authentication is still loading. Please try again.',
      };
    }

    try {
      if (typeof signUpAttempt.password === 'function') {
        await signUpAttempt.password({
          emailAddress: email,
          password,
          username,
          firstName,
          ...(lastName ? { lastName } : {}),
          unsafeMetadata: { name },
        });
      } else {
        await signUpAttempt.create({
          emailAddress: email,
          password,
          username,
          firstName,
          ...(lastName ? { lastName } : {}),
          unsafeMetadata: { name },
        });
      }

      if (signUpAttempt.verifications?.sendEmailCode) {
        await signUpAttempt.verifications.sendEmailCode();
      } else {
        await signUpAttempt.prepareEmailAddressVerification({
          strategy: 'email_code',
        });
      }

      return {
        success: false,
        code: 'otp_sent',
        message: 'Verification code sent to your email.',
        email,
      };
    } catch (error: any) {
      return {
        success: false,
        code: clerkErrorCode(error, 'signup_failed'),
        message: clerkErrorMessage(error, 'Signup failed.'),
        email,
      };
    }
  };

  const verifyOtp = async (email: string, otpCode: string): Promise<OtpResult> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otpCode.trim();
    const signUpAttempt = signUpState.signUp as any;
    const setActive = signUpState.setActive;

    if (!cleanEmail || !cleanOtp) {
      return {
        success: false,
        code: 'missing_fields',
        message: 'Email and OTP code are required.',
      };
    }

    try {
      const attempt = signUpAttempt.verifications?.verifyEmailCode
        ? await signUpAttempt.verifications.verifyEmailCode({ code: cleanOtp })
        : await signUpAttempt.attemptEmailAddressVerification({ code: cleanOtp });

      let status = attempt?.status || signUpAttempt.status;
      let createdSessionId = attempt?.createdSessionId || signUpAttempt.createdSessionId;
      let latestAttempt = attempt || signUpAttempt;

      if (
        status !== 'complete' &&
        hasMissingUsernameRequirement(latestAttempt) &&
        typeof signUpAttempt.update === 'function'
      ) {
        latestAttempt = await signUpAttempt.update({
          username: usernameFromEmail(cleanEmail),
        });
        status = latestAttempt?.status || signUpAttempt.status;
        createdSessionId = latestAttempt?.createdSessionId || signUpAttempt.createdSessionId;
      }

      if (status !== 'complete') {
        return {
          success: false,
          code: 'invalid_otp',
          message: formatClerkMissingRequirements(latestAttempt),
          email: cleanEmail,
        };
      }

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        setUser(fallbackUserFromEmail(cleanEmail));
      }

      return {
        success: true,
        message: 'Account verified successfully.',
        email: cleanEmail,
      };
    } catch (error: any) {
      return {
        success: false,
        code: clerkErrorCode(error, 'invalid_otp'),
        message: clerkErrorMessage(error, 'OTP verification failed.'),
        email: cleanEmail,
      };
    }
  };

  const resendOtp = async (email: string): Promise<OtpResult> => {
    const cleanEmail = email.trim().toLowerCase();
    const signUpAttempt = signUpState.signUp as any;

    if (!cleanEmail) {
      return {
        success: false,
        code: 'missing_fields',
        message: 'Email is required.',
      };
    }

    try {
      if (signUpAttempt.verifications?.sendEmailCode) {
        await signUpAttempt.verifications.sendEmailCode();
      } else {
        await signUpAttempt.prepareEmailAddressVerification({
          strategy: 'email_code',
        });
      }

      return {
        success: true,
        message: 'OTP resent successfully.',
        email: cleanEmail,
      };
    } catch (error: any) {
      return {
        success: false,
        code: clerkErrorCode(error, 'otp_not_found'),
        message: clerkErrorMessage(error, 'Failed to resend OTP.'),
        email: cleanEmail,
      };
    }
  };

  const requestPasswordReset = async (email: string): Promise<OtpResult> => {
    const cleanEmail = email.trim().toLowerCase();
    const signIn = signInState.signIn as any;

    if (!cleanEmail) {
      return {
        success: false,
        code: 'missing_fields',
        message: 'Email is required.',
      };
    }

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: cleanEmail,
      });

      return {
        success: true,
        message: 'Reset code sent. Check your email.',
        email: cleanEmail,
      };
    } catch (error: any) {
      return {
        success: false,
        code: clerkErrorCode(error, 'unknown_error'),
        message: clerkErrorMessage(error, 'Unable to request reset code.'),
        email: cleanEmail,
      };
    }
  };

  const resetPassword = async (
    email: string,
    code: string,
    newPassword: string
  ): Promise<OtpResult> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    const signIn = signInState.signIn as any;

    if (!cleanEmail || !cleanCode || !newPassword.trim()) {
      return {
        success: false,
        code: 'missing_fields',
        message: 'Email, reset code and password are required.',
      };
    }

    try {
      await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: cleanCode,
        password: newPassword,
      });

      return {
        success: true,
        message: 'Password updated. You can now log in.',
        email: cleanEmail,
      };
    } catch (error: any) {
      return {
        success: false,
        code: clerkErrorCode(error, 'unknown_error'),
        message: clerkErrorMessage(error, 'Unable to reset password.'),
        email: cleanEmail,
      };
    }
  };

  const signOut = async () => {
    setUser(null);
    const redirectUrl = getWebAppBaseUrl();
    if (redirectUrl) {
      await (clerkSignOut as any)({ redirectUrl });
    } else {
      await clerkSignOut();
    }

    if (redirectUrl && window.location.href !== redirectUrl) {
      window.history.replaceState(null, '', redirectUrl);
    }
  };

  const value = useMemo(
    () => ({
      user,
      isInitializing,
      login,
      signUp,
      verifyOtp,
      resendOtp,
      requestPasswordReset,
      resetPassword,
      signOut,
    }),
    [user, isInitializing, signInResource, signUpResource]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
