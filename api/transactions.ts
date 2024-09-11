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

// แสดงข้อมูล transactions และรูปภาพของ userId นั้น
router.get("/:userId", (req, res) => {
    const userId = req.params.userId; // รับค่า userId จาก URL parameters

    // ดึงข้อมูลผู้ใช้
    const userSql = `
    SELECT u.wallet_balance, u.image 
    FROM users u
    WHERE u.user_id = ?`;

    // ดึงข้อมูล transactions เรียงตามวันที่ล่าสุดและรายการล่าสุด
    const transactionsSql = `
    SELECT * 
    FROM transactions
    WHERE user_id = ?
    ORDER BY transaction_date DESC, transaction_id DESC`;

    conn.query(userSql, [userId], (err, userResult) => {
        if (err) {
            console.error(err);
            res.status(500).json({
                message: 'Internal Server Error'
            });
            return;
        }

        if (userResult.length === 0) {
            res.status(404).json({
                message: 'User not found'
            });
            return;
        }

        const userData = userResult[0];
        
        conn.query(transactionsSql, [userId], (err, transactionsResult) => {
            if (err) {
                console.error(err);
                res.status(500).json({
                    message: 'Internal Server Error'
                });
            } else {
                res.status(200).json({
                    success: true,
                    message: 'Get Data Success',
                    data: {
                        wallet_balance: userData.wallet_balance,
                        image: userData.image,
                        transactions: transactionsResult
                    }
                });
            }
        });
    });
});
