# klickLab

> 클릭스트림 기반 데이터 수집 및 분석 플랫폼  
> 웹 사용자 행동 데이터를 실시간으로 수집하고, 분석 대시보드로 시각화합니다.

## 🔍 소개

**KlickLab**은 고객사가 사용자 행동을 빠르게 이해하고, 명확한 데이터로 효과적인 의사결정을 내릴 수 있도록 돕는 서비스입니다.

## ⚙️ 설치 및 실행

### 1. 레포지토리 클론

```bash
git clone https://github.com/Eatventory/KlickLab.git
cd klickLab
```

### 2. 백엔드 설치

```bash
cd backend
npm install
node index.js
```

### 3. 환경변수 설정
backend 디렉토리에 `.env` 파일을 생성하고 아래와 같이 설정해 주세요:
- CLICKHOUSE_PASSWORD와 JWT_SECRET을 입력해주세요.

```bash
CLICKHOUSE_URL=http://localhost:8123
CLICKHOUSE_USER=default
CLICKHOUSE_DB=klicklab
CLICKHOUSE_PASSWORD=
JWT_SECRET=
JWT_REFRESH_SECRET=
```

### 4. 프론트엔드 설치

```bash
cd frontend
npm install
npm run dev
```
