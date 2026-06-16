import React, { createContext, useContext, useEffect, useState } from "react";
import { communityClient, LOGIN_EVENT_NAME, supabase } from "@/api/communityClient";
import LoginDialog from "@/components/auth/LoginDialog";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  useEffect(() => {
    checkUserAuth();

    if (!supabase) return undefined;
    const { data } = supabase.auth.onAuthStateChange(() => {
      checkUserAuth();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const openLogin = (event) => {
      event?.preventDefault();
      setIsLoginOpen(true);
    };

    window.addEventListener(LOGIN_EVENT_NAME, openLogin);
    return () => window.removeEventListener(LOGIN_EVENT_NAME, openLogin);
  }, []);

  const checkUserAuth = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const currentUser = await communityClient.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error) {
      if (error.status && error.status !== 401) {
        setAuthError({
          type: "unknown",
          message: error.message || "Unable to load your account.",
        });
      }
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = async (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    await communityClient.auth.logout(shouldRedirect ? window.location.href : "");
  };

  const navigateToLogin = () => {
    setIsLoginOpen(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings: false,
        authError,
        appPublicSettings: null,
        logout,
        navigateToLogin,
        openLogin: () => setIsLoginOpen(true),
        closeLogin: () => setIsLoginOpen(false),
        checkAppState: checkUserAuth,
        checkUserAuth,
      }}
    >
      {children}
      <LoginDialog open={isLoginOpen} onOpenChange={setIsLoginOpen} />
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
