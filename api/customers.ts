import express from "express";
import { conn } from "../dbconn";
import mysql from "mysql";
import bcrypt from 'bcrypt';

const saltRounds = 10;

export const router = express.Router();

//แสดงข้อมูลสมาชิกทั้งหมด
router.get("/",(req, res) => {
    
    const sql = "select * from users";

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
                    data:result

                });

            } else {
                res.status(400).json({
                    message: 'Get Data failed'
                });
            }
        }
    });

});

// แสดงข้อมูลสมาชิกแค่IDที่ต้องการ
router.get("/:user_id", (req, res) => {
    const { user_id } = req.params;

    const sql = "SELECT * FROM users WHERE user_id = ?";

    conn.query(sql, [user_id], (err, result) => {
        if (err) {
            console.error("Error during query:", err.message);
            return res.status(500).json({ message: 'Internal Server Error' });
        }

        if (result.length > 0) {
            return res.status(200).json(result[0]);
        } else {
            return res.status(404).json({
                success: false,
                message: 'users Not Found'
            });
        }
    });
});

//สมัครสมาชิก
router.post("/register", (req, res) => {
    const { password, fullname, phone, email } = req.body;

    // email และ password ต้องไม่เป็นค่าว่าง
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and Password cannot be null' });
    }

    const checkEmailSql = "SELECT COUNT(*) AS count FROM users WHERE email = ?";

    conn.query(checkEmailSql, [email], (err, result) => {
        if (err) {
            console.error("Error checking email:", err.message);
            return res.status(500).send('Error during email check.');
        }

        if (result[0].count > 0) {
            // ตรวจพบ email ซ้ำ
            return res.status(409).json({ message: 'Email already exists' });
        }

        //ถ้าไม่มี email ซ้ำให้เพิ่มข้อมูล
        const insertSql = "INSERT INTO users (fullname, phone_number, email, password, wallet_balance, is_member) VALUES (?, ?, ?, ?, 2000, true)";

        conn.query(insertSql, [fullname, phone, email, password], (err, result) => {
            if (err) {
                console.error("Error during insertion:", err.message);
                return res.status(500).send('Error during insertion.');
            }

            if (result.affectedRows > 0) {
                return res.status(200).json({ message: 'Inserted Successfully' });
            } else {
                return res.status(404).send('Insertion Failed');
            }
        });
    });
});


//เข้าสู่ระบบ
router.post("/login", (req, res) => {
    const { email, password } = req.body;

    // ตรวจสอบว่ามีการกรอก email และ password หรือไม่
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and Password cannot be null' });
    }

    const sql = "SELECT * FROM users WHERE email = ? AND password = ?";

    conn.query(sql, [email, password], (err, result) => {
        if (err) {
            console.error("Error during login:", err.message);
            return res.status(500).send('Internal Server Error');
        }

        if (result.length > 0) {
            const user = result[0];
            const userID = user.user_id;  // ดึงค่า user_id จากฐานข้อมูล

            return res.status(200).json({
                message: 'Login Successfully',
                userID: userID
            });
        } else {
            return res.status(401).json({
                message: 'Login Failed: Invalid Email or Password'
            });
        }
    });
});


// อัปเดตข้อมูลผู้ใช้เฉพาะฟิลด์ที่มีการส่งมา
router.put("/updateUser", (req, res) => {
    const { user_id, fullname, email, phone_number, password } = req.body;

    // ตรวจสอบว่ามีการส่ง user_id หรือไม่
    if (!user_id) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    // สร้างอาร์เรย์สำหรับเก็บฟิลด์ที่จะอัปเดต
    let fieldsToUpdate = [];
    let values = [];

    if (fullname) {
        fieldsToUpdate.push("fullname = ?");
        values.push(fullname);
    }

    if (email) {
        fieldsToUpdate.push("email = ?");
        values.push(email);
    }

    if (phone_number) {
        fieldsToUpdate.push("phone_number = ?");
        values.push(phone_number);
    }

    if (password) {
        fieldsToUpdate.push("password = ?");
        values.push(password);
    }

    // ตรวจสอบว่ามีฟิลด์ที่จะอัปเดตหรือไม่
    if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
    }

    // เพิ่ม user_id เข้าไปในอาร์เรย์ values
    values.push(user_id);

    // สร้างคำสั่ง SQL โดยรวมเฉพาะฟิลด์ที่ต้องการอัปเดต
    const sql = `UPDATE users SET ${fieldsToUpdate.join(", ")} WHERE user_id = ?`;

    conn.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error during update:", err.message);
            return res.status(500).json({ message: 'Internal Server Error' });
        }

        if (result.affectedRows > 0) {
            return res.status(200).json({ message: 'User updated successfully' });
        } else {
            return res.status(404).json({ message: 'User not found' });
        }
    });
});



