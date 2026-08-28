import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AppDataProvider } from "./contexts/AppDataContext.jsx";
import { UIProvider } from "./contexts/UIContext.jsx";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import ErrorBoundary from "./components/ui/ErrorBoundary.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <UIProvider>
          <AuthProvider>
            <AppDataProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </AppDataProvider>
          </AuthProvider>
        </UIProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
