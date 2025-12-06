import cors from "cors";
import express from "express";

const app = express();

// middle ware
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.status(200).send("App connected successfully");
});

export default app;
