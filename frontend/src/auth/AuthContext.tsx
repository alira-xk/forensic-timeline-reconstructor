import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AuthResult,
  AuthUser,
  OtpResult,
  SignUpInput,
  authService,
} from './authService';

type AuthContextValue = {
  user: AuthUser | null;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  signUp: (input: SignUpInput) => Promise<AuthResult>;
  verifyOtp: (email: string, otpCode: string) => Promise<OtpResult>;
  resendOtp: (email: string) => Promise<OtpResult>;
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
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let isMounted = true;

    authService
      .getSession()
      .then((sessionUser) => {
        if (isMounted) {
          setUser(sessionUser);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsInitializing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const result = await authService.login(email, password);

    if (result.success) {
      setUser(result.user);
    }

    return result;
  };

  const signUp = async (input: SignUpInput) => {
    const result = await authService.signUp(input);

    if (result.success) {
      setUser(result.user);
    }

    return result;
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
  };

  const verifyOtp = async (email: string, otpCode: string) => {
    return authService.verifyOtp(email, otpCode);
  };

  const resendOtp = async (email: string) => {
    return authService.resendOtp(email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isInitializing,
        login,
        signUp,
        verifyOtp,
        resendOtp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);