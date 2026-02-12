import { createContext, useContext, useState, ReactNode } from 'react';
import { TEAM_TOKEN_KEY, ADMIN_TOKEN_KEY } from '../services/api';

interface AuthContextType {
  teamToken: string | null;
  adminToken: string | null;
  loginTeam: (token: string) => void;
  loginAdmin: (token: string) => void;
  logoutTeam: () => void;
  logoutAdmin: () => void;
  isTeamAuthenticated: boolean;
  isAdminAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [teamToken, setTeamToken] = useState<string | null>(
    sessionStorage.getItem(TEAM_TOKEN_KEY),
  );
  const [adminToken, setAdminToken] = useState<string | null>(
    sessionStorage.getItem(ADMIN_TOKEN_KEY),
  );

  const loginTeam = (token: string) => {
    sessionStorage.setItem(TEAM_TOKEN_KEY, token);
    setTeamToken(token);
  };

  const loginAdmin = (token: string) => {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    setAdminToken(token);
  };

  const logoutTeam = () => {
    sessionStorage.removeItem(TEAM_TOKEN_KEY);
    setTeamToken(null);
  };

  const logoutAdmin = () => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdminToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        teamToken,
        adminToken,
        loginTeam,
        loginAdmin,
        logoutTeam,
        logoutAdmin,
        isTeamAuthenticated: !!teamToken,
        isAdminAuthenticated: !!adminToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
