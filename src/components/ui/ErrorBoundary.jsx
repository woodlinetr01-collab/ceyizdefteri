import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("Uygulama hatası:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, padding: 24, textAlign: "center", fontFamily: "system-ui, sans-serif", background: "#F5F3EC", color: "#152238" }}>
          <h2 style={{ margin: 0 }}>Bir şeyler ters gitti</h2>
          <p style={{ maxWidth: 420, color: "#5b6472" }}>
            Beklenmeyen bir hata oluştu. Verileriniz tarayıcınızda güvende — sayfayı yenilemeyi deneyin.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ background: "#152238", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 9, cursor: "pointer", fontSize: 14 }}
          >
            Sayfayı Yenile
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
