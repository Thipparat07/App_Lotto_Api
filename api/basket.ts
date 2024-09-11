import express from "express";
import { conn } from "../dbconn";
import mysql from "mysql";

export const router = express.Router();


// เพิ่มลอตโต้ลงในตะกร้า
router.post("/add", (req, res) => {
    const { user_id, lotto_id, quantity } = req.body;

    if (!user_id || !lotto_id || quantity == null) {
        return res.status(400).json({ message: 'User ID, Lotto ID, and Quantity are required' });
    }

    // ตรวจสอบว่าหมายเลขลอตโต้มีอยู่ในฐานข้อมูล
    const checkLottoQuery = "SELECT * FROM Lotto WHERE lotto_id = ?";

    conn.query(checkLottoQuery, [lotto_id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Internal Server Error' });
        }

        if (result.length > 0) {
            // ตรวจสอบว่าลอตโต้มีอยู่ในตะกร้าหรือไม่
            const checkBasketQuery = "SELECT * FROM Basket WHERE user_id = ? AND lotto_id = ?";

            conn.query(checkBasketQuery, [user_id, lotto_id], (err, basketResult) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ message: 'Internal Server Error' });
                }

                if (basketResult.length > 0) {
                    // อัปเดตจำนวนลอตโต้ในตะกร้า
                    const updateBasketQuery = "UPDATE Basket SET quantity = ? WHERE user_id = ? AND lotto_id = ?";

                    conn.query(updateBasketQuery, [quantity, user_id, lotto_id], (err) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).json({ message: 'Internal Server Error' });
                        }

                        res.status(200).json({
                            success: true,
                            message: 'Lotto quantity updated in basket successfully'
                        });
                    });
                } else {
                    // เพิ่มลอตโต้ลงในตะกร้า
                    const insertBasketQuery = "INSERT INTO Basket (user_id, lotto_id, quantity) VALUES (?, ?, ?)";

                    conn.query(insertBasketQuery, [user_id, lotto_id, quantity], (err) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).json({ message: 'Internal Server Error' });
                        }

                        res.status(200).json({
                            success: true,
                            message: 'Lotto added to basket successfully'
                        });
                    });
                }
            });
        } else {
            res.status(404).json({ message: 'Lotto ID not found' });
        }
    });
});



// ดูรายการลอตโต้ในตะกร้าพร้อมจำนวนเงินรวม
router.get("/:user_id", (req, res) => {
    const { user_id } = req.params;

    if (!user_id) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    const sql = `
        SELECT b.basket_id, b.lotto_id, b.quantity, l.lotto_number, l.price
        FROM Basket b
        JOIN Lotto l ON b.lotto_id = l.lotto_id
        WHERE b.user_id = ?
    `;

    conn.query(sql, [user_id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Internal Server Error' });
        }

        // คำนวณจำนวนเงินรวม
        let totalAmount = 0;
        const basketItems = result.map((item: { quantity: number; price: number; }) => {
            const itemTotal = item.quantity * item.price;
            totalAmount += itemTotal;
            return { ...item, itemTotal };
        });

        res.status(200).json({
            success: true,
            message: 'Basket retrieved successfully',
            data: basketItems,
            totalAmount: totalAmount.toFixed(2)  // จำนวนเงินรวมทั้งหมด
        });
    });
});

//ปุ่มจ่ายเงิน
router.post("/payment", (req, res) => {
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    // ดึงรายการลอตโต้ทั้งหมดที่อยู่ในตะกร้าของผู้ใช้
    const basketQuery = `
        SELECT b.lotto_id, b.quantity, l.price
        FROM Basket b
        JOIN Lotto l ON b.lotto_id = l.lotto_id
        WHERE b.user_id = ?
    `;

    conn.query(basketQuery, [user_id], (err, basketItems) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Internal Server Error' });
        }

        if (basketItems.length > 0) {
            // คำนวณจำนวนเงินรวม
            let totalAmount = 0;
            const purchases = basketItems.map((item: { quantity: number; price: number; lotto_id: any; }) => {
                const itemTotal = item.quantity * item.price;
                totalAmount += itemTotal;
                return [user_id, item.lotto_id, item.quantity];
            });

            // ตรวจสอบยอดเงินในกระเป๋า
            const checkBalanceQuery = "SELECT wallet_balance FROM Users WHERE user_id = ?";
            conn.query(checkBalanceQuery, [user_id], (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ message: 'Internal Server Error' });
                }

                const user = result[0];
                if (user.wallet_balance < totalAmount) {
                    return res.status(400).json({ message: 'Insufficient wallet balance' });
                }

                // บันทึกข้อมูลการซื้อ
                const insertPurchaseQuery = "INSERT INTO Purchases (user_id, lotto_id, purchase_count) VALUES ?";
                conn.query(insertPurchaseQuery, [purchases], (err) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ message: 'Internal Server Error' });
                    }

                    // อัปเดตสถานะของ Lotto ว่าถูกซื้อแล้ว
                    const updateLottoQuery = "UPDATE Lotto SET is_sold = TRUE WHERE lotto_id IN (?)";
                    conn.query(updateLottoQuery, [basketItems.map((item: { lotto_id: any; }) => item.lotto_id)], (err) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).json({ message: 'Internal Server Error' });
                        }

                        // หักเงินจากกระเป๋า
                        const updateBalanceQuery = "UPDATE Users SET wallet_balance = wallet_balance - ? WHERE user_id = ?";
                        conn.query(updateBalanceQuery, [totalAmount, user_id], (err) => {
                            if (err) {
                                console.error(err);
                                return res.status(500).json({ message: 'Internal Server Error' });
                            }

                            // บันทึกธุรกรรม
                            const insertTransactionQuery = "INSERT INTO Transactions (user_id, amount, transaction_type) VALUES (?, ?, 'Purchase')";
                            conn.query(insertTransactionQuery, [user_id, totalAmount], (err) => {
                                if (err) {
                                    console.error(err);
                                    return res.status(500).json({ message: 'Internal Server Error' });
                                }

                                // ลบรายการที่ซื้อจากตะกร้า
                                const clearBasketQuery = "DELETE FROM Basket WHERE user_id = ?";
                                conn.query(clearBasketQuery, [user_id], (err) => {
                                    if (err) {
                                        console.error(err);
                                        return res.status(500).json({ message: 'Internal Server Error' });
                                    }

                                    res.status(200).json({
                                        success: true,
                                        message: 'Purchase successful',
                                        totalAmount: totalAmount.toFixed(2)  // จำนวนเงินรวมทั้งหมด
                                    });
                                });
                            });
                        });
                    });
                });
            });
        } else {
            res.status(404).json({ message: 'Basket is empty or User ID not found' });
        }
    });
});
