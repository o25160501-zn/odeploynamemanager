# Section 9 — Risks & Mitigations

---

## 9.1 Risk Register

| ID | Rủi ro | Likelihood | Impact | Score | Mitigation |
|----|--------|-----------|--------|-------|------------|
| R-01 | DPDNS API không có tài liệu công khai, endpoint không chính thức | 🔴 High | 🔴 High | **Critical** | Reverse-engineer từ browser DevTools (Network tab) của dashboard. Đặt câu hỏi trong DigitalPlat Discord/GitHub Discussions. |
| R-02 | DPDNS API thay đổi mà không thông báo (breaking change) | 🟠 Medium | 🔴 High | **High** | Gọi health-check endpoint khi app load, alert nếu API phản hồi bất thường. Version-pin endpoint path trong config. |
| R-03 | Cloudflare không cho phép thêm subdomain `.dpdns.org` như một zone (second-level domain) | 🟡 Medium | 🔴 High | **High** | Test trước khi commit. Nếu không được, dùng Cloudflare DNS Only (không tạo zone, chỉ dùng NS từ DigitalPlat). |
| R-04 | Firebase Realtime DB Security Rules cấu hình sai → data leak | 🟡 Medium | 🔴 High | **High** | Review rules trước mỗi deploy. Dùng Firebase Emulator để test rules locally. |
| R-05 | DigitalPlat giới hạn 3 domain/tài khoản gây UX confusing | 🔴 High | 🟡 Medium | **High** | Đếm domain hiện tại từ API/Firebase, hiển thị warning `"Bạn đã dùng X/3 domain"` trước khi cho đăng ký. |
| R-06 | Cloudflare Global API Key scope quá rộng (toàn bộ account) | 🟠 Medium | 🟠 Medium | **Medium** | Cảnh báo user khi nhập Key về rủi ro bảo mật. Lộ roadmap upgrade sang API Token trong v2. |
| R-07 | CORS block khi gọi DPDNS API từ browser | 🟠 Medium | 🟠 Medium | **Medium** | Nếu bị CORS, tạo Next.js API Route làm proxy (server-side gọi thay client). |
| R-08 | Firebase free tier (Spark) vượt giới hạn đọc/ghi | 🟢 Low | 🟡 Medium | **Low** | App quy mô cá nhân, data nhỏ. Monitor usage trong Firebase console. Upgrade Blaze nếu cần. |
| R-09 | DigitalPlat dừng hoạt động hoặc thay đổi policy | 🟢 Low | 🔴 High | **Medium** | Dự án open-source, có thể fork/migrate sang DPDNS provider khác. Architecture đủ modular để swap service. |

---

## 9.2 Chi tiết Mitigation cho Rủi ro Critical

### R-01 — DPDNS API không có tài liệu

**Kế hoạch khám phá API:**

1. Mở `dash.domain.digitalplat.org` → DevTools → Network tab
2. Thực hiện thao tác đăng ký domain thủ công
3. Capture request: URL, method, headers, request body, response
4. Đặc biệt chú ý: Bearer token format, request body fields
5. Document lại thành internal API spec trước khi code

**Fallback:** Nếu API có CSRF protection hoặc session-based auth không dùng Bearer Token → cần dùng Puppeteer/Playwright để automate browser thay vì raw HTTP calls (tăng complexity đáng kể).

---

### R-03 — Cloudflare không nhận subdomain .dpdns.org

**Test case cần thực hiện trước khi code:**

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones" \
  -H "X-Auth-Email: test@example.com" \
  -H "X-Auth-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  --data '{"name": "testdomain.dpdns.org", "account": {"id": "YOUR_ACCOUNT_ID"}, "type": "full"}'
```

**Kịch bản thay thế nếu bị block:** Cloudflare chỉ nhận apex domain (`.dpdns.org` chứ không phải `myapp.dpdns.org`). Trong trường hợp này, nameserver sẽ là NS của DigitalPlat chứ không phải Cloudflare — cần redesign flow.

---

### R-07 — CORS block

**Giải pháp Next.js API Route Proxy:**

```typescript
// pages/api/proxy/dpdns.ts  (Next.js API Route)
export async function POST(req: Request) {
  const body = await req.json();
  const token = /* lấy từ Firebase qua server-side */;
  
  const res = await fetch('https://dash.domain.digitalplat.org/api/v1/domain/register', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  
  return Response.json(await res.json());
}
```

---

## 9.3 Risk Monitoring

| Trigger | Action |
|---------|--------|
| DPDNS API trả về status code bất thường liên tục | Kiểm tra GitHub Discussions DigitalPlat, check changelog |
| Cloudflare zone creation error rate > 5% | Inspect Cloudflare status page, review API version |
| Firebase read/write ops > 80% free tier limit | Upgrade to Blaze plan hoặc optimize queries |
| User report domain không resolve sau 48h | Hướng dẫn user kiểm tra NS propagation tại whatsmydns.net |
