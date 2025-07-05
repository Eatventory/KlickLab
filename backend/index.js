const express = require('express');
const cors = require('cors');
const app = express();
const path = require("path");
const PORT = 3000;

const clickhouse = require("./src/config/clickhouse");
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
// app.use(cors());
app.use(cors({
  origin: '*',
  methods: ['POST'],
}));

/* stats 라우팅 */
const statsRoutes = require('./routes/stats');
app.use('/api/stats', statsRoutes);

/* 데모용 테스트 API */
app.get('/api/button-clicks', async (req, res) => {
  const query = req.query;

  try {
    const where = [
      `event_name = 'auto_click'`,
      `is_button = 1`,
      `target_text REGEXP '^button [1-7]$'`,
      query.platform ? `(device_type = '${query.platform}' OR device_os = '${query.platform}')` : null
    ].filter(Boolean).join(' AND ');

    const result = await clickhouse.query({
      query: `
        SELECT element_path, target_text
        FROM events
        WHERE ${where}
      `,
      format: 'JSON',
    });

    const json = await result.json();
    const { data } = json;

    let clicks = [0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < data.length; i++) {
      const tmp = data[i].target_text;
      clicks[Number(tmp.charAt(tmp.length - 1))]++;
    }

    const buttonClicks = Object.fromEntries(
      Array.from({ length: 7 }, (_, i) => {
        const index = i + 1;
        return [`button${index}`, clicks[index]];
      })
    );

    const clickEvents = data.map(q => ({
      element_path: q.element_path ?? '',
      target_text: q.target_text ?? '',
    }));

    res.status(200).json({ buttonClicks, clickEvents });
  } catch (err) {
    console.error('ClickHouse SELECT ERROR:', err);
    res.status(500).json({ error: 'ClickHouse query failed' });
  }
});

app.listen(PORT, () => {
  console.log(`KlickLab 서버 실행 중: http://localhost:${PORT}`);
});

app.get('/', (req, res) => {
  res.send('Welcome to the KlickLab!');
});