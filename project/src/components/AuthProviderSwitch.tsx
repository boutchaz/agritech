import React from 'react';
import { MultiTenantAuthProvider } from './MultiTenantAuthProvider';

interface AuthProviderSwitchProps {
  children: React.ReactNode;
}

export const AuthProviderSwitch = ({ children }: AuthProviderSwitchProps) => {
  return <MultiTenantAuthProvider>{children}</MultiTenantAuthProvider>;
};
