import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import authenticationRoutes from "./routes/authentication";

const app: Express = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/authentication", authenticationRoutes);

export default app;
