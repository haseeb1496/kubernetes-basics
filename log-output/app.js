const Koa = require("koa");
const Router = require("@koa/router");

const app = new Koa();
const router = new Router();

const PORT = process.env.PORT || 3000;

function generateRandomString(length = 16) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }

  return result;
}

const randomString = generateRandomString();

const getRandomString = () => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp}: ${randomString}`);

  setTimeout(getRandomString, 5000);
};

router.get("/status", (ctx) => {
  const timestamp = new Date().toISOString();

  ctx.body = {
    timestamp,
    randomString: randomString,
  };
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(PORT, () => {
  console.log(`Listening to port: ${PORT}`);
});

getRandomString();
