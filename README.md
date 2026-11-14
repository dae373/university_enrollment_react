# 대학 신입생 충원 분석 React 웹앱

PRD를 기반으로 구현한 React + TypeScript + Vite 프런트엔드 MVP입니다. 모든 Excel 분석은 사용자의 브라우저에서 이루어집니다.

## 기술 스택

- React 18
- TypeScript
- Vite
- SheetJS (`xlsx`) — Excel 읽기 및 내보내기
- Recharts — 대시보드 차트
- `docx` — Word 보고서 생성
- Lucide React — 아이콘

## 주요 기능

- 대학알리미 Excel 다중 업로드
- 파일명 대신 표 제목과 헤더를 이용한 공시 항목 자동 판별
- 신입생 충원 현황과 출신 고교 현황 구분
- 모집인원 0, 충원율 100% 초과, 중복 행, 산식 불일치 검증
- 학교종류·지역·설립구분·대학명 필터
- 충원율·경쟁률·지원자·입학자 KPI
- 경쟁률과 충원율 산점도
- 지역·설립 유형별 가중 분석
- 대학 최대 10개 비교
- 동일 충원 공시 데이터가 2개 연도 이상일 때 전년 비교
- Word 보고서와 Excel 분석 결과 브라우저 다운로드

## 실행 방법

Node.js 18 이상이 필요합니다.

```bash
npm install
npm run dev
```

브라우저에서 아래 주소로 접속합니다.

```text
http://localhost:5173
```

## 프로덕션 빌드

```bash
npm run build
npm run preview
```

빌드 파일은 `dist` 폴더에 생성됩니다.

## 샘플 데이터

`public/sample_data` 폴더에 제공된 파일을 포함했습니다.

- `2025_data.xlsx`: 신입생 출신 고등학교 유형별 현황
- `2026_data.xlsx`: 신입생 충원 현황

공시 항목이 다르므로 기본 샘플에서는 전년 충원 비교를 수행하지 않고 검증 화면에서 불일치를 안내합니다.

## 배포

정적 React 앱이므로 다음 서비스에 배포할 수 있습니다.

- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront
- 사내 Nginx 웹 서버

Vercel/Netlify에서는 빌드 명령을 `npm run build`, 배포 폴더를 `dist`로 설정합니다.

## 향후 확장

- 로그인 및 사용자 권한
- 프로젝트별 분석 결과 DB 저장
- 본교·분교·캠퍼스 자동 통합
- 학교명 변경 및 통폐합 이력 관리
- 출신 고교 유형별 상세 열 분석
- PowerPoint 자동 생성
- FastAPI 또는 Node.js 백엔드 연동
