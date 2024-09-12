import express from "express";
import { conn } from "../dbconn";
import mysql from "mysql";

export const router = express.Router();


// Function to generate unique 6-digit numbers
function generateUniqueNumbers(count: number, digits: number) {
    const uniqueNumbers = new Set();

    while (uniqueNumbers.size < count) {
        const number = Math.floor(Math.random() * (10 ** digits));
        const paddedNumber = number.toString().padStart(digits, '0');
        uniqueNumbers.add(paddedNumber);
    }

    return Array.from(uniqueNumbers);
}

// Route to generate and store 100 unique 6-digit numbers with price
router.get("/setlotto", (req, res) => {
    try {
        // Generate 100 unique 6-digit numbers
        const uniqueSixDigitNumbers = generateUniqueNumbers(100, 6);

        // กำหนดราคาสำหรับลอตโต้แต่ละใบ (สามารถปรับได้ตามต้องการ)
        const lottoPrice = 50.00; // ตัวอย่างราคาคงที่สำหรับทุกใบ

        // Prepare the SQL statement for inserting into the Lotto table
        const insertQuery = "INSERT INTO lotto (lotto_number, price) VALUES ?";
        const values = uniqueSixDigitNumbers.map((number) => [number, lottoPrice]);

        // Insert the generated numbers and their prices into the database
        conn.query(insertQuery, [values], (err, result) => {
            if (err) {
                console.error("Error inserting numbers into database:", err.message);
                return res.status(500).json({
                    success: false,
                    message: 'Internal Server Error'
                });
            }

            // Send the unique numbers and their prices as JSON response
            res.status(200).json({
                success: true,
                message: 'Unique 6-digit numbers with prices generated and stored successfully',
                numbers: uniqueSixDigitNumbers,
                price: lottoPrice
            });
        });
    } catch (error) {
        console.error("Error generating numbers:", error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
});


// แสดงข้อมูล Lotto ทั้งหมดและเรียงตามหมายเลขจากน้อยไปมาก
router.get("/", (req, res) => {
    const sql = "SELECT * FROM lotto WHERE is_sold = 0 ORDER BY lotto_number ASC";

    conn.query(sql, (err, result) => {
        if (err) {
            console.error('Error executing query:', err);
            res.status(500).json({
                success: false,
                message: 'Internal Server Error',
                error: err.message
            });
        } else {
            if (result.length > 0) {
                res.status(200).json({
                    success: true,
                    message: 'Get Data Success',
                    data: result
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'No Data Found'
                });
            }
        }
    });
});


//ขึ้นเงินlottoที่ถูกรางวัล
router.post("/cash-lotto", (req, res) => {
    const { user_id, lotto_id } = req.body;

    // Check winning lotto and get winner level
    const checkLottoQuery = `
        SELECT l.lotto_number, p.purchase_count, lr.winner_level
        FROM lotto l
        JOIN purchases p ON l.lotto_id = p.lotto_id
        JOIN lottoresults lr ON l.lotto_id = lr.lotto_id
        WHERE l.lotto_id = ? AND l.is_sold = 1 AND p.user_id = ?
    `;

    conn.query(checkLottoQuery, [lotto_id, user_id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }

        if (result.length > 0) {
            const { purchase_count, winner_level } = result[0];

            // Get prize amount
            const prizeQuery = `SELECT prize_amount FROM prizes WHERE winner_level = ?`;
            conn.query(prizeQuery, [winner_level], (err, prizeResult) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ success: false, message: 'Failed to fetch prize amount' });
                }

                const prizeAmount = prizeResult[0].prize_amount;
                const totalPrizeAmount = prizeAmount * purchase_count;

                // Update wallet
                const updateWalletQuery = `
                    UPDATE users
                    SET wallet_balance = wallet_balance + ?
                    WHERE user_id = ?
                `;
                conn.query(updateWalletQuery, [totalPrizeAmount, user_id], (err, walletResult) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ success: false, message: 'Failed to update wallet' });
                    }

                    // Log transaction
                    const insertTransactionQuery = `
                        INSERT INTO transactions (user_id, amount, transaction_type, transaction_date)
                        VALUES (?, ?, 'Prize Payout', NOW())
                    `;
                    conn.query(insertTransactionQuery, [user_id, totalPrizeAmount], (err, transactionResult) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).json({ success: false, message: 'Failed to log transaction' });
                        }

                        // Mark lotto as cashed
                        const updateLottoQuery = `
                            UPDATE lotto
                            SET is_claimed = 1
                            WHERE lotto_id = ?
                        `;
                        conn.query(updateLottoQuery, [lotto_id], (err, lottoUpdateResult) => {
                            if (err) {
                                console.error(err);
                                return res.status(500).json({ success: false, message: 'Failed to mark lotto as cashed' });
                            }

                            res.status(200).json({
                                success: true,
                                message: 'Lotto cashed successfully',
                                totalPrizeAmount: totalPrizeAmount,
                                quantity: purchase_count
                            });
                        });
                    });
                });
            });
        } else {
            res.status(404).json({ success: false, message: 'No winning lotto found or already cashed' });
        }
    });
});



router.get("/random", (req, res) => {
    let count = 3; // ค่าเริ่มต้น

    if (req.query.count && typeof req.query.count === 'string') {
        const parsedCount = parseInt(req.query.count, 10);
        if (!isNaN(parsedCount) && parsedCount > 0) {
            count = parsedCount;
        }
    }

    const sql = `
        SELECT * 
        FROM lotto 
        WHERE is_sold = 0 
        ORDER BY RAND() 
        LIMIT ?
    `;

    conn.query(sql, [count], (err, result) => {
        if (err) {
            console.error('Error executing query:', err);
            res.status(500).json({
                success: false,
                message: 'Internal Server Error',
                error: err.message
            });
        } else {
            if (result.length > 0) {
                res.status(200).json({
                    success: true,
                    message: 'Get Random Lotto Data Success',
                    data: result
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'No Data Found'
                });
            }
        }
    });
});