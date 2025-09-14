import { useState, useEffect, useRef } from "react";

type Message = {
  id: number;
  role: "user" | "bot";
  text: string;
};

export default function Chatbot() {
  const [open, setOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function sendMessage() {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now(), role: "user", text: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    
    // Add loading message
    const loadingMsg: Message = { id: Date.now() + 1, role: "bot", text: "..." };
    setMessages((m) => [...m, loadingMsg]);
    
    try {
      // Get conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.role === "bot" ? "assistant" : "user",
        content: msg.text
      }));

      const res = await fetch("/api/chatbot/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMsg.text,
          conversationHistory 
        }),
      });
      
      const data = await res.json();
      
      // Remove loading message and add bot response
      setMessages((m) => {
        const withoutLoading = m.filter(msg => msg.id !== loadingMsg.id);
        const botMsg: Message = { 
          id: Date.now() + 2, 
          role: "bot", 
          text: data.success ? data.message : "Désolé, je rencontre des difficultés. Veuillez réessayer." 
        };
        return [...withoutLoading, botMsg];
      });
    } catch (error) {
      // Remove loading message and add error
      setMessages((m) => {
        const withoutLoading = m.filter(msg => msg.id !== loadingMsg.id);
        const errorMsg: Message = { 
          id: Date.now() + 2, 
          role: "bot", 
          text: "Désolé, le service est temporairement indisponible. Veuillez réessayer plus tard." 
        };
        return [...withoutLoading, errorMsg];
      });
    }
  }

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Animation style for the speech bubble (fade in/out + floating)
  const bubbleAnimationStyle: React.CSSProperties = {
    animation: "bubbleFadeFloat 4s ease-in-out infinite",
    position: "absolute",
    bottom: "60px",
    left: "-170px",
    width: "160px",
    padding: "10px",
    backgroundColor: "#0ea5e9",
    color: "#fff",
    borderRadius: "15px",
    fontSize: "0.85rem",
    fontWeight: "500",
    boxShadow: "0 4px 10px rgba(14, 165, 233, 0.4)",
    userSelect: "none",
  };

  return (
    <>
      <style>
        {`
          @keyframes bubbleFadeFloat {
            0%, 100% { opacity: 0; transform: translateY(4px); }
            50% { opacity: 1; transform: translateY(0); }
          }
          /* Clignotement des yeux */
          .eye-animate ellipse {
            animation: blink 2.5s infinite;
            transform-origin: center;
          }
          .eye-animate ellipse:nth-child(1) {
            animation-delay: 0s;
          }
          .eye-animate ellipse:nth-child(2) {
            animation-delay: 0.25s;
          }
          @keyframes blink {
            0%, 100% { ry: 3; }
            50% { ry: 0.7; }
          }
        `}
      </style>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {open && (
          <div className="w-80 max-w-xs bg-white rounded-xl shadow-xl flex flex-col p-0 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-primary text-white rounded-t-xl">
              <strong>Assistant TeamMove</strong>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fermer le chat"
                className="text-xl hover:bg-primary/20 p-1 rounded"
              >
                ×
              </button>
            </div>
            <div className="flex-1 h-64 overflow-y-auto px-2 py-3 bg-gray-50 custom-scrollbar" data-testid="chat-messages">
              {messages.length === 0 && (
                <div className="text-sm text-gray-500 text-center">
                  Bonjour ! Posez-moi une question sur le site.
                </div>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  } mb-2`}
                >
                  <div
                    className={`message
                  px-3 py-2 rounded-2xl max-w-[75%] whitespace-pre-line break-words  
                  ${
                    m.role === "user"
                      ? "bg-primary text-white rounded-br-sm"
                      : "bg-gray-200 text-gray-900 rounded-bl-sm"
                  }
                  shadow-sm`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form
              className="flex items-center gap-2 bg-white px-3 py-2 border-t"
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="flex-1 rounded-full border border-gray-300 bg-gray-100 px-4 py-2 focus:outline-none focus:ring focus:ring-primary/30 transition"
                aria-label="Message"
                placeholder="Écrire un message…"
                autoComplete="off"
                data-testid="chat-input"
              />
              <button
                type="submit"
                className="w-10 h-10 bg-primary hover:bg-primary/90 rounded-full p-0 flex items-center justify-center text-white disabled:opacity-50 transition"
                disabled={!input.trim()}
                aria-label="Envoyer"
                data-testid="send-button"
              >
                <svg viewBox="0 0 24 24" width={22} height={22} fill="currentColor">
                  <path d="M2 21l21-9-21-9v7l15 2-15 2z" />
                </svg>
              </button>
            </form>
          </div>
        )}

        {/* Bouton flottant avec bulle d'idée animée */}
        <div className="relative flex items-center justify-center">
          { !open && (
            <div style={bubbleAnimationStyle}>
              Comment puis-je vous aider ?
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0ea5e9"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="inline-block ml-1"
                style={{ verticalAlign: "middle" }}
              >
                <path d="M9 10l3 3-3 3" />
                <path d="M12 13h8" />
              </svg>
            </div>
          )}

          <button
            aria-label="Ouvrir l'assistant"
            onClick={() => setOpen((s) => !s)}
            className="w-14 h-14 bg-primary hover:bg-primary/90 rounded-full shadow-xl flex items-center justify-center text-white"
          >
            {/* Robot SVG animé à yeux clignotants */}
            <svg
              viewBox="0 0 48 48"
              width={36}
              height={36}
              fill="none"
              style={{ display: "block" }}
              className="eye-animate"
            >
              {/* Corps */}
              <rect x="8" y="16" width="32" height="22" rx="11" fill="white" stroke="#0ea5e9" strokeWidth="2" />
              {/* Antenne */}
              <rect x="22" y="8" width="4" height="8" rx="2" fill="#0ea5e9" />
              {/* Oreilles */}
              <circle cx="8" cy="23" r="3" fill="#0ea5e9" />
              <circle cx="40" cy="23" r="3" fill="#0ea5e9" />
              {/* Yeux animés */}
              <ellipse cx="18" cy="27" rx="3" ry="3" fill="#0ea5e9" />
              <ellipse cx="30" cy="27" rx="3" ry="3" fill="#0ea5e9" />
              {/* Bouche */}
              <rect x="20" y="33.5" width="8" height="2" rx="1" fill="#0ea5e9" opacity="0.8" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
