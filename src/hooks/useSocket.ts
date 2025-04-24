import { io } from "socket.io-client";

const socket = io("/", {
  path: "/socket.io",
  transports: ["websocket", "polling"]
});

export default socket;
