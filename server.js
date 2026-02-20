const express = require("express");
const sql = require("mssql");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* إعداد الاتصال */
const config = {
  user: "whats",
  password: "admin1234",   // غيّرها حسب إعدادك
  server: "DESKTOP-U44G9Q5",
  database: "print_system",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

/* دالة تحقق رقم الهاتف اليمني */
function validPhone(phone){
  return /^(77|78|70|71|73)\d{7}$/.test(phone);
}

/* API حفظ الطلب */
app.post("/api/orders", async (req, res) => {
  console.log("API HIT ✅");
console.log("BODY:", req.body);

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

    /* ===== التحقق من البيانات ===== */

    if(!name || name.length < 3)
      return res.status(400).json({error:"الاسم غير صحيح"});

    if(!validPhone(phone))
      return res.status(400).json({error:"رقم الهاتف غير صحيح"});

    if(!product)
      return res.status(400).json({error:"اختر نوع الطباعة"});

    if(!quantity || quantity <= 0)
      return res.status(400).json({error:"الكمية غير صحيحة"});

    if(!price || price <= 0)
      return res.status(400).json({error:"السعر غير صالح"});

   /* الاتصال بقاعدة البيانات */
const pool = await sql.connect(config);

const result = await pool.request()
  .input("name", sql.NVarChar, name)
  .input("phone", sql.NVarChar, phone)
  .input("product", sql.NVarChar, product)
  .input("size", sql.NVarChar, size)
  .input("quantity", sql.Int, quantity)
  .input("lamination", sql.NVarChar, lamination || "")
  .input("finish", sql.NVarChar, finish || "")
  .input("weight", sql.NVarChar, weight || "")
  .input("faces", sql.NVarChar, faces || "")
  .input("price", sql.Decimal(10,2), price)
  .query(`
    INSERT INTO orders
    (name, phone, product, size, quantity, lamination, finish, weight, faces, price)
    OUTPUT INSERTED.id
    VALUES
    (@name, @phone, @product, @size, @quantity, @lamination, @finish, @weight, @faces, @price)
  `);

/* نرجع رقم الطلب للفرونت */
res.json({
  success: true,
  orderId: result.recordset[0].id
});


  } catch(err){
    console.error("SERVER ERROR:", err);
    res.status(500).json({error:"خطأ داخلي في السيرفر"});
  }
});


app.post("/api/payments", async (req, res) => {
  try {

    const { orderId, transactionId, amount } = req.body;

    if(!orderId || !amount)
      return res.status(400).json({error:"بيانات ناقصة"});

    const pool = await sql.connect(config);

    await pool.request()
      .input("orderId", sql.Int, orderId)
      .input("transactionId", sql.NVarChar, transactionId || "")
      .input("amount", sql.Decimal(10,2), amount)
      .input("proofImage", sql.NVarChar, "uploaded_later.jpg")
      .query(`
        INSERT INTO payments (order_id, transaction_id, proof_image, amount)
        VALUES (@orderId, @transactionId, @proofImage, @amount)
      `);

    res.json({success:true});

  } catch(err){
    console.error(err);
    res.status(500).json({error:"خطأ في الدفع"});
  }
});
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});