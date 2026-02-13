import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TEAM_TOKEN_KEY, ADMIN_TOKEN_KEY } from '../services/api';

interface AuthContextType {
  teamToken: string | null;
  teamName: string | null;
  teamPassword: string | null;
  adminToken: string | null;
  loginTeam: (token: string, name: string, password: string) => void;
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
  const [teamName, setTeamName] = useState<string | null>(
    sessionStorage.getItem('TEAM_NAME')
  );
  const [teamPassword, setTeamPassword] = useState<string | null>(
    sessionStorage.getItem('TEAM_PASSWORD')
  );
  const [adminToken, setAdminToken] = useState<string | null>(
    sessionStorage.getItem(ADMIN_TOKEN_KEY),
  );

  // 토큰이 없으면 관련 정보도 모두 삭제 (동기화)
  useEffect(() => {
    if (!teamToken) {
      sessionStorage.removeItem(TEAM_TOKEN_KEY);
      sessionStorage.removeItem('TEAM_NAME');
      sessionStorage.removeItem('TEAM_PASSWORD');
      setTeamName(null);
      setTeamPassword(null);
    }
  }, [teamToken]);

  const loginTeam = (token: string, name: string, password: string) => {
    sessionStorage.setItem(TEAM_TOKEN_KEY, token);
    sessionStorage.setItem('TEAM_NAME', name);
    sessionStorage.setItem('TEAM_PASSWORD', password);
    setTeamToken(token);
    setTeamName(name);
    setTeamPassword(password);
  };

  const loginAdmin = (token: string) => {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    setAdminToken(token);
  };

  const logoutTeam = () => {
    sessionStorage.removeItem(TEAM_TOKEN_KEY);
    sessionStorage.removeItem('TEAM_NAME');
    sessionStorage.removeItem('TEAM_PASSWORD');
    setTeamToken(null);
    setTeamName(null);
    setTeamPassword(null);
  };

  const logoutAdmin = () => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdminToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        teamToken,
        teamName,
        teamPassword,
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
