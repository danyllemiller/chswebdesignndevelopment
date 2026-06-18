// /js/student/student-payroll.js
/**
 * Student Payroll & Timesheet Viewer (Modular/MariaDB Version)
 * - Organizes timesheets into bi-weekly pay periods.
 * - Applies realistic Carson City, NV pay scales based on role.
 * - Generates an authentic Earnings Statement (Paystub) with tax withholdings.
 * - FULLY MODULARIZED: Uses user-session.js and api-client.js.
 */

import { getLoggedInUser } from '../modules/user-session.js';
import { apiFetch } from '../modules/api-client.js';

// ==============================================================================
// 💼 TEACHER CONFIGURATION: ADJUSTABLE PAY SCALES & SCHEDULE
// Rates are based on median wages for the Carson City, NV area.
// ==============================================================================
const PAY_SCALES = {
    "Intern": 15.00,
    "Junior Developer": 20.00,
    "Web Developer": 35.00, // Area Median
    "Senior Developer": 45.00,
    "Project Manager": 50.00
};
const DEFAULT_ROLE = "Web Developer";
const ON_TIME_BONUS = 5.00; // Flat bonus per on-time punch
const ANCHOR_DATE = new Date("2026-08-02T00:00:00");

// Global State
let currentRole = DEFAULT_ROLE;
let currentRate = PAY_SCALES[DEFAULT_ROLE];
let currentStudentName = 'Student';
let payPeriods = [];
let currentPeriodIndex = 0;
let isCSStudent = false;

// ==============================================================================
// 🛠️ UTILITIES
// ==============================================================================
function _pad(n) {
    return n < 10 ? '0' + n : String(n);
}

function getPayPeriodForDate(dateStr) {
    const d = new Date(dateStr + "T12:00:00");
    const diffTime = d.getTime() - ANCHOR_DATE.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const periodsPassed = Math.floor(diffDays / 14);

    const ppStart = new Date(ANCHOR_DATE.getTime() + periodsPassed * 14 * 24 * 60 * 60 * 1000);
    const ppEnd = new Date(ppStart.getTime() + 13 * 24 * 60 * 60 * 1000);

    const startStr = `${ppStart.getFullYear()}-${_pad(ppStart.getMonth() + 1)}-${_pad(ppStart.getDate())}`;
    const endStr = `${ppEnd.getFullYear()}-${_pad(ppEnd.getMonth() + 1)}-${_pad(ppEnd.getDate())}`;
    const id = Number(`${ppStart.getFullYear()}${_pad(ppStart.getMonth() + 1)}${_pad(ppStart.getDate())}`);

    return {
        startStr,
        endStr,
        id,
        friendly: `${ppStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${ppEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    };
}

// ==============================================================================
// 🚀 INITIALIZATION & UI
// ==============================================================================

async function initPayroll() {
    const user = getLoggedInUser();
    if (!user) return;
    
    try {
        // Fetch User Data from MariaDB via API
        const userData = await apiFetch(`/api/payroll/roster?username=${user.username}`);
        
        currentStudentName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Student';
        if (userData.title && PAY_SCALES[userData.title]) {
            currentRole = userData.title;
            currentRate = parseFloat(userData.hourly_rate);
        }
        
        isCSStudent = userData.section_id?.startsWith('CS') || false;

        if (!isCSStudent) {
            buildPayrollUI(user.student_id);
        } else {
            const container = document.getElementById('student-payroll-container');
            if (container) {
                container.innerHTML = `
                    <div class="alert alert-info mt-5 shadow-sm border-info">
                        <h5 class="fw-bold">Computer Science Students</h5>
                        <p class="mb-0">Payroll and timesheet summaries are not available for CS accounts. Use the CS Interactive Workspace for clock in/out and point tracking.</p>
                    </div>
                `;
            }
        }
    } catch (e) {
        console.error("Payroll init error:", e);
    }
}

async function buildPayrollUI(student_id) {
    const container = document.getElementById('student-payroll-container');
    if (!container) return; 

    // UI Layout
    container.innerHTML = `
        <div class="card shadow-sm border-success mt-5 mb-5">
            <div class="card-header bg-success text-white py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <h4 class="mb-0 fw-bold"><i class="fas fa-money-check-alt me-2"></i>My Employee Portal</h4>
                <div class="badge bg-light text-success fs-6 border border-light shadow-sm">
                    <i class="fas fa-id-badge me-1"></i> ${currentRole} | $${currentRate.toFixed(2)}/hr
                </div>
            </div>
            <div class="card-body bg-light p-4">
                
                <div class="d-flex justify-content-between align-items-center bg-white p-3 border rounded shadow-sm mb-4">
                    <button id="btnPrevPeriod" class="btn btn-outline-success fw-bold px-3"><i class="fas fa-chevron-left"></i> Previous</button>
                    <div class="text-center">
                        <span class="text-muted small fw-bold text-uppercase d-block" style="letter-spacing:1px;">Pay Period</span>
                        <h5 class="fw-bold text-dark mb-0" id="currentPeriodLabel">Loading...</h5>
                    </div>
                    <button id="btnNextPeriod" class="btn btn-outline-success fw-bold px-3" disabled>Next <i class="fas fa-chevron-right"></i></button>
                </div>

                <div class="row text-center mb-4 g-3">
                    <div class="col-md-6">
                        <div class="p-3 bg-white border border-success rounded shadow-sm h-100 d-flex flex-column justify-content-center">
                            <h6 class="text-muted fw-bold text-uppercase mb-1" style="letter-spacing: 1px;">Period Hours</h6>
                            <h2 class="display-6 text-success fw-bold mb-0" id="totalHoursDisplay">0h 0m</h2>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="p-3 bg-white border border-success rounded shadow-sm h-100 d-flex flex-column justify-content-center">
                            <h6 class="text-muted fw-bold text-uppercase mb-1" style="letter-spacing: 1px;">Period Gross Pay</h6>
                            <h2 class="display-6 text-success fw-bold mb-0" id="totalPayDisplay">$0.00</h2>
                        </div>
                    </div>
                </div>
                
                <div class="d-flex justify-content-between align-items-end border-bottom pb-2 mb-3">
                    <h5 class="fw-bold text-dark mb-0">Shift Logs</h5>
                    <button id="btnViewPaystub" class="btn btn-sm btn-primary fw-bold shadow-sm" disabled>
                        <i class="fas fa-file-invoice-dollar me-1"></i> Generate Paystub
                    </button>
                </div>
                
                <div class="table-responsive">
                    <table class="table table-hover table-bordered bg-white shadow-sm align-middle small">
                        <thead class="bg-secondary text-white text-center">
                            <tr>
                                <th>Date</th>
                                <th>Clock In</th>
                                <th>Clock Out</th>
                                <th>Time Logged</th>
                                <th>Est. Gross Earnings</th>
                            </tr>
                        </thead>
                        <tbody id="studentTimesheetBody">
                            <tr><td colspan="7" class="text-center p-4"><div class="spinner-border spinner-border-sm text-success me-2"></div> Fetching HR records...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="modal fade" id="paystubModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content shadow-lg border-0">
                    <div class="modal-body p-0">
                        <div class="bg-white p-4 p-md-5" style="font-family: 'Courier New', Courier, monospace; border: 1px solid #ccc; border-radius: 8px;">
                            <div class="row border-bottom border-2 border-dark pb-3 mb-4">
                                <div class="col-sm-6 mb-3 mb-sm-0">
                                    <h4 class="fw-bold mb-0 text-uppercase" style="letter-spacing: -1px;">CHS Web Design Studio</h4>
                                    <div class="small fw-bold">1111 N Saliman Rd<br>Carson City, NV 89701</div>
                                </div>
                                <div class="col-sm-6 text-sm-end">
                                    <h3 class="fw-bold mb-0 text-success">EARNINGS STATEMENT</h3>
                                    <div class="fw-bold">Pay Period: <span id="stubPeriodDates"></span></div>
                                    <div class="fw-bold">Pay Date: <span id="stubPayDate"></span></div>
                                </div>
                            </div>
                            
                            <div class="row mb-4">
                                <div class="col-12">
                                    <div class="border border-dark p-2">
                                        <div class="row fw-bold small">
                                            <div class="col-6 border-end border-dark">EMPLOYEE: <span class="text-primary">${currentStudentName}</span></div>
                                            <div class="col-6">TITLE: <span class="text-primary">${currentRole}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="row mb-4">
                                <div class="col-md-7 mb-4 mb-md-0">
                                    <h6 class="fw-bold text-decoration-underline mb-2">EARNINGS</h6>
                                    <table class="table table-sm table-borderless small fw-bold">
                                        <thead class="border-bottom border-dark">
                                            <tr>
                                                <th>Description</th>
                                                <th class="text-center">Rate</th>
                                                <th class="text-center">Hours/Qty</th>
                                                <th class="text-end">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>Regular Pay</td>
                                                <td class="text-center">$${currentRate.toFixed(2)}</td>
                                                <td class="text-center" id="stubRegHours">0.00</td>
                                                <td class="text-end" id="stubRegTotal">$0.00</td>
                                            </tr>
                                            <tr>
                                                <td>Performance Bonus</td>
                                                <td class="text-center">$${ON_TIME_BONUS.toFixed(2)}</td>
                                                <td class="text-center" id="stubBonusQty">0</td>
                                                <td class="text-end" id="stubBonusTotal">$0.00</td>
                                            </tr>
                                        </tbody>
                                        <tfoot class="border-top border-dark">
                                            <tr>
                                                <td colspan="3"><strong>GROSS PAY</strong></td>
                                                <td class="text-end text-success fs-6" id="stubGrossPay">$0.00</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                <div class="col-md-5">
                                    <h6 class="fw-bold text-decoration-underline mb-2">TAXES & WITHHOLDINGS</h6>
                                    <table class="table table-sm table-borderless small fw-bold text-danger">
                                        <thead class="border-bottom border-dark">
                                            <tr>
                                                <th>Description</th>
                                                <th class="text-end">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>Federal Income Tax</td>
                                                <td class="text-end" id="stubFedTax">$0.00</td>
                                            </tr>
                                            <tr>
                                                <td>Social Security (FICA)</td>
                                                <td class="text-end" id="stubSSTax">$0.00</td>
                                            </tr>
                                            <tr>
                                                <td>Medicare (FICA)</td>
                                                <td class="text-end" id="stubMedTax">$0.00</td>
                                            </tr>
                                        </tbody>
                                        <tfoot class="border-top border-dark">
                                            <tr>
                                                <td><strong>TOTAL DEDUCTIONS</strong></td>
                                                <td class="text-end" id="stubTotalDeductions">$0.00</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            <div class="row bg-light border border-2 border-dark p-3 align-items-center">
                                <div class="col-6">
                                    <div class="fw-bold text-muted small">YEAR TO DATE (YTD) GROSS: <span id="stubYTDGross">$0.00</span></div>
                                </div>
                                <div class="col-6 text-end">
                                    <h5 class="fw-bold mb-0">NET PAY: <span class="text-success fs-3" id="stubNetPay">$0.00</span></h5>
                                </div>
                            </div>
                            
                            <div class="text-center mt-3 text-muted" style="font-size: 0.65rem;">
                                THIS IS A SIMULATED EARNINGS STATEMENT FOR EDUCATIONAL PURPOSES ONLY. NO REAL CURRENCY IS EXCHANGED.
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer bg-light py-2">
                        <button type="button" class="btn btn-secondary fw-bold px-4" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('btnPrevPeriod').addEventListener('click', () => changePeriod(1));
    document.getElementById('btnNextPeriod').addEventListener('click', () => changePeriod(-1));
    document.getElementById('btnViewPaystub').addEventListener('click', showPaystubModal);

    // Fetch Timesheets from MariaDB
    try {
        const result = await apiFetch(`/api/payroll/timesheets?student_id=${student_id}`);
        let periodsMap = {};
        
        result.timesheets.forEach(data => {
            const pp = getPayPeriodForDate(data.date);
            if (!periodsMap[pp.id]) {
                periodsMap[pp.id] = { info: pp, shifts: [], totals: { mins: 0, gross: 0, bonusCount: 0 } };
            }
            
            const dur = Math.round((new Date(data.clockOutTime) - new Date(data.clockInTime)) / 60000);
            const bonus = (data.statusIn === "On Time" ? 1 : 0) + (data.statusOut === "On Time" ? 1 : 0);
            const gross = (dur/60 * currentRate) + (bonus * ON_TIME_BONUS);
            
            data.calcMins = dur;
            data.calcGross = gross;
            
            periodsMap[pp.id].shifts.push(data);
            periodsMap[pp.id].totals.mins += dur;
            periodsMap[pp.id].totals.gross += gross;
            periodsMap[pp.id].totals.bonusCount += bonus;
        });

        payPeriods = Object.values(periodsMap).sort((a, b) => b.info.id - a.info.id);
        payPeriods.forEach(p => p.shifts.sort((a, b) => new Date(b.date) - new Date(a.date)));
        
        renderCurrentPeriod();
    } catch (e) {
        console.error("Timesheet fetch error:", e);
    }
}

function renderCurrentPeriod() {
    const period = payPeriods[currentPeriodIndex];
    if (!period) return;
    document.getElementById('currentPeriodLabel').innerText = `${period.info.startStr} - ${period.info.endStr}`;
    document.getElementById('totalHoursDisplay').innerText = `${Math.floor(period.totals.mins / 60)}h ${period.totals.mins % 60}m`;
    document.getElementById('totalPayDisplay').innerText = `$${period.totals.gross.toFixed(2)}`;
    
    let tableHtml = '';
    period.shifts.forEach(data => {
        const friendlyDate = new Date(data.date + "T12:00:00").toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        tableHtml += `<tr class="text-center">
            <td class="fw-bold text-start">${friendlyDate}</td>
            <td>${new Date(data.clockInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
            <td>${data.statusIn || '--'}</td>
            <td>${new Date(data.clockOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
            <td>${data.statusOut || '--'}</td>
            <td class="fw-bold text-dark">${Math.floor(data.calcMins/60)}h ${data.calcMins%60}m</td>
            <td class="text-success fw-bold">$${data.calcGross.toFixed(2)}</td>
        </tr>`;
    });
    document.getElementById('studentTimesheetBody').innerHTML = tableHtml;
}

function changePeriod(direction) {
    currentPeriodIndex += direction;
    if (currentPeriodIndex < 0) currentPeriodIndex = 0;
    if (currentPeriodIndex >= payPeriods.length) currentPeriodIndex = payPeriods.length - 1;
    renderCurrentPeriod();
}

function showPaystubModal() {
    const period = payPeriods[currentPeriodIndex];
    if (!period) return;

    let ytdGross = 0;
    payPeriods.forEach(p => { if (p.info.id <= period.info.id) ytdGross += p.totals.gross; });

    const gross = period.totals.gross;
    const fedTax = gross * 0.10;
    const ssTax = gross * 0.062;
    const medTax = gross * 0.0145;
    const totalDed = fedTax + ssTax + medTax;
    const netPay = gross - totalDed;

    document.getElementById('stubPeriodDates').innerText = `${period.info.startStr} to ${period.info.endStr}`;
    document.getElementById('stubPayDate').innerText = period.info.endStr;
    document.getElementById('stubRegHours').innerText = (period.totals.mins / 60).toFixed(2);
    document.getElementById('stubRegTotal').innerText = `$${(period.totals.mins / 60 * currentRate).toFixed(2)}`;
    document.getElementById('stubBonusQty').innerText = period.totals.bonusCount;
    document.getElementById('stubBonusTotal').innerText = `$${(period.totals.bonusCount * ON_TIME_BONUS).toFixed(2)}`;
    document.getElementById('stubGrossPay').innerText = `$${gross.toFixed(2)}`;
    document.getElementById('stubFedTax').innerText = `-$${fedTax.toFixed(2)}`;
    document.getElementById('stubSSTax').innerText = `-$${ssTax.toFixed(2)}`;
    document.getElementById('stubMedTax').innerText = `-$${medTax.toFixed(2)}`;
    document.getElementById('stubTotalDeductions').innerText = `-$${totalDed.toFixed(2)}`;
    document.getElementById('stubYTDGross').innerText = `$${ytdGross.toFixed(2)}`;
    document.getElementById('stubNetPay').innerText = `$${netPay.toFixed(2)}`;

    new bootstrap.Modal(document.getElementById('paystubModal')).show();
}

document.addEventListener('DOMContentLoaded', initPayroll);