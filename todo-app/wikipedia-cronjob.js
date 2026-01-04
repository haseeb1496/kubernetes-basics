const axios = require("axios");

const TODO_BACKEND_URL =
  process.env.TODO_BACKEND_URL ||
  "http://todo-backend-svc.project.svc.cluster.local:3000";
const WIKIPEDIA_RANDOM_URL = "https://en.wikipedia.org/wiki/Special:Random";

async function getRandomWikipediaUrl() {
  try {
    console.log("Fetching random Wikipedia article...");

    const response = await axios.get(WIKIPEDIA_RANDOM_URL, {
      maxRedirects: 0,
      validateStatus: function (status) {
        return status >= 200 && status < 400;
      },
    });

    let finalUrl = WIKIPEDIA_RANDOM_URL;
    if (response.status === 302 || response.status === 301) {
      finalUrl = response.headers.location;
    } else if (response.request.responseURL) {
      finalUrl = response.request.responseURL;
    }

    console.log("Random Wikipedia article URL:", finalUrl);
    return finalUrl;
  } catch (error) {
    if (
      error.response &&
      (error.response.status === 301 || error.response.status === 302)
    ) {
      const finalUrl = error.response.headers.location || error.config.url;
      console.log("Random Wikipedia article URL (from redirect):", finalUrl);
      return finalUrl;
    }

    console.error("Error fetching random Wikipedia article:", error.message);

    return "https://en.wikipedia.org/wiki/Wikipedia:Contents";
  }
}

async function createTodo(text) {
  try {
    console.log("Creating todo:", text);

    const response = await axios.post(
      `${TODO_BACKEND_URL}/todos`,
      {
        text: text,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    if (response.data.success) {
      console.log("Successfully created todo:", response.data.todo);
      return response.data.todo;
    } else {
      throw new Error(
        "Todo creation failed: " + (response.data.error || "Unknown error")
      );
    }
  } catch (error) {
    console.error("Error creating todo:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    throw error;
  }
}

async function generateWikipediaTodo() {
  try {
    console.log("Starting Wikipedia todo generation...");

    const wikipediaUrl = await getRandomWikipediaUrl();

    const todoText = `Read ${wikipediaUrl}`;

    if (todoText.length > 140) {
      console.warn(
        `Todo text is too long (${todoText.length} chars), truncating to 140 characters...`
      );
      const truncatedText = todoText.substring(0, 137) + "...";
      await createTodo(truncatedText);
    } else {
      await createTodo(todoText);
    }

    console.log("Wikipedia todo generation completed successfully!");
  } catch (error) {
    console.error("Failed to generate Wikipedia todo:", error.message);
    process.exit(1);
  }
}

generateWikipediaTodo();
