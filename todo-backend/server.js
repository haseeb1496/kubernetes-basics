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

async function updateTodo(id, completed) {
  try {
    const client = await pool.connect();
    const result = await client.query(
      "UPDATE todos SET completed = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, text, completed, created_at, updated_at",
      [completed, id]
    );
    client.release();
    if (result.rows.length === 0) {
      throw new Error("Todo not found");
    }
    return result.rows[0];
  } catch (error) {
    console.error("Error updating todo:", error);
    throw error;
  }
}

let todos = [];
let nextId = 1;

app.use(async (ctx, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  console.log(`[${timestamp}] ${ctx.method} ${ctx.url} - Request started`);

  if (ctx.request.body && Object.keys(ctx.request.body).length > 0) {
    console.log(
      `[${timestamp}] Request body:`,
      JSON.stringify(ctx.request.body)
    );
  }

  await next();

  const ms = Date.now() - start;
  const endTimestamp = new Date().toISOString();
  console.log(
    `[${endTimestamp}] ${ctx.method} ${ctx.url} - ${ctx.status} - ${ms}ms`
  );

  if (ctx.status >= 400) {
    console.warn(`[${endTimestamp}] ERROR RESPONSE:`, JSON.stringify(ctx.body));
  }
});

app.use(cors());
app.use(bodyParser());

router.get("/healthz/ready", async (ctx) => {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();

    ctx.status = 200;
    ctx.body = {
      status: "ready",
      message: "Database connection is healthy",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Readiness check failed:`,
      error
    );
    ctx.status = 503;
    ctx.body = {
      status: "not ready",
      message: "Database connection failed",
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
});

router.get("/healthz/live", (ctx) => {
  ctx.status = 200;
  ctx.body = {
    status: "alive",
    message: "Todo backend is running",
    timestamp: new Date().toISOString(),
  };
});

router.get("/todos", async (ctx) => {
  console.log(`[${new Date().toISOString()}] GET /todos - Fetching all todos`);
  try {
    const todos = await getAllTodos();
    console.log(
      `[${new Date().toISOString()}] GET /todos - Successfully fetched ${
        todos.length
      } todos`
    );
    ctx.type = "application/json";
    ctx.body = {
      success: true,
      todos: todos,
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR in GET /todos:`, error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: "Failed to fetch todos",
    };
  }
});

router.post("/todos", async (ctx) => {
  const { text } = ctx.request.body;
  const timestamp = new Date().toISOString();

  console.log(
    `[${timestamp}] POST /todos - Creating new todo with text: "${text}"`
  );

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    console.warn(
      `[${timestamp}] POST /todos - VALIDATION ERROR: Empty or invalid text`
    );
    ctx.status = 400;
    ctx.body = {
      success: false,
      error: "Todo text is required and cannot be empty",
    };
    return;
  }

  if (text.length > TODO_MAX_LENGTH) {
    console.warn(
      `[${timestamp}] POST /todos - VALIDATION ERROR: Text too long (${text.length} chars, max: ${TODO_MAX_LENGTH})`
    );
    ctx.status = 400;
    ctx.body = {
      success: false,
      error: `Todo text cannot be longer than ${TODO_MAX_LENGTH} characters`,
      actualLength: text.length,
      maxLength: TODO_MAX_LENGTH,
    };
    return;
  }

  try {
    const newTodo = await createTodo(text.trim());
    console.log(
      `[${timestamp}] POST /todos - Successfully created todo with ID: ${newTodo.id}`
    );

    ctx.status = 201;
    ctx.type = "application/json";
    ctx.body = {
      success: true,
      todo: newTodo,
    };
  } catch (error) {
    console.error(`[${timestamp}] ERROR in POST /todos:`, error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: "Failed to create todo",
    };
  }
});

router.put("/todos/:id", async (ctx) => {
  const { id } = ctx.params;
  const { completed } = ctx.request.body;
  const timestamp = new Date().toISOString();

  console.log(
    `[${timestamp}] PUT /todos/${id} - Updating todo completed status to: ${completed}`
  );

  if (typeof completed !== "boolean") {
    console.warn(
      `[${timestamp}] PUT /todos/${id} - VALIDATION ERROR: Invalid completed value`
    );
    ctx.status = 400;
    ctx.body = {
      success: false,
      error: "Completed field must be a boolean value",
    };
    return;
  }

  try {
    const updatedTodo = await updateTodo(parseInt(id), completed);
    console.log(`[${timestamp}] PUT /todos/${id} - Successfully updated todo`);

    ctx.status = 200;
    ctx.type = "application/json";
    ctx.body = {
      success: true,
      todo: updatedTodo,
    };
  } catch (error) {
    if (error.message === "Todo not found") {
      console.warn(`[${timestamp}] PUT /todos/${id} - Todo not found`);
      ctx.status = 404;
      ctx.body = {
        success: false,
        error: "Todo not found",
      };
    } else {
      console.error(`[${timestamp}] ERROR in PUT /todos/${id}:`, error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: "Failed to update todo",
      };
    }
  }
});

app.use(router.routes()).use(router.allowedMethods());

async function startServer() {
  app.listen(PORT, () => {
    console.log(`Todo Backend service listening on port: ${PORT}`);
  });

  const dbInitialized = await initializeDatabase();

  if (dbInitialized) {
    console.log("Database connected and ready to serve todos");
  } else {
    console.error(
      "Failed to initialize database. Server started but readiness probe will fail until database is available."
    );
  }
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
