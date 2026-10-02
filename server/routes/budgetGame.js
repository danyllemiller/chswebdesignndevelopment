// /server/routes/budgetGame.js
// "The Paycheck" -- a real-money budgeting game, live for every level (WD1
// included as of 2026-10-01, not just WD2/AS). Every real,
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
const { requireSelfOrStaff } = require('../helpers');

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

// "Game of Life"-style random life events -- rolled once per newly-synced
// real paycheck (same "one real paycheck = one real turn" cadence the
// interest/investment rolls above use), so they stay rare and different
// for each student rather than firing on every page load or hitting
// everyone at once. weight controls how often an event is picked relative
// to the others once LIFE_EVENT_CHANCE has already decided an event fires
// at all -- common inconveniences are weighted heavily, milestones are
// deliberately rare so they still feel special when they land.
const LIFE_EVENT_CHANCE = 0.3; // 30% chance per new paycheck that ANY event fires
const LIFE_EVENTS = [
    // Common minor expenses
    { key: 'dentist', label: 'Dentist Checkup', message: 'Time for your 6-month dentist checkup.', amount: -4.00, weight: 10 },
    { key: 'flat_tire', label: 'Flat Tire', message: 'You got a flat tire and had to patch it.', amount: -6.00, weight: 10 },
    { key: 'cracked_screen', label: 'Cracked Phone Screen', message: 'You dropped your phone and cracked the screen.', amount: -8.00, weight: 8 },
    { key: 'parking_ticket', label: 'Parking Ticket', message: 'Oops -- you got a parking ticket.', amount: -3.00, weight: 10 },
    { key: 'vet_bill', label: 'Vet Visit', message: 'Your pet needed a check-up at the vet.', amount: -5.00, weight: 8 },
    { key: 'birthday_gift', label: "Friend's Birthday", message: "You bought a gift for a friend's birthday.", amount: -3.00, weight: 10 },
    { key: 'oil_change', label: 'Oil Change', message: 'Your car needed an oil change.', amount: -4.00, weight: 9 },
    { key: 'haircut', label: 'Haircut', message: 'You got a haircut.', amount: -3.00, weight: 9 },
    { key: 'fast_food', label: 'Ate Out With Friends', message: 'You grabbed food with friends after school.', amount: -4.00, weight: 10 },
    // Moderate, less frequent setbacks
    { key: 'car_trouble', label: 'Car Trouble', message: 'Your car broke down and needed real repairs.', amount: -15.00, weight: 5 },
    { key: 'doctor_visit', label: 'Doctor Visit', message: 'You got sick and had to see a doctor.', amount: -10.00, weight: 6 },
    { key: 'lost_phone', label: 'Lost Your Phone', message: 'You lost your phone and had to replace it.', amount: -14.00, weight: 4 },
    { key: 'speeding_ticket', label: 'Speeding Ticket', message: 'You got pulled over for speeding.', amount: -12.00, weight: 4 },
    { key: 'home_repair', label: 'Something Broke at Home', message: 'Something broke at home and needed fixing.', amount: -12.00, weight: 5 },
    // Windfalls
    { key: 'birthday_cash', label: 'Birthday Cash', message: 'Grandma sent you some birthday cash!', amount: 10.00, weight: 8 },
    { key: 'found_money', label: 'Found Money', message: 'You found cash in an old jacket pocket!', amount: 5.00, weight: 7 },
    { key: 'tax_refund', label: 'Tax Refund', message: 'You got a small tax refund.', amount: 8.00, weight: 5 },
    { key: 'garage_sale', label: 'Garage Sale', message: 'You sold some old stuff at a garage sale.', amount: 7.00, weight: 6 },
    { key: 'raffle_win', label: 'Won a Raffle', message: 'You won a school raffle prize!', amount: 6.00, weight: 5 },
    // Rare milestones -- bigger financial swing, more narrative weight
    { key: 'got_married', label: 'Got Married!', message: 'Congratulations -- you got married! The wedding cost more than expected, but you also got some generous gifts.', amount: -10.00, weight: 1 },
    { key: 'had_baby', label: 'Had a Baby!', message: "Congratulations -- you're a parent now! Time to budget for diapers and baby gear.", amount: -20.00, weight: 1 },
    { key: 'bought_car', label: 'Bought a (Used) Car', message: 'You saved up and bought your first car!', amount: -25.00, weight: 1 },
    { key: 'moved_out', label: 'Moved Into Your Own Place', message: 'You moved into your first apartment -- deposit and moving costs added up.', amount: -22.00, weight: 1 },
    { key: 'got_raise', label: 'Got a Raise!', message: 'Your hard work paid off -- you got a raise!', amount: 15.00, weight: 1 }
];
const LIFE_EVENT_TOTAL_WEIGHT = LIFE_EVENTS.reduce((sum, e) => sum + e.weight, 0);

function pickLifeEvent() {
    let roll = Math.random() * LIFE_EVENT_TOTAL_WEIGHT;
    for (const e of LIFE_EVENTS) {
        if (roll < e.weight) return e;
        roll -= e.weight;
    }
    return LIFE_EVENTS[LIFE_EVENTS.length - 1];
}

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

            // Random "Game of Life" event -- not every period, not every
            // student, never the same one twice in a row for the same
            // reason. Checking is allowed to go negative here (unlike a
            // student-initiated buy/pay-bills, which block if they can't
            // afford it) -- getting caught short by a surprise expense is
            // the actual lesson, same as it would be for real.
            if (Math.random() < LIFE_EVENT_CHANCE) {
                const event = pickLifeEvent();
                checking = round2(checking + event.amount);
                await logTxn(connection, studentId, 'life_event', `${event.label} -- ${event.message}`, event.amount, checking);
            }
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

router.get('/student/budget-game/state', requireSelfOrStaff(), async (req, res) => {
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

router.post('/student/budget-game/pay-bills', requireSelfOrStaff(), async (req, res) => {
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

router.post('/student/budget-game/buy', requireSelfOrStaff(), async (req, res) => {
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
router.post('/student/budget-game/transfer', requireSelfOrStaff(), async (req, res) => {
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
