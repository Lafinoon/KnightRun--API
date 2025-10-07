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

        // 查询用户信息和物品信息（使用LEFT JOIN）
        const query = `
            SELECT 
                ui.user_id, 
                ui.username, 
                ui."level", 
                ui.experience_points, 
                ui.class_points, 
                ui.gold_coins, 
                ui.silver_coins, 
                ui.credits, 
                ui.consecutive_days, 
                ui.exercise_intensity,
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
        
        // 构建响应数据
        const responseData = {
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

// 注册接口：birthday/ register_date 按 DATE，weight 按 DOUBLE，height 按 INTEGER
app.post('/api/register', async (req, res) => {
  try {
    let { username, password, birthday, height, weight, intensity, registerDate } = req.body;

    // 1) 基础校验
    if (!username || !password || !birthday || !height || weight === undefined || !intensity) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // 2) 统一强度
    intensity = String(intensity).trim().toUpperCase();

    // 3) 解析 height 下界为整数
    const heightLower = parseLowerHeight(height); // e.g. "170-175" → 170
    if (heightLower == null) {
      return res.status(400).json({ success: false, message: 'Invalid height range' });
    }

    // 4) 解析 weight 为 Number（double）
    const w = Number(weight);
    if (Number.isNaN(w)) {
      return res.status(400).json({ success: false, message: 'Invalid weight' });
    }

    // 5) 注册日期（可选）：前端传 registerDate（yyyy-MM-dd），否则用今天
    // Postgres 能把 'yyyy-MM-dd' 自动转为 DATE
    if (!registerDate) {
      // 生成今天的 yyyy-MM-dd（UTC 或本地均可，这里用本地时间）
      const today = new Date();
      registerDate = today.toISOString().slice(0, 10);
    }

    // 6) 懒建表/补列（不会覆盖已有数据；如已有不同类型需要手工迁移）
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.user_info (
        user_id VARCHAR(10) PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        birthday DATE NOT NULL,
        height INTEGER,
        weight_kg INTEGER,
        exercise_intensity TEXT,
        register_date DATE
      );
      ALTER TABLE public.user_info
        ADD COLUMN IF NOT EXISTS height INTEGER,
        ADD COLUMN IF NOT EXISTS weight_kg INTEGER,
        ADD COLUMN IF NOT EXISTS exercise_intensity TEXT,
        ADD COLUMN IF NOT EXISTS register_date DATE;
    `);

    // 7) 重名检查
    const exists = await client.query(
      'SELECT 1 FROM public.user_info WHERE username = $1',
      [username]
    );
    if (exists.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }

    // 8) 生成 6 位 user_id（"000001"...）
    const last = await client.query(`
      SELECT user_id
      FROM public.user_info
      WHERE user_id ~ '^[0-9]+$'
      ORDER BY user_id::int DESC
      LIMIT 1
    `);
    let newId = '000001';
    if (last.rows.length > 0) {
      const lastNum = parseInt(last.rows[0].user_id, 10) || 0;
      newId = String(lastNum + 1).padStart(6, '0');
    }

    // 9) 插入（Postgres 会把 'yyyy-MM-dd' 自动解析为 DATE）
  // INSERT 语句中字段名要与数据库完全一致
  const insertSQL = `
    INSERT INTO public.user_info
      (username, password_h, created_at, birthday, height, weight, exercise_int)
    VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6)
  `;
  await client.query(insertSQL, [
    username,
    password,          // 直接存明文（你说不加密）
    birthday,          // DATE 格式字符串 "yyyy-MM-dd"
    heightLower,       // INTEGER
    w,                 // INTEGER
    intensity          // WEAK / MEDIUM / STRONG
  ]);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user_id: newId,
      paddedId: newId
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
  }
});

// —— 工具函数：提取区间下界整数 —— //
function parseLowerHeight(input) {
  if (input == null) return null;
  // 只保留数字和连字符，取第一个数字段
  const s = String(input).replace(/[^\d\-–—]+/g, '');
  const m = s.match(/\d+/);
  if (!m) return null;
  const n = parseInt(m[0], 10);
  if (Number.isNaN(n)) return null;
  if (n < 80 || n > 250) return null; // 合理范围保护
  return n;
}

// 启动服务器
app.listen(PORT, () => {
    console.log(`Knight Run API server running on port ${PORT}`);
});
