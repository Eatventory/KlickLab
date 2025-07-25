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

## 대시보드 스크린샷

> 대시보드 탭별 스크린샷입니다. <br/>클릭하면 원본 해상도로 확대됩니다.

| Overview | User 분석 | 유입 분석 |
|:---:|:---:|:---:|
| [![Overview](https://github.com/user-attachments/assets/a069b4a0-c2b1-44b6-8d67-bb7441967522?raw=true)](https://github.com/user-attachments/assets/a069b4a0-c2b1-44b6-8d67-bb7441967522) | [![User](https://github.com/user-attachments/assets/0517d953-3da3-4f96-b83f-8aa821a82175?raw=true)](https://github.com/user-attachments/assets/0517d953-3da3-4f96-b83f-8aa821a82175) | [![Acquisition](https://github.com/user-attachments/assets/b0ffd88d-f281-43c2-9ded-27bbb89fb924?raw=true)](https://github.com/user-attachments/assets/b0ffd88d-f281-43c2-9ded-27bbb89fb924) |
| 참여도 분석 | 이벤트 타임라인 | KPI & 설정 |
| [![Engage](https://github.com/user-attachments/assets/2b8c66e0-ea7f-42ee-9ce0-36bce874d143?raw=true)](https://github.com/user-attachments/assets/2b8c66e0-ea7f-42ee-9ce0-36bce874d143) | [![Timeline](https://github.com/user-attachments/assets/1c6546aa-0aca-4353-afea-47fe4e63b6f6?raw=true)](https://github.com/user-attachments/assets/1c6546aa-0aca-4353-afea-47fe4e63b6f6) | [![Report](https://github.com/user-attachments/assets/015974bb-86ed-4380-b6d0-e2d833becf1d?raw=true)](https://github.com/user-attachments/assets/015974bb-86ed-4380-b6d0-e2d833becf1d) |

<details>
<summary>🔎 원본 7장 전체 보기</summary>

<div align="center">

<img src="https://github.com/user-attachments/assets/a069b4a0-c2b1-44b6-8d67-bb7441967522" width="90%"/>
<img src="https://github.com/user-attachments/assets/0517d953-3da3-4f96-b83f-8aa821a82175" width="90%"/>
<img src="https://github.com/user-attachments/assets/b0ffd88d-f281-43c2-9ded-27bbb89fb924" width="90%"/>
<img src="https://github.com/user-attachments/assets/2b8c66e0-ea7f-42ee-9ce0-36bce874d143" width="90%"/>
<img src="https://github.com/user-attachments/assets/1c6546aa-0aca-4353-afea-47fe4e63b6f6" width="90%"/>
<img src="https://github.com/user-attachments/assets/015974bb-86ed-4380-b6d0-e2d833becf1d" width="90%"/>
<img src="https://github.com/user-attachments/assets/ab444991-b663-4dca-8f26-1ffc44123e7d" width="90%"/>

</div>

</details>

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
