# Section 8 — Milestones & Timeline

---

## 8.1 Tổng quan các Phase

| Phase | Tên | Thời gian | Mục tiêu |
|-------|-----|-----------|---------|
| Phase 0 | Foundation | 3 ngày | Setup project, Firebase, Auth |
| Phase 1 | Core Registration Flow | 5 ngày | Đăng ký domain end-to-end hoạt động |
| Phase 2 | Domain Management | 3 ngày | CRUD đầy đủ, realtime list |
| Phase 3 | UX Polish & Security | 2 ngày | Validation, error handling, credential masking |
| Phase 4 | Testing & Deploy | 2 ngày | Test, Vercel deployment, Firebase rules production |

**Tổng thời gian ước tính:** ~15 ngày làm việc (1 developer)

---

## 8.2 Phase 0 — Foundation (Ngày 1–3)

**Mục tiêu:** Skeleton app sẵn sàng để phát triển feature

| Task | Deliverable | Ngày |
|------|-------------|------|
| Khởi tạo Next.js 14 + TypeScript + Tailwind | Repo có thể chạy `npm dev` | Ngày 1 |
| Cài đặt shadcn/ui, Zustand, Zod, react-hook-form | Dependencies installed | Ngày 1 |
| Cấu hình Firebase project (Auth + Realtime DB) | Firebase console setup xong | Ngày 2 |
| Implement Google Sign-In (Firebase Auth) | Login page hoạt động | Ngày 2 |
| Cấu hình Firebase Security Rules (draft) | Rules file checked in | Ngày 3 |
| Setup environment variables (.env.local) | `.env.example` committed | Ngày 3 |

**Definition of Done (Phase 0):**
- [ ] `npm run dev` chạy không lỗi
- [ ] Đăng nhập bằng Google thành công, `auth.uid` được log
- [ ] Firebase read/write test đơn giản hoạt động

---

## 8.3 Phase 1 — Core Registration Flow (Ngày 4–8)

**Mục tiêu:** Luồng đăng ký domain hoàn chỉnh end-to-end

| Task | Deliverable | Ngày |
|------|-------------|------|
| Build `CredentialsForm` + `SettingsPage` | Lưu/đọc credentials từ Firebase | Ngày 4 |
| Implement `CloudflareService.createZone()` | Gọi `POST /zones`, lấy `name_servers` | Ngày 5 |
| Implement `DPDNSService.registerDomain()` | Gọi DPDNS API đăng ký domain | Ngày 6 |
| Implement rollback (xoá CF zone nếu DPDNS fail) | Error path được test | Ngày 6 |
| Build `RegisterModal` với `StepIndicator` | 3-step progress UI | Ngày 7 |
| Lưu domain record vào Firebase sau đăng ký | `/users/{uid}/domains` có data | Ngày 7 |
| Test end-to-end: từ form → domain registered → Firebase updated | Manual test pass | Ngày 8 |

**Definition of Done (Phase 1):**
- [ ] Nhập domain, bấm Register → 3 bước chạy tuần tự → domain trong Firebase
- [ ] Nếu DPDNS fail → Cloudflare zone bị xoá, hiển thị lỗi
- [ ] Credentials thiếu → redirect về Settings

---

## 8.4 Phase 2 — Domain Management (Ngày 9–11)

**Mục tiêu:** CRUD đầy đủ và danh sách realtime

| Task | Deliverable | Ngày |
|------|-------------|------|
| Build `DashboardPage` với danh sách domain realtime | `onValue()` listener, list render | Ngày 9 |
| Build `DomainCard` component | Hiển thị đầy đủ fields, copy NS button | Ngày 9 |
| Build `EditDomainModal` + `DPDNSService.updateNameservers()` | Edit NS + call API | Ngày 10 |
| Build `ConfirmDeleteDialog` + xoá Firebase record | Delete với confirmation | Ngày 11 |
| Opt-in xoá Cloudflare zone khi delete | Checkbox + `CloudflareService.deleteZone()` | Ngày 11 |

**Definition of Done (Phase 2):**
- [ ] List domains cập nhật realtime khi có thay đổi
- [ ] Edit NS → DPDNS API được gọi → Firebase updated
- [ ] Delete với confirmation dialog hoạt động

---

## 8.5 Phase 3 — UX Polish & Security (Ngày 12–13)

**Mục tiêu:** Production-ready UX và security hardening

| Task | Deliverable | Ngày |
|------|-------------|------|
| Credentials masking + Reveal button | Security UX | Ngày 12 |
| Implement AES-256 encryption cho credentials | Encrypted data in Firebase | Ngày 12 |
| Toàn bộ error states: toast, inline errors | UX coverage | Ngày 13 |
| Domain availability check (pre-registration) | FR-011 | Ngày 13 |
| Responsive design: mobile check ≥ 375px | Mobile UX | Ngày 13 |

---

## 8.6 Phase 4 — Testing & Deploy (Ngày 14–15)

**Mục tiêu:** Deploy lên production, Firebase rules final

| Task | Deliverable | Ngày |
|------|-------------|------|
| Review và finalize Firebase Security Rules | Rules deployed to production | Ngày 14 |
| Test toàn bộ happy paths và error paths | Checklist manual test | Ngày 14 |
| Deploy lên Vercel (production environment) | Live URL | Ngày 15 |
| Setup Vercel environment variables | `.env` production configured | Ngày 15 |
| Smoke test trên production | Tất cả flows pass | Ngày 15 |

---

## 8.7 Critical Path

```
[Phase 0: Firebase Auth]
         │
         ▼
[Phase 1: CloudflareService] ──► [Phase 1: DPDNSService]
         │                              │
         └──────────────┬───────────────┘
                        ▼
               [Phase 1: RegisterModal + StepIndicator]
                        │
                        ▼
               [Phase 2: Dashboard + Realtime List]
                        │
                        ▼
               [Phase 2: Edit + Delete]
                        │
                        ▼
               [Phase 3: Security + Polish]
                        │
                        ▼
               [Phase 4: Deploy]
```

**Bottleneck quan trọng nhất:** Phase 1 (Days 5–6) — Nếu DPDNS API không có tài liệu đầy đủ về endpoint đăng ký domain, cần thêm 1–2 ngày để reverse-engineer từ dashboard network calls.

---

## 8.8 Post-MVP Backlog

| Feature | Ưu tiên | Effort |
|---------|---------|--------|
| Dùng Cloudflare API Token thay Global API Key | High | Medium |
| Firebase Functions làm API proxy (bảo mật hơn) | Medium | High |
| Theo dõi trạng thái NS propagation | Medium | Medium |
| Export danh sách domain ra CSV | Low | Low |
| Multi-user / shared workspace | Low | Very High |
