const Koa = require("koa");
const Router = require("@koa/router");
const { Pool } = require("pg");

const app = new Koa();
const router = new Router();

const PORT = process.env.PORT || 3000;

const pool = new Pool({
  host: process.env.POSTGRES_HOST || "postgres-service",
  port: parseInt(process.env.POSTGRES_PORT) || 5432,
  database: process.env.POSTGRES_DB || "pingpongdb",
  user: process.env.POSTGRES_USER || "pingponguser",
  password: process.env.POSTGRES_PASSWORD || "pingpongpassword",
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function initializeDatabase() {
  try {
    const client = await pool.connect();

    const result = await client.query("SELECT NOW()");
    console.log("Database connected successfully:", result.rows[0]);

    await client.query(`
      CREATE TABLE IF NOT EXISTS counters (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        value INTEGER NOT NULL DEFAULT 0
      );
    `);

    await client.query(`
      INSERT INTO counters (name, value) VALUES ('pingpong', 0) 
      ON CONFLICT (name) DO NOTHING;
    `);

    const counterResult = await client.query(
      "SELECT value FROM counters WHERE name = 'pingpong'"
    );
    const currentCounter = counterResult.rows[0]?.value || 0;

    console.log(`Ping-Pong app started with counter: ${currentCounter}`);

    client.release();
    return true;
  } catch (error) {
    console.error("Database initialization error:", error);
    return false;
  }
}

async function getCounter() {
  try {
    const client = await pool.connect();
    const result = await client.query(
      "SELECT value FROM counters WHERE name = 'pingpong'"
    );
    const counter = result.rows[0]?.value || 0;
    client.release();
    return counter;
  } catch (error) {
    console.error("Error getting counter:", error);
    return 0;
  }
}

async function incrementCounter() {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      UPDATE counters SET value = value + 1 WHERE name = 'pingpong' 
      RETURNING value
    `);
    const newCounter = result.rows[0]?.value || 0;
    client.release();
    return newCounter;
  } catch (error) {
    console.error("Error incrementing counter:", error);
    return 0;
  }
}

router.get("/pingpong", async (ctx) => {
  try {
    const currentCounter = await getCounter();
    const response = `pong ${currentCounter}`;
    await incrementCounter();

    console.log(`Request received. Response: ${response}`);

    ctx.body = response;
  } catch (error) {
    console.error("Error in /pingpong route:", error);
    ctx.status = 500;
    ctx.body = "Internal Server Error";
  }
});

router.get("/counter", async (ctx) => {
  try {
    const counter = await getCounter();
    ctx.type = "application/json";
    ctx.body = { counter: counter };
  } catch (error) {
    console.error("Error in /counter route:", error);
    ctx.status = 500;
    ctx.body = { error: "Internal Server Error" };
  }
});

// Health check route
router.get("/", (ctx) => {
  ctx.body = "Ping-Pong Application is running!";
});

router.get("/healthz/ready", async (ctx) => {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    ctx.status = 200;
    ctx.body = { status: "ready", message: "Database connection is healthy" };
  } catch (error) {
    console.error("Readiness check failed:", error);
    ctx.status = 503;
    ctx.body = {
      status: "not ready",
      message: "Database connection failed",
      error: error.message,
    };
  }
});

router.get("/healthz/live", (ctx) => {
  ctx.status = 200;
  ctx.body = { status: "alive", message: "Application is running" };
});

app.use(router.routes()).use(router.allowedMethods());

async function startServer() {
  const dbReady = await initializeDatabase();

  if (!dbReady) {
    console.error("Failed to initialize database. Retrying in 5 seconds...");
    setTimeout(startServer, 5000);
    return;
  }

  app.listen(PORT, () => {
    console.log(`Ping-Pong application listening on port: ${PORT}`);
  });
}

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM, closing database connections...");
  await pool.end();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Received SIGINT, closing database connections...");
  await pool.end();
  process.exit(0);
});

startServer();
