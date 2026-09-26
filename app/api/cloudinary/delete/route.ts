import { NextResponse } from 'next/server';
import crypto from 'crypto';

function extractPublicIdAndType(url: string): { publicId: string | null; resourceType: 'video' | 'image' } {
  if (!url || !url.includes('cloudinary.com')) {
    return { publicId: null, resourceType: 'image' };
  }

  const isVideo = url.includes('/video/') || url.endsWith('.mp4') || url.endsWith('.mov') || url.endsWith('.webm');
  const resourceType: 'video' | 'image' = isVideo ? 'video' : 'image';

  // Extract public ID: matches /upload/(optional v123/)(public_id).(extension)
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
  const publicId = match ? match[1] : null;

  return { publicId, resourceType };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { url, public_id, resource_type } = body;

    if (url && !public_id) {
      const extracted = extractPublicIdAndType(url);
      public_id = extracted.publicId;
      if (!resource_type) {
        resource_type = extracted.resourceType;
      }
    }

    if (!public_id) {
      return NextResponse.json({ error: 'Missing public_id or valid Cloudinary url' }, { status: 400 });
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'cpwt6w5h';
    const apiKey = process.env.CLOUDINARY_API_KEY || '283739613316953';
    const apiSecret = process.env.CLOUDINARY_API_SECRET || '2S_U46QvVlCDmJ0142yfWNZ8ZX4';

    const timestamp = Math.round(Date.now() / 1000);
    const targetType = resource_type === 'video' ? 'video' : 'image';

    // Signature must be SHA-1 of alphabetically sorted parameters appended with api_secret
    const paramString = `invalidate=true&public_id=${public_id}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(paramString).digest('hex');

    const formParams = new URLSearchParams({
      public_id,
      timestamp: String(timestamp),
      api_key: apiKey,
      signature,
      invalidate: 'true',
    });

    const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${targetType}/destroy`, {
      method: 'POST',
      body: formParams,
    });

    const data = await cloudinaryRes.json();

    // If not found and was video/image, try the opposite resource_type as fallback
    if (data.result === 'not found' && !body.resource_type) {
      const altType = targetType === 'video' ? 'image' : 'video';
      const altRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${altType}/destroy`, {
        method: 'POST',
        body: formParams,
      });
      const altData = await altRes.json();
      if (altData.result === 'ok') {
        return NextResponse.json({ success: true, result: altData.result, resource_type: altType });
      }
    }

    return NextResponse.json({
      success: data.result === 'ok' || data.result === 'not found',
      result: data.result,
      resource_type: targetType,
    });
  } catch (error: any) {
    console.error('Cloudinary destroy API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
