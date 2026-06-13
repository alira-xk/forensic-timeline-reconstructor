import React from 'react';
import { ClerkProvider, useAuth, useUser } from '@clerk/expo';
import { useSignIn, useSignUp } from '@clerk/expo/legacy';
import { tokenCache } from '@clerk/expo/token-cache';

type AppClerkProviderProps = {
  children: React.ReactNode;
  publishableKey: string;
};

export const AppClerkProvider: React.FC<AppClerkProviderProps> = ({
  children,
  publishableKey,
}) => (
  <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
    {children}
  </ClerkProvider>
);

export { useAuth, useSignIn, useSignUp, useUser };
