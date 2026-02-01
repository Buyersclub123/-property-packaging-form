import { NextResponse } from 'next/server';

/**
 * API route to fetch images from URLs
 * This avoids CORS issues when fetching images from external sources
 */
export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    let imageUrl: URL;
    try {
      imageUrl = new URL(url);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Fetch the image
    const response = await fetch(imageUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    // Check if it's actually an image
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'URL does not point to an image' },
        { status: 400 }
      );
    }

    // Get image as blob
    const blob = await response.blob();

    // Return the image blob
    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': blob.size.toString(),
      },
    });
  } catch (error) {
    console.error('Image fetch error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch image',
      },
      { status: 500 }
    );
  }
}
