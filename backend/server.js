import express from "express";
import cookieParser from "cookie-parser";

import { errorHandler } from "./middlewares/errorMiddleware.js";
import connectDB from "./services/db.service.js";

// express app
const app = express();
app.set("trust proxy", true);

//connect to db
const PORT = 5000;
connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Database connection failed");
  });

//middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());       
app.use(cookieParser()); 

// home page
app.get("/", (req, res) => res.send("BidVault Online Auction System") );

// auth routes
import authRoutes from "./routes/auth.routes.js";
app.use("/bidvault/auth", authRoutes);

// error handling middleware
app.use(errorHandler);   

export default app;