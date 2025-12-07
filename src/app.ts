import cors from "cors";
import express from "express";
import cryptoRouter from "./routes/crypto.route";

const app = express();

// List of allowed origins
// const allowedOrigins = [
//   "http://localhost:3000", // for local dev
// ];

// // CORS options
// const corsOptions = {
//   origin: (origin: string | undefined, callback: Function) => {
//     if (!origin) {
//       // Allow non-browser requests (like Postman)
//       return callback(null, true);
//     }
//     if (allowedOrigins.includes(origin)) {
//       callback(null, true); // allow
//     } else {
//       callback(new Error("Not allowed by CORS")); // reject
//     }
//   },
//   methods: ["GET", "POST", "PUT", "DELETE"],
//   allowedHeaders: ["Content-Type", "Authorization"],
//   credentials: true, // if you use cookies or auth headers
// };

// middle ware
// app.use(cors(corsOptions));
app.use(cors());
app.use(express.json());

app.use("/api/crypto", cryptoRouter);

app.get("/", (req, res) => {
  res.status(200).send("App connected successfully");
});

export default app;
