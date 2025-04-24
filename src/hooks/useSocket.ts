import { io } from "socket.io-client";

const useSocket = io("/", {
  path: "/socket.io",
  transports: ["websocket", "polling"]
});

export default useSocket;
