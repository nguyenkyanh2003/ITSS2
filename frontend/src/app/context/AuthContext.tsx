import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { getApiUrl, getAssetUrl } from "../../utils/api";

interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, phone: string, password: string) => Promise<void>;
  updateUser: (rawUser: any, fallbackPhone?: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeAvatarUrl = (value?: string | null) => {
  return getAssetUrl(value);
};

const buildUserState = (rawUser: any, fallbackPhone?: string) => ({
  id: rawUser.id,
  email: rawUser.email,
  fullName: rawUser.fullName,
  phone: rawUser.phoneNumber || rawUser.phone || fallbackPhone || "0123456789",
  avatarUrl: normalizeAvatarUrl(rawUser.profile?.avatarUrl),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Fetch user profile if token exists
      fetch(getApiUrl('/api/users/me'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setUser(buildUserState(data.data.user));
          } else {
            localStorage.removeItem('token');
          }
        })
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(getApiUrl('/api/auth/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('token', data.token);
      setUser(buildUserState(data.data.user));
    } else {
      throw new Error(data.message || 'Đăng nhập thất bại');
    }
  };

  const register = async (fullName: string, email: string, phone: string, password: string) => {
    const res = await fetch(getApiUrl('/api/auth/register'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fullName, email, phoneNumber: phone, password }),
    });
    
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('token', data.token);
      setUser(buildUserState(data.data.user, phone));
    } else {
      throw new Error(data.message || 'Đăng ký thất bại');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };
 
  const updateUser = (rawUser: any, fallbackPhone?: string) => {
    setUser(buildUserState(rawUser, fallbackPhone));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        updateUser,
        logout,
        isLoading
      }}
    >
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
