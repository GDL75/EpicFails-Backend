const request = require("supertest");
const app = require("../../app");
const mongoose = require("mongoose");

// teste le nombre de posts du user "Az" (on attend : 2)
it("GET /stats/PpnNwBt53PUced_mgP6R_B0u2RoQu2LV", async () => {
  const res = await request(app).get("/stats/PpnNwBt53PUced_mgP6R_B0u2RoQu2LV");

  expect(res.statusCode).toBe(200);
  expect(res.body.stats.fromUser.nbPosts).toBe(2);
});

afterAll(async () => {
  await mongoose.connection.close();
});