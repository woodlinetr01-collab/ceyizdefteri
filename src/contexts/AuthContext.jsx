import React, { createContext, useContext, useEffect, useState } from "react";
import * as authService from "../services/authService.js";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(() => authService.getSession());

  const signUp = async (payload) => setSessionState(await authService.signUp(payload));
  const signIn = async (payload) => setSessionState(await authService.signIn(payload));
  const signOut = () => { authService.signOut(); setSessionState(null); };
  const resetPassword = (payload) => authService.resetPassword(payload);

  return (
    <AuthCtx.Provider value={{ session, user: session?.user || null, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthCtx.Provider>
  );
}
