import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  photo?: string;
  bio?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserProfile;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  updateUser: (data: Partial<UserProfile>) => void;
  showWelcome: boolean;
  setShowWelcome: (val: boolean) => void;
}

const DEFAULT_USER: UserProfile = {
  name: "Mayckon Dias",
  email: "vitoriaservicosdepintura@gmail.com",
  phone: "+55 (11) 98765-4321",
  photo: "https://github.com/shadcn.png",
  bio: "Consultor Imobiliário Sênior especializado em mercado de luxo."
};

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem("crm_auth") === "true"
  );
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem("crm_user");
    return saved ? JSON.parse(saved) : DEFAULT_USER;
  });
  const [showWelcome, setShowWelcome] = useState(false);

  const login = (email: string, password: string) => {
    if (
      email === "vitoriaservicosdepintura@gmail.com" &&
      password === "10203040"
    ) {
      setIsAuthenticated(true);
      setShowWelcome(true);
      localStorage.setItem("crm_auth", "true");
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("crm_auth");
  };

  const updateUser = (data: Partial<UserProfile>) => {
    const updated = { ...user, ...data };
    setUser(updated);
    localStorage.setItem("crm_user", JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated, user, login, logout, updateUser, showWelcome, setShowWelcome
    }}>
      {children}
    </AuthContext.Provider>
  );
};
