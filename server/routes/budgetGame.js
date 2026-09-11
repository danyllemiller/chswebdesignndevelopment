// /server/routes/budgetGame.js
// "The Paycheck" -- a real-money budgeting game for WD2 and AS students. Every real,
// finalized payroll run (server/routes/payroll.js) becomes a paycheck event
// here: the first time a student opens the game after a new payroll run
// posts, that real net_pay deposits into their in-game checking balance,
// savings earns a small guaranteed interest bump, and anything invested
// takes a real (simulated) market swing -- up or down. Everything else
// (bills, the store, moving money between buckets) is purely in-game, but
// the money arriving in the first place is always their own real pay.
const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');

const STATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS budget_game_state (
    student_id VARCHAR(50) PRIMARY KEY,
    checking_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    savings_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    invested_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    last_synced_paystub_id INT DEFAULT NULL,
    bills_paid_through_paystub_id INT DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

const TXN_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS budget_game_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    type VARCHAR(30) NOT NULL,
    description VARCHAR(200) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_student (student_id, id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

async function ensureTables(connection) {
    await connection.execute(STATE_TABLE_SQL);
    await connection.execute(TXN_TABLE_SQL);
}

// Fixed, small-dollar "starter economy" -- deliberately scaled to match what
// a real student payroll run actually pays out this early in the year
// (single digits to low tens of dollars per period), not real-world prices.
// As real pay grows over the semester the same numbers stay proportionate
// enough to still mean something; revisit if that stops being true.
const BILLS = [
    { key: 'rent', label: 'Rent', amount: 6.00 },
    { key: 'utilities', label: 'Utilities', amount: 2.00 },
    { key: 'phone', label: 'Phone Bill', amount: 2.00 }
];
const BILLS_TOTAL = BILLS.reduce((sum, b) => sum + b.amount, 0);

const STORE_ITEMS = {
    groceries: [
        { key: 'milk', label: 'Milk', price: 1.00 },
        { key: 'bread', label: 'Bread', price: 0.75 },
        { key: 'fruit', label: 'Fresh Fruit', price: 1.25 },
        { key: 'frozen_meal', label: 'Frozen Meal', price: 2.00 },
        { key: 'snacks', label: 'Snacks', price: 1.50 }
    ],
    clothes: [
        { key: 'tshirt', label: 'T-Shirt', price: 3.00 },
        { key: 'jeans', label: 'Jeans', price: 6.00 },
        { key: 'shoes', label: 'Shoes', price: 8.00 },
        { key: 'jacket', label: 'Jacket', price: 10.00 }
    ]
};
const ALL_ITEMS = {};
Object.values(STORE_ITEMS).forEach(cat => cat.forEach(item => { ALL_ITEMS[item.key] = item; }));

const SAVINGS_INTEREST_RATE = 0.02;   // guaranteed, applied per new paycheck synced
const INVEST_MIN_RETURN = -0.10;      // simulated market swing, applied per new paycheck synced
const INVEST_MAX_RETURN = 0.15;

function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

async function logTxn(connection, studentId, type, description, amount, balanceAfter) {
    await connection.execute(
        `INSERT INTO budget_game_transactions (student_id, type, description, amount, balance_after)
         VALUES (?, ?, ?, ?, ?)`,
        [studentId, type, description, round2(amount), round2(balanceAfter)]
    );
}

// Pulls in any real, finalized paystubs the student has earned since the
// last time this game synced, depositing each one's net_pay into checking,
// then applies one round of savings interest / investment return per newly
// synced paycheck (so a semester with 3 real payroll runs plays out as 3
// real financial "turns", not one lump sum).
async function syncRealPay(connection, studentId) {
    const [[state]] = await connection.execute(
        'SELECT * FROM budget_game_state WHERE student_id = ?', [studentId]
    );
    let current = state || {
        student_id: studentId, checking_balance: 0, savings_balance: 0,
        invested_balance: 0, last_synced_paystub_id: null, bills_paid_through_paystub_id: null
    };

    const [paystubs] = await connection.execute(
        `SELECT sp.id, sp.net_pay, sp.role_title, pr.period_end
         FROM student_paystubs sp
         JOIN payroll_runs pr ON sp.payroll_run_id = pr.id
         WHERE sp.student_id = ? AND pr.is_finalized = 1
         ORDER BY pr.period_end ASC, sp.id ASC`,
        [studentId]
    );

    const newOnes = current.last_synced_paystub_id
        ? paystubs.filter(p => p.id > current.last_synced_paystub_id)
        : paystubs;

    if (newOnes.length === 0) {
        if (!state) {
            await connection.execute(
                `INSERT INTO budget_game_state (student_id) VALUES (?)`, [studentId]
            );
        }
        return;
    }

    let checking = Number(current.checking_balance);
    let savings = Number(current.savings_balance);
    let invested = Number(current.invested_balance);
    let lastId = current.last_synced_paystub_id;

    for (const stub of newOnes) {
        const pay = Number(stub.net_pay);
        if (pay > 0) {
            checking = round2(checking + pay);
            const periodLabel = stub.period_end ? new Date(stub.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
            await logTxn(connection, studentId, 'paycheck', `Paycheck deposited (${stub.role_title || 'pay period'}${periodLabel ? ', ' + periodLabel : ''})`, pay, checking);
        }
        if (savings > 0) {
            const interest = round2(savings * SAVINGS_INTEREST_RATE);
            if (interest > 0) {
                savings = round2(savings + interest);
                await logTxn(connection, studentId, 'interest', 'Savings interest', interest, savings);
            }
        }
        if (invested > 0) {
            const rate = INVEST_MIN_RETURN + Math.random() * (INVEST_MAX_RETURN - INVEST_MIN_RETURN);
            const change = round2(invested * rate);
            invested = round2(invested + change);
            await logTxn(connection, studentId, 'invest_return', `Investment ${change >= 0 ? 'gain' : 'loss'} (${(rate * 100).toFixed(1)}%)`, change, invested);
        }
        lastId = stub.id;
    }

    if (state) {
        await connection.execute(
            `UPDATE budget_game_state SET checking_balance = ?, savings_balance = ?, invested_balance = ?,
             last_synced_paystub_id = ? WHERE student_id = ?`,
            [checking, savings, invested, lastId, studentId]
        );
    } else {
        await connection.execute(
            `INSERT INTO budget_game_state (student_id, checking_balance, savings_balance, invested_balance, last_synced_paystub_id)
             VALUES (?, ?, ?, ?, ?)`,
            [studentId, checking, savings, invested, lastId]
        );
    }
}

router.get('/student/budget-game/state', async (req, res) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        await syncRealPay(connection, student_id);

        const [[state]] = await connection.execute(
            'SELECT * FROM budget_game_state WHERE student_id = ?', [student_id]
        );
        const [txns] = await connection.execute(
            'SELECT type, description, amount, balance_after, created_at FROM budget_game_transactions WHERE student_id = ? ORDER BY id DESC LIMIT 25',
            [student_id]
        );

        const billsPaidThisPeriod = state.bills_paid_through_paystub_id === state.last_synced_paystub_id
            && state.last_synced_paystub_id !== null;

        await connection.release();
        res.json({
            checking: Number(state.checking_balance),
            savings: Number(state.savings_balance),
            invested: Number(state.invested_balance),
            net_worth: round2(Number(state.checking_balance) + Number(state.savings_balance) + Number(state.invested_balance)),
            bills: BILLS,
            bills_total: round2(BILLS_TOTAL),
            bills_paid_this_period: billsPaidThisPeriod,
            store: STORE_ITEMS,
            transactions: txns
        });
    } catch (err) {
        console.error('[budget-game] state error:', err);
        res.status(500).json({ error: 'Failed to load budget game state' });
    }
});

router.post('/student/budget-game/pay-bills', async (req, res) => {
    const { student_id } = req.body || {};
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        const [[state]] = await connection.execute(
            'SELECT * FROM budget_game_state WHERE student_id = ?', [student_id]
        );
        if (!state) { await connection.release(); return res.status(400).json({ error: 'No game state yet -- open the game first.' }); }

        if (state.bills_paid_through_paystub_id === state.last_synced_paystub_id && state.last_synced_paystub_id !== null) {
            await connection.release();
            return res.status(400).json({ error: 'Bills for this period are already paid.' });
        }

        const checking = Number(state.checking_balance);
        if (checking < BILLS_TOTAL) {
            await connection.release();
            return res.status(400).json({ error: `You need $${BILLS_TOTAL.toFixed(2)} to cover this period's bills, but only have $${checking.toFixed(2)}.` });
        }

        const newChecking = round2(checking - BILLS_TOTAL);
        await connection.execute(
            `UPDATE budget_game_state SET checking_balance = ?, bills_paid_through_paystub_id = ? WHERE student_id = ?`,
            [newChecking, state.last_synced_paystub_id, student_id]
        );
        await logTxn(connection, student_id, 'bill', `Paid bills (${BILLS.map(b => b.label).join(', ')})`, -BILLS_TOTAL, newChecking);
        await connection.release();
        res.json({ success: true, checking: newChecking });
    } catch (err) {
        console.error('[budget-game] pay-bills error:', err);
        res.status(500).json({ error: 'Failed to pay bills' });
    }
});

router.post('/student/budget-game/buy', async (req, res) => {
    const { student_id, item_key } = req.body || {};
    if (!student_id || !item_key) return res.status(400).json({ error: 'student_id and item_key required' });
    const item = ALL_ITEMS[item_key];
    if (!item) return res.status(400).json({ error: 'Unknown item' });
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        const [[state]] = await connection.execute(
            'SELECT * FROM budget_game_state WHERE student_id = ?', [student_id]
        );
        if (!state) { await connection.release(); return res.status(400).json({ error: 'No game state yet -- open the game first.' }); }

        const checking = Number(state.checking_balance);
        if (checking < item.price) {
            await connection.release();
            return res.status(400).json({ error: `${item.label} costs $${item.price.toFixed(2)}, but you only have $${checking.toFixed(2)} in checking.` });
        }
        const newChecking = round2(checking - item.price);
        await connection.execute('UPDATE budget_game_state SET checking_balance = ? WHERE student_id = ?', [newChecking, student_id]);
        await logTxn(connection, student_id, 'purchase', `Bought ${item.label}`, -item.price, newChecking);
        await connection.release();
        res.json({ success: true, checking: newChecking });
    } catch (err) {
        console.error('[budget-game] buy error:', err);
        res.status(500).json({ error: 'Failed to complete purchase' });
    }
});

// direction: 'to_savings' | 'from_savings' | 'to_invest' | 'from_invest'
router.post('/student/budget-game/transfer', async (req, res) => {
    const { student_id, direction, amount } = req.body || {};
    const amt = round2(Number(amount));
    if (!student_id || !direction || !(amt > 0)) return res.status(400).json({ error: 'student_id, direction, and a positive amount are required' });
    const validDirections = ['to_savings', 'from_savings', 'to_invest', 'from_invest'];
    if (!validDirections.includes(direction)) return res.status(400).json({ error: 'Invalid direction' });

    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        const [[state]] = await connection.execute(
            'SELECT * FROM budget_game_state WHERE student_id = ?', [student_id]
        );
        if (!state) { await connection.release(); return res.status(400).json({ error: 'No game state yet -- open the game first.' }); }

        let checking = Number(state.checking_balance);
        let savings = Number(state.savings_balance);
        let invested = Number(state.invested_balance);
        let txnLabel, txnAmount, txnBalanceAfter;

        if (direction === 'to_savings') {
            if (checking < amt) { await connection.release(); return res.status(400).json({ error: `You only have $${checking.toFixed(2)} in checking.` }); }
            checking = round2(checking - amt); savings = round2(savings + amt);
            txnLabel = 'Moved to savings'; txnAmount = -amt; txnBalanceAfter = checking;
        } else if (direction === 'from_savings') {
            if (savings < amt) { await connection.release(); return res.status(400).json({ error: `You only have $${savings.toFixed(2)} in savings.` }); }
            savings = round2(savings - amt); checking = round2(checking + amt);
            txnLabel = 'Moved from savings'; txnAmount = amt; txnBalanceAfter = checking;
        } else if (direction === 'to_invest') {
            if (checking < amt) { await connection.release(); return res.status(400).json({ error: `You only have $${checking.toFixed(2)} in checking.` }); }
            checking = round2(checking - amt); invested = round2(invested + amt);
            txnLabel = 'Invested'; txnAmount = -amt; txnBalanceAfter = checking;
        } else {
            if (invested < amt) { await connection.release(); return res.status(400).json({ error: `You only have $${invested.toFixed(2)} invested.` }); }
            invested = round2(invested - amt); checking = round2(checking + amt);
            txnLabel = 'Cashed out investment'; txnAmount = amt; txnBalanceAfter = checking;
        }

        await connection.execute(
            'UPDATE budget_game_state SET checking_balance = ?, savings_balance = ?, invested_balance = ? WHERE student_id = ?',
            [checking, savings, invested, student_id]
        );
        await logTxn(connection, student_id, direction, `${txnLabel} ($${amt.toFixed(2)})`, txnAmount, txnBalanceAfter);
        await connection.release();
        res.json({ success: true, checking, savings, invested });
    } catch (err) {
        console.error('[budget-game] transfer error:', err);
        res.status(500).json({ error: 'Failed to complete transfer' });
    }
});

module.exports = router;
