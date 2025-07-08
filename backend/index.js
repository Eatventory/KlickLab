const express = require('express');
const cors = require('cors');
const app = express();
const path = require("path");
const PORT = 3000;

const clickhouse = require("./src/config/clickhouse");
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
// app.use(cors({
//   origin: '*',
//   methods: ['POST'],
// }));

/* stats 라우팅 */
const statsRoutes = require('./routes/stats');
app.use('/api/stats', statsRoutes);

/* overview 라우팅 */
const overviewRoutes = require('./routes/overview');
app.use('/api/overview', overviewRoutes);

/* users 라우팅 */
const usersRoutes = require('./routes/users');
app.use('/api/users', usersRoutes);

/* traffic 라우팅 */
const trafficRoutes = require('./routes/traffic');
app.use('/api/traffic', trafficRoutes);

/* ▼ 메트릭 연결 */
const metricsPort = 9091; // 메트릭 전용 포트
const client = require('prom-client');
// Prometheus 메트릭을 담을 전용 공간(레지스트리)을 생성
const register = new client.Registry();

// CPU, 메모리 등 기본적인 Node.js 프로세스 메트릭을 수집하고, 우리가 만든 register에 등록
client.collectDefaultMetrics({ register });

// HTTP 요청 카운터
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'], // '어떤 방식', '어떤 경로', '어떤 상태코드'로 요청이 왔는지 구분하기 위한 라벨
});
register.registerMetric(httpRequestCounter);

// HTTP 요청 지연 시간 히스토그램
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [50, 100, 200, 300, 400, 500, 1000, 2000], // 응답 시간을 담을 구간(버킷)을 정의
});
register.registerMetric(httpRequestDurationMicroseconds);

// 메트릭 수집 미들웨어
app.use((req, res, next) => {
  // 1. 요청이 들어오는 순간, 타이머를 시작하고 '종료 함수(end)'를 받아둔다.
  const end = httpRequestDurationMicroseconds.startTimer();
  // 2. 이 요청에 대한 응답(res)이 완전히 끝나면('finish' 이벤트) 아래 함수를 실행.
  res.on('finish', () => {
    // 3. 경로를 깔끔하게 정리. (e.g., /users/123 -> /users/:id)
    const route = req.route?.path || req.originalUrl.split('?')[0] || req.path;
    // 4. HTTP 요청 카운터(Counter)의 값을 1 증가.
    // 어떤 요청이었는지 라벨(method, route, status_code)과 함께 기록.
    httpRequestCounter.inc({
      method: req.method,
      route: route,
      status_code: res.statusCode,
    });
    // 5. 요청 시작부터 지금까지의 시간을 계산하여 히스토그램에 기록.
    //    마찬가지로 라벨과 함께 기록.
    end({ route, code: res.statusCode, method: req.method });
  });
  // 6. 다음 미들웨어 또는 실제 API 로직을 실행.
  next();
});

// 모든 요청에 대해 콘솔에 로그를 남기는 미들웨어 추가
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

/* metrics 라우팅 */
// const metricsRoutes = require('./routes/metrics');
// app.use('/api/metrics', metricsRoutes);

// Prometheus 메트릭 엔드포인트
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
/* ▲ 메트릭 연결 */

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
  console.log(`KlickLab API server listening on port ${PORT}`);
});

app.listen(metricsPort, () => {
  console.log(`Metrics server listening on port ${metricsPort}`);
});

app.get('/', (req, res) => {
  res.send('Welcome to the KlickLab!');
});