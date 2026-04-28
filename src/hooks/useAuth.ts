import { useCallback, useState } from "react";

type User = {
  username: string;
};

type AuthState = {
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, password: string) => void;
  logout: () => void;
};

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback((username: string, _password: string) => {
    setUser({ username });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  return {
    isAuthenticated: user !== null,
    user,
    login,
    logout,
  };
}
