const fs = require("fs");
const path = require("path");

// Shared directory path - this will be a mounted volume
const LOG_FILE_PATH = "/shared/logs.txt";

function generateRandomString(length = 16) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }

  return result;
}

// Generate random string on startup
const randomString = generateRandomString();
console.log(`Writer started with random string: ${randomString}`);

// Ensure the shared directory exists
const logDir = path.dirname(LOG_FILE_PATH);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function writeLogEntry() {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp}: ${randomString}\n`;

  try {
    // Append to the log file
    fs.appendFileSync(LOG_FILE_PATH, logEntry);
    console.log(`Written: ${logEntry.trim()}`);
  } catch (error) {
    console.error("Error writing to file:", error);
  }

  // Schedule next write in 5 seconds
  setTimeout(writeLogEntry, 5000);
}

// Start writing log entries
writeLogEntry();
