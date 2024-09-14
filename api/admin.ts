import express from "express";
import { conn } from "../dbconn";
import mysql from "mysql";

export const router = express.Router();

// เก็บหมายเลขที่ถูกสุ่มได้
let drawnNumbers: { lotto_id: any; lotto_number: any; }[] = [];

// ฟังก์ชันสำหรับการสุ่มหมายเลขลอตโต้ทีละหนึ่ง
router.post("/draw-one", (req, res) => {
    if (drawnNumbers.length >= 5) {
        return res.status(400).json({
            success: false,
            message: 'Already drawn 5 numbers. Please save or reset.'
        });
    }

    const sql = `
        SELECT l.lotto_id, l.lotto_number 
        FROM lotto l
        WHERE l.is_sold = 1 AND l.lotto_id NOT IN (?) 
        ORDER BY RAND() 
        LIMIT 1
    `;

    const excludedIds = drawnNumbers.length > 0 ? drawnNumbers.map(num => num.lotto_id) : [-1];

    conn.query(sql, [excludedIds], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({
                success: false,
                message: 'Internal Server Error'
            });
        }

        if (result.length === 1) {
            const drawnLotto = {
                lotto_id: result[0].lotto_id,
                lotto_number: result[0].lotto_number
            };

            drawnNumbers.push(drawnLotto);

            return res.status(200).json({
                success: true,
                message: 'Lotto number drawn successfully',
                drawnLotto: drawnLotto,
                drawnCount: drawnNumbers.length
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'No available lotto tickets to draw'
            });
        }
    });
});

router.post("/reset-drawn", (req, res) => {
    drawnNumbers = [];
    res.status(200).json({
        success: true,
        message: 'Drawn numbers reset successfully'
    });
});

router.post("/save-drawn-numbers", (req, res) => {
    if (drawnNumbers.length < 5) {
        return res.status(400).json({
            message: 'จำนวนหมายเลขที่สุ่มไม่เพียงพอ กรุณาสุ่มหมายเลข 5 หมายเลขก่อน'
        });
    }

    // ดึงวันที่ปัจจุบัน
    const now = new Date();
    const formattedNow = now.getFullYear() +
        '-' + String(now.getMonth() + 1).padStart(2, '0') +
        '-' + String(now.getDate()).padStart(2, '0') +
        ' ' + String(now.getHours()).padStart(2, '0') +
        ':' + String(now.getMinutes()).padStart(2, '0') +
        ':' + String(now.getSeconds()).padStart(2, '0');

    // ดึงวันที่ปัจจุบันในรูปแบบที่เหมาะสำหรับการเปรียบเทียบ
    const currentDate = formattedNow.slice(0, 10);

    // SQL ตรวจสอบว่ามีการบันทึกหมายเลขครบ 5 หมายเลขแล้วในวันนี้หรือไม่
    const checkExistingSql = `
        SELECT COUNT(*) AS count
        FROM lottoresults
        WHERE DATE(draw_date) = ?
    `;

    conn.query(checkExistingSql, [currentDate], (checkErr, checkResult) => {
        if (checkErr) {
            console.error("เกิดข้อผิดพลาดในการตรวจสอบข้อมูล:", checkErr);
            return res.status(500).json({
                message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
            });
        }

        // ตรวจสอบจำนวนหมายเลขที่บันทึกในวันนี้
        const alreadySavedCount = checkResult[0].count;

        if (alreadySavedCount >= 5) {
            return res.status(400).json({
                message: 'วันนี้มีการบันทึกหมายเลขครบ 5 หมายเลขแล้ว'
            });
        }

        // ตรวจสอบหมายเลขที่สุ่มและระบุระดับรางวัล
        const assignWinnerLevels = drawnNumbers.map((num, index) => [num.lotto_id, index + 1]);

        // SQL สำหรับการบันทึกหมายเลขที่สุ่มพร้อมระดับรางวัลในตาราง lottoresults
        const saveResultsSql = `
            INSERT INTO lottoresults (lotto_id, winner_level, draw_date) 
            VALUES ?
        `;

        const values = assignWinnerLevels.map(value => [...value, formattedNow]); // เพิ่มวันที่สำหรับการบันทึก

        conn.query(saveResultsSql, [values], (err, result) => {
            if (err) {
                console.error("เกิดข้อผิดพลาดในฐานข้อมูล:", err);
                return res.status(500).json({
                    message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
                });
            }

            // ล้างหมายเลขที่สุ่มหลังจากบันทึกเสร็จ
            drawnNumbers = [];

            return res.status(200).json({
                success: true,
                message: 'หมายเลขที่สุ่มถูกบันทึกสำเร็จ'
            });
        });
    });
});





// ฟังก์ชันสำหรับการ reset ระบบการจับรางวัล
router.post("/reset", (req, res) => {
    // ล้างค่า drawnNumbers เพื่อให้เริ่มสุ่มใหม่ได้
    drawnNumbers = [];
    res.status(200).json({
        success: true,
        message: 'Lotto system has been reset.'
    });
});


router.get("/memberlist", (req, res) => {
    const sql = "SELECT * FROM users WHERE status = 1";
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
                res.status(204).json({
                    message: 'No active users found'
                });
            }
        }
    });
});

router.delete("/delete-member", (req, res) => {
    const sql = "DELETE FROM users WHERE status = 1";
    conn.query(sql, (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).json({
                success: false,
                message: 'Internal Server Error'
            });
        } else {
            if (result.affectedRows > 0) {
                res.status(200).json({
                    success: true,
                    message: 'Successfully deleted all active users',
                    deletedCount: result.affectedRows
                });
            } else {
                res.status(200).json({
                    success: true,
                    message: 'No active users found to delete',
                    deletedCount: 0
                });
            }
        }
    });
});

router.get("/user/:userId", (req, res) => {
    const userId = req.params.userId;
    const sql = "SELECT user_id, username, fullname, email, phone_number, status, wallet_balance FROM users WHERE user_id = ?";
    
    conn.query(sql, [userId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: 'Internal Server Error'
            });
        }
        
        if (result.length > 0) {
            const user = result[0];
            // ไม่ส่งคืนข้อมูล password เพื่อความปลอดภัย
            res.status(200).json({
                success: true,
                message: 'User data retrieved successfully',
                data: user
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
    });
});
