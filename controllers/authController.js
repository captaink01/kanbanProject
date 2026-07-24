const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.signup = async (req, res) => {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // Check for existing user
        const existing = await req.db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Hash password
        const saltRounds = 12;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Insert user
        const result = await req.db.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
            [email, password_hash]
        );
        const user = result.rows[0];

        res.status(201).json({ user: { id: user.id, email: user.email } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const result = await req.db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Create tokens
        const accessToken = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { userId: user.id },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '7d' }
        );

        // Store refresh token in DB
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await req.db.query(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [user.id, refreshToken, expiresAt]
        );

        // Set refresh token as httpOnly cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // only over HTTPS in prod
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({ accessToken });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.refreshToken = async (req, res) => {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: 'Refresh token required' });

    try {
        // Verify token
        const payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

        // Check in DB
        const dbToken = await req.db.query(
            'SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2',
            [token, payload.userId]
        );
        if (dbToken.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        // Delete old token (rotation)
        await req.db.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);

        // Issue new tokens
        const userResult = await req.db.query('SELECT email FROM users WHERE id = $1', [payload.userId]);
        const user = userResult.rows[0];

        const newAccessToken = jwt.sign(
            { userId: payload.userId, email: user.email },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '15m' }
        );

        const newRefreshToken = jwt.sign(
            { userId: payload.userId },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '7d' }
        );

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await req.db.query(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [payload.userId, newRefreshToken, expiresAt]
        );

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({ accessToken: newAccessToken });
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
};

exports.logout = async (req, res) => {
    const token = req.cookies?.refreshToken;
    if (token) {
        await req.db.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
    }
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
};