import { Routes, Route, useLocation } from "react-router-dom"; // Đảm bảo đã import
import { useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import './App.css'
import { useAuthContext } from "./context/AuthContext";
import ChatbotAi from "./components/ChatAi";


function App() {
  // 1. MỞ COMMENT DÒNG NÀY ĐỂ REACT ĐƯỢC LẮNG NGHE URL THAY ĐỔI
  const location = useLocation(); 
  
  const noHeaderFooterPaths = ["/login", "/register",];
  
  const { fetchMe, fetchDoctor } = useAuth();
  const user = useAuthContext();

  useEffect(() => {
      fetchMe(); 
  }, []);

  useEffect(() => {
    if (user.user?._id && user.user.role === 'doctor') {
      fetchDoctor(user.user._id);
    }
  }, [user.user?._id, user.user?.role]);

  return (
    <div className="App">
      {/* {!hideHeaderFooter && <Header />} */}
      
      <Routes>
        <Route path="/" element={<ChatbotAi />} />
       </Routes>
      
      {/* {!hideHeaderFooter && <Footer />} */}
    </div>
  );
}

export default App;