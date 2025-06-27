const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 12000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'nanochip-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// CORS and iframe settings
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('X-Frame-Options', 'ALLOWALL');
    next();
});

// Data files paths
const USER_FILE = path.join(__dirname, 'data', 'users.json');
const DATA_FILE = path.join(__dirname, 'data', 'data.json');

// Initialize data files
async function initializeDataFiles() {
    try {
        await fs.ensureDir(path.join(__dirname, 'data'));
        
        // Initialize users file
        if (!await fs.pathExists(USER_FILE)) {
            const defaultUser = {
                username: 'admin',
                password: await bcrypt.hash('admin123', 10),
                name: 'المدير'
            };
            await fs.writeJson(USER_FILE, [defaultUser]);
        }
        
        // Initialize data file
        if (!await fs.pathExists(DATA_FILE)) {
            const defaultData = {
                clients: [],
                expenses: [],
                revenues: []
            };
            await fs.writeJson(DATA_FILE, defaultData);
        }
    } catch (error) {
        console.error('خطأ في تهيئة ملفات البيانات:', error);
    }
}

// Helper functions
async function readData() {
    try {
        return await fs.readJson(DATA_FILE);
    } catch (error) {
        console.error('خطأ في قراءة البيانات:', error);
        return { clients: [], expenses: [], revenues: [] };
    }
}

async function writeData(data) {
    try {
        await fs.writeJson(DATA_FILE, data, { spaces: 2 });
        return true;
    } catch (error) {
        console.error('خطأ في كتابة البيانات:', error);
        return false;
    }
}

async function readUsers() {
    try {
        return await fs.readJson(USER_FILE);
    } catch (error) {
        console.error('خطأ في قراءة المستخدمين:', error);
        return [];
    }
}

async function writeUsers(users) {
    try {
        await fs.writeJson(USER_FILE, users, { spaces: 2 });
        return true;
    } catch (error) {
        console.error('خطأ في كتابة المستخدمين:', error);
        return false;
    }
}

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/');
    }
}

// Routes
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const users = await readUsers();
    
    const user = users.find(u => u.username === username);
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = { username: user.username, name: user.name };
        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/dashboard', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/clients', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'clients.html'));
});

app.get('/expenses', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'expenses.html'));
});

app.get('/revenues', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'revenues.html'));
});

app.get('/reports', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reports.html'));
});

app.get('/profile', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// API Routes
app.get('/api/user', requireAuth, (req, res) => {
    res.json(req.session.user);
});

app.get('/api/data', requireAuth, async (req, res) => {
    const data = await readData();
    res.json(data);
});

app.post('/api/clients', requireAuth, async (req, res) => {
    const { name, clientId } = req.body;
    const data = await readData();
    
    // Check if client ID already exists
    if (data.clients.find(c => c.clientId === clientId)) {
        return res.json({ success: false, message: 'رقم العميل موجود بالفعل' });
    }
    
    const newClient = {
        id: Date.now(),
        name,
        clientId,
        createdAt: new Date().toISOString()
    };
    
    data.clients.push(newClient);
    const success = await writeData(data);
    
    res.json({ success, client: newClient });
});

app.post('/api/expenses', requireAuth, async (req, res) => {
    const { clientId, amount, notes } = req.body;
    const data = await readData();
    
    const newExpense = {
        id: Date.now(),
        clientId,
        amount: parseFloat(amount),
        notes: notes || '',
        createdAt: new Date().toISOString()
    };
    
    data.expenses.push(newExpense);
    const success = await writeData(data);
    
    res.json({ success, expense: newExpense });
});

app.post('/api/revenues', requireAuth, async (req, res) => {
    const { clientId, amount, product, notes } = req.body;
    const data = await readData();
    
    const newRevenue = {
        id: Date.now(),
        clientId,
        amount: parseFloat(amount),
        product: product || '',
        notes: notes || '',
        createdAt: new Date().toISOString()
    };
    
    data.revenues.push(newRevenue);
    const success = await writeData(data);
    
    res.json({ success, revenue: newRevenue });
});

app.get('/api/dashboard-stats', requireAuth, async (req, res) => {
    const data = await readData();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const calculateStats = (items, dateFilter) => {
        return items
            .filter(item => new Date(item.createdAt) >= dateFilter)
            .reduce((sum, item) => sum + item.amount, 0);
    };
    
    const stats = {
        today: {
            revenues: calculateStats(data.revenues, today),
            expenses: calculateStats(data.expenses, today)
        },
        week: {
            revenues: calculateStats(data.revenues, thisWeek),
            expenses: calculateStats(data.expenses, thisWeek)
        },
        month: {
            revenues: calculateStats(data.revenues, thisMonth),
            expenses: calculateStats(data.expenses, thisMonth)
        },
        total: {
            revenues: data.revenues.reduce((sum, item) => sum + item.amount, 0),
            expenses: data.expenses.reduce((sum, item) => sum + item.amount, 0)
        }
    };
    
    // Calculate profits
    Object.keys(stats).forEach(period => {
        stats[period].profit = stats[period].revenues - stats[period].expenses;
    });
    
    res.json(stats);
});

app.post('/api/update-profile', requireAuth, async (req, res) => {
    const { name, currentPassword, newPassword } = req.body;
    const users = await readUsers();
    
    const userIndex = users.findIndex(u => u.username === req.session.user.username);
    if (userIndex === -1) {
        return res.json({ success: false, message: 'المستخدم غير موجود' });
    }
    
    const user = users[userIndex];
    
    // Verify current password if changing password
    if (newPassword) {
        if (!await bcrypt.compare(currentPassword, user.password)) {
            return res.json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' });
        }
        user.password = await bcrypt.hash(newPassword, 10);
    }
    
    // Update name
    if (name) {
        user.name = name;
        req.session.user.name = name;
    }
    
    const success = await writeUsers(users);
    res.json({ success, message: success ? 'تم تحديث البيانات بنجاح' : 'حدث خطأ في التحديث' });
});

// Delete APIs
app.delete('/api/clients/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const data = await readData();
    
    const clientIndex = data.clients.findIndex(c => c.id == id);
    if (clientIndex === -1) {
        return res.json({ success: false, message: 'العميل غير موجود' });
    }
    
    const client = data.clients[clientIndex];
    
    // Check if client has transactions
    const hasRevenues = data.revenues.some(r => r.clientId === client.clientId);
    const hasExpenses = data.expenses.some(e => e.clientId === client.clientId);
    
    if (hasRevenues || hasExpenses) {
        return res.json({ 
            success: false, 
            message: 'لا يمكن حذف العميل لأنه يحتوي على معاملات مالية. احذف المعاملات أولاً.' 
        });
    }
    
    // Remove client
    data.clients.splice(clientIndex, 1);
    const success = await writeData(data);
    
    res.json({ 
        success, 
        message: success ? 'تم حذف العميل بنجاح' : 'حدث خطأ في حذف العميل',
        client: client
    });
});

app.delete('/api/expenses/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const data = await readData();
    
    const expenseIndex = data.expenses.findIndex(e => e.id == id);
    if (expenseIndex === -1) {
        return res.json({ success: false, message: 'المصروف غير موجود' });
    }
    
    const expense = data.expenses[expenseIndex];
    
    // Remove expense
    data.expenses.splice(expenseIndex, 1);
    const success = await writeData(data);
    
    res.json({ 
        success, 
        message: success ? 'تم حذف المصروف بنجاح' : 'حدث خطأ في حذف المصروف',
        expense: expense
    });
});

app.delete('/api/revenues/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const data = await readData();
    
    const revenueIndex = data.revenues.findIndex(r => r.id == id);
    if (revenueIndex === -1) {
        return res.json({ success: false, message: 'الإيراد غير موجود' });
    }
    
    const revenue = data.revenues[revenueIndex];
    
    // Remove revenue
    data.revenues.splice(revenueIndex, 1);
    const success = await writeData(data);
    
    res.json({ 
        success, 
        message: success ? 'تم حذف الإيراد بنجاح' : 'حدث خطأ في حذف الإيراد',
        revenue: revenue
    });
});

// Initialize and start server
initializeDataFiles().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 NanoChip Financial System running on port ${PORT}`);
        console.log(`🌐 Access at: http://localhost:${PORT}`);
    });
});