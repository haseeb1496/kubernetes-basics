const Koa = require("koa");
const Router = require("@koa/router");
const cors = require("@koa/cors");
const bodyParser = require("koa-bodyparser");
const { Pool } = require("pg");

const app = new Koa();
const router = new Router();

const PORT = process.env.PORT || 3000;
const TODO_MAX_LENGTH = parseInt(process.env.TODO_MAX_LENGTH) || 140;

const pool = new Pool({
  host: process.env.POSTGRES_HOST || "todo-postgres-service",
  port: parseInt(process.env.POSTGRES_PORT) || 5432,
  database: process.env.POSTGRES_DB || "tododb",
  user: process.env.POSTGRES_USER || "todouser",
  password: process.env.POSTGRES_PASSWORD || "todopassword",
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function initializeDatabase() {
  try {
    const client = await pool.connect();

    const result = await client.query("SELECT NOW()");
    console.log("Database connected successfully:", result.rows[0]);

    await client.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        completed BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Database initialized successfully");
    client.release();
    return true;
  } catch (error) {
    console.error("Database initialization error:", error);
    return false;
  }
}

async function getAllTodos() {
  try {
    const client = await pool.connect();
    const result = await client.query(
      "SELECT id, text, completed, created_at, updated_at FROM todos ORDER BY created_at DESC"
    );
    client.release();
    return result.rows;
  } catch (error) {
    console.error("Error getting todos:", error);
    throw error;
  }
}

async function createTodo(text) {
  try {
    const client = await pool.connect();
    const result = await client.query(
      "INSERT INTO todos (text) VALUES ($1) RETURNING id, text, completed, created_at, updated_at",
      [text]
    );
    client.release();
    return result.rows[0];
  } catch (error) {
    console.error("Error creating todo:", error);
    throw error;
  }
}

let todos = [];
let nextId = 1;

app.use(cors());
app.use(bodyParser());

router.get("/todos", async (ctx) => {
  console.log("GET /todos - Fetching all todos");
  try {
    const todos = await getAllTodos();
    ctx.type = "application/json";
    ctx.body = {
      success: true,
      todos: todos,
    };
  } catch (error) {
    console.error("Error in GET /todos:", error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: "Failed to fetch todos",
    };
  }
});

router.post("/todos", async (ctx) => {
  const { text } = ctx.request.body;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      error: "Todo text is required and cannot be empty",
    };
    return;
  }

  if (text.length > TODO_MAX_LENGTH) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      error: `Todo text cannot be longer than ${TODO_MAX_LENGTH} characters`,
    };
    return;
  }

  try {
    const newTodo = await createTodo(text.trim());
    console.log("POST /todos - Created new todo:", newTodo);

    ctx.status = 201;
    ctx.type = "application/json";
    ctx.body = {
      success: true,
      todo: newTodo,
    };
  } catch (error) {
    console.error("Error in POST /todos:", error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: "Failed to create todo",
    };
  }
});

app.use(router.routes()).use(router.allowedMethods());

async function startServer() {
  const dbInitialized = await initializeDatabase();

  if (!dbInitialized) {
    console.error("Failed to initialize database. Exiting...");
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Todo Backend service listening on port: ${PORT}`);
    console.log("Database connected and ready to serve todos");
  });
}

process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  await pool.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  await pool.end();
  process.exit(0);
});

startServer();
