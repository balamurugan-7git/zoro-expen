const AppState = {
    transactions: [],
    habits: [],
    notes: [],
    upcomingExpenses: [], // New: Future Plans
    totalAssets: 0,
    currentView: 'dashboard',
    currency: '₹',
    currentUser: null, // New: Auth State

    init() {
        // Load Data from Local Database
        const storedTrans = localStorage.getItem('zoro_transactions');
        const storedHabits = localStorage.getItem('zoro_habits');
        const storedNotes = localStorage.getItem('zoro_notes');
        const storedAssets = localStorage.getItem('zoro_assets');
        const storedUpcoming = localStorage.getItem('zoro_upcoming'); // New
        const storedUser = localStorage.getItem('zoro_user'); // New

        if (storedTrans) this.transactions = JSON.parse(storedTrans);
        if (storedHabits) this.habits = JSON.parse(storedHabits);
        if (storedNotes) this.notes = JSON.parse(storedNotes);
        if (storedUpcoming) this.upcomingExpenses = JSON.parse(storedUpcoming);
        if (storedAssets) this.totalAssets = parseFloat(storedAssets);
        if (storedUser) this.currentUser = JSON.parse(storedUser);

        // Seeding Data if Empty (First Run)
        if (!storedTrans && !storedAssets) {
            this.totalAssets = 100000;
            this.habits = [
                { id: 'h1', name: 'Check Markets', history: {} },
                { id: 'h2', name: 'No Spending Day', history: {} },
                { id: 'h3', name: 'Read Finance Book', history: {} }
            ];
            this.notes = [
                { id: 'n1', title: 'Goals 2026', content: 'Save 10L for house down payment.' }
            ];
            this.save();
        }

        // Auth Check
        if (this.currentUser) {
            document.getElementById('loginOverlay').classList.add('hidden');
            this.render();
        } else {
            // Show login (default state is visible)
        }
    },

    save() {
        localStorage.setItem('zoro_transactions', JSON.stringify(this.transactions));
        localStorage.setItem('zoro_habits', JSON.stringify(this.habits));
        localStorage.setItem('zoro_notes', JSON.stringify(this.notes));
        localStorage.setItem('zoro_upcoming', JSON.stringify(this.upcomingExpenses));
        localStorage.setItem('zoro_assets', JSON.stringify(this.totalAssets));
        if (this.currentUser) localStorage.setItem('zoro_user', JSON.stringify(this.currentUser));
    },

    // --- Auth Logic ---
    login(type) {
        if (type === 'google') {
            // Real Google Auth via Firebase
            const provider = new firebase.auth.GoogleAuthProvider();
            firebase.auth().signInWithPopup(provider)
                .then((result) => {
                    const user = result.user;
                    this.currentUser = {
                        name: user.displayName || user.email.split('@')[0],
                        email: user.email,
                        photoURL: user.photoURL,
                        type: 'google'
                    };
                    this.finishLogin();
                })
                .catch((error) => {
                    console.error('Google Auth Error:', error);
                    alert('Google sign-in failed. Try Quest Mode or check your internet connection.');
                });
        } else {
            // Quest Mode - Local adventure
            this.currentUser = {
                name: 'Quest Explorer',
                type: 'quest',
                startedAt: new Date().toISOString()
            };
            this.finishLogin();
        }
    },

    finishLogin() {
        this.save();
        document.getElementById('loginOverlay').classList.add('hidden');
        this.render();
        // Show welcome message
        const welcomeName = this.currentUser.name || 'Warrior';
        console.log(`Welcome, ${welcomeName}! Your financial quest begins.`);
    },

    // --- Financial Logic ---
    addTransaction(transaction) {
        if (transaction.type === 'future') {
            this.upcomingExpenses.push({ id: Date.now().toString(), ...transaction });
        } else {
            this.transactions.push({ id: Date.now().toString(), ...transaction });

            // Update Total Assets Logic
            if (transaction.type === 'income') {
                this.totalAssets += transaction.amount;
            } else {
                this.totalAssets -= transaction.amount;
            }
        }
        this.save();
        this.render(); // Ensure re-render to update UI immediately
    },

    // Execute Future Expense -> Real Expense
    executeUpcomingExpense(id) {
        const index = this.upcomingExpenses.findIndex(ex => ex.id === id);
        if (index > -1) {
            const expense = this.upcomingExpenses[index];

            // Remove from future
            this.upcomingExpenses.splice(index, 1);

            // Add to real transactions (as expense)
            this.addTransaction({
                type: 'expense',
                amount: expense.amount,
                desc: expense.desc,
                category: expense.category,
                date: new Date().toISOString().split('T')[0]
            });

            alert(`Executed: ${expense.desc}. Wallet deducted.`);
        }
    },

    editTotalAssets() {
        const newAmount = prompt("Enter new Total Asset Value (₹):", this.totalAssets);
        if (newAmount !== null && !isNaN(newAmount)) {
            this.totalAssets = parseFloat(newAmount);
            this.save();
        }
    },

    // --- Habit Logic ---
    toggleHabit(habitId, dateStr) {
        const habit = this.habits.find(h => h.id === habitId);
        if (habit) {
            if (habit.history[dateStr]) {
                delete habit.history[dateStr];
            } else {
                habit.history[dateStr] = true;
            }
            this.save();
        }
    },

    // --- Notes Logic ---
    addNote(title, content) {
        this.notes.push({
            id: Date.now().toString(),
            title,
            content,
            date: new Date().toISOString()
        });
        this.save();
    },

    getStats() {
        let income = 0;
        let expense = 0;
        this.transactions.forEach(t => {
            if (t.type === 'income') income += Number(t.amount);
            else expense += Number(t.amount);
        });
        return { income, expense, balance: this.totalAssets }; // Balance is manually managed/truth
    },

    // --- Main Render Loop ---
    render() {
        viewContainer.innerHTML = '';
        totalAssetsDisplay.textContent = this.currency + ' ' + this.totalAssets.toLocaleString('en-IN');

        // Update User Avatar Name if needed
        // document.querySelector('.header-text p').textContent = `Welcome, ${this.currentUser ? this.currentUser.name : 'Swordsman'}`;

        switch (this.currentView) {
            case 'dashboard': renderDashboard(); break;
            case 'transactions': renderTransactions(); break;
            case 'habits': renderHabits(); break;
            case 'journal': renderJournal(); break;
            case 'analytics': renderAnalytics(); break;
            case 'future': renderFutureExpenses(); break; // New View
        }
    }
};

// --- DOM Elements ---
const viewContainer = document.getElementById('viewContainer');
const modalOverlay = document.getElementById('modalOverlay');
const addTransForm = document.getElementById('addTransactionForm');
const addNoteForm = document.getElementById('addNoteForm');
const totalAssetsDisplay = document.getElementById('totalAssetsDisplay');

// --- Categories & Icons ---
const CATEGORIES = {
    income: ['Salary', 'Freelance', 'Business', 'Investment', 'Other'],
    expense: ['Food', 'Rent', 'Travel', 'Gadgets', 'Subscriptions', 'Health', 'Education', 'Other'],
    future: ['Car', 'House', 'Vacation', 'Gadget', 'Event', 'Emergency Fund']
};
const ICONS = {
    'Salary': 'fa-money-bill-wave', 'Food': 'fa-utensils',
    'Travel': 'fa-plane', 'Gadgets': 'fa-mobile-screen',
    'Investment': 'fa-chart-line', 'Business': 'fa-briefcase'
};

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyDemo-ReplaceWithYourActualKey",
    authDomain: "zoro-finance.firebaseapp.com",
    projectId: "zoro-finance",
    storageBucket: "zoro-finance.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase (only if not already initialized)
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    AppState.init();
    setupNavigation();
    setupModal();
    setupLoginButtons();
    updateDateDisplay();
});

function setupLoginButtons() {
    const googleBtn = document.getElementById('googleLoginBtn');
    const questBtn = document.getElementById('questModeBtn');

    if (googleBtn) {
        googleBtn.addEventListener('click', () => AppState.login('google'));
    }
    if (questBtn) {
        questBtn.addEventListener('click', () => AppState.login('quest'));
    }
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-links li');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            AppState.currentView = link.dataset.view;
            AppState.render();
        });
    });
}

function setupModal() {
    const sidebarAddBtn = document.getElementById('sidebarAddBtn');
    const closeBtns = document.querySelectorAll('.close-modal');

    sidebarAddBtn.addEventListener('click', () => {
        openModalWithView('transaction');
    });

    closeBtns.forEach(btn => btn.addEventListener('click', () => {
        modalOverlay.classList.add('hidden');
    }));

    // Transaction Form
    addTransForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const type = document.getElementById('transactionType').value;
        const amount = parseFloat(document.getElementById('transAmount').value);
        const desc = document.getElementById('transDesc').value;
        const category = document.getElementById('selectedCategory').value;
        const date = document.getElementById('transDate').value;
        const notes = document.getElementById('transNotes').value; // Capture notes

        if (!category) return alert('Select a category');

        if (type === 'future' && amount > AppState.totalAssets) {
            // Optional warning
        }

        AppState.addTransaction({ type, amount, desc, category, date, notes });
        addTransForm.reset(); // Reset form
        modalOverlay.classList.add('hidden');
    });

    // Note Form
    addNoteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('noteTitle').value;
        const content = document.getElementById('noteContent').value;
        AppState.addNote(title, content);
        modalOverlay.classList.add('hidden');
    });

    // Amount Input Listener for Real-time Calculation
    const amountInput = document.getElementById('transAmount');
    amountInput.addEventListener('input', () => {
        const val = parseFloat(amountInput.value);
        const type = document.getElementById('transactionType').value;
        const currentBal = AppState.totalAssets;
        let newBal = currentBal;

        const feedbackDiv = document.getElementById('balanceFeedback') || createFeedbackDiv();

        if (!isNaN(val)) {
            if (type === 'income') newBal += val;
            else if (type === 'expense') newBal -= val;
            // Future doesn't affect balance yet, but maybe show what it WOULD be?
            else if (type === 'future') newBal -= val;

            feedbackDiv.style.display = 'block';
            feedbackDiv.innerHTML = `
                <span style="color:var(--text-secondary)">Current: ${AppState.currency}${currentBal.toLocaleString()}</span>
                <i class="fa-solid fa-arrow-right" style="margin:0 0.5rem"></i>
                <span style="color:${type === 'income' ? 'var(--neon-green)' : 'var(--neon-red)'}; font-weight:bold">
                    ${AppState.currency}${newBal.toLocaleString()}
                </span>
                ${type === 'future' ? '<span style="font-size:0.7rem; display:block; color:#FFD700">(Projected)</span>' : ''}
            `;
        } else {
            feedbackDiv.style.display = 'none';
        }
    });

    function createFeedbackDiv() {
        const div = document.createElement('div');
        div.id = 'balanceFeedback';
        div.style.background = 'rgba(255,255,255,0.05)';
        div.style.padding = '0.5rem';
        div.style.borderRadius = '8px';
        div.style.marginTop = '0.5rem';
        div.style.fontSize = '0.9rem';
        div.style.textAlign = 'center';
        document.getElementById('transAmount').parentElement.appendChild(div);
        return div;
    }

    // Type Switcher
    const typeBtns = document.querySelectorAll('.type-btn');
    typeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            typeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const type = btn.dataset.type;
            document.getElementById('transactionType').value = type;
            renderCategories(type);

            // Toggle Notes Field for Future
            const notesGroup = document.getElementById('futureNotesGroup');
            if (type === 'future') notesGroup.classList.remove('hidden');
            else notesGroup.classList.add('hidden');

            // Re-style submit button temporarily
            const submitBtn = document.getElementById('modalSubmitBtn');
            if (type === 'future') {
                submitBtn.textContent = 'Plan It';
                document.getElementById('modalTitle').textContent = 'Future Plan';
            } else if (type === 'income') {
                submitBtn.textContent = 'Add Income';
                document.getElementById('modalTitle').textContent = 'Add Income';
            } else {
                submitBtn.textContent = 'Add Expense';
                document.getElementById('modalTitle').textContent = 'Add Expense';
            }

            // Trigger calculation update if amount exists
            amountInput.dispatchEvent(new Event('input'));
        });
    });
}

function openModalWithView(viewType, subType = 'expense') {
    document.getElementById('modalTitle').textContent = viewType === 'note' ? 'New Note' : 'New Transaction';

    if (viewType === 'note') {
        addTransForm.classList.add('hidden');
        addNoteForm.classList.remove('hidden');
    } else if (viewType === 'future') {
        addTransForm.classList.remove('hidden');
        addNoteForm.classList.add('hidden');
        document.getElementById('transDate').valueAsDate = new Date();
        document.getElementById('futureNotesGroup').classList.remove('hidden'); // Show notes

        // Force Future Switch
        const typeBtns = document.querySelectorAll('.type-btn');
        typeBtns.forEach(b => b.classList.remove('active'));
        const futureBtn = document.querySelector('.type-btn[data-type="future"]');
        if (futureBtn) futureBtn.classList.add('active');

        document.getElementById('transactionType').value = 'future';
        renderCategories('future');
        document.getElementById('modalSubmitBtn').textContent = 'Plan It';

    } else {
        addTransForm.classList.remove('hidden');
        addNoteForm.classList.add('hidden');
        document.getElementById('transDate').valueAsDate = new Date();
        document.getElementById('futureNotesGroup').classList.add('hidden'); // Hide notes by default

        // Handle explicit subtype (e.g. income click)
        const typeBtns = document.querySelectorAll('.type-btn');
        typeBtns.forEach(b => b.classList.remove('active'));
        const activeBtn = document.querySelector(`.type-btn[data-type="${subType}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        document.getElementById('transactionType').value = subType;
        renderCategories(subType);

        const submitBtn = document.getElementById('modalSubmitBtn');
        if (subType === 'income') {
            document.getElementById('modalTitle').textContent = 'Add Income';
            submitBtn.textContent = 'Add Income';
        } else {
            document.getElementById('modalTitle').textContent = 'Add Expense';
            submitBtn.textContent = 'Add Expense';
        }
    }
    modalOverlay.classList.remove('hidden');
}


function renderCategories(type) {
    const container = document.getElementById('categorySelect');
    container.innerHTML = '';
    CATEGORIES[type].forEach(cat => {
        const chip = document.createElement('div');
        chip.className = 'asset-pill'; // Reuse styled pill
        chip.style.padding = '0.4rem 0.8rem';
        chip.style.fontSize = '0.8rem';
        chip.innerHTML = cat;
        chip.addEventListener('click', () => {
            document.getElementById('selectedCategory').value = cat;
            Array.from(container.children).forEach(c => c.style.background = '');
            chip.style.background = 'var(--neon-green)';
            chip.style.color = 'black';
        });
        container.appendChild(chip);
    });
}

// --- Main Render Loop ---
AppState.render = function () {
    viewContainer.innerHTML = '';
    totalAssetsDisplay.textContent = this.currency + ' ' + this.totalAssets.toLocaleString('en-IN');

    switch (this.currentView) {
        case 'dashboard': renderDashboard(); break;
        case 'transactions': renderTransactions(); break;
        case 'habits': renderHabits(); break;
        case 'journal': renderJournal(); break;
        case 'analytics': renderAnalytics(); break;
        case 'future': renderFutureExpenses(); break;
    }
};

// --- Render Functions ---
function renderDashboard() {
    const stats = AppState.getStats();
    viewContainer.innerHTML = `
        <div class="summary-cards">
            <div class="glass-card">
                <div style="color:var(--text-secondary)">Total Assets</div>
                <div class="card-amount" style="color:var(--text-primary)">${AppState.currency} ${stats.balance.toLocaleString('en-IN')}</div>
            </div>
            <div class="glass-card clickable-card" onclick="openModalWithView('transaction', 'income')">
                <div style="color:var(--text-secondary)">Income Flow <i class="fa-solid fa-plus-circle" style="font-size:0.8rem; margin-left:0.5rem"></i></div>
                <div class="card-amount income">+${stats.income.toLocaleString('en-IN')}</div>
            </div>
            <div class="glass-card clickable-card" onclick="openModalWithView('transaction', 'expense')">
                <div style="color:var(--text-secondary)">Expense Flow <i class="fa-solid fa-minus-circle" style="font-size:0.8rem; margin-left:0.5rem"></i></div>
                <div class="card-amount expense">-${stats.expense.toLocaleString('en-IN')}</div>
            </div>
        </div>
        
        <div class="glass-header" style="margin-bottom:1rem">
            <h3>Recent Activity</h3>
        </div>
        <div class="notes-grid">
            ${AppState.transactions.slice(-6).reverse().map(t => createTransactionCard(t)).join('')}
        </div>
    `;
}

function renderFutureExpenses() {
    viewContainer.innerHTML = `
        <div class="glass-header"><h3>Future Threats (Unplanned Expenses)</h3></div>
        <div class="notes-grid">
             <div class="note-card new-note-card" onclick="openModalWithView('future')">
                <i class="fa-solid fa-plus" style="font-size:2rem; color:#FFD700"></i>
                <span style="color:#FFD700">Add Upcoming</span>
            </div>
            ${AppState.upcomingExpenses.map(t => `
                <div class="glass-card" style="border-left: 4px solid #FFD700">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <div class="note-title" style="margin-bottom:0.2rem">${t.desc}</div>
                            <span style="font-size:0.8rem; color:var(--text-secondary)">Target: ${t.date}</span>
                            ${t.notes ? `<div style="font-size:0.8rem; color: #aaa; margin-top:0.5rem; font-style:italic;">"${t.notes}"</div>` : ''}
                        </div>
                        <div style="color:#FFD700; font-weight:700; font-size:1.2rem;">
                            -${Number(t.amount).toLocaleString('en-IN')}
                        </div>
                    </div>
                    <div class="future-card-actions">
                        <button class="btn-convert" onclick="AppState.executeUpcomingExpense('${t.id}')">
                            <i class="fa-solid fa-bolt"></i> Pay Now
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderTransactions() {
    viewContainer.innerHTML = `
        <div class="glass-header"><h3>All Transactions</h3></div>
        <div style="display:flex; flex-direction:column; gap:1rem;">
            ${AppState.transactions.slice().reverse().map(t => `
                <div class="glass-card" style="display:flex; justify-content:space-between; align-items:center; padding:1.5rem;">
                    <div>
                        <h4 style="font-size:1.1rem; margin-bottom:0.3rem;">${t.desc}</h4>
                        <span style="color:var(--text-secondary); font-size:0.9rem;">${t.category} • ${t.date}</span>
                    </div>
                    <div class="card-amount ${t.type}" style="font-size:1.5rem;">
                        ${t.type === 'income' ? '+' : '-'}${Number(t.amount).toLocaleString('en-IN')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderHabits() {
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.unshift(d.toISOString().split('T')[0]);
    }

    viewContainer.innerHTML = `
        <div class="glass-header"><h3>Habit Matrix</h3></div>
        <div class="glass-card habit-grid-container">
            <table class="habit-table">
                <thead>
                    <tr>
                        <th style="width:200px">Habit / Protocol</th>
                        ${dates.map(d => `<th>${d.slice(5)}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${AppState.habits.map(h => `
                        <tr class="habit-row">
                            <td style="font-weight:600;">${h.name}</td>
                            ${dates.map(d => `
                                <td class="check-cell">
                                    <div class="custom-check ${h.history[d] ? 'checked' : ''}" 
                                         onclick="AppState.toggleHabit('${h.id}', '${d}')">
                                        <i class="fa-solid fa-check"></i>
                                    </div>
                                </td>
                            `).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderJournal() {
    viewContainer.innerHTML = `
        <div class="glass-header"><h3>Financial Journal</h3></div>
        <div class="notes-grid">
            <div class="note-card new-note-card" onclick="openModalWithView('note')">
                <i class="fa-solid fa-plus" style="font-size:2rem;"></i>
                <span>Add Note</span>
            </div>
            ${AppState.notes.map(n => `
                <div class="note-card">
                    <div class="note-title">${n.title}</div>
                    <div class="note-preview">${n.content}</div>
                    <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:1rem; text-align:right;">
                        ${new Date(n.date).toLocaleDateString()}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderAnalytics() {
    viewContainer.innerHTML = `
        <div class="glass-header"><h3>Visual Data</h3></div>
        <div style="height:400px; position:relative;">
             <canvas id="mainChart"></canvas>
        </div>
    `;
    setTimeout(() => {
        const ctx = document.getElementById('mainChart').getContext('2d');
        const stats = AppState.getStats();
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Income', 'Expense', 'Net Assets'],
                datasets: [{
                    label: 'Financial Flow',
                    data: [stats.income, stats.expense, stats.balance],
                    backgroundColor: ['#39ff14', '#ff003c', '#ffffff'],
                    barThickness: 50
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#888' } },
                    x: { grid: { display: false }, ticks: { color: '#fff' } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }, 100);
}

// --- Helpers ---
function createTransactionCard(t) {
    return `
        <div class="note-card" style="min-height:auto; border-left: 4px solid ${t.type === 'income' ? 'var(--neon-green)' : 'var(--neon-red)'}">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <div class="note-title" style="margin-bottom:0.2rem">${t.desc}</div>
                    <span style="font-size:0.8rem; color:var(--text-secondary)">${t.category}</span>
                </div>
                <div style="color:${t.type === 'income' ? 'var(--neon-green)' : 'var(--neon-red)'}; font-weight:700;">
                    ${t.amount.toLocaleString('en-IN')}
                </div>
            </div>
        </div>
    `;
}

function updateDateDisplay() {
    document.getElementById('currentDate').innerText = new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
}
