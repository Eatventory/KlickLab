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

// Traffic 탭 통합 API
app.get('/api/dashboard/traffic', async (req, res) => {
  try {
    const db = await connectMongo();
    const logs = db.collection('logs');
    
    const { period = 'daily', gender = 'all', ageGroup = 'all' } = req.query;
    
    // 기간별 날짜 계산
    let startDate, endDate;
    const now = new Date();
    
    switch (period) {
      case 'daily':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'monthly':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        endDate = now;
    }
    
    // 기본 매치 조건
    let matchConditions = {
      timestamp: {
        $gte: startDate,
        $lte: endDate
      },
      event_name: 'auto_click'
    };
    
    // 성별 필터링
    if (gender !== 'all') {
      matchConditions['context.traits.gender'] = gender;
    }
    
    // 나이대 필터링
    if (ageGroup !== 'all') {
      let ageRange;
      switch (ageGroup) {
        case '10s':
          ageRange = { $gte: 10, $lt: 20 };
          break;
        case '20s':
          ageRange = { $gte: 20, $lt: 30 };
          break;
        case '30s':
          ageRange = { $gte: 30, $lt: 40 };
          break;
        case '40s':
          ageRange = { $gte: 40, $lt: 50 };
          break;
        case '50s':
          ageRange = { $gte: 50, $lt: 60 };
          break;
        case '60s+':
          ageRange = { $gte: 60 };
          break;
      }
      if (ageRange) {
        matchConditions['context.traits.age'] = ageRange;
      }
    }
    
    // 1. 방문자 트렌드 데이터 (필터 적용하지 않음 - 항상 전체 데이터)
    const visitorTrend = await logs.aggregate([
      {
        $match: {
          timestamp: {
            $gte: startDate,
            $lte: endDate
          },
          event_name: 'auto_click'
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            user_id: '$user_id'
          }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          uniqueVisitors: { $sum: 1 },
          totalVisitors: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      },
      {
        $project: {
          date: '$_id',
          visitors: '$totalVisitors',
          newVisitors: '$uniqueVisitors',
          returningVisitors: { $subtract: ['$totalVisitors', '$uniqueVisitors'] },
          _id: 0
        }
      }
    ]).toArray();
    
    // 2. 메인 페이지에서 이동하는 페이지 Top 10 (필터 적용)
    const mainPageNavigation = await logs.aggregate([
      {
        $match: {
          ...matchConditions,
          'properties.page_path': { $ne: '/' } // 메인 페이지가 아닌 페이지로의 이동
        }
      },
      {
        $group: {
          _id: '$properties.page_path',
          clicks: { $sum: 1 },
          uniqueClicks: { $addToSet: '$user_id' }
        }
      },
      {
        $project: {
          name: '$_id',
          page: '$_id',
          clicks: 1,
          uniqueClicks: { $size: '$uniqueClicks' },
          clickRate: { $multiply: [{ $divide: ['$clicks', 100] }, 100] }, // 임시 계산
          avgTimeToClick: 3.2, // 임시 값
          rank: 1,
          _id: 0
        }
      },
      {
        $sort: { clicks: -1 }
      },
      {
        $limit: 10
      }
    ]).toArray();
    
    // 랭킹 추가
    mainPageNavigation.forEach((item, index) => {
      item.rank = index + 1;
      item.id = (index + 1).toString();
    });
    
    res.status(200).json({
      visitorTrend,
      mainPageNavigation,
      filters: { period, gender, ageGroup }
    });
  } catch (err) {
    console.error('Traffic Dashboard API ERROR:', err);
    res.status(500).json({ error: 'Failed to get traffic dashboard data' });
  }
});

app.listen(PORT, () => {
  console.log(`KlickLab 서버 실행 중: http://localhost:${PORT}`);
});

app.get('/', (req, res) => {
  res.send('Welcome to the KlickLab!');
});