import { createContext, useContext, useEffect, useState } from "react";
import { localApi } from "./localClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ensure profile exists for user
    const ensureProfile = async (user) => {
      if (!user) return;
      
      try {
        const { data: existingProfile } = await localApi
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        if (!existingProfile) {
          await localApi.from("profiles").insert({
            id: user.id,
            email: user.email,
            display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          });
        }
      } catch (err) {
        console.error("Profile creation error:", err);
      }
    };

    // Check session khi mount
    const checkSession = async () => {
      try {
        const { data, error } = await localApi.auth.getSession();
        if (data?.session?.user) {
          setUser(data.session.user);
          await ensureProfile(data.session.user);
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
      const { data } = localApi.auth.onAuthStateChanged(async (session) => {
        if (session?.user) {
          setUser(session.user);
          await ensureProfile(session.user);
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
