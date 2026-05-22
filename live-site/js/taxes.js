// js/taxes.js
/**
 * Student Tax Center Logic
 * Fetches W-2 forms from Firestore and allows students to file a simulated 1040-EZ.
 */

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, getDocs, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db, appId } from "/js/firebase-init.js";

let currentUser = null;
let availableW2s = [];

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        loadTaxData();
    } else {
        window.location.replace("/login.html");
    }
});

async function loadTaxData() {
    const container = document.getElementById('tax-container');
    try {
        const taxesRef = collection(db, 'artifacts', appId, 'users', currentUser.uid, 'taxes');
        const snap = await getDocs(taxesRef);
        
        availableW2s = [];
        snap.forEach(doc => {
            if(doc.id.startsWith('W2_')) {
                availableW2s.push(doc.data());
            }
        });

        if (availableW2s.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center mt-5">
                    <i class="fas fa-box-open text-muted mb-3" style="font-size: 5rem;"></i>
                    <h3 class="fw-bold text-dark">No Tax Documents Found</h3>
                    <p class="text-muted fs-5">You do not have any W-2 forms on file yet. Your employer will issue them at the end of the tax year (January).</p>
                </div>`;
            return;
        }

        // Sort by year descending (Newest first)
        availableW2s.sort((a,b) => b.year - a.year);
        renderTaxUI();

    } catch (e) {
        console.error("Tax loading error:", e);
        container.innerHTML = `<div class="col-12 text-center text-danger fw-bold mt-5 fs-4">Error loading tax data from the server.</div>`;
    }
}

function renderTaxUI() {
    const container = document.getElementById('tax-container');
    const activeW2 = availableW2s[0]; // Process the most recent year

    let html = `
        <div class="col-lg-6 mb-4">
            <div class="card shadow-lg border-dark h-100">
                <div class="card-header bg-dark text-white fw-bold d-flex justify-content-between align-items-center py-3">
                    <h5 class="mb-0"><i class="fas fa-file-invoice me-2"></i>Form W-2 Wage and Tax Statement</h5>
                    <span class="badge bg-light text-dark fs-6">Year: ${activeW2.year}</span>
                </div>
                <div class="card-body p-4" style="font-family: 'Courier New', Courier, monospace; background-color: #fdfdfd;">
                    <div class="row border border-dark mb-2">
                        <div class="col-12 border-bottom border-dark p-2">
                            <small class="fw-bold text-muted">b Employer identification number (EIN)</small>
                            <div class="fs-5">88-XXXXXXX</div>
                        </div>
                        <div class="col-12 p-2">
                            <small class="fw-bold text-muted">c Employer's name, address, and ZIP code</small>
                            <div class="fs-5">${activeW2.employer}<br>1111 N Saliman Rd<br>Carson City, NV 89701</div>
                        </div>
                    </div>
                    <div class="row border border-dark mb-3">
                        <div class="col-12 p-2">
                            <small class="fw-bold text-muted">e Employee's name</small>
                            <div class="fw-bold text-primary fs-4">${activeW2.lastName.toUpperCase()}, ${activeW2.firstName.toUpperCase()}</div>
                        </div>
                    </div>
                    <div class="row g-2">
                        <div class="col-6">
                            <div class="border border-dark p-3 h-100">
                                <small class="fw-bold text-muted">1 Wages, tips, other comp.</small>
                                <div class="fw-bold fs-4 text-success">$${activeW2.wages.toFixed(2)}</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="border border-dark p-3 h-100">
                                <small class="fw-bold text-muted">2 Federal income tax withheld</small>
                                <div class="fw-bold fs-4 text-danger">$${activeW2.fedTaxWithheld.toFixed(2)}</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="border border-dark p-3 h-100">
                                <small class="fw-bold text-muted">3 Social security wages</small>
                                <div class="fw-bold fs-5">$${activeW2.wages.toFixed(2)}</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="border border-dark p-3 h-100">
                                <small class="fw-bold text-muted">4 Social security tax withheld</small>
                                <div class="fw-bold fs-5 text-danger">$${activeW2.ssTaxWithheld.toFixed(2)}</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="border border-dark p-3 h-100">
                                <small class="fw-bold text-muted">5 Medicare wages and tips</small>
                                <div class="fw-bold fs-5">$${activeW2.wages.toFixed(2)}</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="border border-dark p-3 h-100">
                                <small class="fw-bold text-muted">6 Medicare tax withheld</small>
                                <div class="fw-bold fs-5 text-danger">$${activeW2.medTaxWithheld.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                    <div class="text-center mt-4 text-muted" style="font-size: 0.75rem;">
                        COPY B - To be filed with employee's FEDERAL tax return.
                    </div>
                </div>
            </div>
        </div>
        
        <div class="col-lg-6 mb-4">
            <div class="card shadow-lg border-success h-100">
                <div class="card-header bg-success text-white fw-bold py-3">
                    <h5 class="mb-0"><i class="fas fa-calculator me-2"></i>Form 1040-EZ Tax Return Simulation</h5>
                </div>
                <div class="card-body p-4 bg-light">
                    <form id="taxForm">
                        <div class="mb-4 d-flex justify-content-between align-items-end border-bottom border-secondary pb-3">
                            <div class="w-75 pe-3">
                                <label class="form-label fw-bold mb-0 fs-5">1. Total Wages</label>
                                <div class="small text-muted">Copy this exact amount from Box 1 of your W-2.</div>
                            </div>
                            <div class="input-group w-50">
                                <span class="input-group-text bg-white border-success fw-bold text-success">$</span>
                                <input type="number" class="form-control border-success text-end fw-bold fs-5" id="line1" value="${activeW2.wages.toFixed(2)}" readonly>
                            </div>
                        </div>
                        
                        <div class="mb-4 d-flex justify-content-between align-items-end border-bottom border-secondary pb-3">
                            <div class="w-75 pe-3">
                                <label class="form-label fw-bold mb-0 fs-5">2. Standard Deduction</label>
                                <div class="small text-muted">A flat amount that reduces your taxable income ($13,850 for a single filer).</div>
                            </div>
                            <div class="input-group w-50">
                                <span class="input-group-text bg-white border-danger text-danger fw-bold">-$</span>
                                <input type="number" class="form-control border-danger text-end fw-bold text-danger fs-5" id="line2" value="13850.00" readonly>
                            </div>
                        </div>
                        
                        <div class="mb-4 d-flex justify-content-between align-items-end border-bottom border-secondary pb-3">
                            <div class="w-75 pe-3">
                                <label class="form-label fw-bold text-primary mb-0 fs-5">3. Taxable Income</label>
                                <div class="small text-muted">Subtract Line 2 from Line 1. If less than zero, your taxable income is 0.</div>
                            </div>
                            <div class="input-group w-50">
                                <span class="input-group-text bg-white border-primary fw-bold text-primary">$</span>
                                <input type="number" class="form-control border-primary text-end fw-bold text-primary fs-5" id="line3" value="0.00" readonly>
                            </div>
                        </div>

                        <div class="mb-4 d-flex justify-content-between align-items-end border-bottom border-secondary pb-3">
                            <div class="w-75 pe-3">
                                <label class="form-label fw-bold mb-0 fs-5">4. Tax Calculated</label>
                                <div class="small text-muted">For this simulation, you owe 10% tax on your Taxable Income (Line 3).</div>
                            </div>
                            <div class="input-group w-50">
                                <span class="input-group-text bg-white border-warning fw-bold text-warning">$</span>
                                <input type="number" class="form-control border-warning text-end fw-bold fs-5" id="line4" value="0.00" readonly>
                            </div>
                        </div>
                        
                        <div class="mb-4 d-flex justify-content-between align-items-end border-bottom border-secondary pb-3">
                            <div class="w-75 pe-3">
                                <label class="form-label fw-bold mb-0 fs-5">5. Federal Tax Withheld</label>
                                <div class="small text-muted">Money you already paid the government! (Copy this from Box 2 of your W-2).</div>
                            </div>
                            <div class="input-group w-50">
                                <span class="input-group-text bg-white border-success text-success fw-bold">+$</span>
                                <input type="number" class="form-control border-success text-end fw-bold text-success fs-5" id="line5" value="${activeW2.fedTaxWithheld.toFixed(2)}" readonly>
                            </div>
                        </div>

                        <!-- Results Box -->
                        <div class="p-4 rounded mb-4 shadow-sm" id="resultsBox" style="background-color: #e9ecef;">
                            <div class="d-flex justify-content-between align-items-center">
                                <h4 class="fw-bold mb-0" id="resultLabel">Calculating...</h4>
                                <h2 class="fw-bold mb-0" id="resultAmount">$0.00</h2>
                            </div>
                            <p class="fs-6 text-muted mb-0 mt-2" id="resultDescription"></p>
                        </div>

                        <button type="button" class="btn btn-success w-100 fw-bold shadow-sm p-3 fs-5" id="btnFileTaxes">
                            <i class="fas fa-paper-plane me-2"></i> File Tax Return & Submit
                        </button>
                    </form>

                    <div id="filedStatus" class="alert alert-success mt-4 d-none text-center fw-bold fs-5 shadow-sm border-success">
                        <i class="fas fa-check-circle fs-3 d-block mb-2 text-success"></i>
                        <span id="filedStatusText">Return filed successfully!</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
    
    // Perform Tax Mathematics
    const line1 = activeW2.wages;
    const line2 = 13850; // Current approx standard deduction
    
    let line3 = line1 - line2;
    if (line3 < 0) line3 = 0;
    document.getElementById('line3').value = line3.toFixed(2);
    
    // Simulate a simple 10% tax bracket
    const line4 = line3 * 0.10;
    document.getElementById('line4').value = line4.toFixed(2);
    
    const line5 = activeW2.fedTaxWithheld;
    
    const resBox = document.getElementById('resultsBox');
    const resLabel = document.getElementById('resultLabel');
    const resAmt = document.getElementById('resultAmount');
    const resDesc = document.getElementById('resultDescription');

    let isRefund = false;
    let finalAmount = 0;

    // Refund vs Amount Owed Logic
    if (line5 >= line4) {
        isRefund = true;
        finalAmount = line5 - line4;
        resBox.className = "p-4 rounded mb-4 bg-success bg-opacity-10 border border-success";
        resLabel.innerText = "6a. YOUR REFUND:";
        resLabel.className = "fw-bold mb-0 text-success";
        resAmt.innerText = `+$${finalAmount.toFixed(2)}`;
        resAmt.className = "fw-bold mb-0 text-success";
        resDesc.innerText = "Congratulations! You paid more in taxes during the year than you actually owed. The IRS owes you this money as a refund.";
    } else {
        finalAmount = line4 - line5;
        resBox.className = "p-4 rounded mb-4 bg-danger bg-opacity-10 border border-danger";
        resLabel.innerText = "6b. AMOUNT YOU OWE:";
        resLabel.className = "fw-bold mb-0 text-danger";
        resAmt.innerText = `-$${finalAmount.toFixed(2)}`;
        resAmt.className = "fw-bold mb-0 text-danger";
        resDesc.innerText = "You did not pay enough taxes during the year out of your paychecks. You must pay this remaining balance to the IRS by April 15th.";
    }

    // Attach File Event
    document.getElementById('btnFileTaxes').addEventListener('click', async () => {
        const btn = document.getElementById('btnFileTaxes');
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Transmitting to IRS...';
        btn.disabled = true;

        try {
            const returnRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'taxes', `Return_${activeW2.year}`);
            await setDoc(returnRef, {
                year: activeW2.year,
                wages: line1,
                standardDeduction: line2,
                taxableIncome: line3,
                taxCalculated: line4,
                taxWithheld: line5,
                isRefund: isRefund,
                amount: finalAmount,
                filedOn: new Date().toISOString()
            });

            document.getElementById('btnFileTaxes').style.display = 'none';
            document.getElementById('filedStatus').classList.remove('d-none');
            document.getElementById('filedStatusText').innerText = `Officially Filed on ${new Date().toLocaleDateString()}`;
        } catch (e) {
            console.error("Filing error:", e);
            alert("Error transmitting return to the server.");
            btn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> File Tax Return & Submit';
            btn.disabled = false;
        }
    });
    
    // Check if they already filed this year
    checkIfFiled(activeW2.year);
}

async function checkIfFiled(year) {
    try {
        const returnRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'taxes', `Return_${year}`);
        const snap = await getDoc(returnRef);
        if (snap.exists()) {
            document.getElementById('btnFileTaxes').style.display = 'none';
            const status = document.getElementById('filedStatus');
            status.classList.remove('d-none');
            status.innerHTML = `<i class="fas fa-lock fs-3 d-block mb-2"></i> <span id="filedStatusText">Officially Filed on ${new Date(snap.data().filedOn).toLocaleDateString()}</span>`;
        }
    } catch (e) {
        console.error("Check filed error:", e);
    }
}