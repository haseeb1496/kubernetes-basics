const Koa = require("koa");
const Router = require("@koa/router");
const fs = require("fs");

const app = new Koa();
const router = new Router();

const http = require("http");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;
const IMAGE_FILE_PATH = "/shared/current-image.jpg";

// Serve the main page with HTML content
router.get("/", (ctx) => {
  ctx.type = "text/html";
  ctx.body = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Project App</title>
        <script>
            const TODO_API_BASE = '/todos';
            
            async function loadTodos() {
                try {
                    const response = await fetch(TODO_API_BASE);
                    const data = await response.json();
                    
                    if (data.success && data.todos) {
                        const todoList = document.getElementById('todoList');
                        todoList.innerHTML = ''; // Clear existing todos
                        
                        data.todos.forEach(todo => {
                            const listItem = document.createElement('li');
                            listItem.textContent = todo.text;
                            todoList.appendChild(listItem);
                        });
                    } else {
                        console.error('Failed to load todos:', data);
                    }
                } catch (error) {
                    console.error('Error loading todos:', error);
                    alert('Failed to load todos. Please refresh the page.');
                }
            }
            
            async function sendTodo() {
                const input = document.getElementById('todoInput');
                const todoText = input.value.trim();
                
                if (todoText.length === 0) {
                    alert('Please enter a todo');
                    return;
                }
                
                if (todoText.length > 140) {
                    alert('Todo cannot be longer than 140 characters');
                    return;
                }
                
                try {
                    const response = await fetch(TODO_API_BASE, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ text: todoText })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success && data.todo) {
                        // Add the new todo to the list
                        const todoList = document.getElementById('todoList');
                        const newTodo = document.createElement('li');
                        newTodo.textContent = data.todo.text;
                        todoList.appendChild(newTodo);
                        
                        // Clear the input
                        input.value = '';
                        updateInput();
                    } else {
                        alert('Failed to create todo: ' + (data.error || 'Unknown error'));
                    }
                } catch (error) {
                    console.error('Error creating todo:', error);
                    alert('Failed to create todo. Please try again.');
                }
            }
            
            function updateInput() {
                const input = document.getElementById('todoInput');
                const sendBtn = document.getElementById('sendBtn');
                sendBtn.disabled = input.value.trim().length === 0;
            }
            
            function handleKeyPress(event) {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    if (!document.getElementById('sendBtn').disabled) {
                        sendTodo();
                    }
                }
            }
        
            window.addEventListener('DOMContentLoaded', loadTodos);
        </script>
    </head>
    <body>
        <h1>Project App</h1>

        <img src="/image" alt="Random image" />
        <input 
            id="todoInput" 
            oninput="updateInput()"
            onkeypress="handleKeyPress(event)"
        />
        <br>
        <button id="sendBtn" onclick="sendTodo()" disabled>Create todo</button>
        
        <h2>Todo List</h2>
        <ul id="todoList">
        </ul>
    </body>
    </html>
  `;
});

// Proxy routes for todo API
const TODO_BACKEND_URL =
  "http://todo-backend-svc.project.svc.cluster.local:3000";

// Proxy GET /todos
router.get("/todos", async (ctx) => {
  try {
    const response = await fetch(`${TODO_BACKEND_URL}/todos`);
    const data = await response.json();
    ctx.body = data;
    ctx.status = response.status;
  } catch (error) {
    console.error("Error proxying GET /todos:", error);
    ctx.status = 500;
    ctx.body = { success: false, error: "Failed to connect to todo backend" };
  }
});

// Proxy POST /todos
router.post("/todos", async (ctx) => {
  try {
    // Parse request body
    const body = await new Promise((resolve) => {
      let data = "";
      ctx.req.on("data", (chunk) => {
        data += chunk;
      });
      ctx.req.on("end", () => {
        resolve(data);
      });
    });

    const response = await fetch(`${TODO_BACKEND_URL}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    });

    const responseData = await response.json();
    ctx.body = responseData;
    ctx.status = response.status;
  } catch (error) {
    console.error("Error proxying POST /todos:", error);
    ctx.status = 500;
    ctx.body = { success: false, error: "Failed to connect to todo backend" };
  }
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
