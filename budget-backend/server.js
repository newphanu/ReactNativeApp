const express = require('express');
const knex = require('knex');
const cors = require('cors');
const bodyParser = require('body-parser');

const db = knex({
  client: 'mysql2',
  connection: {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'final_exam',
  },
});

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ดึงข้อมูลธุรกรรมและยอดคงเหลือ
app.get('/transactions', async (req, res) => {
  try {
    const transactions = await db('transactions')
      .join('records', 'transactions.record_id', '=', 'records.record_id')
      .select(
        'transactions.transaction_id',
        'transactions.type',
        'transactions.amount',
        'transactions.description',
        'transactions.transaction_date',
        'records.record_name'
      )
      .orderBy('transactions.transaction_date', 'desc');

    // คำนวณยอดรวม
    const summary = await db('transactions')
      .select(
        db.raw('SUM(CASE WHEN type = "income" THEN amount ELSE 0 END) as total_income'),
        db.raw('SUM(CASE WHEN type = "expense" THEN amount ELSE 0 END) as total_expense')
      )
      .first();

    const response = {
      transactions,
      summary: {
        total_income: summary.total_income || 0,
        total_expense: summary.total_expense || 0,
        balance: (summary.total_income || 0) - (summary.total_expense || 0)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Error fetching data: ' + error.message);
  }
});

// เพิ่มข้อมูลธุรกรรมและอัพเดทยอดรวม
app.post('/transactions', async (req, res) => {
  const { type, amount, description, transaction_date } = req.body;

  if (!type || !amount || !transaction_date) {
    return res.status(400).send('Missing required fields');
  }

  try {
    // เริ่ม transaction
    await db.transaction(async (trx) => {
      // สร้าง record ใหม่
      const [recordId] = await trx('records').insert({
        record_name: 'New Record',
        record_date: transaction_date
      });

      // เพิ่มข้อมูลธุรกรรม
      await trx('transactions').insert({
        record_id: recordId,
        type,
        amount,
        description,
        transaction_date
      });

      // คำนวณยอดรวมใหม่
      const summary = await trx('transactions')
        .select(
          db.raw('SUM(CASE WHEN type = "income" THEN amount ELSE 0 END) as total_income'),
          db.raw('SUM(CASE WHEN type = "expense" THEN amount ELSE 0 END) as total_expense')
        )
        .first();

      // อัพเดทหรือสร้าง summary ใหม่
      await trx('summaries')
        .insert({
          record_id: recordId,
          total_income: summary.total_income || 0,
          total_expense: summary.total_expense || 0,
          balance: (summary.total_income || 0) - (summary.total_expense || 0)
        })
        .onConflict('record_id')
        .merge();
    });

    res.status(201).json({ message: 'Transaction added successfully' });
  } catch (error) {
    console.error('Error adding transaction:', error);
    res.status(500).send('Error adding transaction: ' + error.message);
  }
});

app.listen(3000, () => {
  console.log('Backend server running on http://localhost:3000');
});