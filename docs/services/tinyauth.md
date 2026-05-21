# Tinyauth service (`docker-compose/compose.auth.yml`)

## Vai trò
- Là lớp xác thực chung cho các route Caddy qua `forward_auth`.
- Thay thế toàn bộ Caddy Basic Auth cũ.
- Dùng được cho app chính, ops services, deploy-code và app bổ sung sau này.

## Compose layer
- File: `docker-compose/compose.auth.yml`.
- `dc.sh` nạp layer này ngay sau `compose.core.yml` và trước ops/access/app.
- Các project sau nên giữ auth layer riêng, không nhúng Tinyauth vào `compose.apps.yml`.

## Cấu hình chính
- Service: `tinyauth`
- Container: `tinyauth`
- Image: `ghcr.io/steveiliop56/tinyauth:v5`
- Network: `app_net`
- Data volume: `${DOCKER_VOLUMES_ROOT:-./.docker-volumes}/tinyauth:/data`
- DB runtime: `sqlite:////data/${TINYAUTH_DB_FILE}`
- Public auth host:
  - `http://auth.${PROJECT_NAME}.${DOMAIN}`
  - `http://auth.${DOMAIN}`
  - `http://auth.${PROJECT_NAME_TAILSCALE}.${TAILSCALE_TAILNET_DOMAIN}`

## Caddy integration
Các service cần bảo vệ thêm labels:

```yaml
- "caddy.forward_auth=tinyauth:${TINYAUTH_PORT:-3000}"
- "caddy.forward_auth.uri=/api/auth/caddy"
- "caddy.forward_auth.copy_headers=Remote-User Remote-Email Remote-Name Remote-Groups"
```

Giữ label `reverse_proxy` của service như cũ.

## ENV cần thiết
- `TINYAUTH_APP_URL`: public URL của Tinyauth, ví dụ `http://auth.${DOMAIN}`.
- `TINYAUTH_PORT`: port nội bộ Tinyauth, mặc định `3000`.
- `TINYAUTH_SECRET`: secret ký session/cookie. Generate: `openssl rand -hex 32`.
- `TINYAUTH_DB_FILE`: tên file SQLite trong volume Tinyauth, mặc định `tinyauth.db`.
- `TINYAUTH_USERS`: users tĩnh, comma-separated, ví dụ `admin:changeme`.
- `TINYAUTH_OAUTH_AUTO_REDIRECT`: auto redirect provider. Giá trị phổ biến: `none`, `github`, `google`, `generic`.
- `TINYAUTH_DISABLE_CONTINUE`: `true|false`, ẩn/hiện trang continue sau login.
- `TINYAUTH_COOKIE_SECURE`: `true|false`, giữ `true` khi đi qua HTTPS tunnel.
- `TINYAUTH_TRUST_PROXY`: `true|false`, giữ `true` với Caddy/Cloudflared/Tailscale để tránh cảnh báo http/https direct.
- `TINYAUTH_LOG_LEVEL`: `trace|debug|info|warn|error`.

## OAuth ENV phổ biến
- Google:
  - `TINYAUTH_GOOGLE_CLIENT_ID`
  - `TINYAUTH_GOOGLE_CLIENT_SECRET`
  - Console: https://console.cloud.google.com/apis/credentials
- GitHub:
  - `TINYAUTH_GITHUB_CLIENT_ID`
  - `TINYAUTH_GITHUB_CLIENT_SECRET`
  - OAuth Apps: https://github.com/settings/developers
- Generic OIDC:
  - `TINYAUTH_OIDC_ISSUER`
  - `TINYAUTH_OIDC_CLIENT_ID`
  - `TINYAUTH_OIDC_CLIENT_SECRET`
  - `TINYAUTH_OIDC_SCOPES`, default `openid email profile`

## Access control ENV phổ biến
- `TINYAUTH_ALLOWED_USERS`: danh sách email/user được phép.
- `TINYAUTH_ALLOWED_DOMAINS`: danh sách domain email được phép.
- `TINYAUTH_ALLOWED_GROUPS`: danh sách group được phép nếu provider hỗ trợ.

## Quy trình triển khai
1. Điền `TINYAUTH_SECRET` bằng secret mạnh.
2. Chọn auth mode:
   - Static user: điền `TINYAUTH_USERS`.
   - OAuth: điền provider env + `TINYAUTH_OAUTH_AUTO_REDIRECT` nếu muốn auto redirect.
3. Đảm bảo `LITESTREAM_REPLICATE_DBS` có `tinyauth` nếu muốn backup DB auth.
4. Lần đầu deploy: `LITESTREAM_INIT_MODE=true`.
5. Sau khi login/config ổn: đổi `LITESTREAM_INIT_MODE=false` để các lần deploy sau bắt buộc restore.
6. Chạy: `bash docker-compose/scripts/dc.sh up -d --build --remove-orphans`.

## Vận hành
- Logs: `bash docker-compose/scripts/dc.sh logs -f tinyauth`.
- Restart: `bash docker-compose/scripts/dc.sh restart tinyauth`.
- DB nằm ở `${DOCKER_VOLUMES_ROOT}/tinyauth/${TINYAUTH_DB_FILE}`.
- Không xóa DB local khi `LITESTREAM_INIT_MODE=false` nếu chưa chắc replica S3 restore được.
