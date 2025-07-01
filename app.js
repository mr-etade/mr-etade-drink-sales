// Global variables
let transactions = [];
const API_BASE_URL = 'https://mr-etade-drink-sales.vercel.app/api';

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
    // Check for existing token
    const token = localStorage.getItem('token');
    if (!token) {
        showLoginForm();
        return;
    }

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

// Login function
async function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        if (data.token) {
            localStorage.setItem('token', data.token);
            location.reload();
        } else {
            alert('Login failed. Please check your credentials.');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

// Load transactions from API
async function loadTransactions() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_BASE_URL}/transactions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 401) {
            localStorage.removeItem('token');
            showLoginForm();
            return;
        }
        
        if (!response.ok) throw new Error('Failed to fetch transactions');
        
        transactions = await response.json();
        updateKPICards();
    } catch (error) {
        console.error('Error loading transactions:', error);
        if (error.message.includes('401')) {
            showLoginForm();
        } else {
            alert('Failed to load transactions. Please try again later.');
        }
    }
}

// Handle form submission
async function handleTransactionSubmit(e) {
    e.preventDefault();
    
    const token = localStorage.getItem('token');
    if (!token) {
        showLoginForm();
        return;
    }
    
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
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(transaction)
        });
        
        if (response.status === 401) {
            localStorage.removeItem('token');
            showLoginForm();
            return;
        }
        
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
        if (error.message.includes('401')) {
            showLoginForm();
        } else {
            alert('Failed to save transaction. Please try again.');
        }
    }
}

// Show login form
function showLoginForm() {
    document.body.innerHTML = `
        <div class="login-container">
            <h2>Login Required</h2>
            <div class="form-group">
                <label for="login-username">Username</label>
                <input type="text" id="login-username" required>
            </div>
            <div class="form-group">
                <label for="login-password">Password</label>
                <input type="password" id="login-password" required>
            </div>
            <button onclick="login()">Login</button>
        </div>
    `;
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
    renderInventoryChart(filteredTransactions);
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
            headerFormat: '<span style="font-size:11px">{point.key}</span><br>',
            pointFormat: '<span style="color:{point.color}">\u25CF</span> {series.name}: <b>PGK {point.y:.2f}</b><br/>'
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
    
    // Group by month with proper month names
    const monthlyIncome = {};
    const monthlyExpenses = {};
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    transactions.forEach(t => {
        const dateParts = t.Date.split('/');
        const monthIndex = parseInt(dateParts[1]) - 1;
        const monthYear = `${monthNames[monthIndex]} ${dateParts[2]}`;
        
        if (t['Income/Expense'] === 'Income') {
            if (!monthlyIncome[monthYear]) {
                monthlyIncome[monthYear] = 0;
            }
            monthlyIncome[monthYear] += t.PGK;
        } else {
            if (!monthlyExpenses[monthYear]) {
                monthlyExpenses[monthYear] = 0;
            }
            monthlyExpenses[monthYear] += t.PGK;
        }
    });
    
    const categories = [...new Set([
        ...Object.keys(monthlyIncome),
        ...Object.keys(monthlyExpenses)
    ])].sort((a, b) => {
        const [monthA, yearA] = a.split(' ');
        const [monthB, yearB] = b.split(' ');
        const yearDiff = parseInt(yearA) - parseInt(yearB);
        if (yearDiff !== 0) return yearDiff;
        return monthNames.indexOf(monthA) - monthNames.indexOf(monthB);
    });
    
    const incomeData = categories.map(month => monthlyIncome[month] || 0);
    const expensesData = categories.map(month => monthlyExpenses[month] || 0);
    const profitData = categories.map((month, i) => incomeData[i] - expensesData[i]);
    
    // Calculate profit margins
    const marginData = categories.map((month, i) => {
        const income = incomeData[i] || 0;
        const profit = profitData[i] || 0;
        return income > 0 ? Math.round((profit / income) * 100) : (expensesData[i] > 0 ? -100 : 0);
    });
    
    const marginMin = Math.min(...marginData, 0) - 10;
    const marginMax = Math.max(...marginData, 0) + 10;
    
    Highcharts.chart('profit-chart', {
        chart: {
            type: 'column',
            backgroundColor: 'transparent',
            style: {
                fontFamily: 'Poppins, sans-serif'
            }
        },
        title: {
            text: 'Monthly Profit Analysis',
            style: {
                color: '#ffffff',
                fontSize: '18px'
            }
        },
        xAxis: {
            categories: categories,
            crosshair: true,
            labels: {
                style: {
                    color: '#ffffff'
                }
            }
        },
        yAxis: [{
            title: {
                text: 'Amount (PGK)',
                style: {
                    color: '#ffffff'
                }
            },
            labels: {
                style: {
                    color: '#ffffff'
                },
                formatter: function() {
                    return 'PGK ' + this.value.toLocaleString();
                }
            },
            gridLineColor: 'rgba(255, 255, 255, 0.1)'
        }, {
            title: {
                text: 'Profit Margin (%)',
                style: {
                    color: '#ffffff'
                }
            },
            opposite: true,
            labels: {
                style: {
                    color: '#ffffff'
                },
                formatter: function() {
                    return this.value + '%';
                }
            },
            gridLineWidth: 0,
            min: marginMin,
            max: marginMax,
            plotLines: [{
                value: 0,
                color: '#ffffff',
                width: 1,
                zIndex: 5
            }]
        }],
        legend: {
            itemStyle: {
                color: '#ffffff'
            },
            align: 'center',
            verticalAlign: 'top',
            layout: 'horizontal'
        },
        plotOptions: {
            column: {
                grouping: false,
                shadow: false,
                borderWidth: 0,
                pointPadding: 0.2,
                groupPadding: 0.1
            },
            line: {
                marker: {
                    radius: 4,
                    lineWidth: 2,
                    lineColor: '#ffffff'
                }
            }
        },
        series: [{
            name: 'Income',
            data: incomeData,
            color: '#ba94e9',
            tooltip: {
                valuePrefix: 'PGK '
            },
            pointPadding: 0.3
        }, {
            name: 'Expenses',
            data: expensesData,
            color: '#ffbc3e',
            tooltip: {
                valuePrefix: 'PGK '
            },
            pointPadding: 0.4
        }, {
            name: 'Profit',
            data: profitData,
            color: '#1cc549',
            type: 'line',
            lineWidth: 3,
            marker: {
                symbol: 'diamond'
            },
            tooltip: {
                valuePrefix: 'PGK '
            }
        }, {
            name: 'Profit Margin',
            type: 'line',
            yAxis: 1,
            data: marginData,
            color: '#ffbc3e',
            dashStyle: 'Dash',
            tooltip: {
                valueSuffix: '%',
                pointFormatter: function() {
                    const color = this.y >= 0 ? '#1cc549' : '#f46659';
                    return `<span style="color:${color}">●</span> ${this.series.name}: <b>${this.y}%</b><br/>`;
                }
            },
            marker: {
                enabled: true,
                symbol: 'circle',
                fillColor: function() {
                    return this.y >= 0 ? '#1cc549' : '#f46659';
                },
                lineColor: '#ffffff',
                lineWidth: 1
            },
            zones: [{
                value: 0,
                color: '#f46659'
            }, {
                color: '#ffbc3e'
            }]
        }],
        tooltip: {
            shared: true,
            useHTML: true,
            headerFormat: '<small><b>{point.key}</b></small><table>',
            pointFormat: '<tr><td><span style="color:{point.color}">●</span> {series.name}: </td>' +
                '<td style="text-align:right"><b>{point.y}</b></td></tr>',
            footerFormat: '</table>',
            valueDecimals: 2
        },
        credits: {
            enabled: false
        }
    });
}

// Sales by product chart
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
            headerFormat: '<span style="font-size:11px">{point.key}</span><br>',
            pointFormat: '<span style="color:{point.color}">\u25CF</span> {series.name}: <b>PGK {point.y:.2f}</b><br/>'
        },
        credits: {
            enabled: false
        }
    });
}

// Inventory chart
function renderInventoryChart(transactions) {
    const purchases = {};
    transactions
        .filter(t => t['Income/Expense'] === 'Expense' && t.Category === 'Food')
        .forEach(t => {
            const product = t.Note.replace(' Carton', '');
            if (!purchases[product]) {
                purchases[product] = 0;
            }
            purchases[product] += t.Quantity;
        });

    const sales = {};
    transactions
        .filter(t => t['Income/Expense'] === 'Income' && t.Category.includes('Sales'))
        .forEach(t => {
            const product = t.Category.replace(' Sales', '');
            if (!sales[product]) {
                sales[product] = 0;
            }
            sales[product] += t.Quantity;
        });

    const allProducts = [...new Set([...Object.keys(purchases), ...Object.keys(sales)])];

    const soldData = allProducts.map(product => sales[product] || 0);
    const remainingData = allProducts.map(product => 
        Math.max(0, (purchases[product] || 0) - (sales[product] || 0))
    );

    Highcharts.chart('inventory-chart', {
        chart: {
            type: 'column',
            backgroundColor: 'transparent',
            style: {
                fontFamily: 'Poppins, sans-serif'
            }
        },
        title: {
            text: 'Drink Inventory Status',
            style: {
                color: '#ffffff'
            }
        },
        xAxis: {
            categories: allProducts,
            labels: {
                style: {
                    color: '#ffffff'
                }
            }
        },
        yAxis: {
            min: 0,
            title: {
                text: 'Quantity',
                style: {
                    color: '#ffffff'
                }
            },
            labels: {
                style: {
                    color: '#ffffff'
                }
            },
            gridLineColor: 'rgba(255, 255, 255, 0.1)',
            stackLabels: {
                enabled: true,
                style: {
                    color: '#ffffff',
                    textOutline: 'none'
                }
            }
        },
        legend: {
            itemStyle: {
                color: '#ffffff'
            }
        },
        plotOptions: {
            column: {
                stacking: 'normal',
                dataLabels: {
                    enabled: true,
                    color: '#ffffff',
                    style: {
                        textOutline: 'none'
                    }
                },
                borderRadius: 5
            }
        },
        series: [{
            name: 'Sold',
            data: soldData,
            color: '#1cc549'
        }, {
            name: 'Remaining',
            data: remainingData,
            color: '#f46659'
        }],
        tooltip: {
            headerFormat: '<span style="font-size:11px">{point.key}</span><br>',
            pointFormat: '{series.name}: {point.y}<br/>Total: {point.stackTotal}'
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
            headerFormat: '<span style="font-size:11px">{point.key}</span><br>',
            pointFormat: '<span style="color:{point.color}">\u25CF</span> {series.name}: <b>PGK {point.y:.2f}</b><br/>'
        },
        credits: {
            enabled: false
        }
    });
}

// Daily sales chart
function renderDailySalesChart(transactions) {
    const incomeTransactions = transactions.filter(t => t['Income/Expense'] === 'Income');
    
    const dailySales = {};
    incomeTransactions.forEach(t => {
        if (!dailySales[t.Date]) {
            dailySales[t.Date] = 0;
        }
        dailySales[t.Date] += t.PGK;
    });
    
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
            headerFormat: '<span style="font-size:11px">{point.key}</span><br>',
            pointFormat: '<span style="color:{point.color}">\u25CF</span> {series.name}: <b>PGK {point.y:.2f}</b><br/>'
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
