"use client";

import React, { useState, useEffect } from "react";
import {
  Leaf,
  MessageSquare,
  BookOpen,
  Calculator,
  Shield,
  ArrowRight,
  Cpu,
  Globe,
  Users,
  DollarSign,
  Moon,
  Sun
} from "lucide-react";

export default function LandingPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("greentech_theme") as "light" | "dark";
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initialTheme = prefersDark ? "dark" : "light";
      setTheme(initialTheme);
      document.documentElement.setAttribute("data-theme", initialTheme);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("greentech_theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--bg-app)", color: "var(--text-main)", transition: "all 0.3s ease" }}>
      {/* 1. Header Navbar */}
      <header className="top-header" style={{ position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(8px)", background: "rgba(var(--bg-panel), 0.8)" }}>
        <div className="brand" style={{ cursor: "pointer" }} onClick={() => window.location.href = "/"}>
          <span className="brand-icon">
            <Leaf size={24} fill="currentColor" />
          </span>
          <span className="brand-title">GreenTech Advisor AI</span>
        </div>
        <div className="header-right" style={{ gap: "16px" }}>
          <a href="/chat" className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", fontSize: "0.85rem" }}>
            Chat Now <ArrowRight size={14} />
          </a>
          <button className="icon-btn" onClick={toggleTheme}>
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section style={{ padding: "80px 24px 60px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "10%", left: "5%", color: "var(--primary-glow)", opacity: 0.1, transform: "rotate(-20deg)" }}>
          <Leaf size={140} fill="currentColor" />
        </div>
        <div style={{ position: "absolute", bottom: "10%", right: "5%", color: "var(--primary-glow)", opacity: 0.1, transform: "rotate(40deg)" }}>
          <Leaf size={180} fill="currentColor" />
        </div>

        <div style={{ maxWidth: "800px", margin: "auto", position: "relative", zIndex: 1 }}>
          <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--primary)", fontWeight: 700, backgroundColor: "var(--primary-glow)", padding: "6px 14px", borderRadius: "20px" }}>
            RAG-Powered AI Platform
          </span>
          <h1 style={{ fontSize: "2.8rem", fontWeight: 850, marginTop: "20px", marginBottom: "20px", lineHeight: "1.2", letterSpacing: "-0.02em" }}>
            Evaluating Sustainable Electronic Purchases
          </h1>
          <p style={{ fontSize: "1.1rem", color: "var(--text-sub)", lineHeight: "1.6", marginBottom: "36px", maxWidth: "680px", margin: "auto" }}>
          </p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
            <a href="/chat" className="btn-primary" style={{ padding: "12px 24px", fontSize: "0.95rem", textDecoration: "none", display: "flex", alignItems: "center", gap: "8px", borderRadius: "10px" }}>
              Launch Chat Advisor <MessageSquare size={16} />
            </a>
            <a href="/explorer" className="btn-secondary" style={{ padding: "12px 24px", fontSize: "0.95rem", textDecoration: "none", display: "flex", alignItems: "center", gap: "8px", borderRadius: "10px" }}>
              Explore Documents <BookOpen size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* 3. Research Banner Section */}
      <section style={{ padding: "0 24px 60px 24px" }}>
        <div style={{ maxWidth: "880px", margin: "auto", backgroundColor: "var(--accent-green)", color: "var(--accent-green-text)", padding: "28px", borderRadius: "18px", borderLeft: "6px solid var(--primary)", boxShadow: "var(--shadow-md)" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px" }}></h3>
          <p style={{ fontSize: "0.9rem", lineHeight: "1.5" }}>

            <br />
            <em style={{ fontWeight: 600 }}>"Assessing the Impact of Green Purchase Intention</em>
            <br /><br />
            Unlike survey-collection chatbots, this AI is a retrieval-oriented knowledge advisor. It helps users browse literature context, evaluate hardware lifecycle data, and find disposal locations.
          </p>
        </div>
      </section>

      {/* 4. Feature Navigation Grid */}
      <section style={{ padding: "40px 24px 80px 24px", backgroundColor: "var(--bg-panel)", borderTop: "1px solid var(--border-light)", borderBottom: "1px solid var(--border-light)" }}>
        <div style={{ maxWidth: "1000px", margin: "auto" }}>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 800, textAlign: "center", marginBottom: "40px" }}>Explore Platform Modules</h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
            <div className="starter-card" onClick={() => window.location.href = "/chat"} style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
              <div>
                <MessageSquare size={32} style={{ color: "var(--primary)", marginBottom: "16px" }} />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px" }}>AI Chat Advisor</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-sub)", lineHeight: "1.4" }}>
                  Chat with our LLM RAG engine to query sustainable hardware metrics, recyclers, and policies. Returns cited bracketed references.
                </p>
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600, marginTop: "16px", display: "flex", alignItems: "center", gap: "4px" }}>
                Open Chat <ArrowRight size={12} />
              </span>
            </div>

            <div className="starter-card" onClick={() => window.location.href = "/explorer"} style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
              <div>
                <BookOpen size={32} style={{ color: "var(--primary)", marginBottom: "16px" }} />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px" }}>Knowledge Explorer</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-sub)", lineHeight: "1.4" }}>
                  Browse, read, and index document segments in our sustainable database. Directly examine research insights and regulatory papers.
                </p>
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600, marginTop: "16px", display: "flex", alignItems: "center", gap: "4px" }}>
                Browse Files <ArrowRight size={12} />
              </span>
            </div>

            <div className="starter-card" onClick={() => window.location.href = "/recommendations"} style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
              <div>
                <Calculator size={32} style={{ color: "var(--primary)", marginBottom: "16px" }} />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px" }}>Savings Calculator</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-sub)", lineHeight: "1.4" }}>
                  Estimate carbon emissions and electrical energy bill reductions by choosing green hardware. Search local recycling centers.
                </p>
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600, marginTop: "16px", display: "flex", alignItems: "center", gap: "4px" }}>
                Compute Savings <ArrowRight size={12} />
              </span>
            </div>

            <div className="starter-card" onClick={() => window.location.href = "/admin"} style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
              <div>
                <Shield size={32} style={{ color: "var(--primary)", marginBottom: "16px" }} />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px" }}>Admin & Analytics</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-sub)", lineHeight: "1.4" }}>
                  Upload raw files, trigger database re-indexing, and review conversational quality ratings, likes, and dislikes logs.
                </p>
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600, marginTop: "16px", display: "flex", alignItems: "center", gap: "4px" }}>
                Access Console <ArrowRight size={12} />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Theory Section */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: "1000px", margin: "auto" }}>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 800, textAlign: "center", marginBottom: "16px" }}>The Undergraduates Study Framework</h2>
          <p style={{ fontSize: "0.95rem", color: "var(--text-sub)", textAlign: "center", marginBottom: "48px", maxWidth: "600px", margin: "auto" }}>
            The research measures the impact of four independent variables on the green purchase intention of electronic hardware:
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginTop: "24px" }}>
            <div style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-light)", padding: "24px", borderRadius: "14px" }}>
              <div style={{ backgroundColor: "var(--primary-glow)", color: "var(--primary)", width: "40px", height: "40px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                <Globe size={20} />
              </div>
              <h4 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "8px" }}>Environmental Concern</h4>
              <p style={{ fontSize: "0.8rem", color: "var(--text-sub)", lineHeight: "1.4" }}>
                An individual's general worry about environmental health, which serves as a motivational base but faces an "attitude-behavior gap" due to financial limits.
              </p>
            </div>

            <div style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-light)", padding: "24px", borderRadius: "14px" }}>
              <div style={{ backgroundColor: "var(--primary-glow)", color: "var(--primary)", width: "40px", height: "40px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                <Cpu size={20} />
              </div>
              <h4 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "8px" }}>Green Product Knowledge</h4>
              <p style={{ fontSize: "0.8rem", color: "var(--text-sub)", lineHeight: "1.4" }}>
                Familiarity with hardware certificates (EPEAT, EnergyStar, TCO), battery health, conflicts, and repairability. Higher knowledge lowers information asymmetry barriers.
              </p>
            </div>

            <div style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-light)", padding: "24px", borderRadius: "14px" }}>
              <div style={{ backgroundColor: "var(--primary-glow)", color: "var(--primary)", width: "40px", height: "40px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                <Users size={20} />
              </div>
              <h4 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "8px" }}>Social Influence</h4>
              <p style={{ fontSize: "0.8rem", color: "var(--text-sub)", lineHeight: "1.4" }}>
                The peer pressure and expectations from department colleagues, professors, and university leadership, which shapes the choice of device procurement.
              </p>
            </div>

            <div style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-light)", padding: "24px", borderRadius: "14px" }}>
              <div style={{ backgroundColor: "var(--primary-glow)", color: "var(--primary)", width: "40px", height: "40px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                <DollarSign size={20} />
              </div>
              <h4 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "8px" }}>Willingness to Pay</h4>
              <p style={{ fontSize: "0.8rem", color: "var(--text-sub)", lineHeight: "1.4" }}>
                The cost barrier in the Sri Lankan economic context. Balanced against long-term energy savings and modular upgrades to reduce lifetime expenses.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer style={{ marginTop: "auto", padding: "30px 24px", backgroundColor: "var(--bg-panel)", borderTop: "1px solid var(--border-light)", textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)" }}>
        <p style={{ marginBottom: "8px" }}>© 2026 GreenTech Advisor AI - Sri Lanka State Universities IT Undergraduates Research Project.</p>
        <p>Decoupled RAG System | Local In-Memory DB Enabled | Local Time: 2026-08-02</p>
      </footer>
    </div>
  );
}
