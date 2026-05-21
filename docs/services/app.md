# App service (`compose.apps.yml`)

## Vai trò
- Service ứng dụng chính: **domain-register-app** (Next.js standalone).
- Build từ source code tại `../domain-register-app` (thư mục anh em với repo này).

## Cấu hình chính
- Image local tag: `${PROJECT_NAME}-app:local`
- Build context: `../domain-register-app` (relative path)
- Port expose localhost: `127.0.0.1:${APP_HOST_PORT}:${APP_PORT}`
- Logs volume: `${DOCKER_VOLUMES_ROOT:-./.docker-volumes}/app/logs:/app/logs`
- Healthcheck: `wget http://localhost:${APP_PORT}${HEALTH_PATH:-/}`
- Start period: 30s (Next.js build + cold start lâu hơn Node.js đơn giản)

## ENV bắt buộc
- `APP_PORT`: port Next.js lắng nghe trong container (default 3000).
- `PROJECT_NAME`, `DOMAIN`: tạo hostname public.
- `TINYAUTH_PORT`: port forward_auth nội bộ tới Tinyauth.

## ENV optional
- `APP_HOST_PORT` (default 3000): chỉ truy cập localhost host machine.
- `NODE_ENV` (default production).
- `HEALTH_PATH` (default `/`): Next.js không có `/health`, dùng `/`.
- `DOCKER_VOLUMES_ROOT` (default `./.docker-volumes`).
- `TAILSCALE_TAILNET_DOMAIN`: dùng cho route HTTPS nội bộ qua caddy_1.

## Build Args (Firebase — baked in lúc build)
Các biến sau phải có trong `.env` trước khi `docker build`:
- `NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_API_KEY`
- `NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_DATABASE_URL`
- `NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_FIREBASE_APP_ID`
- `NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_ENCRYPT_SALT`
- `DPDNS_CLOUDFLARED_MANAGER_BACKEND_API_SECRET_KEY`
- `NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_ALLOWED_EMAILS`

## Routing
- Public host: `${PROJECT_NAME}.${DOMAIN}` (+ alias `main.${DOMAIN}`, `${DOMAIN}`).
- Internal HTTPS host: `${PROJECT_NAME_TAILSCALE}.${TAILSCALE_TAILNET_DOMAIN}` với `tls internal`.
- Auth: Caddy `forward_auth` tới `tinyauth:${TINYAUTH_PORT}`.

## Auth/Litestream layer
- Tinyauth và Litestream nằm ở `docker-compose/compose.auth.yml`, không đặt trong `compose.apps.yml`.
- App chỉ giữ labels `forward_auth` trỏ tới `tinyauth:${TINYAUTH_PORT}`.
- **Không dùng SQLite** — dữ liệu lưu trên Firebase Realtime Database.
- Không cần cấu hình Litestream cho app (chỉ Tinyauth dùng Litestream).
