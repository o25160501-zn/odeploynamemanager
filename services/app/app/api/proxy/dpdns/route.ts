import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PATCH', 'DELETE']);

export async function POST(req: NextRequest) {
  try {
    const { endpoint, method, body, token } = await req.json();
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ success: false, message: 'Missing DPDNS token' }, { status: 400 });
    }
    if (!endpoint?.startsWith('/api/v1/') || !ALLOWED_METHODS.has(method)) {
      return NextResponse.json({ success: false, message: 'Invalid proxy request' }, { status: 400 });
    }

    const res = await fetch(`https://domain-api.digitalplat.org${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({ success: res.ok }));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'DPDNS proxy failed';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
