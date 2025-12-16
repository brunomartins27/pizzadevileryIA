import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

const generateSessionId = () => Math.random().toString(36).substring(7);

function App() {
  const [sessionId, setSessionId] = useState(generateSessionId());

  const [input, setInput] = useState("");
  const initialMsg = {
    role: "assistant",
    content: 'Olá! Bem-vindo ao Pizza Bot 🍕. Digite "cardápio" para começar!',
  };
  const [messages, setMessages] = useState([initialMsg]);

  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState([]);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const messagesEndRef = useRef(null);
  const totalCart = cart.reduce((acc, item) => acc + item.preco, 0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const processBotResponse = (text) => {
    const regex = /:::ADD:(.*?)\|(.*?):::/g;
    let match;
    let newItems = [];

    while ((match = regex.exec(text)) !== null) {
      const nome = match[1];
      const preco = parseFloat(match[2]);
      if (nome && !isNaN(preco)) newItems.push({ nome, preco });
    }

    const cleanText = text.replace(regex, "").trim();
    if (newItems.length > 0) setCart((prev) => [...prev, ...newItems]);

    return cleanText;
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
        },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) throw new Error("Erro na API");
      const data = await response.json();

      const visibleText = processBotResponse(data.response);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: visibleText },
      ]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Erro de conexão. Verifique o Docker.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = () => {
    setOrderSuccess(true);
  };

  const resetOrder = () => {
    setCart([]);
    setOrderSuccess(false);
    setSessionId(generateSessionId());
    setMessages([initialMsg]);
  };

  const styles = {
    appContainer: {
      display: "flex",
      height: "100vh",
      backgroundColor: "#1a1a2e",
      color: "#e0e0e0",
      fontFamily: "Segoe UI, sans-serif",
    },
    chatSection: {
      flex: 2,
      display: "flex",
      flexDirection: "column",
      borderRight: "1px solid #2f2f4f",
      position: "relative",
    },
    cartSection: {
      flex: 1,
      backgroundColor: "#16213e",
      padding: "25px",
      display: "flex",
      flexDirection: "column",
      boxShadow: "-5px 0 15px rgba(0,0,0,0.2)",
      position: "relative",
    },
    header: {
      padding: "20px",
      textAlign: "center",
      backgroundColor: "#0f3460",
      boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
      zIndex: 10,
    },
    messagesArea: {
      flex: 1,
      overflowY: "auto",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "15px",
      backgroundImage: "radial-gradient(#2f2f4f 1px, transparent 1px)",
      backgroundSize: "20px 20px",
    },
    messageBubble: (role) => ({
      alignSelf: role === "user" ? "flex-end" : "flex-start",
      maxWidth: "80%",
      padding: "15px 20px",
      borderRadius: "20px",
      borderBottomRightRadius: role === "user" ? "5px" : "20px",
      borderBottomLeftRadius: role === "assistant" ? "5px" : "20px",
      backgroundColor: role === "user" ? "#e94560" : "#32325d",
      color: "#fff",
      boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
    }),
    inputArea: {
      padding: "20px",
      backgroundColor: "#1a1a2e",
      borderTop: "1px solid #2f2f4f",
      display: "flex",
      gap: "10px",
    },
    inputField: {
      flex: 1,
      padding: "15px 20px",
      borderRadius: "30px",
      border: "none",
      backgroundColor: "#2f2f4f",
      color: "white",
      fontSize: "16px",
      outline: "none",
    },
    sendButton: {
      padding: "15px 30px",
      borderRadius: "30px",
      border: "none",
      backgroundColor: "#e94560",
      color: "white",
      fontWeight: "bold",
      cursor: "pointer",
    },
    cartItem: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "10px",
      padding: "10px",
      backgroundColor: "#1f2e5a",
      borderRadius: "8px",
    },
    checkoutButton: {
      width: "100%",
      padding: "15px",
      marginTop: "20px",
      borderRadius: "30px",
      border: "none",
      backgroundColor: "#4caf50",
      color: "white",
      fontWeight: "bold",
      fontSize: "1.1rem",
      cursor: "pointer",
      transition: "all 0.3s",
    },
    disabledButton: {
      backgroundColor: "#555",
      cursor: "not-allowed",
      opacity: 0.6,
    },
    successOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(22, 33, 62, 0.95)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100,
      textAlign: "center",
      padding: "20px",
      animation: "fadeIn 0.5s ease-out",
    },
  };

  return (
    <div style={styles.appContainer}>
      {/* Esquerda: Chat */}
      <div style={styles.chatSection}>
        <div style={styles.header}>
          <h1 style={{ margin: 0 }}>🍕 Pizza Delivery IA</h1>
        </div>
        <div style={styles.messagesArea}>
          {messages.map((msg, index) => (
            <div key={index} style={styles.messageBubble(msg.role)}>
              <ReactMarkdown
                components={{
                  p: ({ node, ...props }) => (
                    <p style={{ margin: 0 }} {...props} />
                  ),
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          ))}
          {loading && (
            <div style={{ color: "#888", marginLeft: "20px" }}>
              Digitando...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div style={styles.inputArea}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !loading && sendMessage()}
            style={styles.inputField}
            placeholder="Digite sua mensagem..."
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            style={styles.sendButton}
          >
            Enviar
          </button>
        </div>
      </div>

      {/* Direita: Carrinho */}
      <div style={styles.cartSection}>
        {orderSuccess ? (
          <div style={styles.successOverlay}>
            <div style={{ fontSize: "4rem", marginBottom: "20px" }}>✅</div>
            <h2 style={{ color: "#4caf50", fontSize: "2rem" }}>
              Pedido Concluído!
            </h2>
            <p style={{ fontSize: "1.2rem", marginTop: "10px" }}>
              O pagamento foi processado.
            </p>
            <p>Total: R$ {totalCart.toFixed(2)}</p>
            <button
              onClick={resetOrder}
              style={{
                ...styles.checkoutButton,
                marginTop: "30px",
                backgroundColor: "#e94560",
              }}
            >
              Fazer Novo Pedido
            </button>
          </div>
        ) : (
          <>
            <h2
              style={{
                borderBottom: "2px solid #e94560",
                paddingBottom: "10px",
              }}
            >
              🛒 Seu Pedido
            </h2>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {cart.map((item, index) => (
                <div key={index} style={styles.cartItem}>
                  <span>{item.nome}</span>
                  <span style={{ fontWeight: "bold" }}>
                    R$ {item.preco.toFixed(2)}
                  </span>
                </div>
              ))}
              {cart.length === 0 && (
                <p
                  style={{
                    color: "#888",
                    textAlign: "center",
                    marginTop: "20px",
                  }}
                >
                  Carrinho vazio.
                </p>
              )}
            </div>
            <div
              style={{
                borderTop: "2px solid #e94560",
                paddingTop: "20px",
                marginTop: "auto",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                }}
              >
                <span>Total:</span>
                <span>R$ {totalCart.toFixed(2)}</span>
              </div>
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                style={
                  cart.length === 0
                    ? { ...styles.checkoutButton, ...styles.disabledButton }
                    : styles.checkoutButton
                }
              >
                {cart.length === 0 ? "Adicione itens..." : "Fechar Pedido"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
