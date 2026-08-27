# 1단계: 빌드 환경 (Node.js 20 Alpine)
FROM node:20-alpine AS builder

WORKDIR /app

# 종속성 파일 복사 및 설치 (캐시 레이어 활용)
COPY package*.json ./
RUN npm install

# 소스 코드 전체 복사 및 프로덕션 빌드
COPY . .
RUN npm run build

# 2단계: 런타임 환경 (Nginx Alpine)
FROM nginx:alpine

# Nginx 기본 설정 교체
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 1단계에서 빌드된 정적 파일(dist) 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# 80 포트 노출
EXPOSE 80

# Nginx 포그라운드 실행
CMD ["nginx", "-g", "daemon off;"]
