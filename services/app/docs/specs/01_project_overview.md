# Section 1 — Project Overview

---

## 1.1 Problem Statement

Đăng ký và quản lý domain miễn phí từ DigitalPlat (DPDNS) hiện nay yêu cầu người dùng thao tác thủ công qua nhiều giao diện web khác nhau:

1. Đăng nhập vào **dash.domain.digitalplat.org** để đăng ký domain.
2. Chuyển sang **Cloudflare Dashboard** để thêm domain, chờ lấy nameserver.
3. Quay lại **DigitalPlat** để điền nameserver vào domain vừa đăng ký.
4. Không có chỗ lưu lịch sử, không theo dõi trạng thái, không quản lý nhiều domain một cách có hệ thống.

Dự án này xây dựng một ứng dụng web tập trung, tự động hoá toàn bộ luồng trên chỉ với vài thao tác, đồng thời lưu trữ dữ liệu realtime và hỗ trợ CRUD đầy đủ.

---

## 1.2 Project Goals

| # | Mục tiêu | Đo lường thành công |
|---|----------|---------------------|
| G-01 | Tự động đăng ký domain DPDNS qua API | Domain được tạo thành công qua API call, không cần vào web |
| G-02 | Tự động thêm domain vào Cloudflare và lấy nameserver | Zone được tạo, NS trả về trong ≤ 10 giây |
| G-03 | Tự động cập nhật nameserver Cloudflare vào DigitalPlat | NS được set đúng ngay sau khi lấy từ Cloudflare |
| G-04 | Lưu trữ toàn bộ dữ liệu realtime lên Firebase | Mọi thao tác phản ánh trong DB trong ≤ 2 giây |
| G-05 | Hỗ trợ lưu API Key trước khi tạo domain | API Key được lưu mã hoá, sử dụng lại cho mọi request |
| G-06 | Hỗ trợ xem, sửa, xoá domain đã đăng ký | CRUD hoạt động đầy đủ, có xác nhận trước khi xoá |

---

## 1.3 Business Flow (Luồng nghiệp vụ chính)

```
┌─────────────────────────────────────────────────────────────────┐
│                    LUỒNG CHÍNH                                   │
│                                                                   │
│  [1] Người dùng lưu API Keys                                     │
│       ├── DigitalPlat Token (Bearer)                             │
│       └── Cloudflare Email + Global API Key                      │
│                          │                                        │
│  [2] Nhập tên domain muốn đăng ký (e.g. myapp.dpdns.org)        │
│                          │                                        │
│  [3] App gọi Cloudflare API → POST /zones                        │
│       └── Response: zone_id + name_servers[] ← LƯU VÀO FIREBASE │
│                          │                                        │
│  [4] App gọi DigitalPlat API → Đăng ký domain                   │
│       └── Payload: domain name + nameservers từ bước [3]         │
│                          │                                        │
│  [5] Lưu domain record vào Firebase                              │
│       └── Fields: name, zone_id, nameservers, status,            │
│                   created_at, updated_at                         │
│                          │                                        │
│  [6] Dashboard hiển thị danh sách domain realtime               │
│       ├── Edit: cập nhật nameserver hoặc metadata               │
│       └── Delete: xoá domain (xác nhận 2 bước)                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1.4 Scope

### Trong phạm vi (In-scope)

- Lưu và quản lý API credentials (DPDNS Token, Cloudflare Global API Key + Email)
- Đăng ký domain mới qua DPDNS API (các namespace: `.dpdns.org`, `.us.kg`, `.qzz.io`, `.xx.kg`)
- Tạo Cloudflare Zone và truy xuất nameserver tự động
- Cập nhật nameserver DPDNS ngay sau khi lấy từ Cloudflare
- Lưu trữ tất cả dữ liệu trên Firebase Realtime Database
- Hiển thị danh sách domain với trạng thái, thời gian tạo/sửa
- Sửa thông tin domain (nameserver, notes)
- Xoá domain (có confirmation dialog)
- Giao diện web responsive

### Ngoài phạm vi (Out-of-scope)

- Quản lý DNS records (A, CNAME, MX...) — chỉ quản lý nameserver delegation
- Tích hợp với DNS providers khác ngoài Cloudflare
- Tính năng gia hạn domain (DPDNS là free, không có renewal)
- Multi-user / team collaboration
- Billing / payment
- Email hosting

---

## 1.5 Stakeholders

| Role | Người/Nhóm | Quan tâm chính |
|------|-----------|----------------|
| Primary User | Developer / DevOps cá nhân | Tiết kiệm thời gian, tự động hoá |
| Secondary User | Startup / Side project owner | Quản lý nhiều domain miễn phí |
| System Admin | Người deploy ứng dụng | Cấu hình Firebase, API keys |
| External | DigitalPlat API | Domain namespace provider |
| External | Cloudflare API | DNS zone management |

---

## 1.6 Key Assumptions

- Người dùng đã có tài khoản DigitalPlat và có API Token hợp lệ.
- Người dùng đã có tài khoản Cloudflare và có Global API Key.
- Cloudflare Global API Key được dùng thay vì API Token (theo yêu cầu của dự án — lưu global để tái sử dụng).
- DigitalPlat giới hạn 3 domain miễn phí/tài khoản — ứng dụng sẽ hiển thị cảnh báo khi đạt giới hạn.
- Firebase Realtime Database rules sẽ được cấu hình phù hợp (authenticated writes only).
