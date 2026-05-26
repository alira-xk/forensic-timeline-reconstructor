import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthResult, AuthUser, SignUpInput, authService } from './authService';

type AuthContextValue = {
  user: AuthUser | null;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  signUp: (input: SignUpInput) => Promise<AuthResult>;
  verifyOtp: (email: string, otpCode: string) => Promise<AuthResult>;
  resendOtp: (email: string) => Promise<{ success: boolean; message: string }>;
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
    code: 'missing_fields',
    message: 'Email and OTP are required.',
  }),
  resendOtp: async () => ({
    success: false,
    message: 'Email is required.',
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

    // Signup only sends OTP. It should not login automatically.
    return result;
  };

  const verifyOtp = async (email: string, otpCode: string) => {
    const result = await authService.verifyOtp(email, otpCode);

    // OTP verification only verifies account. User should login manually.
    return result;
  };

  const resendOtp = async (email: string) => {
    return authService.resendOtp(email);
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
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