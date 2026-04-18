import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthContext } from "./AuthContext";

const socketUrl = import.meta.env.VITE_API_URL;

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null
});

function generateGuestId() {
  return 'guest_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user } = useAuthContext();

  let currentUserId = localStorage.getItem('chat_user_id');
if (!currentUserId) {
  currentUserId = generateGuestId();
  localStorage.setItem('chat_user_id', currentUserId);
}

  useEffect(() => {
    const newSocket = io(socketUrl, {
      // withCredentials: true,
      // autoConnect: false
      query: {
        userId: currentUserId
      }
    });

    setSocket(newSocket);

    if (user) {
      newSocket.connect();
      console.log("🟢 Bật Socket kết nối vì đã đăng nhập!");
    }

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
