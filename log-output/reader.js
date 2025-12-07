const Koa = require("koa");
const Router = require("@koa/router");
const fs = require("fs");

const app = new Koa();
const router = new Router();

const PORT = process.env.PORT || 3000;
const IMAGE_FILE_PATH = "/shared/current-image.jpg";

// Serve the main page with HTML content
router.get("/", (ctx) => {
  ctx.type = "text/html";
  ctx.body = `
    <!DOCTYPE html>
    <html>
    <head>
    </head>
    <body>
        <h1>Project app</h1>
        <div class="container">
            
            <div class="image-section">
                <img src="/image" alt="Random image" style="max-width: 600px; height: auto; border: 2px solid #333; margin: 20px 0;" />
            </div>
        </div>
    </body>
    </html>
  `;
});

// Serve the cached image
router.get("/image", (ctx) => {
  try {
    if (fs.existsSync(IMAGE_FILE_PATH)) {
      const imageBuffer = fs.readFileSync(IMAGE_FILE_PATH);
      ctx.type = "image/jpeg";
      ctx.body = imageBuffer;
      console.log("Served cached image");
    } else {
      ctx.status = 404;
      ctx.body = "Image not found";
      console.log("Image requested but not found");
    }
  } catch (error) {
    console.error("Error serving image:", error);
    ctx.status = 500;
    ctx.body = "Error serving image";
  }
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(PORT, () => {
  console.log(`Reader container listening on port: ${PORT}`);
});
