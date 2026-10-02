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
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { getDbConnection } = require('../db');
const { requireSelfOrStaff, requireStaff } = require('../helpers');
const { QUARTER_BOUNDARIES } = require('../tardyLogic');

const STORE_IMAGE_ROOT = path.join(__dirname, '..', '..', 'images', 'budget-game-store');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

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

const STORE_ITEMS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS budget_game_store_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_key VARCHAR(60) NOT NULL UNIQUE,
    category VARCHAR(30) NOT NULL,
    label VARCHAR(100) NOT NULL,
    price DECIMAL(6,2) NOT NULL,
    image_url VARCHAR(255) DEFAULT NULL,
    sort_order INT DEFAULT 0,
    active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

// Starting catalog -- same items/prices the store always had, now rows in a
// real table instead of hardcoded, so a teacher can add real student-submitted
// photos (or whole new items) from admin/tools/budget-game-store.html without
// a code deploy. Only seeded once, on an empty table, so it never stomps on
// items a teacher has since added, edited, or deactivated.
const SEED_STORE_ITEMS = [
    { item_key: 'milk', category: 'groceries', label: 'Milk', price: 1.00, sort_order: 1 },
    { item_key: 'bread', category: 'groceries', label: 'Bread', price: 0.75, sort_order: 2 },
    { item_key: 'fruit', category: 'groceries', label: 'Fresh Fruit', price: 1.25, sort_order: 3 },
    { item_key: 'frozen_meal', category: 'groceries', label: 'Frozen Meal', price: 2.00, sort_order: 4 },
    { item_key: 'snacks', category: 'groceries', label: 'Snacks', price: 1.50, sort_order: 5 },
    { item_key: 'tshirt', category: 'clothes', label: 'T-Shirt', price: 3.00, sort_order: 1 },
    { item_key: 'jeans', category: 'clothes', label: 'Jeans', price: 6.00, sort_order: 2 },
    { item_key: 'shoes', category: 'clothes', label: 'Shoes', price: 8.00, sort_order: 3 },
    { item_key: 'jacket', category: 'clothes', label: 'Jacket', price: 10.00, sort_order: 4 }
];

const CARDS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS budget_game_cards (
    student_id VARCHAR(50) PRIMARY KEY,
    card_number VARCHAR(19) NOT NULL,
    card_name VARCHAR(100) NOT NULL,
    expiry VARCHAR(5) NOT NULL,
    cvv VARCHAR(3) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

const CART_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS budget_game_cart_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    item_key VARCHAR(60) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_cart_item (student_id, item_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

async function ensureTables(connection) {
    await connection.execute(STATE_TABLE_SQL);
    await connection.execute(TXN_TABLE_SQL);
    await connection.execute(STORE_ITEMS_TABLE_SQL);
    await connection.execute(CARDS_TABLE_SQL);
    await connection.execute(CART_TABLE_SQL);
    const [[{ cnt }]] = await connection.execute('SELECT COUNT(*) AS cnt FROM budget_game_store_items');
    if (cnt === 0) {
        for (const item of SEED_STORE_ITEMS) {
            await connection.execute(
                `INSERT INTO budget_game_store_items (item_key, category, label, price, sort_order) VALUES (?, ?, ?, ?, ?)`,
                [item.item_key, item.category, item.label, item.price, item.sort_order]
            );
        }
    }
}

// "groceries" is its own page/checkout (the Grocery Store); every other
// category (clothes, household, other, ...) lives together on one Mall
// page with a shared cart -- new categories added later via Store Manager
// automatically land in the Mall without needing code changes here.
function storeForCategory(category) {
    return category === 'groceries' ? 'groceries' : 'mall';
}

function randomDigits(n) {
    let s = '';
    for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
    return s;
}

// Issued once per student, first time they touch the card/cart/checkout --
// a realistic-LOOKING 16-digit number (clearly fake test-range BIN, not a
// real network's actual range) and a few-years-out expiry, so "My Card"
// has something to actually show without ever being a usable real card
// number by construction.
async function ensureCard(connection, studentId) {
    const [[existing]] = await connection.execute('SELECT * FROM budget_game_cards WHERE student_id = ?', [studentId]);
    if (existing) return existing;

    const [[student]] = await connection.execute('SELECT first_name, last_name FROM students WHERE student_id = ?', [studentId]);
    const cardName = student ? `${student.first_name} ${student.last_name}`.toUpperCase() : 'CHS STUDENT';
    const cardNumber = `4900 ${randomDigits(4)} ${randomDigits(4)} ${randomDigits(4)}`;
    const now = new Date();
    const expiryYear = String((now.getFullYear() + 3) % 100).padStart(2, '0');
    const expiryMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const expiry = `${expiryMonth}/${expiryYear}`;
    const cvv = randomDigits(3);

    await connection.execute(
        `INSERT INTO budget_game_cards (student_id, card_number, card_name, expiry, cvv) VALUES (?, ?, ?, ?, ?)`,
        [studentId, cardNumber, cardName, expiry, cvv]
    );
    return { student_id: studentId, card_number: cardNumber, card_name: cardName, expiry, cvv };
}

async function getStoreCatalog(connection) {
    const [rows] = await connection.execute(
        `SELECT item_key, category, label, price, image_url FROM budget_game_store_items WHERE active = 1 ORDER BY category, sort_order, label`
    );
    const catalog = {};
    rows.forEach(r => {
        if (!catalog[r.category]) catalog[r.category] = [];
        catalog[r.category].push({ key: r.item_key, label: r.label, price: Number(r.price), image: r.image_url });
    });
    return catalog;
}

async function getActiveItemByKey(connection, itemKey) {
    const [[row]] = await connection.execute(
        `SELECT item_key, category, label, price, image_url FROM budget_game_store_items WHERE item_key = ? AND active = 1`,
        [itemKey]
    );
    return row ? { key: row.item_key, category: row.category, label: row.label, price: Number(row.price), image: row.image_url } : null;
}

function slugify(text) {
    return String(text).toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50) || 'item';
}

const BLOCKED_IMG_EXTENSIONS = new Set(['php', 'php3', 'php4', 'php5', 'phtml', 'phar', 'cgi', 'pl', 'py', 'rb', 'sh', 'exe', 'jsp', 'asp', 'aspx', 'svg', 'html', 'htm']);
const ALLOWED_IMG_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

function saveStoreImage(category, itemKey, file) {
    const ext = (file.originalname.split('.').pop() || '').toLowerCase();
    if (BLOCKED_IMG_EXTENSIONS.has(ext) || !ALLOWED_IMG_EXTENSIONS.has(ext)) return null;
    const safeCategory = slugify(category);
    const dir = path.join(STORE_IMAGE_ROOT, safeCategory);
    fs.mkdirSync(dir, { recursive: true });
    const filename = `${itemKey}-${Date.now()}.${ext}`;
    fs.writeFileSync(path.join(dir, filename), file.buffer, { mode: 0o644 });
    return `/images/budget-game-store/${safeCategory}/${filename}`;
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
        const store = await getStoreCatalog(connection);

        await connection.release();
        res.json({
            checking: Number(state.checking_balance),
            savings: Number(state.savings_balance),
            invested: Number(state.invested_balance),
            net_worth: round2(Number(state.checking_balance) + Number(state.savings_balance) + Number(state.invested_balance)),
            bills: BILLS,
            bills_total: round2(BILLS_TOTAL),
            bills_paid_this_period: billsPaidThisPeriod,
            store,
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
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);

        const item = await getActiveItemByKey(connection, item_key);
        if (!item) { await connection.release(); return res.status(400).json({ error: 'Unknown item' }); }

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

// GET /student/budget-game/card?student_id=X -- auto-issues on first call
router.get('/student/budget-game/card', requireSelfOrStaff(), async (req, res) => {
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ error: 'student_id required' });
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        const card = await ensureCard(connection, student_id);
        await connection.release();
        res.json({
            card_number: card.card_number, card_name: card.card_name,
            expiry: card.expiry, cvv: card.cvv
        });
    } catch (err) {
        console.error('[budget-game] card error:', err);
        res.status(500).json({ error: 'Failed to load card' });
    }
});

// GET /student/budget-game/cart?student_id=X&store=groceries|mall
router.get('/student/budget-game/cart', requireSelfOrStaff(), async (req, res) => {
    const { student_id, store } = req.query;
    if (!student_id || !['groceries', 'mall'].includes(store)) {
        return res.status(400).json({ error: 'student_id and a valid store (groceries or mall) are required' });
    }
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        const [rows] = await connection.execute(
            `SELECT c.item_key, c.quantity, i.label, i.price, i.image_url, i.category, i.active
             FROM budget_game_cart_items c
             JOIN budget_game_store_items i ON i.item_key = c.item_key
             WHERE c.student_id = ?`,
            [student_id]
        );
        const items = rows
            .filter(r => storeForCategory(r.category) === store)
            .map(r => ({ key: r.item_key, label: r.label, price: Number(r.price), image: r.image_url, category: r.category, quantity: r.quantity, active: !!r.active }));
        const subtotal = round2(items.reduce((sum, it) => sum + (it.active ? it.price * it.quantity : 0), 0));
        await connection.release();
        res.json({ items, subtotal });
    } catch (err) {
        console.error('[budget-game] cart error:', err);
        res.status(500).json({ error: 'Failed to load cart' });
    }
});

// POST /student/budget-game/cart/add -- { student_id, item_key, quantity? }
router.post('/student/budget-game/cart/add', requireSelfOrStaff(), async (req, res) => {
    const { student_id, item_key } = req.body || {};
    const quantity = Math.max(1, Math.floor(Number(req.body?.quantity) || 1));
    if (!student_id || !item_key) return res.status(400).json({ error: 'student_id and item_key required' });
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        const item = await getActiveItemByKey(connection, item_key);
        if (!item) { await connection.release(); return res.status(400).json({ error: 'Unknown item' }); }
        await connection.execute(
            `INSERT INTO budget_game_cart_items (student_id, item_key, quantity) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
            [student_id, item_key, quantity]
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) {
        console.error('[budget-game] cart add error:', err);
        res.status(500).json({ error: 'Failed to add to cart' });
    }
});

// POST /student/budget-game/cart/update -- { student_id, item_key, quantity }
// quantity 0 removes the line entirely.
router.post('/student/budget-game/cart/update', requireSelfOrStaff(), async (req, res) => {
    const { student_id, item_key } = req.body || {};
    const quantity = Math.floor(Number(req.body?.quantity));
    if (!student_id || !item_key || Number.isNaN(quantity) || quantity < 0) {
        return res.status(400).json({ error: 'student_id, item_key, and a non-negative quantity are required' });
    }
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        if (quantity === 0) {
            await connection.execute('DELETE FROM budget_game_cart_items WHERE student_id = ? AND item_key = ?', [student_id, item_key]);
        } else {
            await connection.execute(
                `UPDATE budget_game_cart_items SET quantity = ? WHERE student_id = ? AND item_key = ?`,
                [quantity, student_id, item_key]
            );
        }
        await connection.release();
        res.json({ success: true });
    } catch (err) {
        console.error('[budget-game] cart update error:', err);
        res.status(500).json({ error: 'Failed to update cart' });
    }
});

// POST /student/budget-game/checkout -- { student_id, store }. One-click
// "pay with my CHS Card" -- no card re-entry since the card was already
// auto-issued and is tied to the student's own real checking balance here,
// not a separately-tracked card balance.
router.post('/student/budget-game/checkout', requireSelfOrStaff(), async (req, res) => {
    const { student_id, store } = req.body || {};
    if (!student_id || !['groceries', 'mall'].includes(store)) {
        return res.status(400).json({ error: 'student_id and a valid store (groceries or mall) are required' });
    }
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        const card = await ensureCard(connection, student_id);

        const [cartRows] = await connection.execute(
            `SELECT c.item_key, c.quantity, i.label, i.price, i.category, i.active
             FROM budget_game_cart_items c
             JOIN budget_game_store_items i ON i.item_key = c.item_key
             WHERE c.student_id = ?`,
            [student_id]
        );
        const items = cartRows.filter(r => storeForCategory(r.category) === store);
        if (items.length === 0) { await connection.release(); return res.status(400).json({ error: 'Your cart is empty.' }); }
        const inactiveItem = items.find(r => !r.active);
        if (inactiveItem) { await connection.release(); return res.status(400).json({ error: `${inactiveItem.label} is no longer available -- remove it from your cart.` }); }

        const total = round2(items.reduce((sum, it) => sum + Number(it.price) * it.quantity, 0));

        const [[state]] = await connection.execute('SELECT * FROM budget_game_state WHERE student_id = ?', [student_id]);
        if (!state) { await connection.release(); return res.status(400).json({ error: 'No game state yet -- open the game first.' }); }
        const checking = Number(state.checking_balance);
        if (checking < total) {
            await connection.release();
            return res.status(400).json({ error: `Your card was declined -- insufficient funds. Total is $${total.toFixed(2)}, but you only have $${checking.toFixed(2)} in checking.`, declined: true });
        }

        const newChecking = round2(checking - total);
        await connection.execute('UPDATE budget_game_state SET checking_balance = ? WHERE student_id = ?', [newChecking, student_id]);
        const storeName = store === 'groceries' ? 'Grocery Store' : 'The Mall';
        const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);
        await logTxn(connection, student_id, 'purchase', `${storeName} -- ${itemCount} item${itemCount === 1 ? '' : 's'} (card ending in ${card.card_number.slice(-4)})`, -total, newChecking);

        const itemKeys = items.map(it => it.item_key);
        await connection.execute(
            `DELETE FROM budget_game_cart_items WHERE student_id = ? AND item_key IN (${itemKeys.map(() => '?').join(',')})`,
            [student_id, ...itemKeys]
        );

        await connection.release();
        res.json({
            success: true, checking: newChecking, total,
            card_last4: card.card_number.slice(-4),
            receipt: items.map(it => ({ label: it.label, price: Number(it.price), quantity: it.quantity }))
        });
    } catch (err) {
        console.error('[budget-game] checkout error:', err);
        res.status(500).json({ error: 'Checkout failed' });
    }
});

// GET /admin/budget-game/leaderboard?start=YYYY-MM-DD&end=YYYY-MM-DD -- a
// quarterly "winner" score, deliberately NOT just whoever has the highest
// net worth (that would mostly just reward whoever has the highest-paying
// role or the most hours, neither of which is a budgeting decision). Scores
// three things a student actually controls, each worth up to 40/40/20:
//   - Bills Rate: paid bills every period they got paid, not just some.
//   - Savings Rate: how much of what they earned actually got moved into
//     savings/invest instead of sitting in checking or going to the store.
//   - No Overdrafts: checking never went negative (-5/incident, floor 0).
// All three come straight out of budget_game_transactions for the date
// range -- no point-in-time net-worth snapshot needed (transfers only log
// the checking side of the move, so savings/invested balances can't be
// reliably reconstructed as of a past date from this log alone; current
// net_worth is included on each row for context only, never scored).
router.get('/admin/budget-game/leaderboard', requireStaff, async (req, res) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const start = req.query.start || QUARTER_BOUNDARIES.find(q => todayStr >= q.start && todayStr <= q.end)?.start || QUARTER_BOUNDARIES[0].start;
    const end = req.query.end || QUARTER_BOUNDARIES.find(q => todayStr >= q.start && todayStr <= q.end)?.end || QUARTER_BOUNDARIES[QUARTER_BOUNDARIES.length - 1].end;
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);

        const [rows] = await connection.execute(
            `SELECT s.student_id, s.first_name, s.last_name, s.section_id,
                    COALESCE(gs.checking_balance, 0) + COALESCE(gs.savings_balance, 0) + COALESCE(gs.invested_balance, 0) AS net_worth,
                    SUM(CASE WHEN t.type = 'paycheck' THEN 1 ELSE 0 END) AS paychecks,
                    SUM(CASE WHEN t.type = 'paycheck' THEN t.amount ELSE 0 END) AS income_total,
                    SUM(CASE WHEN t.type = 'bill' THEN 1 ELSE 0 END) AS bills_paid,
                    SUM(CASE WHEN t.type IN ('to_savings', 'to_invest') THEN ABS(t.amount) ELSE 0 END) AS saved_in,
                    SUM(CASE WHEN t.type IN ('from_savings', 'from_invest') THEN ABS(t.amount) ELSE 0 END) AS saved_out,
                    SUM(CASE WHEN t.type NOT IN ('interest', 'invest_return') AND t.balance_after < 0 THEN 1 ELSE 0 END) AS overdrafts,
                    SUM(CASE WHEN t.type = 'life_event' THEN 1 ELSE 0 END) AS life_events,
                    SUM(CASE WHEN t.type = 'life_event' AND t.amount < 0 THEN 1 ELSE 0 END) AS life_events_negative
             FROM budget_game_transactions t
             JOIN students s ON s.student_id = t.student_id
             LEFT JOIN budget_game_state gs ON gs.student_id = t.student_id
             WHERE t.created_at >= ? AND t.created_at < DATE_ADD(?, INTERVAL 1 DAY)
             GROUP BY s.student_id, s.first_name, s.last_name, s.section_id, gs.checking_balance, gs.savings_balance, gs.invested_balance`,
            [start, end]
        );
        await connection.release();

        const leaderboard = rows.map(r => {
            const paychecks = Number(r.paychecks);
            const billsRate = paychecks > 0 ? Math.min(1, Number(r.bills_paid) / paychecks) : 0;
            const income = Number(r.income_total);
            const netSaved = Number(r.saved_in) - Number(r.saved_out);
            const savingsRate = income > 0 ? Math.min(1, Math.max(0, netSaved / income)) : 0;
            const overdraftPenalty = Math.min(20, Number(r.overdrafts) * 5);
            const score = Math.round(billsRate * 40 + savingsRate * 40 + (20 - overdraftPenalty));
            return {
                student_id: r.student_id, first_name: r.first_name, last_name: r.last_name, section_id: r.section_id,
                net_worth: round2(Number(r.net_worth)),
                paychecks, bills_paid: Number(r.bills_paid), bills_rate: round2(billsRate),
                income_total: round2(income), net_saved: round2(netSaved), savings_rate: round2(savingsRate),
                overdrafts: Number(r.overdrafts), life_events: Number(r.life_events), life_events_negative: Number(r.life_events_negative),
                score
            };
        }).sort((a, b) => b.score - a.score || b.net_worth - a.net_worth);

        res.json({
            start, end,
            quarters: QUARTER_BOUNDARIES.map((q, i) => ({ label: `Q${i + 1}`, start: q.start, end: q.end })),
            rows: leaderboard
        });
    } catch (err) {
        console.error('[budget-game] leaderboard error:', err);
        res.status(500).json({ error: 'Failed to compute leaderboard' });
    }
});

// ============================================================================
// STORE ITEM MANAGEMENT (staff -- lets a teacher add real student-submitted
// photos / new items without a code deploy)
// ============================================================================

// GET /admin/budget-game/store-items -- every item, active or not, for the
// management page's own list (a deactivated item still needs to show up
// there so it can be reactivated or re-edited).
router.get('/admin/budget-game/store-items', requireStaff, async (req, res) => {
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        const [rows] = await connection.execute(
            `SELECT id, item_key, category, label, price, image_url, sort_order, active FROM budget_game_store_items ORDER BY category, sort_order, label`
        );
        await connection.release();
        res.json({ items: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load store items.' }); }
});

// POST /admin/budget-game/store-items -- multipart form: category, label,
// price, image (optional file)
router.post('/admin/budget-game/store-items', requireStaff, upload.single('image'), async (req, res) => {
    const { category, label } = req.body || {};
    const price = Number(req.body?.price);
    if (!category || !label || !(price > 0)) {
        return res.status(400).json({ error: 'category, label, and a positive price are required' });
    }
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);

        let itemKey = slugify(label);
        const [[existing]] = await connection.execute('SELECT id FROM budget_game_store_items WHERE item_key = ?', [itemKey]);
        if (existing) itemKey = `${itemKey}_${Date.now().toString().slice(-5)}`;

        let imageUrl = null;
        if (req.file) {
            imageUrl = saveStoreImage(category, itemKey, req.file);
            if (!imageUrl) { await connection.release(); return res.status(400).json({ error: 'That image file type is not allowed. Use JPG, PNG, WEBP, or GIF.' }); }
        }

        const [[{ maxSort }]] = await connection.execute(
            'SELECT COALESCE(MAX(sort_order), 0) AS maxSort FROM budget_game_store_items WHERE category = ?', [category]
        );

        await connection.execute(
            `INSERT INTO budget_game_store_items (item_key, category, label, price, image_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
            [itemKey, category, label.trim().slice(0, 100), round2(price), imageUrl, maxSort + 1]
        );
        await connection.release();
        res.json({ success: true, item_key: itemKey, image_url: imageUrl });
    } catch (err) {
        console.error('[budget-game] create store item error:', err);
        res.status(500).json({ error: 'Failed to add item.' });
    }
});

// PATCH /admin/budget-game/store-items/:id -- multipart or JSON: label,
// price, active, image (optional replacement file)
router.patch('/admin/budget-game/store-items/:id', requireStaff, upload.single('image'), async (req, res) => {
    const { id } = req.params;
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        const [[item]] = await connection.execute('SELECT * FROM budget_game_store_items WHERE id = ?', [id]);
        if (!item) { await connection.release(); return res.status(404).json({ error: 'Item not found.' }); }

        const updates = [];
        const values = [];
        if (req.body?.label) { updates.push('label = ?'); values.push(String(req.body.label).trim().slice(0, 100)); }
        if (req.body?.price) { updates.push('price = ?'); values.push(round2(Number(req.body.price))); }
        if (req.body?.active !== undefined) { updates.push('active = ?'); values.push(req.body.active === 'true' || req.body.active === true || req.body.active === '1' ? 1 : 0); }
        if (req.file) {
            const imageUrl = saveStoreImage(item.category, item.item_key, req.file);
            if (!imageUrl) { await connection.release(); return res.status(400).json({ error: 'That image file type is not allowed. Use JPG, PNG, WEBP, or GIF.' }); }
            updates.push('image_url = ?'); values.push(imageUrl);
        }
        if (updates.length === 0) { await connection.release(); return res.status(400).json({ error: 'Nothing to update.' }); }

        values.push(id);
        await connection.execute(`UPDATE budget_game_store_items SET ${updates.join(', ')} WHERE id = ?`, values);
        await connection.release();
        res.json({ success: true });
    } catch (err) {
        console.error('[budget-game] update store item error:', err);
        res.status(500).json({ error: 'Failed to update item.' });
    }
});

module.exports = router;
