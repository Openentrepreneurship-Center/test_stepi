# 기관 서버용 (spec 009). 버전을 바꿀 때는 spec 009 결정 4번을 같이 고친다
FROM node:24.18.0-slim

RUN npm install -g pnpm@10.34.6

WORKDIR /app

# 패키지 목록이 그대로면 이 층을 재사용해서 인터넷 없이 다시 빌드된다
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# 빌드할 때 코드에 박힌다. 브라우저와 컨테이너 안 모두에서 닿는 주소여야 한다(localhost 불가)
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

EXPOSE 3000
CMD ["pnpm", "start"]
