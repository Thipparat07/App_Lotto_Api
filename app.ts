import express from "express";
import { router as index } from "./api/index";

export const app = express();

app.use("/", index);