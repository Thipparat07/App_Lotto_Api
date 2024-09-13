import mysql from "mysql";
import util from "util";

export const conn = mysql.createPool({
    connectionLimit: 10,
    host: "140.99.98.118",
    user: "Thipparat01",
    password: "Thipparat07",
    database: "lotto",
});

export const queryAsync = util.promisify(conn.query).bind(conn);

