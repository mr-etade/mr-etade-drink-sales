// Global variables
let transactions = [];
const API_BASE_URL = 'https://mr-etade-drink-sales.vercel.app/api'; // Replace with your Vercel URL

// DOM Elements
const transactionForm = document.getElementById('transaction-form');
const transactionTypeSelect = document.getElementById('transaction-type');
const categorySelect = document.getElementById('category');
const priceInput = document.getElementById('price');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const applyFilterBtn = document.getElementById('apply-filter');
const resetFilterBtn = document.getElementById('reset-filter');

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0];
    
    startDateInput.value = oneMonthAgoStr;
    endDateInput.value = today;
    
    // Set current date and time as default
    document.getElementById('date').value = today;
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    document.getElementById('time').value = timeString;
    
    // Set default prices based on category
    categorySelect.addEventListener('change', () => {
        const category = categorySelect.value;
        switch(category) {
            case 'Bu Sales':
                priceInput.value = '3.5';
                break;
            case 'Solo Sales':
                priceInput.value = '2.5';
                break;
            case 'Coke Sales':
                priceInput.value = '2.5';
                break;
            default:
                priceInput.value = '';
        }
    });
    
    // Load transactions
    await loadTransactions();
    
    // Initialize charts
    renderCharts();
    
    // Set up event listeners
    transactionForm.addEventListener('submit', handleTransactionSubmit);
    applyFilterBtn.addEventListener('click', applyDateFilter);
    resetFilterBtn.addEventListener('click', resetDateFilter);
});

// Load transactions from API
async function loadTransactions() {
    try {
        const response = await fetch(`${API_BASE_URL}/transactions`);
        if (!response.ok) throw new Error('Failed to fetch transactions');
        
        transactions = await response.json();
        updateKPICards();
    } catch (error) {
        console.error('Error loading transactions:', error);
        alert('Failed to load transactions. Please try again later.');
    }
}

// Handle form submission
async function handleTransactionSubmit(e) {
    e.preventDefault();
    
    const transaction = {
        Date: document.getElementById('date').value.split('-').reverse().join('/'),
        'Time (hh:mm:ss)': document.getElementById('time').value + ':00',
        Account: document.getElementById('account').value,
        Category: document.getElementById('category').value,
        Note: document.getElementById('note').value,
        Quantity: parseFloat(document.getElementById('quantity').value),
        'Income/Expense': document.getElementById('transaction-type').value,
        PGK: parseFloat(document.getElementById('price').value) * parseFloat(document.getElementById('quantity').value)
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/transactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(transaction)
        });
        
        if (!response.ok) throw new Error('Failed to save transaction');
        
        const newTransaction = await response.json();
        transactions.push(newTransaction);
        
        // Reset form
        transactionForm.reset();
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        const now = new Date();
        const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        document.getElementById('time').value = timeString;
        
        // Update UI
        updateKPICards();
        renderCharts();
        
        alert('Transaction saved successfully!');
    } catch (error) {
        console.error('Error saving transaction:', error);
        alert('Failed to save transaction. Please try again.');
    }
}

// Apply date filter
function applyDateFilter() {
    renderCharts();
}

// Reset date filter
function resetDateFilter() {
    startDateInput.value = '';
    endDateInput.value = '';
    
    renderCharts();
}

// Update KPI cards
function updateKPICards() {
    const filteredTransactions = filterTransactionsByDate();
    
    // Calculate totals for ALL transactions (not just filtered ones)
    const totalRevenueAll = transactions
        .filter(t => t['Income/Expense'] === 'Income')
        .reduce((sum, t) => sum + t.PGK, 0);
    
    const totalExpensesAll = transactions
        .filter(t => t['Income/Expense'] === 'Expense')
        .reduce((sum, t) => sum + t.PGK, 0);
    
    const totalProfitAll = totalRevenueAll - totalExpensesAll;
    
    // Calculate totals for FILTERED transactions
    const totalRevenueFiltered = filteredTransactions
        .filter(t => t['Income/Expense'] === 'Income')
        .reduce((sum, t) => sum + t.PGK, 0);
    
    const totalExpensesFiltered = filteredTransactions
        .filter(t => t['Income/Expense'] === 'Expense')
        .reduce((sum, t) => sum + t.PGK, 0);
    
    const totalProfitFiltered = totalRevenueFiltered - totalExpensesFiltered;
    
    // Check if any date filter is applied
    const isFilterApplied = startDateInput.value || endDateInput.value !== new Date().toISOString().split('T')[0];
    
    document.getElementById('total-revenue').textContent = `PGK ${totalRevenueFiltered.toFixed(2)}`;
    document.getElementById('total-expenses').textContent = `PGK ${totalExpensesFiltered.toFixed(2)}`;
    document.getElementById('total-profit').textContent = `PGK ${totalProfitFiltered.toFixed(2)}`;
}

// Filter transactions by date range
function filterTransactionsByDate() {
    const startDate = startDateInput.value ? new Date(startDateInput.value) : null;
    const endDate = endDateInput.value ? new Date(endDateInput.value) : null;
    
    return transactions.filter(transaction => {
        const transactionDateParts = transaction.Date.split('/');
        const transactionDate = new Date(`${transactionDateParts[2]}-${transactionDateParts[1]}-${transactionDateParts[0]}`);
        
        if (startDate && transactionDate < startDate) return false;
        if (endDate && transactionDate > endDate) return false;
        
        return true;
    });
}

// Render all charts
function renderCharts() {
    const filteredTransactions = filterTransactionsByDate();
    
    renderRevenueChart(filteredTransactions);
    renderProfitChart(filteredTransactions);
    renderSalesByProductChart(filteredTransactions);
    renderExpensesChart(filteredTransactions);
    renderPaymentMethodChart(filteredTransactions);
    renderDailySalesChart(filteredTransactions);
    
    updateKPICards();
}

// Revenue chart
function renderRevenueChart(transactions) {
    const incomeTransactions = transactions.filter(t => t['Income/Expense'] === 'Income');
    
    // Group by month
    const monthlyRevenue = {};
    incomeTransactions.forEach(t => {
        const dateParts = t.Date.split('/');
        const monthYear = `${dateParts[1]}/${dateParts[2]}`;
        
        if (!monthlyRevenue[monthYear]) {
            monthlyRevenue[monthYear] = 0;
        }
        monthlyRevenue[monthYear] += t.PGK;
    });
    
    const categories = Object.keys(monthlyRevenue).sort();
    const data = categories.map(month => monthlyRevenue[month]);
    
    Highcharts.chart('revenue-chart', {
        chart: {
            type: 'column',
            backgroundColor: 'transparent',
            style: {
                fontFamily: 'Poppins, sans-serif'
            }
        },
        title: {
            text: 'Monthly Revenue',
            style: {
                color: '#ffffff'
            }
        },
        xAxis: {
            categories: categories,
            labels: {
                style: {
                    color: '#ffffff'
                }
            }
        },
        yAxis: {
            title: {
                text: 'Amount (PGK)',
                style: {
                    color: '#ffffff'
                }
            },
            labels: {
                style: {
                    color: '#ffffff'
                }
            },
            gridLineColor: 'rgba(255, 255, 255, 0.1)'
        },
        legend: {
            itemStyle: {
                color: '#ffffff'
            }
        },
        series: [{
            name: 'Revenue',
            data: data,
            color: '#eb8fd8'
        }],
        tooltip: {
            valuePrefix: 'PGK '
        },
        credits: {
            enabled: false
        }
    });
}

// Profit chart
function renderProfitChart(transactions) {
    const incomeTransactions = transactions.filter(t => t['Income/Expense'] === 'Income');
    const expenseTransactions = transactions.filter(t => t['Income/Expense'] === 'Expense');
    
    // Group by month
    const monthlyIncome = {};
    incomeTransactions.forEach(t => {
        const dateParts = t.Date.split('/');
        const monthYear = `${dateParts[1]}/${dateParts[2]}`;
        
        if (!monthlyIncome[monthYear]) {
            monthlyIncome[monthYear] = 0;
        }
        monthlyIncome[monthYear] += t.PGK;
    });
    
    const monthlyExpenses = {};
    expenseTransactions.forEach(t => {
        const dateParts = t.Date.split('/');
        const monthYear = `${dateParts[1]}/${dateParts[2]}`;
        
        if (!monthlyExpenses[monthYear]) {
            monthlyExpenses[monthYear] = 0;
        }
        monthlyExpenses[monthYear] += t.PGK;
    });
    
    const categories = [...new Set([
        ...Object.keys(monthlyIncome),
        ...Object.keys(monthlyExpenses)
    ])].sort();
    
    const incomeData = categories.map(month => monthlyIncome[month] || 0);
    const expensesData = categories.map(month => monthlyExpenses[month] || 0);
    const profitData = categories.map((month, i) => incomeData[i] - expensesData[i]);
    
    Highcharts.chart('profit-chart', {
        chart: {
            type: 'column',
            backgroundColor: 'transparent',
            style: {
                fontFamily: 'Poppins, sans-serif'
            }
        },
        title: {
            text: 'Monthly Profit',
            style: {
                color: '#ffffff'
            }
        },
        xAxis: {
            categories: categories,
            labels: {
                style: {
                    color: '#ffffff'
                }
            }
        },
        yAxis: {
            title: {
                text: 'Amount (PGK)',
                style: {
                    color: '#ffffff'
                }
            },
            labels: {
                style: {
                    color: '#ffffff'
                }
            },
            gridLineColor: 'rgba(255, 255, 255, 0.1)'
        },
        legend: {
            itemStyle: {
                color: '#ffffff'
            }
        },
        series: [{
            name: 'Income',
            data: incomeData,
            color: '#eb8fd8'
        }, {
            name: 'Expenses',
            data: expensesData,
            color: '#f46659'
        }, {
            name: 'Profit',
            data: profitData,
            color: '#1cc549',
            type: 'line',
            marker: {
                symbol: 'circle'
            }
        }],
        tooltip: {
            valuePrefix: 'PGK '
        },
        credits: {
            enabled: false
        }
    });
}

// Sales by product chart - now as a column chart
function renderSalesByProductChart(transactions) {
    const incomeTransactions = transactions.filter(t => t['Income/Expense'] === 'Income');
    
    const productSales = {};
    incomeTransactions.forEach(t => {
        const product = t.Category;
        if (!productSales[product]) {
            productSales[product] = 0;
        }
        productSales[product] += t.PGK;
    });
    
    const products = Object.keys(productSales);
    const data = products.map(product => ({
        name: product.replace(' Sales', ''),
        y: productSales[product],
        color: getProductColor(product)
    }));
    
    // Sort data by value (descending)
    data.sort((a, b) => b.y - a.y);
    
    Highcharts.chart('sales-by-product-chart', {
        chart: {
            type: 'column',
            backgroundColor: 'transparent',
            style: {
                fontFamily: 'Poppins, sans-serif'
            }
        },
        title: {
            text: 'Sales by Product',
            style: {
                color: '#ffffff'
            }
        },
        xAxis: {
            type: 'category',
            labels: {
                style: {
                    color: '#ffffff'
                }
            }
        },
        yAxis: {
            title: {
                text: 'Amount (PGK)',
                style: {
                    color: '#ffffff'
                }
            },
            labels: {
                style: {
                    color: '#ffffff'
                }
            },
            gridLineColor: 'rgba(255, 255, 255, 0.1)'
        },
        legend: {
            enabled: false
        },
        series: [{
            name: 'Sales',
            data: data,
            colorByPoint: true
        }],
        tooltip: {
            headerFormat: '<span style="font-size:11px">{point.key}</span><br>',
            pointFormat: '<span style="color:{point.color}">\u25CF</span> {series.name}: <b>PGK {point.y:.2f}</b><br/>'
        },
        plotOptions: {
            column: {
                borderRadius: 5,
                pointPadding: 0.2,
                borderWidth: 0
            }
        },
        credits: {
            enabled: false
        }
    });
}

// Expenses chart
function renderExpensesChart(transactions) {
    const expenseTransactions = transactions.filter(t => t['Income/Expense'] === 'Expense');
    
    const expenseCategories = {};
    expenseTransactions.forEach(t => {
        const category = t.Note;
        if (!expenseCategories[category]) {
            expenseCategories[category] = 0;
        }
        expenseCategories[category] += t.PGK;
    });
    
    const categories = Object.keys(expenseCategories);
    const data = categories.map(category => ({
        name: category,
        y: expenseCategories[category],
        color: getExpenseColor(category)
    }));
    
    Highcharts.chart('expenses-chart', {
        chart: {
            type: 'pie',
            backgroundColor: 'transparent',
            style: {
                fontFamily: 'Poppins, sans-serif'
            }
        },
        title: {
            text: 'Expenses by Category',
            style: {
                color: '#ffffff'
            }
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: true,
                    format: '<b>{point.name}</b>: {point.percentage:.1f} %',
                    style: {
                        color: '#ffffff'
                    }
                }
            }
        },
        series: [{
            name: 'Expenses',
            colorByPoint: true,
            data: data
        }],
        tooltip: {
            valuePrefix: 'PGK '
        },
        credits: {
            enabled: false
        }
    });
}

// Payment method chart
function renderPaymentMethodChart(transactions) {
    const incomeTransactions = transactions.filter(t => t['Income/Expense'] === 'Income');
    
    const paymentMethods = {};
    incomeTransactions.forEach(t => {
        const method = t.Account;
        if (!paymentMethods[method]) {
            paymentMethods[method] = 0;
        }
        paymentMethods[method] += t.PGK;
    });
    
    const methods = Object.keys(paymentMethods);
    const data = methods.map(method => ({
        name: method,
        y: paymentMethods[method],
        color: method === 'Cash' ? '#ba94e9' : '#ffbc3e'
    }));
    
    Highcharts.chart('payment-method-chart', {
        chart: {
            type: 'pie',
            backgroundColor: 'transparent',
            style: {
                fontFamily: 'Poppins, sans-serif'
            }
        },
        title: {
            text: 'Payment Methods',
            style: {
                color: '#ffffff'
            }
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: true,
                    format: '<b>{point.name}</b>: {point.percentage:.1f} %',
                    style: {
                        color: '#ffffff'
                    }
                }
            }
        },
        series: [{
            name: 'Payment Method',
            colorByPoint: true,
            data: data
        }],
        tooltip: {
            valuePrefix: 'PGK '
        },
        credits: {
            enabled: false
        }
    });
}

// Daily sales chart
function renderDailySalesChart(transactions) {
    const incomeTransactions = transactions.filter(t => t['Income/Expense'] === 'Income');
    
    // Group by date
    const dailySales = {};
    incomeTransactions.forEach(t => {
        if (!dailySales[t.Date]) {
            dailySales[t.Date] = 0;
        }
        dailySales[t.Date] += t.PGK;
    });
    
    // Convert to array and sort by date
    const sortedDates = Object.keys(dailySales).sort((a, b) => {
        const [dayA, monthA, yearA] = a.split('/').map(Number);
        const [dayB, monthB, yearB] = b.split('/').map(Number);
        return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
    });
    
    const data = sortedDates.map(date => dailySales[date]);
    
    Highcharts.chart('daily-sales-chart', {
        chart: {
            type: 'column',
            backgroundColor: 'transparent',
            style: {
                fontFamily: 'Poppins, sans-serif'
            }
        },
        title: {
            text: 'Daily Sales',
            style: {
                color: '#ffffff'
            }
        },
        xAxis: {
            categories: sortedDates,
            labels: {
                style: {
                    color: '#ffffff'
                },
                rotation: -45
            }
        },
        yAxis: {
            title: {
                text: 'Amount (PGK)',
                style: {
                    color: '#ffffff'
                }
            },
            labels: {
                style: {
                    color: '#ffffff'
                }
            },
            gridLineColor: 'rgba(255, 255, 255, 0.1)'
        },
        legend: {
            enabled: false
        },
        series: [{
            name: 'Sales',
            data: data,
            color: '#eb8fd8',
            marker: {
                symbol: 'circle'
            }
        }],
        tooltip: {
            valuePrefix: 'PGK '
        },
        credits: {
            enabled: false
        }
    });
}

// Helper function to get product color
function getProductColor(product) {
    switch(product) {
        case 'Bu Sales':
            return '#ba94e9';
        case 'Solo Sales':
            return '#eb8fd8';
        case 'Coke Sales':
            return '#ffbc3e';
        default:
            return '#1cc549';
    }
}

// Helper function to get expense color
function getExpenseColor(category) {
    switch(category) {
        case 'Bu':
            return '#ba94e9';
        case 'Solo':
            return '#eb8fd8';
        case 'Coke':
            return '#ffbc3e';
        default:
            return '#f46659';
    }
}
