const Koa = require("koa");
const Router = require("@koa/router");
const fs = require("fs");

const app = new Koa();
const router = new Router();

const PORT = process.env.PORT || 3000;
const LOG_FILE_PATH = "/shared/logs.txt";
const COUNTER_FILE_PATH = "/shared/pingpong-counter.txt";

function readLogFile() {
  try {
    if (fs.existsSync(LOG_FILE_PATH)) {
      const content = fs.readFileSync(LOG_FILE_PATH, "utf8");
      // Return the last entry (most recent)
      const lines = content
        .trim()
        .split("\n")
        .filter((line) => line.length > 0);
      const lastLine = lines[lines.length - 1];

      if (lastLine) {
        // Parse timestamp and random string from format: "2024-01-01T12:00:00.000Z: randomString"
        const [timestamp, randomString] = lastLine.split(": ");
        return { timestamp, randomString };
      }
    }
    return {
      timestamp: new Date().toISOString(),
      randomString: "No data available yet",
    };
  } catch (error) {
    console.error("Error reading log file:", error);
    return {
      timestamp: new Date().toISOString(),
      randomString: "Error reading file",
    };
  }
}

function readPingPongCounter() {
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

router.get("/", (ctx) => {
  const logData = readLogFile();
  const pingPongCounter = readPingPongCounter();

  ctx.body = `${logData.timestamp}: ${logData.randomString}.
Ping / Pongs: ${pingPongCounter}`;

  console.log(`Served: ${ctx.body}`);
});

// Health check endpoint
router.get("/health", (ctx) => {
  ctx.body = { status: "Reader container is healthy" };
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(PORT, () => {
  console.log(`Reader container listening on port: ${PORT}`);
});
