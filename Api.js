const express = require("express");
const { ObjectId } = require('mongodb');
const path = require("path");
const os = require('os');
const tempDir = path.join(os.tmpdir(), 'compilex_temp');
const compiler = require("compilex");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { connect, getDb } = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const wss = new WebSocket.Server({ noServer: true });
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { google } = require('googleapis');
const url = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database connection first
let db;
let contactSubmissions;

// Add this function to clean up corrupted project files
function cleanupCorruptedProjects() {
    try {
        const files = fs.readdirSync(FRONTEND_STORAGE_DIR);
        let cleanedCount = 0;
        
        files.forEach(file => {
            if (file.endsWith('.json')) {
                const filePath = path.join(FRONTEND_STORAGE_DIR, file);
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    JSON.parse(content);
                } catch (error) {
                    console.log(`Cleaning up corrupted project file: ${file}`);
                    fs.unlinkSync(filePath);
                    cleanedCount++;
                    
                    // Also clean up associated assets
                    const projectId = file.replace('.json', '');
                    const assetDir = path.join(FRONTEND_STORAGE_DIR, 'assets', projectId);
                    if (fs.existsSync(assetDir)) {
                        fs.rmSync(assetDir, { recursive: true, force: true });
                    }
                }
            }
        });
        
        if (cleanedCount > 0) {
            console.log(`✅ Cleaned up ${cleanedCount} corrupted project files`);
        }
    } catch (error) {
        console.error('Error cleaning up corrupted projects:', error);
    }
}

// Call this function after initializing collections
async function initializeCollections() {
    try {
        await connect();
        db = getDb();
        contactSubmissions = db.collection('contactSubmissions');
        console.log("Database collections initialized");
        
        // Clean up corrupted projects
        cleanupCorruptedProjects();
    } catch (error) {
        console.error("Failed to initialize collections:", error);
        process.exit(1);
    }
}

if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

const FRONTEND_STORAGE_DIR = path.join(__dirname, "frontend_projects");
if (!fs.existsSync(FRONTEND_STORAGE_DIR)) {
    fs.mkdirSync(FRONTEND_STORAGE_DIR, { recursive: true });
}

const frontendProjects = new Map();

// Fix JWT secret
if (!process.env.JWT_SECRET) {
    console.warn('⚠️ JWT_SECRET not set, using fallback (unsafe for production!)');
    process.env.JWT_SECRET = 'fallback-secret-key-change-in-production';
}


const options = {
    stats: true,
    tempDir: tempDir
};
compiler.init(options);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true,  limit: '50mb'  }));
app.use(express.static(path.join(__dirname, "public")));
app.use('/images', express.static(path.join(__dirname, "public", "images")));
app.use('/js', express.static(path.join(__dirname, "public", "js")));
app.use('/css', express.static(path.join(__dirname, "public", "css")));

// Google OAuth2 client configuration
const oauth2Client = new google.auth.OAuth2(
    "1079090693613-lovubh9n9s7bcm1jka6ssh1grm62usk5.apps.googleusercontent.com",
    "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",
    "https://memory-update-production.up.railway.app/auth/google/callback"
);

// Generate Google OAuth URL
const getGoogleAuthURL = () => {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email'
        ]
    });
};

async function startServer() {
    try {
        await initializeCollections();
        console.log("Database connected successfully");

        const server = app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });

        // Store the server reference for WebSocket upgrades
        app.server = server;

        // Handle WebSocket upgrade requests
        server.on('upgrade', (request, socket, head) => {
            const pathname = url.parse(request.url).pathname;

            if (pathname === '/terminal') {
                wss.handleUpgrade(request, socket, head, (ws) => {
                    wss.emit('connection', ws, request);
                });
            } else {
                socket.destroy();
            }
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: 'Too many OTP requests, please try again later'
});

const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: 'Too many password reset requests, please try again later'
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "landing.html"));
});

app.get("/editor", (req, res) => {
    compiler.flush(() => console.log("Deleted previous temporary files"));
    res.sendFile(path.join(__dirname, "public", "code.html"));
});

app.get('/frontend-editor', (req, res) => {
    res.sendFile(path.join(__dirname, "public", "frontend-editor.html"));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-tickets.html'));
});

app.post("/editor", (req, res) => {
    compiler.flush(() => console.log("Deleted previous temporary files"));
    res.sendFile(path.join(__dirname, "public", "code.html"));
});

// Serve all your HTML pages
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/features', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'features.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/help', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'help.html'));
});

app.get('/privacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

app.get('/terms', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

app.get('/pricing', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pricing.html'));
});

// Google OAuth routes - MOVED BEFORE CATCH-ALL
app.get('/auth/google', (req, res) => {
    try {
        const { redirect } = req.query;
        console.log('🔵 [GOOGLE OAUTH] Initiated, redirect:', redirect || 'none');
        
        // Generate auth URL with state parameter for redirect
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: [
                'https://www.googleapis.com/auth/userinfo.profile',
                'https://www.googleapis.com/auth/userinfo.email'
            ],
            // Include redirect URL in state parameter
            state: redirect ? Buffer.from(JSON.stringify({ redirect })).toString('base64') : ''
        });
        
        console.log('🔵 [GOOGLE OAUTH] Redirecting to Google');
        res.redirect(authUrl);
        
    } catch (error) {
        console.error('🔴 [GOOGLE OAUTH] Initiation error:', error);
        res.redirect('/login?error=oauth_failed');
    }
});

// Google OAuth callback route
// Google OAuth callback route - Update this in your API.js
// Google OAuth callback route
app.get('/auth/google/callback', async (req, res) => {
    try {
        const { code, state } = req.query;
        console.log('Google OAuth callback received:', { code: code ? 'EXISTS' : 'MISSING', state });

        if (!code) {
            return res.status(400).json({ error: 'Authorization code missing' });
        }

        // Exchange authorization code for access token
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Get user info
        const oauth2 = google.oauth2({
            auth: oauth2Client,
            version: 'v2'
        });

        const { data } = await oauth2.userinfo.get();
        console.log('Google user info:', { email: data.email, name: data.name });

        // Check if user exists in your database
        const db = getDb();
        const users = db.collection('users');

        let user = await users.findOne({ email: data.email });

        if (!user) {
            // Create new user
            const newUser = {
                email: data.email,
                name: data.name,
                googleId: data.id,
                picture: data.picture,
                createdAt: new Date(),
                isGoogleAuth: true
            };

            const result = await users.insertOne(newUser);
            user = { ...newUser, _id: result.insertedId };
            console.log('New Google user created:', user.email);
        } else {
            console.log('Existing Google user found:', user.email);
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Parse state parameter for redirect URL
        let redirectUrl = '/editor'; // default
        if (state) {
            try {
                const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
                redirectUrl = stateData.redirect || redirectUrl;
                console.log('Redirect URL from state:', redirectUrl);
            } catch (e) {
                console.error('Error parsing state:', e);
            }
        }

        // Redirect to the intended page with token
        const redirectWithToken = `${redirectUrl}?token=${token}`;
        console.log('Final redirect URL:', redirectWithToken);
        res.redirect(redirectWithToken);

    } catch (error) {
        console.error('Google OAuth callback error:', error);
        res.status(500).send(`
            <html>
                <body>
                    <h1>Authentication Failed</h1>
                    <p>Please try again later.</p>
                    <a href="/login">Return to Login</a>
                </body>
            </html>
        `);
    }
});

// Debug routes
app.get('/debug-oauth', (req, res) => {
    const authUrl = getGoogleAuthURL();
    res.json({
        oauthConfigured: true,
        authUrl: authUrl,
        redirectUri: "https://memory-update-production.up.railway.app/auth/google/callback",
        clientId: "1079090693613-lovubh9n9s7bcm1jka6ssh1grm62usk5.apps.googleusercontent.com",
        message: "Visit /auth/google to test OAuth"
    });
});

app.get('/test-auth', (req, res) => {
    res.json({
        message: "Auth endpoints are working",
        endpoints: {
            googleAuth: "/auth/google",
            googleCallback: "/auth/google/callback",
            debug: "/debug-oauth"
        }
    });
});

// Add this debug route to check compilers
app.get('/check-compilers', (req, res) => {
    const { exec } = require('child_process');

    const commands = [
        { name: 'python3', cmd: 'python3 --version' },
        { name: 'python', cmd: 'python --version' },
        { name: 'g++', cmd: 'g++ --version' },
        { name: 'javac', cmd: 'javac -version' },
        { name: 'java', cmd: 'java -version' }
    ];

    const results = {};
    let completed = 0;

    commands.forEach(({ name, cmd }) => {
        exec(cmd, (error, stdout, stderr) => {
            results[name] = {
                installed: !error,
                output: stdout || stderr,
                error: error ? error.message : null
            };
            completed++;

            if (completed === commands.length) {
                res.json({
                    platform: process.platform,
                    arch: process.arch,
                    nodeVersion: process.version,
                    results: results
                });
            }
        });
    });
});



function authenticateAdmin(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Explicit admin check
        if (!decoded.isAdmin) {
            return res.status(403).json({
                error: 'Admin access required',
                details: decoded // For debugging
            });
        }

        req.user = decoded;
        next();
    } catch (err) {
        res.status(403).json({
            error: 'Invalid token',
            details: process.env.NODE_ENV === 'development' ? err.message : null
        });
    }
}

app.get('/test-email', async (req, res) => {
    try {
        await transporter.sendMail({
            from: `Test <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: 'Test Email',
            text: 'This is a test email'
        });
        res.send('Test email sent successfully');
    } catch (error) {
        console.error('Test email failed:', error);
        res.status(500).send('Failed to send test email');
    }
});

app.get('/api/verify-admin-token', authenticateAdmin, (req, res) => {
    res.json({
        valid: true,
        user: req.user
    });
});

// Add this route to test ticket fetching
app.get('/api/test-tickets', authenticateAdmin, async (req, res) => {
    try {
        const tickets = await contactSubmissions.find().toArray();
        res.json(tickets);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Validate input
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Create ticket
        const ticket = {
            name,
            email,
            subject,
            message,
            status: 'open',
            createdAt: new Date(),
            ticketId: `TKT-${Date.now().toString(36).toUpperCase()}`
        };

        // Save to database
        await contactSubmissions.insertOne(ticket);

        // Send confirmation email
        const mailOptions = {
            from: `CodeEditor Support <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Ticket Created: ${ticket.ticketId}`,
            html: `
                <h2>Thank you for contacting us!</h2>
                <p>We've received your message and will respond within 24 hours.</p>
                <p><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <hr>
                <p><strong>Your Message:</strong></p>
                <p>${message.replace(/\n/g, '<br>')}</p>
                <hr>
                <p>You can reply directly to this email to add more information.</p>
            `
        };

        await transporter.sendMail(mailOptions);

        res.json({
            success: true,
            message: 'Message received successfully',
            ticketId: ticket.ticketId
        });

    } catch (error) {
        console.error('Contact submission error:', error);
        res.status(500).json({
            success: false,
            message: 'Database error. Please try again later.'
        });
    }
});

// Add this route to your Api.js
app.get('/api/admin/tickets', authenticateAdmin, async (req, res) => {
    try {
        const tickets = await contactSubmissions.find().sort({ createdAt: -1 }).toArray();
        res.json(tickets);
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

app.put('/api/admin/tickets/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['open', 'in-progress', 'resolved'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const result = await contactSubmissions.updateOne(
            { _id: new ObjectId(id) },
            { $set: { status, updatedAt: new Date() } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.json({ success: true, message: 'Ticket updated' });
    } catch (error) {
        console.error('Error updating ticket:', error);
        res.status(500).json({ error: 'Failed to update ticket' });
    }
});

async function sendResolutionEmail(ticket) {
    try {
        const mailOptions = {
            from: `CodeEditor Support <${process.env.EMAIL_USER}>`,
            to: ticket.email,
            subject: `Your ticket ${ticket.ticketId} has been resolved`,
            html: `
                <h2>Your Support Ticket Has Been Resolved</h2>
                <p>Hello ${ticket.name},</p>
                <p>We're happy to inform you that your support ticket has been resolved.</p>
                
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3>Ticket Details</h3>
                    <p><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
                    <p><strong>Subject:</strong> ${ticket.subject}</p>
                    <p><strong>Status:</strong> Resolved</p>
                    <p><strong>Date Submitted:</strong> ${new Date(ticket.createdAt).toLocaleString()}</p>
                    <p><strong>Date Resolved:</strong> ${new Date().toLocaleString()}</p>
                    ${ticket.resolutionNotes ? `
                    <p><strong>Resolution Details:</strong></p>
                    <div style="background-color: #fff; padding: 10px; border-radius: 5px; margin-top: 5px;">
                        ${ticket.resolutionNotes.replace(/\n/g, '<br>')}
                    </div>
                    ` : ''}
                </div>
                
                <p>If you have any further questions or if your issue persists, please reply to this email.</p>
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                    <p>Was this solution helpful? <a href="#">Yes</a> | <a href="#">No</a></p>
                </div>
                
                <p>Best regards,<br>The CodeEditor Team</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Resolution email sent to ${ticket.email}`);
    } catch (error) {
        console.error('Error sending resolution email:', error);
    }
}

app.post('/send-otp', otpLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        const db = getDb();
        const users = db.collection('users');
        const otps = db.collection('otps');

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const existingUser = await users.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await otps.updateOne(
            { email },
            { $set: { otp, expiresAt } },
            { upsert: true }
        );

        const mailOptions = {
            from: `Code Editor <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your OTP for Registration',
            html: `
                <h2>Your OTP Code</h2>
                <p>Your OTP is: <strong>${otp}</strong></p>
                <p>It will expire in 5 minutes.</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully to:', email);
        res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Email sending error:', error);
        res.status(500).json({
            error: 'Failed to send OTP',
            details: process.env.NODE_ENV === 'development' ? error.message : null
        });
    }
});

app.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp, emailPassword, loginPassword } = req.body;
        const db = getDb();
        const users = db.collection('users');
        const otps = db.collection('otps');

        const otpRecord = await otps.findOne({ email });
        if (!otpRecord || otpRecord.otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        if (loginPassword.length < 8) {
            return res.status(400).json({ error: 'Login password must be at least 8 characters' });
        }

        if (new Date() > otpRecord.expiresAt) {
            return res.status(400).json({ error: 'OTP expired' });
        }

        const hashedEmailPassword = await bcrypt.hash(emailPassword, 10);
        const hashedLoginPassword = await bcrypt.hash(loginPassword, 10);

        await users.insertOne({
            email,
            emailPassword: hashedEmailPassword,
            loginPassword: hashedLoginPassword,
            createdAt: new Date()
        });

        await otps.deleteOne({ email });
        res.json({ message: 'Registration successful' });
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

app.get('/verify-token', authenticateToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const db = getDb();
        const users = db.collection('users');

        const user = await users.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.loginPassword);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                email: user.email,
                userId: user._id
            },
            redirect: '/editor'
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/forgot-password', passwordResetLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        const db = getDb();
        const users = db.collection('users');
        const passwordResets = db.collection('passwordResets');

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const user = await users.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'Email not found' });
        }

        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        await passwordResets.updateOne(
            { email },
            { $set: { token, expiresAt: new Date(Date.now() + 3600000) } },
            { upsert: true }
        );

        const resetLink = `https://memory-update-production.up.railway.app/reset-password?token=${token}`;

        const mailOptions = {
            from: `Code Editor <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Password Reset Request',
            html: `
                <h2>Password Reset</h2>
                <p>You requested to reset your password. Click the link below to proceed:</p>
                <a href="${resetLink}">Reset Password</a>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({
            message: 'Password reset email sent',
            token
        });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ error: 'Failed to process password reset' });
    }
});

app.post('/reset-password', async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;
        const db = getDb();
        const users = db.collection('users');
        const passwordResets = db.collection('passwordResets');

        if (!email || !token || !newPassword) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        const resetRecord = await passwordResets.findOne({ email, token });
        if (!resetRecord) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        try {
            jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            await passwordResets.deleteOne({ email });
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await users.updateOne(
            { email },
            { $set: { loginPassword: hashedPassword } }
        );

        await passwordResets.deleteOne({ email });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

app.post('/logout', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Logout successful'
    });
});

function authMiddleware(req, res, next) {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: "No token provided" });
    try {
        const decoded = jwt.verify(token, 'your-secret-key');
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: "Invalid token" });
    }
}

const CODE_STORAGE_DIR = path.join(__dirname, "saved_codes");
if (!fs.existsSync(CODE_STORAGE_DIR)) {
    fs.mkdirSync(CODE_STORAGE_DIR);
}

const SHARE_STORAGE_DIR = path.join(__dirname, "shared_codes");
if (!fs.existsSync(SHARE_STORAGE_DIR)) {
    fs.mkdirSync(SHARE_STORAGE_DIR);
}

function autoInjectFlush(code, lang) {
    if (lang === 'C' || lang === 'Cpp') {
        // Add fflush after every printf that doesn't have \n at the end
        return code.replace(
            /printf\s*\([^;]*\)\s*;(?!\s*fflush)/g,
            (match) => {
                // Check if printf ends with \n
                if (match.includes('\\n")')) {
                    return match;
                }
                return match + '\nfflush(stdout);';
            }
        );
    }
    return code;
}

app.post("/run-interactive", (req, res) => {
    let { code, input, lang } = req.body;
    if (!code || !lang) {
        return res.status(400).json({ error: "Code and language are required!" });
    }

    input = input ?? "";

    let envData = { OS: "windows", cmd: "g++", options: { timeout: 5000 } };

    function handleResponse(res, data) {
        if (data.error) {
            return res.json({ output: `Error: ${data.error}` });
        }
        res.json({ output: data.output });
    }

    try {
        if (lang === "C" || lang === "Cpp") {
            if (input.trim().length === 0) {
                compiler.compileCPP(envData, code, (data) => handleResponse(res, data));
            } else {
                compiler.compileCPPWithInput(envData, code, input, (data) => handleResponse(res, data));
            }
        } else if (lang === "Python") {
            compiler.compilePythonWithInput(envData, code, input, (data) => handleResponse(res, data));
        } else if (lang === "Java") {
            compiler.compileJavaWithInput(envData, code, input, (data) => handleResponse(res, data));
        } else {
            return res.status(400).json({ error: "Unsupported language!" });
        }
    } catch (error) {
        console.error("Compilation Error:", error);
        return res.status(500).json({ error: "Server error!" });
    }
});

app.post("/save-code", authenticateToken, (req, res) => {
    const { code, lang, name } = req.body;
    if (!code || !lang || !name) {
        return res.status(400).json({ error: "Code, language, and name are required!" });
    }

    const id = uuidv4();
    const filePath = path.join(CODE_STORAGE_DIR, `${id}.json`);

    const codeData = {
        id,
        name,
        code,
        lang,
        userId: req.user.userId,
        userEmail: req.user.email,
        createdAt: new Date()
    };

    fs.writeFileSync(filePath, JSON.stringify(codeData, null, 2), "utf8");
    res.json({ id, name, lang });
});

app.get("/saved-codes", authenticateToken, (req, res) => {
    fs.readdir(CODE_STORAGE_DIR, (err, files) => {
        if (err) {
            console.error("Error reading saved codes:", err);
            return res.status(500).json({ error: "Failed to retrieve saved codes" });
        }

        const userCodes = files
            .map(file => {
                try {
                    const filePath = path.join(CODE_STORAGE_DIR, file);
                    const fileData = JSON.parse(fs.readFileSync(filePath, "utf8"));

                    if (fileData.userId === req.user.userId) {
                        return {
                            id: fileData.id,
                            name: fileData.name,
                            lang: fileData.lang,
                            createdAt: fileData.createdAt
                        };
                    }
                    return null;
                } catch (error) {
                    console.error(`Error processing file ${file}:`, error);
                    return null;
                }
            })
            .filter(code => code !== null)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Newest first

        res.json(userCodes);
    });
});

app.get("/get-code/:id", authenticateToken, (req, res) => {
    const { id } = req.params;
    const filePath = path.join(CODE_STORAGE_DIR, `${id}.json`);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Code not found" });
    }

    try {
        const fileData = JSON.parse(fs.readFileSync(filePath, "utf8"));
        if (fileData.userId !== req.user.userId) {
            return res.status(403).json({ error: "Unauthorized to access this code" });
        }
        res.json(fileData);
    } catch (error) {
        console.error("Error reading code file:", error);
        res.status(500).json({ error: 'Failed to load code' });
    }
});

app.delete('/delete-code/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const filePath = path.join(CODE_STORAGE_DIR, `${id}.json`);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Code not found" });
    }

    try {
        const fileData = JSON.parse(fs.readFileSync(filePath, "utf8"));
        if (fileData.userId !== req.user.userId) {
            return res.status(403).json({ error: "Unauthorized to delete this code" });
        }

        fs.unlinkSync(filePath);
        res.json({ success: true, message: "Code deleted successfully" });
    } catch (error) {
        console.error("Error deleting code:", error);
        res.status(500).json({ error: "Failed to delete code" });
    }
});

app.post('/api/frontend/save', async (req, res) => {
    try {
        const { name, files, assets, html, css, js } = req.body;
        
        if (!name && !files && !html && !css && !js) {
            return res.status(400).json({
                success: false,
                error: 'No project data provided'
            });
        }

        const projectId = uuidv4();

        // Handle both formats with better validation
        let projectFiles;
        if (files && typeof files === 'object') {
            projectFiles = {
                html: Array.isArray(files.html) ? files.html : [{ name: 'index.html', content: getDefaultHTML() }],
                css: Array.isArray(files.css) ? files.css : [{ name: 'style.css', content: getDefaultCSS() }],
                js: Array.isArray(files.js) ? files.js : [{ name: 'script.js', content: getDefaultJS() }],
                assets: Array.isArray(assets) ? assets : []
            };
        } else {
            projectFiles = {
                html: [{ name: 'index.html', content: html || getDefaultHTML() }],
                css: [{ name: 'style.css', content: css || getDefaultCSS() }],
                js: [{ name: 'script.js', content: js || getDefaultJS() }],
                assets: Array.isArray(assets) ? assets : []
            };
        }

        // Process assets with size limits
        const processedAssets = await processAndSaveAssets(projectFiles.assets, projectId);

        const projectData = {
            id: projectId,
            name: name || 'Untitled Project',
            files: projectFiles,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Save project data
        const projectPath = path.join(FRONTEND_STORAGE_DIR, `${projectId}.json`);
        fs.writeFileSync(projectPath, JSON.stringify(projectData, null, 2));

        res.json({
            success: true,
            projectId,
            shareUrl: `https://memory-update-production.up.railway.app/frontend/${projectId}`,
            message: 'Project saved successfully'
        });
    } catch (error) {
        console.error('Error saving frontend project:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to save project: ' + error.message 
        });
    }
});

// Helper function to process and save assets
async function processAndSaveAssets(assets, projectId) {
    if (!assets || !Array.isArray(assets)) {
        return [];
    }

    const processedAssets = [];
    const assetDir = path.join(FRONTEND_STORAGE_DIR, 'assets', projectId);
    
    // Create asset directory if it doesn't exist
    if (!fs.existsSync(assetDir)) {
        fs.mkdirSync(assetDir, { recursive: true });
    }

    for (const asset of assets) {
        try {
            if (asset.data && asset.data.startsWith('data:')) {
                // Handle base64 encoded assets
                const matches = asset.data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    const mimeType = matches[1];
                    const base64Data = matches[2];
                    const buffer = Buffer.from(base64Data, 'base64');
                    
                    // Determine file extension from mime type
                    const extension = mimeType.split('/')[1] || 'bin';
                    const fileName = `${uuidv4()}.${extension}`;
                    const filePath = path.join(assetDir, fileName);
                    
                    // Save file to disk
                    fs.writeFileSync(filePath, buffer);
                    
                    processedAssets.push({
                        name: asset.name,
                        fileName: fileName,
                        mimeType: mimeType,
                        url: `/api/frontend/assets/${projectId}/${fileName}`,
                        originalName: asset.originalName || asset.name
                    });
                }
            } else if (asset.url) {
                // If asset already has a URL (from existing project), keep it
                processedAssets.push(asset);
            }
        } catch (error) {
            console.error('Error processing asset:', asset.name, error);
            // Continue with other assets even if one fails
        }
    }

    return processedAssets;
}

// Helper function to get default HTML content
function getDefaultHTML() {
    return `<!DOCTYPE html>
<html>
<head>
    <title>My Project</title>
</head>
<body>
    <h1>Hello World!</h1>
    <p>Start building your amazing project...</p>
    <button onclick="showAlert()">Click Me!</button>
</body>
</html>`;
}

// Helper function to get default CSS content
function getDefaultCSS() {
    return `body {
    font-family: Arial, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    min-height: 100vh;
}

h1 {
    text-align: center;
    margin-bottom: 30px;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

button {
    background: #ff6b6b;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 25px;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.3s ease;
}

button:hover {
    background: #ff5252;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
}`;
}

// Helper function to get default JS content
function getDefaultJS() {
    return `function showAlert() {
    alert('Hello from JavaScript! 🎉');
    
    // Create a new element
    const newElement = document.createElement('div');
    newElement.innerHTML = '<h3>Dynamic Content!</h3><p>This was added by JavaScript.</p>';
    newElement.style.background = 'rgba(255,255,255,0.1)';
    newElement.style.padding = '20px';
    newElement.style.borderRadius = '10px';
    newElement.style.marginTop = '20px';
    
    document.body.appendChild(newElement);
}

// Add some interactive features
document.addEventListener('DOMContentLoaded', function() {
    console.log('Frontend playground loaded!');
});`;
}

// Serve frontend project assets
app.get('/api/frontend/assets/:projectId/:fileName', (req, res) => {
    try {
        const { projectId, fileName } = req.params;
        const assetPath = path.join(FRONTEND_STORAGE_DIR, 'assets', projectId, fileName);
        
        console.log('🔍 Looking for asset:', assetPath);
        
        if (!fs.existsSync(assetPath)) {
            console.log('❌ Asset not found:', assetPath);
            return res.status(404).json({ error: 'Asset not found' });
        }

        // Set appropriate content type
        const ext = path.extname(fileName).toLowerCase();
        const contentTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.webp': 'image/webp'
        };

        res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
        console.log('✅ Serving asset:', fileName);
        res.sendFile(assetPath);
    } catch (error) {
        console.error('❌ Error serving asset:', error);
        res.status(500).json({ error: 'Failed to serve asset' });
    }
});

app.get('/api/frontend/project/:id', (req, res) => {
    try {
        const projectId = req.params.id;
        const projectPath = path.join(FRONTEND_STORAGE_DIR, `${projectId}.json`);

        if (!fs.existsSync(projectPath)) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const projectData = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
        
        // Convert to old format for backward compatibility
        const mainHtml = projectData.files.html.find(file => file.name === 'index.html') || projectData.files.html[0];
        const mainCss = projectData.files.css.find(file => file.name === 'style.css') || projectData.files.css[0];
        const mainJs = projectData.files.js.find(file => file.name === 'script.js') || projectData.files.js[0];

        res.json({
            ...projectData,
            html: mainHtml.content,
            css: mainCss.content,
            js: mainJs.content
        });
    } catch (error) {
        console.error('Error loading project:', error);
        res.status(500).json({ error: 'Failed to load project' });
    }
});

app.get('/frontend/:id', (req, res) => {
    try {
        const projectId = req.params.id;
        const projectPath = path.join(FRONTEND_STORAGE_DIR, `${projectId}.json`);

        if (!fs.existsSync(projectPath)) {
            return res.status(404).send('Project not found');
        }

        const projectData = JSON.parse(fs.readFileSync(projectPath, 'utf8'));

        // Combine all HTML, CSS, and JS files
        const combinedHTML = projectData.files.html.map(file => file.content).join('\n');
        const combinedCSS = projectData.files.css.map(file => file.content).join('\n');
        const combinedJS = projectData.files.js.map(file => file.content).join('\n');

        // Create asset mapping for the preview
        const assetUrls = {};
        projectData.files.assets.forEach(asset => {
            assetUrls[asset.name] = `/api/frontend/assets/${projectId}/${asset.fileName}`;
        });

        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectData.name}</title>
    <style>${combinedCSS}</style>
    <script>
        // Inject asset URLs into the preview
        window.projectAssets = ${JSON.stringify(assetUrls)};
    </script>
</head>
<body>
    ${combinedHTML}
    <script>${combinedJS}</script>
</body>
</html>`;

        res.send(htmlContent);
    } catch (error) {
        console.error('Error serving frontend project:', error);
        res.status(500).send('Error loading project');
    }
});

app.get('/api/frontend/projects', authenticateToken, async (req, res) => {
    try {
        if (!fs.existsSync(FRONTEND_STORAGE_DIR)) {
            return res.json([]);
        }

        const files = fs.readdirSync(FRONTEND_STORAGE_DIR);
        const projects = [];

        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const filePath = path.join(FRONTEND_STORAGE_DIR, file);
                    const fileContent = fs.readFileSync(filePath, 'utf8');
                    
                    // Skip empty files
                    if (!fileContent.trim()) {
                        console.log(`Skipping empty file: ${file}`);
                        continue;
                    }
                    
                    const projectData = JSON.parse(fileContent);
                    
                    // Validate project structure
                    if (!projectData.id || !projectData.files) {
                        console.log(`Invalid project structure in: ${file}`);
                        continue;
                    }

                    projects.push({
                        id: projectData.id,
                        name: projectData.name || 'Untitled Project',
                        createdAt: projectData.createdAt || new Date(),
                        updatedAt: projectData.updatedAt || new Date(),
                        shareUrl: `https://memory-update-production.up.railway.app/frontend/${projectData.id}`,
                        fileCount: {
                            html: projectData.files.html?.length || 0,
                            css: projectData.files.css?.length || 0,
                            js: projectData.files.js?.length || 0,
                            assets: projectData.files.assets?.length || 0
                        }
                    });
                } catch (error) {
                    console.error(`Error processing project file ${file}:`, error.message);
                    // Continue with other files even if one fails
                }
            }
        }

        // Sort by updated date (newest first)
        projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        
        res.json(projects);
    } catch (error) {
        console.error('Error loading projects:', error);
        res.status(500).json({ 
            error: 'Failed to load projects',
            details: process.env.NODE_ENV === 'development' ? error.message : null
        });
    }
});

// Delete frontend project
// Delete frontend project with asset cleanup
app.delete('/api/frontend/project/:id', authenticateToken, async (req, res) => {
    try {
        const projectId = req.params.id;
        const projectPath = path.join(FRONTEND_STORAGE_DIR, `${projectId}.json`);

        if (!fs.existsSync(projectPath)) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Load project data to get asset information
        const projectData = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
        
        // Delete the project file
        fs.unlinkSync(projectPath);

        // Delete associated assets directory
        const assetDir = path.join(FRONTEND_STORAGE_DIR, 'assets', projectId);
        if (fs.existsSync(assetDir)) {
            fs.rmSync(assetDir, { recursive: true, force: true });
        }

        res.json({
            success: true,
            message: 'Project deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

app.post('/share-code/:id', (req, res) => {
    const codeId = req.params.id;
    console.log(`[DEBUG] Creating share for code ID: ${codeId}`);

    const filePath = path.join(CODE_STORAGE_DIR, `${codeId}.json`);
    console.log(`[DEBUG] Source file path: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.log(`[DEBUG] Source file not found for code ID: ${codeId}`);
        return res.status(404).json({ error: "Code not found" });
    }

    try {
        const shareId = uuidv4();
        const originalCode = JSON.parse(fs.readFileSync(filePath, "utf8"));
        const sharePath = path.join(SHARE_STORAGE_DIR, `${shareId}.json`);

        console.log(`[DEBUG] Creating shared file at: ${sharePath}`);
        fs.writeFileSync(sharePath, JSON.stringify({
            id: shareId,
            code: originalCode.code,
            lang: originalCode.lang,
            name: originalCode.name,
            created: new Date().toISOString()
        }), "utf8");

        console.log(`[DEBUG] Successfully created share ID: ${shareId}`);
        res.json({
            shareId,
            created: new Date().toISOString()
        });
    } catch (error) {
        console.error(`[ERROR] Sharing failed: ${error.message}`);
        res.status(500).json({
            error: "Failed to share code",
            details: error.message
        });
    }
});

app.get("/shared/:shareId", (req, res) => {
    const shareId = req.params.shareId;
    console.log(`[DEBUG] Request received for share ID: ${shareId}`);

    const sharePath = path.join(SHARE_STORAGE_DIR, `${shareId}.json`);
    console.log(`[DEBUG] Looking for shared file at: ${sharePath}`);

    if (!fs.existsSync(sharePath)) {
        console.log(`[DEBUG] File not found for share ID: ${shareId}`);
        return res.status(404).send(`
            <html>
                <body>
                    <h1>Shared Code Not Found</h1>
                    <p>The requested code either doesn't exist or has expired.</p>
                    <p>Share ID: ${shareId}</p>
                </body>
            </html>
        `);
    }

    try {
        console.log(`[DEBUG] Serving shared code page for ID: ${shareId}`);
        res.sendFile(path.join(__dirname, "public", "shared-code.html"));
    } catch (error) {
        console.error(`[ERROR] Failed to serve shared code page: ${error.message}`);
        res.status(500).send("Internal server error");
    }
});

app.get("/shared-data/:shareId", (req, res) => {
    const shareId = req.params.shareId;
    console.log(`[DEBUG] Data request for share ID: ${shareId}`);

    const sharePath = path.join(SHARE_STORAGE_DIR, `${shareId}.json`);
    console.log(`[DEBUG] Data file path: ${sharePath}`);

    if (!fs.existsSync(sharePath)) {
        console.log(`[DEBUG] Data file not found for share ID: ${shareId}`);
        return res.status(404).json({
            error: "Shared code not found",
            shareId: shareId,
            path: sharePath
        });
    }

    try {
        const fileContent = fs.readFileSync(sharePath, "utf8");
        console.log(`[DEBUG] File content length: ${fileContent.length} bytes`);

        const sharedCode = JSON.parse(fileContent);
        console.log(`[DEBUG] Successfully parsed shared code for ID: ${shareId}`);

        res.json({
            code: sharedCode.code,
            lang: sharedCode.lang,
            name: sharedCode.name || "Anonymous",
            shareId: shareId
        });
    } catch (error) {
        console.error(`[ERROR] Failed to load shared code data: ${error.message}`);
        res.status(500).json({
            error: "Error loading shared code data",
            details: error.message,
            shareId: shareId
        });
    }
});

app.post('/admin-login', async (req, res) => {
    const { username, password } = req.body;

    if (username === process.env.ADMIN_USERNAME &&
        password === process.env.ADMIN_PASSWORD) {

        // This is where you add the payload structure
        const tokenPayload = {
            username: "codeEditor",
            isAdmin: true,  // Critical admin flag
            iat: Math.floor(Date.now() / 1000),  // Current timestamp
            exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60)  // Expires in 8 hours
        };

        const token = jwt.sign(
            tokenPayload,  // Using the structured payload
            process.env.JWT_SECRET,
            { algorithm: 'HS256' }  // Explicit algorithm
        );

        return res.json({ token });
    }
    res.status(401).json({ error: 'Invalid credentials' });
});

app.delete('/api/admin/tickets/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDb();
        const contactSubmissions = db.collection('contactSubmissions');

        // Get the ticket first (for sending deletion email if needed)
        const ticket = await contactSubmissions.findOne({ _id: new ObjectId(id) });
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        // Delete the ticket
        const result = await contactSubmissions.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        // Optionally send deletion notification email
        await sendDeletionEmail(ticket);

        res.json({ success: true, message: 'Ticket deleted successfully' });
    } catch (error) {
        console.error('Error deleting ticket:', error);
        res.status(500).json({ error: 'Failed to delete ticket' });
    }
});

async function sendDeletionEmail(ticket) {
    try {
        const mailOptions = {
            from: `CodeEditor Support <${process.env.EMAIL_USER}>`,
            to: ticket.email,
            subject: `Your ticket ${ticket.ticketId} has been processed`,
            html: `
                <h2>Your Support Ticket Has Been Processed</h2>
                <p>Hello ${ticket.name},</p>
                <p>We're writing to inform you that your support ticket has been processed and closed.</p>
                
                <div style="background-color:极致的 #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3>Ticket Details</h3>
                    <p><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
                    <p><strong>Subject:</strong> ${ticket.subject}</p>
                    <p><strong>Status:</strong> Closed</p>
                    <p><strong>Date Submitted:</strong> ${new Date(ticket.createdAt).toLocaleString()}</p>
                </div>
                
                <p>If you have any further questions, please don't hesitate to contact us.</p>
                
                <p>Best regards,<br>The CodeEditor Team</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Deletion email sent to ${ticket.email}`);
    } catch (error) {
        console.error('Error sending deletion email:', error);
    }
}

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('🔵 [DEBUG] New terminal WebSocket connection established');

    let process = null;
    let tempFiles = [];
    let currentJavaClassName = 'Main';

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            console.log('📨 [DEBUG] WebSocket message received:', {
                type: message.type,
                lang: message.lang,
                codeLength: message.code ? message.code.length : 0
            });

            switch (message.type) {
                case 'execute':
                    console.log('🚀 [DEBUG] Execute command received for language:', message.lang);
                    if (process) {
                        console.log('⚠️ [DEBUG] Killing previous process');
                        process.kill('SIGTERM');
                        setTimeout(() => cleanupTempFiles(), 1000);
                    }
                    executeCode(ws, message.code, message.lang);
                    break;

                case 'input':
                    console.log('⌨️ [DEBUG] Input received:', JSON.stringify(message.data));
                    if (process && process.stdin && !process.stdin.destroyed) {
                        let inputData = message.data;
                        if (!inputData.endsWith('\n')) {
                            inputData += '\n';
                        }
                        process.stdin.write(inputData);
                        console.log('✅ [DEBUG] Input sent to process');
                    } else {
                        console.log('❌ [DEBUG] Process stdin not available or destroyed');
                    }
                    break;

                default:
                    console.log('❓ [DEBUG] Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('💥 [DEBUG] Error processing WebSocket message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Terminal connection closed');
        if (process) {
            process.kill('SIGTERM');
        }
        setTimeout(() => cleanupTempFiles(), 2000);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        if (process) {
            process.kill('SIGTERM');
        }
    });

    function autoInjectFlush(code, lang) {
        if (lang === 'C' || lang === 'Cpp') {
            let processedCode = code;

            // Add stdio.h if not already included
            if (!processedCode.includes('#include <stdio.h>') && !processedCode.includes('#include<stdio.h>')) {
                processedCode = '#include <stdio.h>\n' + processedCode;
            }

            // Add fflush after printf statements that might need immediate display
            processedCode = processedCode.replace(
                /(printf\s*\([^;]*\)\s*;)(?!\s*fflush)/g,
                '$1\nfflush(stdout);'
            );

            return processedCode;
        }
        return code;
    }

    function fixJavaCode(code) {
        // If no class definition found, wrap in Main class
        if (!code.match(/class\s+\w+/)) {
            // Check if it's just a main method
            if (code.includes('public static void main')) {
                code = `public class Main {\n    ${code}\n}`;
            } else {
                code = `public class Main {\n    public static void main(String[] args) {\n        ${code}\n    }\n}`;
            }
        }
        // Ensure class is public if it contains main method
        else if (code.includes('public static void main') && !code.includes('public class')) {
            code = code.replace(/class\s+(\w+)/, 'public class $1');
        }
        return code;
    }

    function executeCode(ws, code, lang) {
        console.log('🔧 [DEBUG] executeCode called with:', {
            lang: lang,
            codeLength: code.length,
            first50Chars: code.substring(0, 50)
        });

        const processedCode = autoInjectFlush(code, lang);
        console.log('🔄 [DEBUG] Code processed for language:', lang);

        cleanupTempFiles();
        tempFiles = [];

        const timestamp = Date.now();
        let filename, command, args;

        currentJavaClassName = 'Main';

        // ADD DEBUG LOGS FOR EACH LANGUAGE
        switch (lang) {
            case 'C':
                console.log('🔵 [DEBUG] Processing C code');
                filename = path.join(tempDir, `code-${timestamp}.c`);
                fs.writeFileSync(filename, processedCode);
                tempFiles.push(filename);
                console.log('📝 [DEBUG] C file created:', filename);

                const executable = path.join(tempDir, `code-${timestamp}.exe`);
                tempFiles.push(executable);

                command = 'gcc';
                args = [filename, '-o', executable];
                console.log('⚙️ [DEBUG] C compile command:', command, args);
                break;

            case 'Cpp':
                console.log('🔵 [DEBUG] Processing C++ code');
                filename = path.join(tempDir, `code-${timestamp}.cpp`);
                fs.writeFileSync(filename, processedCode);
                tempFiles.push(filename);
                console.log('📝 [DEBUG] C++ file created:', filename);

                const cppExecutable = path.join(tempDir, `code-${timestamp}.exe`);
                tempFiles.push(cppExecutable);

                command = 'g++';
                args = [filename, '-o', cppExecutable];
                console.log('⚙️ [DEBUG] C++ compile command:', command, args);
                break;

            case 'Python':
                console.log('🐍 [DEBUG] Processing Python code');
                filename = path.join(tempDir, `code-${timestamp}.py`);
                fs.writeFileSync(filename, code);
                tempFiles.push(filename);
                console.log('📝 [DEBUG] Python file created:', filename);

                command = 'python3';  
                args = [filename];
                console.log('⚙️ [DEBUG] Python execute command:', command, args);
                break;

            case 'Java':
                console.log('☕ [DEBUG] Processing Java code');
                const fixedJavaCode = fixJavaCode(code);
                const classNameMatch = fixedJavaCode.match(/class\s+(\w+)/);
                currentJavaClassName = classNameMatch ? classNameMatch[1] : 'Main';
                console.log('📛 [DEBUG] Java class name:', currentJavaClassName);

                filename = path.join(tempDir, `${currentJavaClassName}.java`);
                fs.writeFileSync(filename, fixedJavaCode);
                tempFiles.push(filename);
                console.log('📝 [DEBUG] Java file created:', filename);

                const classFile = path.join(tempDir, `${currentJavaClassName}.class`);
                tempFiles.push(classFile);

                command = 'javac';
                args = [filename];
                console.log('⚙️ [DEBUG] Java compile command:', command, args);
                break;

            default:
                console.log('❌ [DEBUG] Unsupported language:', lang);
                ws.send(JSON.stringify({
                    type: 'output',
                    data: 'Unsupported language\r\n'
                }));
                return;
        }

        // Compile the code first for compiled languages
        if (lang === 'C' || lang === 'Cpp' || lang === 'Java') {
            console.log('🔨 [DEBUG] Starting compilation for:', lang);
            const compileProcess = spawn(command, args, {
                cwd: tempDir,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let compileOutput = '';
            let compileError = '';

            compileProcess.stdout.on('data', (data) => {
                compileOutput += data.toString();
                console.log('📤 [DEBUG] Compile stdout:', data.toString());
            });

            compileProcess.stderr.on('data', (data) => {
                compileError += data.toString();
                console.log('📤 [DEBUG] Compile stderr:', data.toString());
            });

            compileProcess.on('close', (compileCode) => {
                console.log('🔒 [DEBUG] Compilation finished with code:', compileCode);
                console.log('📊 [DEBUG] Compile output:', compileOutput);
                console.log('❌ [DEBUG] Compile errors:', compileError);

                if (compileCode !== 0) {
                    const errorMessage = compileError || compileOutput || `Compilation failed with code ${compileCode}`;
                    console.log('💥 [DEBUG] Compilation failed:', errorMessage);
                    ws.send(JSON.stringify({
                        type: 'output',
                        data: '\x1b[31m✗ Compilation failed:\x1b[0m\r\n' + errorMessage + '\r\n'
                    }));
                    ws.send(JSON.stringify({
                        type: 'exit',
                        data: compileCode
                    }));
                    setTimeout(() => cleanupTempFiles(), 1000);
                    return;
                }

                console.log('✅ [DEBUG] Compilation successful');

                // Execute the compiled code
                let executeCommand, executeArgs = [];

                if (lang === 'C' || lang === 'Cpp') {
                    executeCommand = path.join(tempDir, `code-${timestamp}.exe`);
                    executeArgs = [];
                } else if (lang === 'Java') {
                    // Use the stored Java class name for execution
                    executeCommand = 'java';
                    executeArgs = ['-cp', tempDir, currentJavaClassName];
                }

                ws.send(JSON.stringify({
                    type: 'output',
                    data: '\x1b[32m✓ Compilation successful!\x1b[0m\r\n\r\n'
                }));

                runProcess(executeCommand, executeArgs);
            });

            compileProcess.on('error', (error) => {
                console.error('💥 [DEBUG] Compilation process error:', {
                    error: error.message,
                    code: error.code,
                    command: command,
                    args: args
                });
                ws.send(JSON.stringify({
                    type: 'output',
                    data: `\x1b[31mCompilation error: ${error.message}\x1b[0m\r\n`
                }));
                ws.send(JSON.stringify({
                    type: 'exit',
                    data: 1
                }));
            });
        } else {
            // For Python - ADD DEBUG LOGS HERE
            console.log('🚀 [DEBUG] Direct execution for Python');
            runProcess(command, args);
        }


        function runProcess(cmd, args) {
            console.log('🎯 [DEBUG] runProcess called with:', { cmd, args });

            process = spawn(cmd, args, {
                cwd: tempDir,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            console.log('✅ [DEBUG] Process spawned successfully, PID:', process.pid);

            process.stdout.on('data', (data) => {
                const output = data.toString();
                console.log('📤 [DEBUG] Process stdout:', output);
                ws.send(JSON.stringify({
                    type: 'output',
                    data: output
                }));
                ws.send(JSON.stringify({
                    type: 'program_running'
                }));
            });

            process.stderr.on('data', (data) => {
                const error = data.toString();
                console.log('📤 [DEBUG] Process stderr:', error);
                ws.send(JSON.stringify({
                    type: 'output',
                    data: '\x1b[31m' + error + '\x1b[0m'
                }));
            });

            process.stdin.on('error', (err) => {
                console.error('💥 [DEBUG] STDIN error:', err);
            });

            process.on('error', (error) => {
                console.error('💥 [DEBUG] Process spawn error:', {
                    error: error.message,
                    code: error.code,
                    cmd: cmd,
                    args: args
                });
                ws.send(JSON.stringify({
                    type: 'output',
                    data: `\x1b[31mProcess error: ${error.message}\x1b[0m\r\n`
                }));
            });

            process.on('close', (code) => {
                console.log('🔒 [DEBUG] Process closed with exit code:', code);
                const exitMessage = code === 0 ?
                    '\x1b[32m✓ Program completed successfully\x1b[0m\r\n' :
                    `\x1b[33mProgram finished with exit code: ${code}\x1b[0m\r\n`;

                ws.send(JSON.stringify({
                    type: 'output',
                    data: exitMessage
                }));
                ws.send(JSON.stringify({
                    type: 'exit',
                    data: code
                }));
                process = null;
                setTimeout(() => cleanupTempFiles(), 2000);
            });
        }
    }

    function cleanupTempFiles() {
        tempFiles.forEach(file => {
            try {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                    console.log(`Cleaned up temp file: ${file}`);
                }
            } catch (e) {
                if (e.code === 'EPERM' || e.code === 'EBUSY') {
                    // File might still be in use, try again later
                    console.log(`File ${file} is busy, will retry cleanup`);
                    setTimeout(() => {
                        try {
                            if (fs.existsSync(file)) {
                                fs.unlinkSync(file);
                                console.log(`Retry cleanup successful: ${file}`);
                            }
                        } catch (retryError) {
                            console.error(`Failed to cleanup ${file} on retry:`, retryError);
                        }
                    }, 3000);
                } else {
                    console.error(`Error cleaning up temp file ${file}:`, e);
                }
            }
        });
        tempFiles = [];
    }
});


startServer();