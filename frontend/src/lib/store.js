import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api";
import { createClient } from "./supabase/client";

const AppCtx = createContext(null);

async function getProfile() {
  const response = await api.get("/auth/profile");
  return response.data;
}

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState("id");
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    let active = true;
    setLang(localStorage.getItem("nk_lang") || "id");
    const supabase = createClient();

    supabase.auth.getSession()
      .then(async ({ data, error }) => {
        if (error) throw error;
        if (data.session) {
          try {
            const profile = await getProfile();
            if (active) setUser(profile);
          } catch (profileError) {
            if (profileError.response?.status !== 404 && profileError.response?.status !== 403) {
              console.error("Unable to load the signed-in user profile.", profileError);
            }
          }
        }
      })
      .catch((error) => console.error("Unable to restore the Supabase session.", error))
      .finally(() => {
        if (active) setBootstrapped(true);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        return;
      }
      queueMicrotask(async () => {
        try {
          const profile = await getProfile();
          if (active) setUser(profile);
        } catch (error) {
          if (error.response?.status !== 404 && error.response?.status !== 403) {
            console.error("Unable to refresh the signed-in user profile.", error);
          }
        }
      });
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("nk_lang", lang);
  }, [lang]);

  const login = useCallback(async (email, password) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const profile = await getProfile();
    setUser(profile);
    return profile;
  }, []);

  const signup = useCallback(async (data) => {
    const supabase = createClient();
    const { data: result, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: new URL("/auth/callback?next=/signin", window.location.origin).toString(),
        data: {
          name: data.name,
          role: data.role,
          city: data.city,
        },
      },
    });
    if (error) throw error;
    if (!result.session) return null;

    const response = await api.post("/auth/profile", {
      name: data.name,
      role: data.role,
      city: data.city,
    });
    setUser(response.data);
    return response.data;
  }, []);

  const resetPassword = useCallback(async (email) => {
    const supabase = createClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", "/signin?reset=complete");
    const redirectTo = callbackUrl.toString();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  }, []);

  return (
    <AppCtx.Provider value={{ user, lang, setLang, login, signup, resetPassword, logout, bootstrapped }}>
      {children}
    </AppCtx.Provider>
  );
};

export const useApp = () => useContext(AppCtx);
