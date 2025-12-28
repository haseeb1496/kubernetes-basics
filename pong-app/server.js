const Koa = require("koa");
const Router = require("@koa/router");

const app = new Koa();
const router = new Router();

const PORT = process.env.PORT || 3000;

// In-memory counter (no file dependency)
let counter = 0;
console.log(`Ping-Pong app started with counter: ${counter}`);

// Route for /pingpong endpoint
router.get("/pingpong", (ctx) => {
  const response = `pong ${counter}`;
  counter++;

  console.log(`Request received. Response: ${response}`);

  ctx.body = response;
});

// New endpoint to get just the counter number for other apps
router.get("/counter", (ctx) => {
  ctx.type = "application/json";
  ctx.body = { counter: counter };
});

// Health check route
router.get("/", (ctx) => {
  ctx.body = "Ping-Pong Application is running!";
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(PORT, () => {
  console.log(`Ping-Pong application listening on port: ${PORT}`);
});
