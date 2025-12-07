const fs = require("fs");
const path = require("path");

// Shared directory path - this will be a mounted volume
const LOG_FILE_PATH = "/shared/logs.txt";
const IMAGE_FILE_PATH = "/shared/current-image.jpg";
const IMAGE_METADATA_PATH = "/shared/image-metadata.json";

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

function fetchImage() {
  return new Promise((resolve, reject) => {
    console.log("Fetching new image from Lorem Picsum...");

    const https = require("https");

    const options = {
      hostname: "picsum.photos",
      port: 443,
      path: "/1200",
      method: "GET",
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Kubernetes-App/1.0)",
      },
    };

    const request = https.request(options, (response) => {
      console.log(`Response status: ${response.statusCode}`);

      if (response.statusCode === 200) {
        const writeStream = fs.createWriteStream(IMAGE_FILE_PATH);
        response.pipe(writeStream);

        writeStream.on("finish", () => {
          writeStream.close();
          console.log("Image successfully downloaded and cached");
          resolve();
        });

        writeStream.on("error", (error) => {
          console.error("Error writing image file:", error);
          reject(error);
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        console.log(`Following redirect to: ${redirectUrl}`);

        // Follow the redirect
        const redirectRequest = https.get(
          redirectUrl,
          {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; Kubernetes-App/1.0)",
            },
            timeout: 30000,
          },
          (redirectResponse) => {
            console.log(
              `Redirect response status: ${redirectResponse.statusCode}`
            );

            if (redirectResponse.statusCode === 200) {
              const writeStream = fs.createWriteStream(IMAGE_FILE_PATH);
              redirectResponse.pipe(writeStream);

              writeStream.on("finish", () => {
                writeStream.close();
                console.log(
                  "Image successfully downloaded and cached (after redirect)"
                );
                resolve();
              });

              writeStream.on("error", (error) => {
                console.error("Error writing redirected image file:", error);
                reject(error);
              });
            } else if (
              redirectResponse.statusCode === 301 ||
              redirectResponse.statusCode === 302
            ) {
              console.log("Multiple redirects detected, trying final URL...");
              const finalUrl = redirectResponse.headers.location;

              const finalRequest = https.get(
                finalUrl,
                {
                  headers: {
                    "User-Agent":
                      "Mozilla/5.0 (compatible; Kubernetes-App/1.0)",
                  },
                  timeout: 30000,
                },
                (finalResponse) => {
                  if (finalResponse.statusCode === 200) {
                    const writeStream = fs.createWriteStream(IMAGE_FILE_PATH);
                    finalResponse.pipe(writeStream);

                    writeStream.on("finish", () => {
                      writeStream.close();
                      console.log(
                        "Image successfully downloaded and cached (final redirect)"
                      );
                      resolve();
                    });

                    writeStream.on("error", (error) => {
                      console.error("Error writing final image file:", error);
                      reject(error);
                    });
                  } else {
                    console.error(
                      `Failed to fetch final image: HTTP ${finalResponse.statusCode}`
                    );
                    reject(new Error(`HTTP ${finalResponse.statusCode}`));
                  }
                }
              );

              finalRequest.on("error", (error) => {
                console.error("Error fetching final redirected image:", error);
                reject(error);
              });
            } else {
              console.error(
                `Failed to fetch redirected image: HTTP ${redirectResponse.statusCode}`
              );
              reject(new Error(`HTTP ${redirectResponse.statusCode}`));
            }
          }
        );

        redirectRequest.on("error", (error) => {
          console.error("Error fetching redirected image:", error);
          reject(error);
        });
      } else {
        console.error(`Failed to fetch image: HTTP ${response.statusCode}`);
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    });

    request.on("error", (error) => {
      console.error("Error fetching image:", error);
      reject(error);
    });

    request.on("timeout", () => {
      request.destroy();
      reject(new Error("Request timeout"));
    });

    request.end();
  });
}

// Function to check if image needs updating (every 10 minutes)
async function checkAndUpdateImage() {
  try {
    let shouldUpdate = false;
    let metadata = { lastUpdated: 0 };

    // Read existing metadata
    if (fs.existsSync(IMAGE_METADATA_PATH)) {
      try {
        const metadataContent = fs.readFileSync(IMAGE_METADATA_PATH, "utf8");
        metadata = JSON.parse(metadataContent);
      } catch (error) {
        console.error("Error reading image metadata:", error);
        shouldUpdate = true;
      }
    } else {
      shouldUpdate = true;
    }

    // Check if image file exists
    if (!fs.existsSync(IMAGE_FILE_PATH)) {
      shouldUpdate = true;
    }

    // Check if 10 minutes have passed (600,000 ms)
    const currentTime = Date.now();
    const timeDiff = currentTime - metadata.lastUpdated;
    if (timeDiff > 600000) {
      // 10 minutes
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      console.log("Image needs updating...");
      await fetchImage();

      // Update metadata
      metadata.lastUpdated = currentTime;
      fs.writeFileSync(IMAGE_METADATA_PATH, JSON.stringify(metadata, null, 2));
      console.log("Image metadata updated");
    } else {
      const remainingTime = Math.floor((600000 - timeDiff) / 1000);
      console.log(
        `Image is still fresh. Next update in ${remainingTime} seconds`
      );
    }
  } catch (error) {
    console.error("Error in checkAndUpdateImage:", error);
  }
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

// Initialize image checking (check every minute)
async function startImageManagement() {
  await checkAndUpdateImage();
  setInterval(checkAndUpdateImage, 60000); // Check every minute
}

// Start writing log entries
writeLogEntry();

// Start image management
startImageManagement();
