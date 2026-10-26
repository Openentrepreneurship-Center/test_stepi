This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 기관 서버 Docker

근거와 결정은 `docs/product/specs/009-onprem-frontend-container.md`(STEPI 작업공간)에 있다. Vercel 배포와는 별개다.

```bash
# 빌드: API 주소는 이때 코드에 박힌다. 브라우저와 컨테이너 안 모두에서 닿는 주소를 쓴다(localhost 불가)
docker build --build-arg NEXT_PUBLIC_API_BASE_URL=https://기관-API-주소 -t stepi-frontend .

# 실행: 비밀값은 이미지에 넣지 않고 실행할 때 넣는다
docker run -d --name stepi-frontend -p 127.0.0.1:3006:3000 --env-file .env stepi-frontend
```

`compose.example.yml`로도 띄울 수 있다(`.env`에 `NEXT_PUBLIC_API_BASE_URL` 포함).

실행 때 쓰는 환경변수(값은 기관에서 새로 발급하고 문서·Git에 적지 않는다):
`SESSION_SECRET`, `AUTH_PASSWORD`, `AUTH_PASSWORD_2`, `API_AUTH_SECRET`, `AI_DETECTION_API_TOKEN`, `AI_DETECTION_ALLOWED_ORIGIN`

위 명령은 서버 안(127.0.0.1)에서만 열린다. 다른 PC에서 접속하려면 앞에 nginx 같은 리버스 프록시를 두거나 연결 주소를 바꾼다.

접속 주소가 https가 아니면 로그인 쿠키가 저장되지 않는다. 이때만 `.env`에 `SESSION_COOKIE_SECURE=false`를 넣는다(정확히 소문자 `false`).
