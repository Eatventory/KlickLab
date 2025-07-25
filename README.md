<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/3e3059d0-1015-4f39-9555-81e7ae08770e" />

# KlickLab
> **KlickLab**은 웹사이트에서 발생하는 행동 데이터를 실시간 수집·구조화하여
> 운영자가 **Data-Driven** 방식으로 합리적인 의사결정을 내릴 수 있도록
> 지원하는 **클릭스트림** 분석 플랫폼입니다.
- 배포 URL : https://klicklab.co.kr/

## 팀원 소개
| <img src="https://img.shields.io/badge/Project_Leader-FF5733" /> | <img src="https://img.shields.io/badge/Frontend_Leader-%2300264B" /> | <img src="https://img.shields.io/badge/Backend_Leader-%2310069F" /> | <img src="https://img.shields.io/badge/Database_Leader-blue" /> | <img src="https://img.shields.io/badge/발사대_Leader-%23009688" /> | <img src="https://img.shields.io/badge/Infra_Leader-%238E44AD" /> |
| :--------------------------------------------------------------: | :--------------------------------------------------------------: | :--------------------------------------------------------------------------: | :-----------------------------------------------------------: | :-----------------------------------------------------------: | :-----------------------------------------------------------: |
| <img src="https://avatars.githubusercontent.com/PurifiedPotion" width="100"/> | <img src="https://avatars.githubusercontent.com/jaykxo" width="100"/> | <img src="https://avatars.githubusercontent.com/qkrwns1478" width="100"/> | <img src="https://avatars.githubusercontent.com/whtierice" width="100"/> | <img src="https://avatars.githubusercontent.com/Fharena" width="100"/> | <img src="https://avatars.githubusercontent.com/At-this-moment" width="100"/> |
| [@PurifiedPotion](https://github.com/PurifiedPotion) | [@jaykxo](https://github.com/jaykxo) | [@qkrwns1478](https://github.com/qkrwns1478) | [@whtierice](https://github.com/whtierice) | [@Fharena](https://github.com/Fharena) | [@At-this-moment](https://github.com/At-this-moment) |
| 김관수 | 김재현 | 박준식 | 오주영 | 윤석주 | 이현재 |
<!-- | 기능1 설명 | 기능2 설명 | 기능3 설명 | 기능4 설명 | 기능5 설명 | 기능6 설명 | -->

## 포스터

<img width="2249" height="3179" alt="image" src="https://github.com/user-attachments/assets/2982378f-6e4d-42e7-be14-10f9972d5573" />

## 아키텍처

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/f5d4489a-207a-4c19-aaab-5cb9bacb3e92" />

## 설치 및 실행

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