import express from "express";
import { router as index } from "../Mini Project/api/index";

export const app = express();

app.use("/", index);