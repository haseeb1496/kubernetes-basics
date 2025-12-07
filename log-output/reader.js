const Koa = require("koa");
const Router = require("@koa/router");
const fs = require("fs");

const app = new Koa();
const router = new Router();

const PORT = process.env.PORT || 3000;
const LOG_FILE_PATH = "/shared/logs.txt";

function readLogFile() {
  try {
    if (fs.existsSync(LOG_FILE_PATH)) {
      const content = fs.readFileSync(LOG_FILE_PATH, "utf8");
      // Return the last entry (most recent)
      const lines = content.trim().split("\n").filter(line => line.length > 0);
      const lastLine = lines[lines.length - 1];
      
      if (lastLine) {
        // Parse timestamp and random string from format: "2024-01-01T12:00:00.000Z: randomString"
        const [timestamp, randomString] = lastLine.split(": ");
        return { timestamp, randomString };
      }
    }
    return { timestamp: new Date().toISOString(), randomString: "No data available yet" };
  } catch (error) {
    console.error("Error reading log file:", error);
    return { timestamp: new Date().toISOString(), randomString: "Error reading file" };
  }
}

router.get("/", (ctx) => {
  const logData = readLogFile();
  
  ctx.body = {
    timestamp: logData.timestamp,
    randomString: logData.randomString,
  };
  
  console.log(`Served: ${JSON.stringify(ctx.body)}`);
});

// Health check endpoint
router.get("/health", (ctx) => {
  ctx.body = { status: "Reader container is healthy" };
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(PORT, () => {
  console.log(`Reader container listening on port: ${PORT}`);
});