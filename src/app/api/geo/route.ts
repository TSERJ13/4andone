import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const headers = new Headers(request.headers);
  const forwardedFor = headers.get('x-forwarded-for');
  const realIp = headers.get('x-real-ip');
  const cfConnectingIp = headers.get('cf-connecting-ip');
  
  // Extract client IP (handle multiple proxies: client, proxy1, proxy2)
  const clientIp = forwardedFor
    ? forwardedFor.split(',')[0].trim()
    : (realIp || cfConnectingIp || '');

  const country = headers.get('x-vercel-ip-country') || 'Unknown';
  const city = headers.get('x-vercel-ip-city') || '';
  const countryRegion = headers.get('x-vercel-ip-country-region') || '';

  return NextResponse.json({
    ip: clientIp,
    country_code: country,
    country_name: country,
    city: city ? decodeURIComponent(city) : '',
    region: countryRegion
  });
}
