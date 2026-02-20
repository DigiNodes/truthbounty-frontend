'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  address: string;
  ens?: string;
}

interface AuthContextType {
  user: User | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if wallet is already connected
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      // This would integrate with wagmi/rainbowkit
      // For now, we'll simulate a connected state
      const address = localStorage.getItem('walletAddress');
      if (address) {
        setUser({ address });
      }
    } catch (error) {
      console.error('Failed to check connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const connect = async () => {
    try {
      // This would integrate with wagmi/rainbowkit
      // For now, we'll simulate connecting
      const mockAddress = '0x1234567890123456789012345678901234567890';
      setUser({ address: mockAddress });
      localStorage.setItem('walletAddress', mockAddress);
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  };

  const disconnect = () => {
    setUser(null);
    localStorage.removeItem('walletAddress');
  };

  const value = {
    user,
    isConnected: !!user,
    connect,
    disconnect,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
