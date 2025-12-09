import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session khi mount
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (data?.session?.user) {
          setUser(data.session.user);
        }
        setLoading(false);
      } catch (err) {
        console.error("Auth error:", err);
        setLoading(false);
      }
    };

    checkSession();

    // Simple auth state change listener
    try {
      const { data } = supabase.auth.onAuthStateChanged((session) => {
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
      });
    } catch (err) {
      console.warn("Auth listener not available:", err);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
