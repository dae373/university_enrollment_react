# 배포 가이드

이 프로젝트는 정적 React SPA입니다. Excel 파일 처리는 서버가 아니라 사용자의 브라우저에서 수행됩니다.

## 방법 1: Vercel 배포

1. 압축을 해제하고 프로젝트를 GitHub 저장소에 올립니다.
2. Vercel에서 `Add New Project`를 선택합니다.
3. GitHub 저장소를 연결합니다.
4. Framework Preset은 `Vite`를 선택합니다.
5. 다음 설정을 확인합니다.
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Node.js: 20
6. Deploy를 실행합니다.

프로젝트에 `vercel.json`이 포함되어 있어 React Router 스타일의 SPA 새로고침과 정적 파일 캐시가 자동 적용됩니다.

## 방법 2: Netlify 배포

1. GitHub 저장소를 Netlify에 연결합니다.
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Deploy를 실행합니다.

`netlify.toml`과 `public/_redirects`가 포함되어 있습니다.

## 방법 3: Render Static Site

프로젝트에 `render.yaml`이 포함되어 있습니다.

1. Render에서 `New +` → `Blueprint`를 선택합니다.
2. GitHub 저장소를 연결합니다.
3. Render가 설정을 읽은 후 배포를 실행합니다.

## 방법 4: Docker 배포

Docker가 설치된 서버에서 실행합니다.

```bash
docker compose up -d --build
```

접속 주소:

```text
http://서버주소:8080
```

중지:

```bash
docker compose down
```

로그 확인:

```bash
docker compose logs -f
```

### Docker 직접 실행

```bash
docker build -t university-enrollment-dashboard .
docker run -d \
  --name university-enrollment-dashboard \
  --restart unless-stopped \
  -p 8080:80 \
  university-enrollment-dashboard
```

## 방법 5: 일반 Nginx 서버

Node.js가 설치된 빌드 환경에서:

```bash
npm install
npm run build
```

생성된 `dist` 폴더의 내용을 웹 서버에 복사합니다.

```bash
sudo rm -rf /var/www/university-dashboard/*
sudo cp -r dist/* /var/www/university-dashboard/
```

Nginx에서는 모든 SPA 경로가 `index.html`로 연결되도록 설정해야 합니다.

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

## GitHub Actions

`.github/workflows/build.yml`이 포함되어 있습니다. GitHub에 푸시하면 자동으로:

1. 의존성 설치
2. TypeScript 검사
3. 프로덕션 빌드
4. `dist` 아티팩트 생성
5. Docker 이미지 빌드 검증

을 수행합니다.

## HTTPS와 도메인

Vercel, Netlify, Render는 기본 HTTPS를 제공합니다. 자체 서버에서는 Nginx와 Let's Encrypt 또는 클라우드 로드밸런서를 사용하세요.

## 개인정보 및 보안

- 업로드된 Excel 파일은 브라우저 메모리에서만 처리됩니다.
- 별도 백엔드 API로 파일을 전송하지 않습니다.
- 페이지를 새로고침하면 업로드 데이터는 초기화됩니다.
- 공개 배포 시 `public/sample_data`의 예제 파일도 외부에서 접근 가능하므로, 공개하면 안 되는 데이터라면 해당 폴더의 파일을 삭제하세요.

## 배포 전 체크리스트

- [ ] `npm install` 성공
- [ ] `npm run typecheck` 성공
- [ ] `npm run build` 성공
- [ ] 샘플 데이터 자동 로딩 확인
- [ ] Excel 업로드 확인
- [ ] Word 및 Excel 다운로드 확인
- [ ] 모바일·태블릿 지원 범위 결정
- [ ] 공개 가능한 데이터인지 확인
- [ ] 사용자 도메인과 HTTPS 설정
