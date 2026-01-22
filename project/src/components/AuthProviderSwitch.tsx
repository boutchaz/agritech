import React from 'react';
import { MultiTenantAuthProvider } from './MultiTenantAuthProvider';

interface AuthProviderSwitchProps {
  children: React.ReactNode;
}

export const AuthProviderSwitch: React.FC<AuthProviderSwitchProps> = ({ children }) => {
  return <MultiTenantAuthProvider>{children}</MultiTenantAuthProvider>;
};
