// DOM Elements
const currentBalanceEl = document.getElementById('currentBalance');
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpensesEl = document.getElementById('totalExpenses');
const transactionListEl = document.getElementById('transactionList');
const noTransactionsMessageEl = document.getElementById('noTransactionsMessage');
const transactionForm = document.getElementById('transactionForm');
const transactionDescriptionInput = document.getElementById('transactionDescription');
const transactionAmountInput = document.getElementById('transactionAmount');
const transactionTypeSelect = document.getElementById('transactionType');
const modalAlertEl = document.getElementById('modalAlert');

// IMPORTANT: Replace this with the actual URL of your PHP backend API
// For local development, it might be something like 'http://localhost/budget_api/api'
// Based on the folder structure, if your public_html is 'budget-buddy-app' and api is inside it,
// it would be 'http://localhost/budget-buddy-app/api'
const API_BASE_URL = 'http://localhost/budget-buddy-app/api'; // Example: Adjust this to your server path

// Initialize transactions array (will be populated from API)
let transactions = [];

// Function to format currency
const formatCurrency = (amount) => {
    return `$${Math.abs(amount).toFixed(2)}`;
};

// Function to update the balance, income, and expenses
const updateSummary = () => {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + parseFloat(t.amount), 0); // Use parseFloat for amount from API

    const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + parseFloat(t.amount), 0); // Use parseFloat for amount from API

    const balance = income - expenses;

    currentBalanceEl.textContent = formatCurrency(balance);
    currentBalanceEl.style.color = balance >= 0 ? '#007bff' : '#dc3545'; // Blue for positive, Red for negative

    totalIncomeEl.textContent = formatCurrency(income);
    totalExpensesEl.textContent = formatCurrency(expenses);
};

// Function to render transactions to the DOM
const renderTransactions = () => {
    transactionListEl.innerHTML = ''; // Clear existing list

    if (transactions.length === 0) {
        noTransactionsMessageEl.style.display = 'block';
    } else {
        noTransactionsMessageEl.style.display = 'none';
    }

    transactions.forEach(transaction => {
        const listItem = document.createElement('li');
        listItem.classList.add(
            'list-group-item',
            'd-flex',
            'justify-content-between',
            'align-items-center',
            'rounded',
            transaction.type // 'income' or 'expense' class
        );
        // Assuming your backend provides an 'id' for each transaction
        listItem.dataset.id = transaction.id;

        const amountClass = transaction.type === 'income' ? 'income-text' : 'expense-text';
        // Check if amount is negative from DB, if so, remove the sign for display and add it back if it's an expense
        const displayAmount = parseFloat(transaction.amount);
        const sign = transaction.type === 'expense' && displayAmount > 0 ? '' : ''; // Only add '-' if it's an expense and positive from DB

        // Ensure date is formatted correctly, assuming ISO string or YYYY-MM-DD from backend
        const transactionDate = new Date(transaction.date || transaction.created_at).toLocaleDateString();

        listItem.innerHTML = `
            <div class="transaction-info">
                <div class="description">${transaction.description}</div>
                <div class="date">${transactionDate}</div>
            </div>
            <span class="transaction-amount ${amountClass}">${sign}${formatCurrency(displayAmount)}</span>
            <button class="btn-delete" data-id="${transaction.id}">
                &times; <!-- Times symbol for delete -->
            </button>
        `;
        transactionListEl.appendChild(listItem);
    });

    // Attach event listeners to new delete buttons
    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', (e) => {
            const idToDelete = e.target.dataset.id;
            deleteTransaction(idToDelete);
        });
    });

    updateSummary();
};

// Function to fetch transactions from the backend
const fetchTransactions = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/transactions.php`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Assuming data is an array of transaction objects
        transactions = data;
        renderTransactions();
    } catch (error) {
        console.error('Error fetching transactions:', error);
        // Display error to user if needed
        modalAlertEl.textContent = 'Failed to load transactions. Please check the backend connection.';
        modalAlertEl.classList.remove('d-none');
    }
};

// Function to add a new transaction to the backend
const addTransaction = async (e) => {
    e.preventDefault();
    modalAlertEl.classList.add('d-none'); // Hide any previous alerts

    const description = transactionDescriptionInput.value.trim();
    const amount = parseFloat(transactionAmountInput.value);
    const type = transactionTypeSelect.value;

    // Basic validation
    if (!description || isNaN(amount) || amount <= 0) {
        modalAlertEl.textContent = 'Please enter a valid description and a positive amount.';
        modalAlertEl.classList.remove('d-none');
        return;
    }

    const newTransactionData = {
        description,
        amount,
        type,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format for backend
    };

    try {
        const response = await fetch(`${API_BASE_URL}/transactions.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newTransactionData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        // After successful addition, re-fetch all transactions to ensure UI is in sync with DB
        // This is simpler for a basic app than trying to add the returned item to the array
        await fetchTransactions();

        // Clear form and close modal
        transactionForm.reset();
        const modal = bootstrap.Modal.getInstance(document.getElementById('addTransactionModal'));
        modal.hide();
    } catch (error) {
        console.error('Error adding transaction:', error);
        modalAlertEl.textContent = `Failed to add transaction: ${error.message}`;
        modalAlertEl.classList.remove('d-none');
    }
};

// Function to delete a transaction from the backend
const deleteTransaction = async (id) => {
    try {
        const response = await fetch(`${API_BASE_URL}/transactions.php?id=${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        // After successful deletion, re-fetch all transactions to ensure UI is in sync with DB
        await fetchTransactions();
    } catch (error) {
        console.error('Error deleting transaction:', error);
        // Display error to user if needed. Using alert for simplicity, but custom modal is better.
        alert(`Failed to delete transaction: ${error.message}`);
    }
};

// Event Listeners
transactionForm.addEventListener('submit', addTransaction);

// Initial fetch and render when the page loads
document.addEventListener('DOMContentLoaded', fetchTransactions);
