import React from 'react';
import {
  ClerkProvider,
  useAuth,
  useSignIn,
  useSignUp,
  useUser,
} from '@clerk/react';

type AppClerkProviderProps = {
  children: React.ReactNode;
  publishableKey: string;
};

export const AppClerkProvider: React.FC<AppClerkProviderProps> = ({
  children,
  publishableKey,
}) => (
  <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>
);

export { useAuth, useSignIn, useSignUp, useUser };
