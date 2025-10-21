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

const randromString = generateRandomString();

const getRandomString = () => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp}: ${randromString}`);

  setTimeout(getRandomString, 5000);
};

getRandomString();
