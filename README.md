![5 - Copy](https://github.com/user-attachments/assets/672ea52a-5424-419d-8908-52b85057fdc0)


# *KlickLab*

## 목차

1. [프로젝트 소개](#프로젝트-소개)
2. [팀원 소개](#팀원-소개)
3. [대시보드 스크린샷](#대시보드-스크린샷)
4. [포스터](#포스터)
5. [아키텍처](#아키텍처)
6. [데이터 흐름도](#데이터-흐름도)
7. [기술 스택](#기술-스택)
8. [설치 및 실행](#설치-및-실행)

## 프로젝트 소개
> **KlickLab**은 웹사이트에서 발생하는 행동 데이터를 실시간 수집·구조화하여<br />
> 운영자가 **Data-Driven** 방식으로 합리적인 의사결정을 내릴 수 있도록<br />
> 지원하는 **클릭스트림** 분석 플랫폼입니다.
- 배포 URL : https://klicklab.co.kr/

## 팀원 소개
| <img src="https://img.shields.io/badge/Project_Leader-FF5733" /> | <img src="https://img.shields.io/badge/Frontend_Leader-%2300264B" /> | <img src="https://img.shields.io/badge/Backend_Leader-%2310069F" /> | <img src="https://img.shields.io/badge/Database_Leader-blue" /> | <img src="https://img.shields.io/badge/발사대_Leader-%23009688" /> | <img src="https://img.shields.io/badge/Infra_Leader-003df3" /> |
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
| **참여도 분석** | **이벤트 타임라인** | **KPI & 설정** |
| [![Engage](https://github.com/user-attachments/assets/2b8c66e0-ea7f-42ee-9ce0-36bce874d143?raw=true)](https://github.com/user-attachments/assets/2b8c66e0-ea7f-42ee-9ce0-36bce874d143) | [![Timeline](https://github.com/user-attachments/assets/1c6546aa-0aca-4353-afea-47fe4e63b6f6?raw=true)](https://github.com/user-attachments/assets/1c6546aa-0aca-4353-afea-47fe4e63b6f6) | [![Report](https://github.com/user-attachments/assets/015974bb-86ed-4380-b6d0-e2d833becf1d?raw=true)](https://github.com/user-attachments/assets/015974bb-86ed-4380-b6d0-e2d833becf1d) |

<details>
<summary>컴포넌트 자세히 보기</summary> <br/>클릭하면 원본 해상도로 확대됩니다.
  
| 컴포넌트 1 | 컴포넌트 2 | 컴포넌트 3 |
|:---:|:---:|:---:|
| [![img1](https://github.com/user-attachments/assets/d0759a17-f49e-40c9-8db7-c496a19db8aa?raw=true)](https://github.com/user-attachments/assets/d0759a17-f49e-40c9-8db7-c496a19db8aa) | [![img2](https://github.com/user-attachments/assets/ef53d693-a40f-4228-a7ab-7a638e6affa8?raw=true)](https://github.com/user-attachments/assets/ef53d693-a40f-4228-a7ab-7a638e6affa8) | [![img3](https://github.com/user-attachments/assets/a3ddabd7-752b-4726-9cc3-2a428e395644?raw=true)](https://github.com/user-attachments/assets/a3ddabd7-752b-4726-9cc3-2a428e395644) |
| **컴포넌트 4** | **컴포넌트 5** | **컴포넌트 6** |
| [![img4](https://github.com/user-attachments/assets/0ea35f15-569a-48d0-8119-9f12c3ace596?raw=true)](https://github.com/user-attachments/assets/0ea35f15-569a-48d0-8119-9f12c3ace596) | [![img5](https://github.com/user-attachments/assets/f682c050-388e-4192-b9b5-fabaa8783c2e?raw=true)](https://github.com/user-attachments/assets/f682c050-388e-4192-b9b5-fabaa8783c2e) | [![img6](https://github.com/user-attachments/assets/e17d5e05-51f3-4439-a626-301313bae503?raw=true)](https://github.com/user-attachments/assets/e17d5e05-51f3-4439-a626-301313bae503) |
| **컴포넌트 7** | **컴포넌트 8** | **컴포넌트 9** |
| [![img7](https://github.com/user-attachments/assets/15f3e8ef-593d-41db-9d1a-f5e01077f46c?raw=true)](https://github.com/user-attachments/assets/15f3e8ef-593d-41db-9d1a-f5e01077f46c) | [![img8](https://github.com/user-attachments/assets/1b2b7fb9-06cf-4fec-9ea4-a0437d546e2a?raw=true)](https://github.com/user-attachments/assets/1b2b7fb9-06cf-4fec-9ea4-a0437d546e2a) | [![img9](https://github.com/user-attachments/assets/6a1d14cc-0578-423d-953b-19399e996782?raw=true)](https://github.com/user-attachments/assets/6a1d14cc-0578-423d-953b-19399e996782) |
| **컴포넌트 10** | **컴포넌트 11** | **컴포넌트 12** |
| [![img10](https://github.com/user-attachments/assets/2d0216a4-e75b-49fa-b779-d3a936a6d6fe?raw=true)](https://github.com/user-attachments/assets/2d0216a4-e75b-49fa-b779-d3a936a6d6fe) | [![img11](https://github.com/user-attachments/assets/bd6dd864-2fe1-4395-9647-229ca294e936?raw=true)](https://github.com/user-attachments/assets/bd6dd864-2fe1-4395-9647-229ca294e936) | [![img12](https://github.com/user-attachments/assets/407a9808-5a3e-4882-8b8c-ae5ced09edf3?raw=true)](https://github.com/user-attachments/assets/407a9808-5a3e-4882-8b8c-ae5ced09edf3) |
| **컴포넌트 13** | **컴포넌트 14** |  |
| [![img13](https://github.com/user-attachments/assets/a0af75d5-96f1-4593-9b40-a37e19669b9c?raw=true)](https://github.com/user-attachments/assets/a0af75d5-96f1-4593-9b40-a37e19669b9c) | [![img14](https://github.com/user-attachments/assets/e39dcf22-5c31-4566-9748-2ced79cb2eb6?raw=true)](https://github.com/user-attachments/assets/e39dcf22-5c31-4566-9748-2ced79cb2eb6) |  |

</details>

## 포스터

<details>
<summary>포스터 보기</summary>

<div align="center">

<img src="https://github.com/user-attachments/assets/2982378f-6e4d-42e7-be14-10f9972d5573" width="80%" alt="KlickLab Poster" />

</div>

</details>

## 아키텍처

<details>
<summary>아키텍처 다이어그램 보기</summary>

<div align="center">

<img src="https://github.com/user-attachments/assets/e1b65435-379c-494c-a612-03a6ae95a116" width="80%" alt="KlickLab Architecture" />

</div>

</details>

## 데이터 흐름도

<details>
<summary>데이터 흐름도 보기</summary>

<div align="center">

![Infra Architecture for KlickLab](https://github.com/user-attachments/assets/593b10fd-656f-4b7a-aa1f-e179306dcc1c)



</div>

</details>


## 기술 스택

### Frontend  
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![React Router](https://img.shields.io/badge/React--Router-CA4245?style=flat&logo=reactrouter&logoColor=white)

### Backend  
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![ClickHouse](https://img.shields.io/badge/ClickHouse-FFCC00?style=flat&logo=clickhouse&logoColor=black)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat&logo=jsonwebtokens&logoColor=white)
![Prometheus Client](https://img.shields.io/badge/Prom--Client-000000?style=flat&logo=prometheus&logoColor=white)

### Infrastructure  
![Amazon AWS](https://img.shields.io/badge/Amazon_AWS-232F3E?style=flat&logo=amazonaws&logoColor=white)
![AWS MSK](https://img.shields.io/badge/AWS--MSK-FF9900?style=flat&logo=apachekafka&logoColor=black)

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
