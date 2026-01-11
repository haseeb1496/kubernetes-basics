const Koa = require("koa");
const Router = require("@koa/router");
const fs = require("fs");
const http = require("http");

const app = new Koa();
const router = new Router();

const PORT = process.env.PORT || 3000;
const IMAGE_FILE_PATH = "/shared/current-image.jpg";

const PING_PONG_SERVICE =
  process.env.PING_PONG_SERVICE || "pong-app-svc.exercises.svc.cluster.local";
const PING_PONG_PORT = process.env.PING_PONG_PORT || "3000";

router.get("/healthz/ready", async (ctx) => {
  try {
    const response = await new Promise((resolve, reject) => {
      const request = http.request(
        {
          hostname: PING_PONG_SERVICE,
          port: PING_PONG_PORT,
          path: "/healthz/ready",
          method: "GET",
          timeout: 3000,
        },
        (response) => {
          let data = "";
          response.on("data", (chunk) => {
            data += chunk;
          });
          response.on("end", () => {
            resolve({ statusCode: response.statusCode, data });
          });
        }
      );

      request.on("error", reject);
      request.on("timeout", () => {
        request.destroy();
        reject(new Error("Timeout"));
      });

      request.end();
    });

    if (response.statusCode === 200) {
      ctx.status = 200;
      ctx.body = {
        status: "ready",
        message: "Ping-pong service is reachable",
        pingPongStatus: response.data,
      };
    } else {
      throw new Error(
        `Ping-pong service returned status ${response.statusCode}`
      );
    }
  } catch (error) {
    console.error("Readiness check failed:", error);
    ctx.status = 503;
    ctx.body = {
      status: "not ready",
      message: "Cannot reach ping-pong service",
      error: error.message,
    };
  }
});

router.get("/healthz/live", (ctx) => {
  ctx.status = 200;
  ctx.body = { status: "alive", message: "Log reader is running" };
});

router.get("/", (ctx) => {
  ctx.type = "text/html";
  ctx.body = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Project App</title>
        <script>
            const TODO_API_BASE = '/todos';
            const TODO_MAX_LENGTH = ${TODO_MAX_LENGTH};
            
            async function loadTodos() {
                try {
                    const response = await fetch(TODO_API_BASE);
                    const data = await response.json();
                    
                    if (data.success && data.todos) {
                        const todoList = document.getElementById('todoList');
                        const doneList = document.getElementById('doneList');
                        todoList.innerHTML = '';
                        doneList.innerHTML = '';
                        
                        data.todos.forEach(todo => {
                            const listItem = document.createElement('li');
                            listItem.style.display = 'flex';
                            listItem.style.alignItems = 'center';
                            listItem.style.marginBottom = '8px';
                            
                            if (todo.completed) {
                                const textSpan = document.createElement('span');
                                textSpan.textContent = todo.text;
                                textSpan.style.textDecoration = 'line-through';
                                textSpan.style.color = '#666';
                                listItem.appendChild(textSpan);
                                doneList.appendChild(listItem);
                            } else {
                                const textSpan = document.createElement('span');
                                textSpan.textContent = todo.text;
                                textSpan.style.flexGrow = '1';
                                
                                const doneButton = document.createElement('button');
                                doneButton.textContent = 'Mark as done';
                                doneButton.style.marginLeft = '10px';
                                doneButton.style.padding = '4px 8px';
                                doneButton.style.backgroundColor = '#28a745';
                                doneButton.style.color = 'white';
                                doneButton.style.border = 'none';
                                doneButton.style.borderRadius = '4px';
                                doneButton.style.cursor = 'pointer';
                                doneButton.onclick = () => markAsDone(todo.id);
                                
                                listItem.appendChild(textSpan);
                                listItem.appendChild(doneButton);
                                todoList.appendChild(listItem);
                            }
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
                
                if (todoText.length > TODO_MAX_LENGTH) {
                    alert('Todo cannot be longer than ' + TODO_MAX_LENGTH + ' characters');
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
                        
                        await loadTodos();
                        
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
            
            async function markAsDone(todoId) {
                try {
                    const response = await fetch(TODO_API_BASE + '/' + todoId, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ completed: true })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        // Reload the todos to reflect the change
                        await loadTodos();
                    } else {
                        alert('Failed to mark todo as done: ' + (data.error || 'Unknown error'));
                    }
                } catch (error) {
                    console.error('Error marking todo as done:', error);
                    alert('Failed to mark todo as done. Please try again.');
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
        
        <h2>Done Items</h2>
        <ul id="doneList">
        </ul>
    </body>
    </html>
  `;
});

const TODO_BACKEND_URL =
  process.env.TODO_BACKEND_URL ||
  "http://todo-backend-svc.project.svc.cluster.local:3000";
const TODO_MAX_LENGTH = parseInt(process.env.TODO_MAX_LENGTH) || 140;

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

router.put("/todos/:id", async (ctx) => {
  try {
    const body = await new Promise((resolve) => {
      let data = "";
      ctx.req.on("data", (chunk) => {
        data += chunk;
      });
      ctx.req.on("end", () => {
        resolve(data);
      });
    });

    const response = await fetch(`${TODO_BACKEND_URL}/todos/${ctx.params.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    });

    const responseData = await response.json();
    ctx.body = responseData;
    ctx.status = response.status;
  } catch (error) {
    console.error("Error proxying PUT /todos/:id:", error);
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
