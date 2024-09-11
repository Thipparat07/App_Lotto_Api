import express from "express";
import { router as index } from "./api/index";
import { router as customers } from "./api/customers";
import { router as lotto } from "./api/lotto";
import { router as basket } from "./api/basket";
import { router as transactions } from "./api/transactions";
import { router as admin } from "./api/admin";
import bodyParser from "body-parser";


export const app = express();


app.use(bodyParser.text());
app.use(bodyParser.json());

app.use("/", index);
app.use("/customers", customers);
app.use("/lotto", lotto);
app.use("/basket", basket);
app.use("/transactions", transactions);
app.use("/admin", admin);

