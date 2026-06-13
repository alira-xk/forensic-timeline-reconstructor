import React from 'react';
import { ClerkProvider, useAuth, useUser } from '@clerk/react';
import { useSignIn, useSignUp } from '@clerk/react/legacy';

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
