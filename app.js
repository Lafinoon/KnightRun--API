const express = require('express');
const { Client } = require('pg');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection configuration
const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_0HBuE1zFKUym@ep-raspy-band-a7sbbwz6-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: {
        rejectUnauthorized: false
    }
});

// Root path
app.get('/', (req, res) => {
    res.json({
        message: 'Knight Run API Server',
        version: '0.1',
        endpoints: [
            'POST /api/register',
            'POST /api/login',
            'POST /api/logout', 
            'POST /api/update-coin',
            'POST /api/update-fires',
            'POST /api/update-treasures',
            'POST /api/update-experience',
            'GET /api/health'
        ]
    });
});

// Connect to database
client.connect()
    .then(() => console.log('Connected to NeonDB'))
    .catch(err => console.error('Database connection error:', err));

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || password === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        // Query user info and items info (using LEFT JOIN)
        const query = `
            SELECT 
                ui.user_id, 
                ui.username, 
                ui.created_at,
                ui."level", 
                ui.experience_points, 
                ui.class_points, 
                ui.gold_coins, 
                ui.silver_coins, 
                ui.credits, 
                ui.consecutive_days, 
                ui.exercise_intensity,
                ui.treasure_found,
                ui.exploring_location,
                ui.birthday,
                ui.height,
                ui.weight,
                uit.equipped_items,
                uit.owned_items
            FROM public.user_info ui
            LEFT JOIN public.user_items uit ON ui.user_id = uit.user_id
            WHERE ui.username = $1 AND ui.password_hash = $2
        `;
        
        const result = await client.query(query, [username, password]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        const user = result.rows[0];
        
        // Build response data
        const responseData = {
            success: true,
            message: 'Login successful',
            user: {
                user_id: user.user_id,
                username: user.username,
                created_at: user.created_at,
                level: user.level,
                experience_points: user.experience_points,
                class_points: user.class_points,
                gold_coins: user.gold_coins,
                silver_coins: user.silver_coins,
                credits: user.credits,
                consecutive_days: user.consecutive_days,
                exercise_intensity: user.exercise_intensity,
                treasure_found: user.treasure_found || 0,
                exploring_location: user.exploring_location || 'Unknown',
                birthday: user.birthday ? user.birthday.toISOString().split('T')[0] : null, // Format as YYYY-MM-DD
                height: user.height || 0,
                weight: user.weight || 0
            },
            items: {
                equipped_items: user.equipped_items || {},
                owned_items: user.owned_items || []
            }
        };

        res.json(responseData);

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error: ' + error.message
        });
    }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logout successful'
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Knight Run API is running',
        timestamp: new Date().toISOString()
    });
});

// Register endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, birthday, height, weight, intensity } = req.body;
        
        // Validate required fields
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        // Check if username already exists (case-sensitive)
        const checkUserQuery = 'SELECT user_id FROM public.user_info WHERE username = $1';
        const existingUser = await client.query(checkUserQuery, [username]);
        
        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Username already exists. Please choose a cooler username :)'
            });
        }

        // Insert new user into user_info table
        // user_id will be auto-generated by the sequence
        const insertUserQuery = `
            INSERT INTO public.user_info 
            (username, password_hash, birthday, height, weight, exercise_intensity, 
             level, experience_points, class_points, gold_coins, silver_coins, 
             credits, consecutive_days, treasure_found, exploring_location)
            VALUES ($1, $2, $3, $4, $5, $6, 1, 0, 0, 0, 0, 0, 0, 0, 'Melbourne')
            RETURNING user_id, username, level, experience_points, class_points, 
                      gold_coins, silver_coins, credits, consecutive_days, 
                      exercise_intensity, treasure_found, exploring_location, 
                      birthday, height, weight
        `;
        
        const userResult = await client.query(insertUserQuery, [
            username,
            password,
            birthday || null,
            height || null,
            weight || null,
            intensity || 'casual'
        ]);
        
        const newUser = userResult.rows[0];
        const userId = newUser.user_id;

        // Insert default items for the new user in user_items table
        const insertItemsQuery = `
            INSERT INTO public.user_items 
            (user_id, equipped_items, owned_items)
            VALUES ($1, $2, $3)
            RETURNING equipped_items, owned_items
        `;
        
        const defaultEquippedItems = { trace: 3, avatar: 1, banner: 2 };
        const defaultOwnedItems = [1, 2, 3];
        
        const itemsResult = await client.query(insertItemsQuery, [
            userId,
            JSON.stringify(defaultEquippedItems),
            JSON.stringify(defaultOwnedItems)
        ]);
        
        const userItems = itemsResult.rows[0];

        // Build success response
        const responseData = {
            success: true,
            message: 'Registration successful',
            user: {
                user_id: newUser.user_id,
                username: newUser.username,
                level: newUser.level,
                experience_points: newUser.experience_points,
                class_points: newUser.class_points,
                gold_coins: newUser.gold_coins,
                silver_coins: newUser.silver_coins,
                credits: newUser.credits,
                consecutive_days: newUser.consecutive_days,
                exercise_intensity: newUser.exercise_intensity,
                treasure_found: newUser.treasure_found,
                exploring_location: newUser.exploring_location,
                birthday: newUser.birthday ? newUser.birthday.toISOString().split('T')[0] : null,
                height: newUser.height,
                weight: newUser.weight
            },
            items: {
                equipped_items: userItems.equipped_items,
                owned_items: userItems.owned_items
            }
        };

        res.status(201).json(responseData);

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error: ' + error.message
        });
    }
});

// Update coins endpoint
app.post('/api/update-coin', async (req, res) => {
    try {
        const { userId, amount } = req.body;

        // Set gold coins to the specified amount (not adding)
        const updateGoldCoinQuery = `
            UPDATE public.user_info
            SET gold_coins = GREATEST($1, 0)
            WHERE user_id = $2
            RETURNING gold_coins;
        `;
        
        const result = await client.query(updateGoldCoinQuery, [amount, userId]);

        // Build success response
        const responseData = {
            success: true,
            message: 'Coin update successful',
            amount: result.rows[0].gold_coins
        };

        res.status(200).json(responseData);

    } catch (error) {
        console.error('Coin update error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error: ' + error.message
        });
    }
});

// Update fire endpoint
app.post('/api/update-fires', async (req, res) => {
    try {
        const { userId, amount } = req.body;

        // Insert new coins into user_info table
        const updateFiresQuery = `
            UPDATE public.user_info
            SET consecutive_days = GREATEST(consecutive_days + $1, 0)
            WHERE user_id = $2
            RETURNING consecutive_days;
        `;
        
        const result = await client.query(updateFiresQuery, [amount, userId]);

        // Build success response
        const responseData = {
            success: true,
            message: 'Fire update successful',
            amount: result.rows[0].consecutive_days
        };

        res.status(200).json(responseData);

    } catch (error) {
        console.error('Fire update error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error: ' + error.message
        });
    }
});

// Update treasures endpoint
app.post('/api/update-treasures', async (req, res) => {
    try {
        const { userId, amount } = req.body;

        // Set treasure_found to the specified amount (not adding)
        const updateTreasuresQuery = `
            UPDATE public.user_info
            SET treasure_found = GREATEST($1, 0)
            WHERE user_id = $2
            RETURNING treasure_found;
        `;
        
        const result = await client.query(updateTreasuresQuery, [amount, userId]);

        // Build success response
        const responseData = {
            success: true,
            message: 'Treasure update successful',
            amount: result.rows[0].treasure_found
        };

        res.status(200).json(responseData);

    } catch (error) {
        console.error('treasure update error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error: ' + error.message
        });
    }
});


// Update experience endpoint
app.post('/api/update-experience', async (req, res) => {
    try {
        const { userId, amount } = req.body;

        // Set experience_points to the specified amount (not adding)
        const updateExperienceQuery = `
            UPDATE public.user_info
            SET experience_points = GREATEST($1, 0)
            WHERE user_id = $2
            RETURNING experience_points;
        `;
        
        const result = await client.query(updateExperienceQuery, [amount, userId]);

        // Build success response
        const responseData = {
            success: true,
            message: 'Experience update successful',
            amount: result.rows[0].experience_points
        };

        res.status(200).json(responseData);

    } catch (error) {
        console.error('Experience update error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error: ' + error.message
        });
    }
});

// Start server!!
app.listen(PORT, () => {
    console.log(`Knight Run API server running on port ${PORT}`);
});
