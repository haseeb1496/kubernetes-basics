const Koa = require("koa");
const Router = require("@koa/router");
const cors = require("@koa/cors");
const bodyParser = require("koa-bodyparser");

const app = new Koa();
const router = new Router();

const PORT = process.env.PORT || 3000;
const TODO_MAX_LENGTH = parseInt(process.env.TODO_MAX_LENGTH) || 140;

let todos = [];
let nextId = 1;

app.use(cors());
app.use(bodyParser());

router.get("/todos", (ctx) => {
  console.log("GET /todos - Fetching all todos");
  ctx.type = "application/json";
  ctx.body = {
    success: true,
    todos: todos,
  };
});

router.post("/todos", (ctx) => {
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

  const newTodo = {
    id: nextId++,
    text: text.trim(),
    completed: false,
  };

  todos.push(newTodo);

  ctx.status = 201;
  ctx.body = {
    success: true,
    todo: newTodo,
  };
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(PORT, () => {
  console.log(`Todo Backend service listening on port: ${PORT}`);
  console.log(`Initialized with ${todos.length} default todos`);
});
