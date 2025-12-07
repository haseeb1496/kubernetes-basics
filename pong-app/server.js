const Koa = require("koa");
const Router = require("@koa/router");
const fs = require("fs");
const path = require("path");

const app = new Koa();
const router = new Router();

const PORT = process.env.PORT || 3000;
const COUNTER_FILE_PATH = "/shared/pingpong-counter.txt";

// Ensure the shared directory exists
function ensureSharedDirectory() {
  const sharedDir = path.dirname(COUNTER_FILE_PATH);
  if (!fs.existsSync(sharedDir)) {
    fs.mkdirSync(sharedDir, { recursive: true });
  }
}

// Read counter from persistent volume
function readCounter() {
  try {
    if (fs.existsSync(COUNTER_FILE_PATH)) {
      const content = fs.readFileSync(COUNTER_FILE_PATH, "utf8").trim();
      return parseInt(content, 10) || 0;
    }
  } catch (error) {
    console.error("Error reading counter file:", error);
  }
  return 0;
}

// Save counter to persistent volume
function saveCounter(counter) {
  try {
    fs.writeFileSync(COUNTER_FILE_PATH, counter.toString());
    console.log(`Counter saved: ${counter}`);
  } catch (error) {
    console.error("Error saving counter:", error);
  }
}

// Initialize
ensureSharedDirectory();
let counter = readCounter();
console.log(`Ping-Pong app started with counter: ${counter}`);

// Route for /pingpong endpoint
router.get("/pingpong", (ctx) => {
  const response = `pong ${counter}`;
  counter++;

  // Save the updated counter to persistent storage
  saveCounter(counter);

  console.log(`Request received. Response: ${response}`);

  ctx.body = response;
});

// Health check route
router.get("/", (ctx) => {
  ctx.body = "Ping-Pong Application is running!";
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(PORT, () => {
  console.log(`Ping-Pong application listening on port: ${PORT}`);
});
