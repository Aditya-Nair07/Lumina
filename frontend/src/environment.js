const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const server = {
  // Backend runs on port 8000 locally
  dev: "http://localhost:8000",
  prod: "https://lumina-backend-6mer.onrender.com",
};

export const serverUrl = isLocal ? server.dev : server.prod;

export default server;
