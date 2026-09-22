"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Leaf,
  Trash2,
  Edit3,
  Plus,
  Menu,
  X,
  Moon,
  Sun,
  ThumbsUp,
  ThumbsDown,
  Copy,
  BookOpen,
  Cpu,
  Check,
  Home,
  Calculator,
  Shield
} from "lucide-react";

interface SourceCitation {
  id: number;
  documentName: string;
  snippet: string;
}

interface Message {
  id: string;
  sessionId: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  sources?: SourceCitation[];
  feedback?: {
    rating: "like" | "dislike";
    comment?: string;
  };
}

interface Session {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

const BACKEND_URL = "http://localhost:8000";

export default function GreenTechChat() {
  const [userId, setUserId] = useState<string>("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const [editingSessionId, setEditingSessionId] = useState<string>("");
  const [editTitleText, setEditTitleText] = useState<string>("");

  const [copiedMessageId, setCopiedMessageId] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let localUserId = localStorage.getItem("greentech_user_id");
    if (!localUserId) {
      localUserId = "user_" + Math.random().toString(36).substring(2, 11);
      localStorage.setItem("greentech_user_id", localUserId);
    }
    setUserId(localUserId);

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

  useEffect(() => {
    if (!userId) return;
    fetchSessions();
  }, [userId]);

  useEffect(() => {
    if (!activeSessionId || !userId) {
      setMessages([]);
      return;
    }
    fetchMessages(activeSessionId);
  }, [activeSessionId, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight - 8, 140)}px`;
    }
  }, [inputText]);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/conversations`, {
        headers: { "X-User-ID": userId }
      });
      if (res.ok) {
        const data = await res.json();
        const mappedSessions = data.map((c: any) => ({
          id: c.id,
          userId: c.user_id,
          title: c.title || "New Consultation",
          createdAt: c.created_at,
          updatedAt: c.created_at
        }));
        setSessions(mappedSessions);
        if (mappedSessions.length > 0 && !activeSessionId) {
          setActiveSessionId(mappedSessions[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching sessions:", err);
    }
  };

  const fetchMessages = async (sessionId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/conversations/${sessionId}/messages`, {
        headers: { "X-User-ID": userId }
      });
      if (res.ok) {
        const data = await res.json();
        const mappedMessages = data.map((m: any) => {
          // Extract citations from message content if present
          let sourcesList: SourceCitation[] = [];
          if (m.sender_type === "assistant" && m.message_content.includes("*[Source:")) {
            const parts = m.message_content.split("*[Source:");
            if (parts.length > 1) {
              const citationText = parts[1].replace("]*", "").trim();
              const citations = citationText.split("|").map((c: string) => c.trim());
              sourcesList = citations.map((cit: string, index: number) => ({
                id: index + 1,
                documentName: cit,
                snippet: "Referenced literature parameters."
              }));
            }
          }
          return {
            id: m.id,
            sessionId: m.conversation_id,
            sender: m.sender_type,
            text: m.message_content,
            timestamp: m.timestamp,
            sources: sourcesList
          };
        });
        setMessages(mappedMessages);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  const handleNewChat = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": userId
        }
      });
      if (res.ok) {
        const c = await res.json();
        const newSession: Session = {
          id: c.id,
          userId: c.user_id,
          title: c.title || "New Consultation",
          createdAt: c.created_at,
          updatedAt: c.created_at
        };
        setSessions((prev) => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        setSidebarOpen(false);
      }
    } catch (err) {
      console.error("Error creating new session:", err);
    }
  };

  const handleRenameSession = async (sessionId: string) => {
    if (!editTitleText.trim()) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/conversations/${sessionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": userId
        },
        body: JSON.stringify({ title: editTitleText.trim() }),
      });
      if (res.ok) {
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, title: editTitleText.trim() } : s))
        );
        setEditingSessionId("");
        setEditTitleText("");
      }
    } catch (err) {
      console.error("Error renaming session:", err);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this chat history?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/conversations/${sessionId}`, {
        method: "DELETE",
        headers: { "X-User-ID": userId }
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (activeSessionId === sessionId) {
          const remaining = sessions.filter((s) => s.id !== sessionId);
          if (remaining.length > 0) {
            setActiveSessionId(remaining[0].id);
          } else {
            setActiveSessionId("");
          }
        }
      }
    } catch (err) {
      console.error("Error deleting session:", err);
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("greentech_theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = textToSend || inputText;
    if (!messageContent.trim() || isGenerating) return;

    setInputText("");
    let currentSessionId = activeSessionId;

    if (!currentSessionId) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/conversations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-ID": userId
          }
        });
        if (res.ok) {
          const newSession = await res.json();
          currentSessionId = newSession.id;
          setActiveSessionId(currentSessionId);
          setSessions((prev) => [{
            id: newSession.id,
            userId: newSession.user_id,
            title: newSession.title || "New Consultation",
            createdAt: newSession.created_at,
            updatedAt: newSession.created_at
          }, ...prev]);
        } else {
          console.error("Failed to initialize session");
          return;
        }
      } catch (err) {
        console.error("Error auto-creating session:", err);
        return;
      }
    }

    const tempUserMsg: Message = {
      id: "temp_user_msg",
      sessionId: currentSessionId,
      sender: "user",
      text: messageContent,
      timestamp: new Date().toISOString(),
    };

    const tempBotMsg: Message = {
      id: "temp_bot_msg",
      sessionId: currentSessionId,
      sender: "assistant",
      text: "",
      timestamp: new Date().toISOString(),
      sources: [],
    };

    setMessages((prev) => [...prev, tempUserMsg, tempBotMsg]);
    setIsGenerating(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": userId,
        },
        body: JSON.stringify({
          message: messageContent,
          conversation_id: currentSessionId,
        }),
      });

      if (!response.ok) {
        throw new Error("API call failed");
      }

      const data = await response.json();

      const formattedSources = data.sources.map((s: string, index: number) => ({
        id: index + 1,
        documentName: s,
        snippet: "Referenced study details."
      }));

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === "temp_bot_msg"
            ? {
              id: `bot_${Date.now()}`,
              sessionId: currentSessionId,
              sender: "assistant",
              text: data.response,
              timestamp: new Date().toISOString(),
              sources: formattedSources,
            }
            : msg
        )
      );

      fetchSessions();

    } catch (error) {
      console.error("API connection error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === "temp_bot_msg"
            ? { ...msg, text: "⚠️ Server connectivity failed. Please verify that your Python FastAPI server is active." }
            : msg
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyText = (text: string, messageId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(""), 2000);
  };

  const handleRateMessage = (messageId: string, rating: "like" | "dislike") => {
    // Update rating state
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, feedback: { rating } } : m
      )
    );
  };

  const renderMessageContent = (msg: Message) => {
    const text = msg.text;
    if (!text) return null;

    // Exclude source footer
    const displayParts = text.split("*[Source:");
    const mainText = displayParts[0].trim();

    const lines = mainText.split("\n");
    return lines.map((line, lineIdx) => {
      if (line.startsWith("### ")) {
        return <h3 key={lineIdx} className="text-md font-bold mt-3 mb-2">{line.substring(4)}</h3>;
      }
      if (line.startsWith("## ")) {
        return <h2 key={lineIdx} className="text-lg font-bold mt-4 mb-2">{line.substring(3)}</h2>;
      }
      if (line.startsWith("# ")) {
        return <h1 key={lineIdx} className="text-xl font-bold mt-4 mb-2">{line.substring(2)}</h1>;
      }

      if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
        const content = line.trim().substring(2);
        return (
          <li key={lineIdx} className="list-disc ml-4">
            {formatBold(content)}
          </li>
        );
      }

      const numMatch = line.trim().match(/^(\d+)\.\s+(.+)$/);
      if (numMatch) {
        const content = numMatch[2];
        return (
          <li key={lineIdx} className="list-decimal ml-4">
            {formatBold(content)}
          </li>
        );
      }

      // Parse markdown tables
      if (line.startsWith("|") && line.endsWith("|")) {
        // Skip separators
        if (line.includes("---")) return null;
        const columns = line.split("|").map(col => col.trim()).filter(col => col !== "");
        return (
          <div key={lineIdx} className="flex gap-4 border-b border-light py-2 px-1 text-xs">
            {columns.map((col, cIdx) => (
              <span key={cIdx} className="flex-1 font-medium">{formatBold(col)}</span>
            ))}
          </div>
        );
      }

      return (
        <p key={lineIdx} className="mb-2">
          {formatBold(line)}
        </p>
      );
    });
  };

  const formatBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={idx} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="app-container">
      {sidebarOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 5, background: "rgba(0,0,0,0.2)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="brand" style={{ cursor: "pointer" }} onClick={() => window.location.href = "/"}>
            <span className="brand-icon">
              <Leaf size={24} fill="currentColor" />
            </span>
            <span className="brand-title">GreenTech AI</span>
          </div>
          <button className="new-chat-btn" onClick={handleNewChat}>
            <Plus size={16} />
            New Advisor Chat
          </button>
        </div>

        <div className="session-list-container">
          <div className="session-list-label">Conversations</div>
          {sessions.length === 0 ? (
            <div style={{ padding: "8px 12px", fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
              No chat logs recorded.
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className={`session-item ${activeSessionId === s.id ? "active" : ""}`}
                onClick={() => {
                  setActiveSessionId(s.id);
                  setSidebarOpen(false);
                }}
              >
                <div className="session-details">
                  <BookOpen size={14} style={{ color: "var(--primary)", flexShrink: 0 }} />
                  {editingSessionId === s.id ? (
                    <input
                      type="text"
                      className="session-title-text"
                      style={{
                        background: "var(--bg-app)",
                        border: "1px solid var(--primary)",
                        color: "var(--text-main)",
                        padding: "2px 4px",
                        borderRadius: "4px",
                        outline: "none",
                        width: "100%",
                      }}
                      value={editTitleText}
                      onChange={(e) => setEditTitleText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameSession(s.id);
                        if (e.key === "Escape") setEditingSessionId("");
                      }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="session-title-text">{s.title}</span>
                  )}
                </div>

                <div className="session-actions" onClick={(e) => e.stopPropagation()}>
                  {editingSessionId === s.id ? (
                    <button className="session-action-btn" onClick={() => handleRenameSession(s.id)}>
                      <Check size={12} />
                    </button>
                  ) : (
                    <>
                      <button
                        className="session-action-btn"
                        onClick={() => {
                          setEditingSessionId(s.id);
                          setEditTitleText(s.title);
                        }}
                      >
                        <Edit3 size={12} />
                      </button>
                      <button className="session-action-btn delete" onClick={(e) => handleDeleteSession(s.id, e)}>
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="sidebar-footer" style={{ justifyContent: "flex-end" }}>
          <button className="icon-btn" onClick={toggleTheme}>
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </aside>

      {/* Main Chat Application */}
      <main className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-left">
            <button className="sidebar-toggle-btn" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="chat-title-container">
              <span className="chat-title">
                {sessions.find((s) => s.id === activeSessionId)?.title || "GreenTech Advisor AI"}
              </span>
              <span className="chat-subtitle">Environmentally Responsible Electronics Assistant</span>
            </div>
          </div>

          {/* Central Navigation Links */}
          <nav style={{ display: "flex", gap: "20px", alignItems: "center" }}>
            <a href="/" style={{ color: "var(--text-sub)", fontSize: "0.85rem", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }} className="nav-link">
              <Home size={14} /> Home
            </a>
            <a href="/explorer" style={{ color: "var(--text-sub)", fontSize: "0.85rem", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }} className="nav-link">
              <BookOpen size={14} /> Explorer
            </a>
            <a href="/recommendations" style={{ color: "var(--text-sub)", fontSize: "0.85rem", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }} className="nav-link">
              <Calculator size={14} /> Calculator
            </a>
            <a href="/admin" style={{ color: "var(--text-sub)", fontSize: "0.85rem", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }} className="nav-link">
              <Shield size={14} /> Admin
            </a>
          </nav>

          <div className="header-right">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.75rem",
                color: "var(--accent-green-text)",
                backgroundColor: "var(--accent-green)",
                padding: "6px 12px",
                borderRadius: "20px",
                fontWeight: 600,
              }}
            >
              <span style={{ width: "6px", height: "6px", backgroundColor: "#10B981", borderRadius: "50%", display: "inline-block" }} />
            </div>
          </div>
        </header>

        {/* Message Window */}
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="welcome-container">
              <div className="welcome-logo">
                <Leaf size={64} fill="currentColor" />
              </div>
              <h1 className="welcome-title">GreenTech Advisor AI</h1>
              <p className="welcome-description">
                Ask me questions about sustainable laptops, eco-friendly smartphones, E-waste disposal policies,
                repairability scores, conflict-free mineral sourcing, and green purchase decisions.
              </p>



              <div className="starters-grid">
                <div
                  className="starter-card"
                  onClick={() => handleSendMessage("What is green electronics?")}
                >
                  <span className="starter-title">Eco Certifications</span>
                  <span className="starter-prompt">"What is green electronics?"</span>
                </div>
                <div
                  className="starter-card"
                  onClick={() => handleSendMessage("How can I recycle my old phone?")}
                >
                  <span className="starter-title">E-Waste Disposal</span>
                  <span className="starter-prompt">"How can I recycle my old phone?"</span>
                </div>
                <div
                  className="starter-card"
                  onClick={() =>
                    handleSendMessage("I want to buy a laptop for software engineering.")
                  }
                >
                  <span className="starter-title">Recommendation</span>
                  <span className="starter-prompt">"I want to buy a laptop for software engineering."</span>
                </div>
                <div
                  className="starter-card"
                  onClick={() =>
                    handleSendMessage("Green products cost too much.")
                  }
                >
                  <span className="starter-title">Problem Solving</span>
                  <span className="starter-prompt">"Green products cost too much."</span>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`message-row ${msg.sender === "user" ? "user" : "bot"}`}>
                {msg.sender === "assistant" && (
                  <div className="message-avatar bot">
                    <Leaf size={16} fill="currentColor" />
                  </div>
                )}
                <div className="message-bubble">
                  {msg.id === "temp_bot_msg" && !msg.text ? (
                    <div className="typing-indicator">
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                    </div>
                  ) : (
                    renderMessageContent(msg)
                  )}

                  {msg.sender === "assistant" && msg.sources && msg.sources.length > 0 && (
                    <details className="mt-4 border border-light rounded-lg bg-panel overflow-hidden transition-all duration-300">
                      <summary className="cursor-pointer select-none py-2 px-3 text-xs font-semibold flex items-center gap-2 hover:bg-hover color-primary">
                        <BookOpen size={12} /> 📚 Cited Knowledge Base Sources ({msg.sources.length})
                      </summary>
                      <div className="py-2 px-3 text-xs border-t border-light flex flex-col gap-2 bg-app">
                        {msg.sources.map((src) => (
                          <div
                            key={src.id}
                            className="p-2 border border-light rounded bg-panel leading-relaxed"
                          >
                            <div className="font-semibold mb-1 text-[11px] color-primary">
                              [{src.id}] Reference Document: {src.documentName}
                            </div>
                            <div className="text-[10px] text-muted italic">
                              Category source verified in state university RAG pipeline context.
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {msg.sender === "assistant" && msg.id !== "temp_bot_msg" && (
                    <div className="message-actions-bar">
                      <button
                        className="message-action-icon-btn"
                        title="Copy Response"
                        onClick={() => handleCopyText(msg.text, msg.id)}
                      >
                        {copiedMessageId === msg.id ? (
                          <Check size={14} style={{ color: "var(--primary)" }} />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>

                      <button
                        className={`message-action-icon-btn ${msg.feedback?.rating === "like" ? "liked" : ""}`}
                        title="Thumb Up (Helpful)"
                        onClick={() => handleRateMessage(msg.id, "like")}
                        disabled={!!msg.feedback}
                      >
                        <ThumbsUp size={14} fill={msg.feedback?.rating === "like" ? "currentColor" : "none"} />
                      </button>

                      <button
                        className={`message-action-icon-btn ${msg.feedback?.rating === "dislike" ? "disliked" : ""}`}
                        title="Thumb Down (Unhelpful/Incorrect)"
                        onClick={() => handleRateMessage(msg.id, "dislike")}
                        disabled={!!msg.feedback}
                      >
                        <ThumbsDown size={14} fill={msg.feedback?.rating === "dislike" ? "currentColor" : "none"} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {isGenerating && messages[messages.length - 1]?.sender === "user" && (
            <div className="message-row bot">
              <div className="message-avatar bot">
                <Leaf size={16} fill="currentColor" />
              </div>
              <div className="message-bubble">
                <div className="typing-indicator">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Area */}
        <div className="chat-input-panel">
          <div className="chat-input-wrapper">
            <textarea
              ref={textareaRef}
              rows={1}
              className="chat-textarea"
              placeholder="Ask about green tech, E-waste disposal, or sustainable devices..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isGenerating}
            />
            <button
              className="send-btn"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isGenerating}
            >
              <Send size={16} />
            </button>
          </div>
          <div className="chat-input-disclaimer">
            GreenTech Advisor AI can assist in evaluating hardware, carbon footprints, and e-waste locations.
          </div>
        </div>
      </main>
    </div>
  );
}
