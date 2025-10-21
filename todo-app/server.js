const http = require("http");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Server started successfully!\n");
});

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
