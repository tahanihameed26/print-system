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
app.post("/api/notification", async (req,res)=>{

const { amount , wallet } = req.body

try{

const order = await pool.query(
`SELECT * FROM orders 
WHERE price=$1 
AND status='pending'
LIMIT 1`,
[amount]
)

if(order.rows.length){

await pool.query(`
UPDATE orders
SET status='paid'
WHERE id=$1
`,[order.rows[0].id])

await pool.query(`
INSERT INTO payments (order_id,amount,wallet)
VALUES ($1,$2,$3)
`,[
order.rows[0].id,
amount,
wallet
])

}

res.json({success:true})

}catch(err){

console.log(err)
}
})
app.get("/api/check-payment/:id",async(req,res)=>{

const id=req.params.id

const result = await pool.query(
`SELECT status FROM orders WHERE id=$1`,
[id]
)

res.json({
paid: result.rows[0].status==="paid"
})

})
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});