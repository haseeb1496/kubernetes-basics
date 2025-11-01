const Koa = require("koa");
const fs = require("fs");
const path = require("path");

const app = new Koa();
const PORT = process.env.PORT || 3000;
const createRandomString = () => Math.random().toString(36).substr(2, 6);

const startingString = createRandomString();

app.use(async (ctx) => {
  if (ctx.path.includes("favicon.ico")) return;

  const filePath = path.join(__dirname, "index.html");
  ctx.type = "html";
  ctx.body = fs.createReadStream(filePath);
});

console.log(`Started with ${startingString}`);
app.listen(PORT);
