import "dotenv/config";
import express from "express";
import cors from "cors";
import realtorRoute from "./realtorRoute.js";
import buyerRoute from "./buyerRoute.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

// Two separate experiences, as planned:
// /api/realtor/chat  -> internal tool for the agent
// /api/buyer/chat    -> customer-facing home search assistant
app.use("/api/realtor", realtorRoute);
app.use("/api/buyer", buyerRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`realtor-llm-backend listening on port ${PORT}`);
});
