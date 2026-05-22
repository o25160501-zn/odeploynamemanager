import { NextResponse } from 'next/server';

export async function GET() {
  const deployInfo: Record<string, string> = {};
  
  // Duyệt qua process.env để lấy tất cả các biến có prefix _DOTENVRTDB_RUNNER_ hoặc CLOUDFLARED_TUNNEL_HOSTNAME_
  Object.keys(process.env).forEach((key) => {
    if (key.startsWith('_DOTENVRTDB_RUNNER_') || key.startsWith('CLOUDFLARED_TUNNEL_HOSTNAME_')) {
      deployInfo[key] = process.env[key] || '';
    }
  });

  return NextResponse.json(deployInfo);
}
