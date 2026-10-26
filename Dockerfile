# 기관 서버용 (spec 009). 버전을 바꿀 때는 spec 009 결정 4번을 같이 고친다
FROM node:24.18.0-slim

RUN npm install -g pnpm@10.34.6

# root 가 아닌 기본 사용자(node)로 설치·빌드·실행한다
WORKDIR /app
RUN chown node:node /app
USER node

# 위 층들과 빌드 캐시가 남아 있고 패키지 목록·파일 권한이 그대로면, 여기까지 재사용되어 인터넷 없이 다시 빌드된다
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY --chown=node:node . .

# 빌드할 때 코드에 박힌다. 브라우저와 컨테이너 안 모두에서 닿는 주소여야 한다(localhost 불가)
ARG NEXT_PUBLIC_API_BASE_URL
RUN test -n "$NEXT_PUBLIC_API_BASE_URL" || (echo "빌드 인자 NEXT_PUBLIC_API_BASE_URL 이 필요하다" && exit 1)
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]
