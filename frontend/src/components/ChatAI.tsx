import { useEffect, useRef, useState } from 'react';
import '../assets/chatAi.css';
import { useSocket } from '../context/SocketContext';
import { ChatAi } from '../api/chatApi';
import ReactMarkdown from 'react-markdown';

const sampleQuestions = [
  'PTXT vào trường?',
  'cần thông tin gì khi đóng học phí',
  'phương thức xét tuyển',
  'Thực tập',
  "học bổng trường mình",

];
const ChatbotAi = () => {
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const { socket } = useSocket();
  
    useEffect(() => {
      if (!socket) return;
  
      const handleAiReply = (data: any) => {

        console.log(data)
        const msg = data.message;

        if (msg.type === "product") {
          setMessages((prev) => [
            ...prev,
            { 
              role: "assistant", 
              type: "text", 
              message: msg.message,
              displayLink: msg.displayLink,
              displaySuggestion: msg.displaySuggestion
            },
            { 
              role: "assistant", 
              type: "product_list", 
              products: msg.products 
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            { 
              role: "assistant",
              type: "text",
              message: msg.message || "Xin lỗi, tôi không đọc được dữ liệu.",
              displayLink: msg.displayLink || null,
              displaySuggestion: msg.displaySuggestion || null
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
  
    const sendMessage = async (customMessage?: string) => {
      const text = customMessage || input;

      if (!text.trim()) return;

      const newMessage = { role: "user", type: "text", message: text };

      setMessages((prev) => [...prev, newMessage]);
      setIsTyping(true);
      setInput("");

      if (socket?.connected) {
        socket.emit("send_message", { message: text });
      } else {
        const res = await ChatAi(text);

        setMessages((prev) => [
          ...prev,
          { role: "assistant", type: "text", message: res.reply }
        ]);

        setIsTyping(false);
      }
    };

    const handleCleanMessages = () => {
      setMessages([]);
    }

    const formatLink = (url: string) => {
      if (!url) return null;
      return url.startsWith("http") ? url : `https://${url}`;
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
          <button className="new-chat-btn" onClick={handleCleanMessages}>
            <svg className="plus-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Chat mới
          </button>
        </div>
        
{messages.length !== 0 && (
  <div className="chat-history">
    {sampleQuestions.map((question: any, index) => (
      <div 
        key={index} 
        className={`history-item`}
        onClick={() => sendMessage(question)}
      >
        <svg
          className="history-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>

        <span>{question}</span>
      </div>
    ))}
  </div>
)}
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="chat-container">
          {/* Header */}
          <header className="chat-header">
            <h1>EduBot - Trợ lý học tập thông minh</h1>

            <button 
              className="refresh-btn" 
              onClick={handleCleanMessages}
              title="Tạo đoạn chat mới"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6"></path>
                <path d="M3 12a9 9 0 1 0 2.13-5.87L2 9"></path>
              </svg>
            </button>

            <div className="header-actions">
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
              <>
              {/* 1. Nếu chưa chat: Hiển thị màn hình Welcome ở giữa */}
              <div className="welcome-section">
                <div className="welcome-icon">🎯</div>
                <h2>Xin chào! Tôi có thể giúp gì cho việc học của bạn?</h2>
                <p>Hỏi tôi bất cứ điều gì về môn học, bài tập, hay kiến thức bạn cần</p>
              </div>

          {/* Sample Questions */}
          <div className="questions-section">
            <h3>Câu hỏi gợi ý:</h3>
            <div className="questions-list">
              {sampleQuestions.map((question: any, index) => (
                <button 
                  key={index} 
                  className="question-chip"
                  onClick={() => sendMessage(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
          </>
            ) : (
              // 2. Nếu đã chat: Hiển thị danh sách tin nhắn
              <div className="messages-list">
                {messages.map((msg, index) => (
                  <div 
                    key={index} 
                    className={`message-wrapper ${msg.role === 'user' ? 'is-user' : 'is-ai'}`}
                  >
                    <div className="message-bubble">
                      <ReactMarkdown 
                        components={{
                          a: ({node, ...props}) => {
                            const href = props.href || "";

                            const fixedHref = href.startsWith("http")
                              ? href
                              : `https://${href}`;

                            return (
                              <a 
                                {...props}
                                href={fixedHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="chat-link"
                              />
                            );
                          }
                        }}
                      >
                        {msg.message}
                      </ReactMarkdown>

                      {msg.displayLink && (
                        <a 
                          href={msg.displayLink && formatLink(msg.displayLink)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="chat-button"
                        >
                          Xem chi tiết 🎓
                        </a>
                      )}

                      {msg.displaySuggestion && (
                        <div className="chat-suggestion">
                          {msg.displaySuggestion}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* 3. Typing Indicator đặt chuẩn trong luồng tin nhắn */}
                {isTyping && (
                  <div className="message-wrapper is-ai">
                    <div className="message-bubble typing-bubble">
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
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault(); // Ngăn xuống dòng khi bấm Enter
                    sendMessage();
                  }
                }}
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
    </div>
  );
}

export default ChatbotAi;