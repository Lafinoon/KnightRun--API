const express = require('express');
const { Client } = require('pg');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 数据库连接配置
const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_0HBuE1zFKUym@ep-raspy-band-a7sbbwz6-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: {
        rejectUnauthorized: false
    }
});

// 连接数据库
client.connect()
    .then(() => console.log('Connected to NeonDB'))
    .catch(err => console.error('Database connection error:', err));

// 登录接口
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || password === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        // 查询用户信息
        const query = `
            SELECT user_id, username, "level", experience_points, class_points, 
                   gold_coins, silver_coins, credits, consecutive_days, exercise_intensity
            FROM public.user_info 
            WHERE username = $1 AND password_hash = $2
        `;
        
        const result = await client.query(query, [username, password]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        const user = result.rows[0];
        
        res.json({
            success: true,
            message: 'Login successful',
            user: {
                user_id: user.user_id,
                username: user.username,
                level: user.level,
                experience_points: user.experience_points,
                class_points: user.class_points,
                gold_coins: user.gold_coins,
                silver_coins: user.silver_coins,
                credits: user.credits,
                consecutive_days: user.consecutive_days,
                exercise_intensity: user.exercise_intensity
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error: ' + error.message
        });
    }
});

// 注销接口
app.post('/api/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logout successful'
    });
});

// 健康检查接口
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Knight Run API is running',
        timestamp: new Date().toISOString()
    });
});

// 根路径
app.get('/', (req, res) => {
    res.json({
        message: 'Knight Run API Server',
        version: '1.0.0',
        endpoints: [
            'POST /api/login',
            'POST /api/logout', 
            'GET /api/health'
        ]
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`Knight Run API server running on port ${PORT}`);
});
