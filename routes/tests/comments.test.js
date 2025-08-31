require("dotenv").config();
const mongoose = require("mongoose");
const connectionString = process.env.CONNECTION_STRING;
mongoose.connect(connectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const request = require("supertest");
const express = require("express");
const commentsRouter = require("../comments");

const app = express();
app.use(express.json());
app.use("/comments", commentsRouter);

test("GET /comments/:postId répond avec le commentaire attendu", async () => {
  const postId = "689af57354a558d8782510f6".trim();
  const res = await request(app).get(`/comments/${postId}`);

  expect(res.statusCode).toBe(200);
  expect(res.body.result).toBe(true);

  // On vérifie que le commentaire est bien dans la liste
  const commentaireTrouve = res.body.comments.find(
    (com) => com.comment === "Oh non ! Qui va nettoyer tout ça ?"
  );
  expect(commentaireTrouve).toBeDefined();
});