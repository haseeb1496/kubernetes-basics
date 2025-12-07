const Koa = require("koa");
const Router = require("@koa/router");

const app = new Koa();
const router = new Router();

const PORT = process.env.PORT || 3000;

// In-memory counter that resets when the application restarts
let counter = 0;

// Route for /pingpong endpoint
router.get("/pingpong", (ctx) => {
  const response = `pong ${counter}`;
  counter++;

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
