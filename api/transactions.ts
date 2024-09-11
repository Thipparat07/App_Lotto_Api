import express from "express";
import { conn } from "../dbconn";
import mysql from "mysql";

export const router = express.Router();

// แสดงข้อมูล transactions ทั้งหมด
router.get("/", (req, res) => {

    const sql = "SELECT * FROM transactions";

    conn.query(sql, (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).json({
                message: 'Internal Server Error'
            });
        } else {
            if (result.length > 0) {
                res.status(200).json({
                    success: true,
                    message: 'Get Data Success',
                    data: result
                });
            } else {
                res.status(400).json({
                    message: 'Get Data failed'
                });
            }
        }
    });
});

// แสดงข้อมูล transactions แค่ userId นั้น
router.get("/:userId", (req, res) => {
    const userId = req.params.userId; // รับค่า userId จาก URL parameters

    const sql = `
    SELECT t.*, u.wallet_balance 
    FROM transactions t
    JOIN users u ON t.user_id = u.user_id
    WHERE t.user_id = ?`;

    conn.query(sql, [userId], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).json({
                message: 'Internal Server Error'
            });
        } else {
            if (result.length > 0) {
                res.status(200).json({
                    success: true,
                    message: 'Get Data Success',
                    data: result
                });
            } else {
                res.status(400).json({
                    message: 'No transactions found for this user'
                });
            }
        }
    });
});
