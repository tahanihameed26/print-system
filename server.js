const express = require("express");
const sql = require("mssql");
const cors = require("cors");

const app = express();
app.use(cors({
  origin: ["https://reliable-piroshki-968b50.netlify.app/"],
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.json());
app.use(express.static("public"));

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/* دالة تحقق رقم الهاتف اليمني */
function validPhone(phone){
  return /^(77|78|70|71|73)\d{7}$/.test(phone);
}

/* API حفظ الطلب */
app.post("/api/orders", async (req, res) => {

  try {

    const {
      name,
      phone,
      product,
      size,
      quantity,
      lamination,
      finish,
      weight,
      faces,
      price
    } = req.body;

    const result = await pool.query(
      `INSERT INTO orders
      (name, phone, product, size, quantity, lamination, finish, weight, faces, price)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id`,
      [
        name,
        phone,
        product,
        size,
        quantity,
        lamination,
        finish,
        weight,
        faces,
        price
      ]
    );

    res.json({
      success: true,
      orderId: result.rows[0].id
    });

  } catch(err){
    console.error(err);
    res.status(500).json({error:"server error"});
  }

});

app.post("/api/payments", async (req, res) => {

  try {

    const { orderId, transactionId, amount } = req.body;

    await pool.query(
      `INSERT INTO payments
      (order_id, transaction_id, proof_image, amount)
      VALUES ($1,$2,$3,$4)`,
      [
        orderId,
        transactionId || "",
        "uploaded_later.jpg",
        amount
      ]
    );

    res.json({ success: true });

  } catch(err){
    console.error(err);
    res.status(500).json({ error:"payment error" });
  }

});
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});