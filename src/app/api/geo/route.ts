import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const headers = new Headers(request.headers);
  const country = headers.get('x-vercel-ip-country') || 'Unknown';
  const city = headers.get('x-vercel-ip-city') || '';
  const countryRegion = headers.get('x-vercel-ip-country-region') || '';

  return NextResponse.json({
    country_code: country,
    country_name: country,
    city: city ? decodeURIComponent(city) : '',
    region: countryRegion
  });
}
