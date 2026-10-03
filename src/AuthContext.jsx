import { createContext, useContext, useEffect, useState } from "react";
import { localApi } from "./localClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const ensureProfile = async (currentUser) => {
      if (!currentUser) return;

      const { data: existingProfile, error } = await localApi
        .from("profiles")
        .select("id")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (error) {
        console.error("Profile lookup error:", error);
        return;
      }

      if (!existingProfile) {
        const { error: createError } = await localApi.from("profiles").insert({
          display_name:
            currentUser.user_metadata?.full_name ||
            currentUser.email?.split("@")[0] ||
            "User",
        });
        if (createError) console.error("Profile creation error:", createError);
      }
    };

    const applySession = async (session) => {
      const nextUser = session?.user || null;
      if (!active) return;
      setUser(nextUser);
      if (nextUser) await ensureProfile(nextUser);
    };

    localApi.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) console.error("Auth error:", error);
        return applySession(data?.session || null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const { data } = localApi.auth.onAuthStateChanged((session) => {
      applySession(session).catch((error) => {
        console.error("Auth state error:", error);
      });
    });

    return () => {
      active = false;
      data?.subscription?.unsubscribe?.();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
