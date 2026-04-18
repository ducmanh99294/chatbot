import React, { useEffect, useRef, useState } from 'react';
import '../assets/chatAiHome.css';
import { useAuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { ChatAi } from '../api/chatApi';
import ReactMarkdown from 'react-markdown';


function App() {
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const { socket } = useSocket();
  
    useEffect(() => {
      if (!socket) return;
  
      const handleAiReply = (data: any) => {
        console.log(data);
        if (data.message.type === "product") {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", type: "text", message: data.message.message },
            { role: "assistant", type: "product_list", products: data.message.products },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", 
              type: "text", 
              message: data.message.message || "Xin lỗi, tôi không đọc được dữ liệu." 
            },
          ]);
        }
        setIsTyping(false);
      };
  
      socket.on("ai_reply", handleAiReply);
  
      return () => {
        socket.off("ai_reply", handleAiReply);
      };
    }, [socket]);
  
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);
  
    const sendMessage = async () => {
      if (!input.trim()) return;
  
      const newMessage: any = { role: "user", type: "text", message: input };
      setMessages((prev) => [...prev, newMessage]);
      setIsTyping(true);
      setInput("");
  
      if (socket?.connected) {
        socket.emit("send_message", { message: input });
      } else {
        const res = await ChatAi(input);
        setMessages((prev) => [...prev, { role: "assistant", type: "text", message: res.reply }]);
        setIsTyping(false);
      }
    };
  
  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">🎓</div>
            <span className="logo-text">EduBot</span>
          </div>
          <button className="new-chat-btn">
            <svg className="plus-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Chat mới
          </button>
        </div>
        
        <div className="chat-history">
          <div className="history-item active">
            <svg className="history-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Hôm nay - Giải toán</span>
          </div>
          <div className="history-item">
            <svg className="history-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Phân tích văn học</span>
          </div>
          <div className="history-item">
            <svg className="history-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Tiếng Anh giao tiếp</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="chat-container">
          {/* Header */}
          <header className="chat-header">
            <h1>EduBot - Trợ lý học tập thông minh</h1>
            <div className="header-actions">
              <button className="theme-toggle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              </button>
              <div className="user-avatar">👨‍🎓</div>
            </div>
          </header>

          {/* Welcome Section */}
          {/* <div className="welcome-section">
            <div className="welcome-icon">🎯</div>
            <h2>Xin chào! Tôi có thể giúp gì cho việc học của bạn?</h2>
            <p>Hỏi tôi bất cứ điều gì về môn học, bài tập, hay kiến thức bạn cần</p>
          </div> */}

          {/* Features Grid */}
          {/* <div className="features-grid">
            {sampleFeatures.map((feature) => (
              <div 
                key={feature.id} 
                className="feature-card"
                onClick={() => handleSendMessage(feature.prompt)}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div> */}

          {/* Sample Questions */}
          {/* <div className="questions-section">
            <h3>Câu hỏi gợi ý:</h3>
            <div className="questions-list">
              {sampleQuestions.map((question, index) => (
                <button 
                  key={index} 
                  className="question-chip"
                  onClick={() => handleSendMessage(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          </div> */}

<div className="chat-body">
            {messages.length === 0 ? (
              // 1. Nếu chưa chat: Hiển thị màn hình Welcome ở giữa
              <div className="welcome-section">
                <div className="welcome-icon">🎯</div>
                <h2>Xin chào! Tôi có thể giúp gì cho việc học của bạn?</h2>
                <p>Hỏi tôi bất cứ điều gì về môn học, bài tập, hay kiến thức bạn cần</p>
                {/* Các Features Grid / Questions Section của bạn để ở đây */}
              </div>
            ) : (
              // 2. Nếu đã chat: Hiển thị danh sách tin nhắn
              <div className="messages-list">
                {/* Bắt buộc phải có vòng lặp .map này thì mới có biến "msg" */}
                {messages.map((msg, index) => (
    <div key={index} className={`message-wrapper ${msg.role === 'user' ? 'is-user' : 'is-ai'}`}>
      <div className="message-bubble">
        
        {/* Bọc ReactMarkdown bên trong vòng lặp */}
        <ReactMarkdown 
          components={{
            a: ({node, ...props}) => (
              <a 
                {...props} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{color: '#007bff', textDecoration: 'underline'}} 
              />
            )
          }}
        >
          {msg.message}
        </ReactMarkdown>

      </div>
    </div>
  ))}
  
  {/* Hiển thị Typing Indicator ngay dưới tin nhắn cuối cùng */}
  {isTyping && (
    <div className="message-wrapper is-ai">
      <div className="typing-indicator">
        <div className="typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  )}
  
  {/* Thẻ div ẩn để tự động cuộn xuống đáy */}
  <div ref={messagesEndRef} />
</div>
            )}
          </div>

          {/* Input Area */}
          <div className="input-area">
            <div className="input-container">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Hỏi EduBot về bài tập, kiến thức..."
                rows="1"
              />
              <button 
                className="send-btn"
                onClick={() => sendMessage()}
                disabled={!input.trim()}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </div>
            <div className="input-note">
              <span>EduBot có thể mắc sai sót. Hãy kiểm tra thông tin quan trọng.</span>
            </div>
          </div>
        </div>
      </main>

      {/* Typing Indicator */}
      {isTyping && (
        <div className="typing-indicator">
          <div className="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;