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
        <title>Project App</title>
        <script>   
            function sendTodo() {
                const input = document.getElementById('todoInput');
                const todoText = input.value.trim();
                
                if (todoText.length > 0) {
                    // Add the todo to the list
                    const todoList = document.getElementById('todoList');
                    const newTodo = document.createElement('li');
                    newTodo.textContent = todoText;
                    todoList.appendChild(newTodo);
                    
                    // Clear the input
                    input.value = '';
                    
                    // Update button state
                    document.getElementById('sendBtn').disabled = true;
                } else {
                    alert('Please enter a todo');
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
        </script>
    </head>
    <body>
        <h1>Project App</h1>
        
        <h2>Daily Image</h2>
        <img src="/image" alt="Random image" />
        <input 
            id="todoInput" 
            oninput="updateInput()"
            onkeypress="handleKeyPress(event)"
            placeholder="Enter a new todo..."
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
