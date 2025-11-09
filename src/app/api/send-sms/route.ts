
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { phone, message } = await request.json();

  if (!process.env.FAST2SMS_API_KEY) {
    return NextResponse.json(
      { success: false, message: 'SMS API key is not configured.' },
      { status: 500 }
    );
  }

  if (!phone || !message) {
    return NextResponse.json(
      { success: false, message: 'Phone number and message are required.' },
      { status: 400 }
    );
  }

  const params = new URLSearchParams();
  params.append('authorization', process.env.FAST2SMS_API_KEY);
  params.append('message', message);
  params.append('numbers', phone);
  params.append('route', 'p'); // 'p' for promotional route as per Fast2SMS docs

  try {
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      body: params,
    });

    const data = await response.json();

    if (data.return === true && data.request_id) {
       return NextResponse.json({ success: true, message: 'SMS sent successfully.' });
    } else {
        // Fast2SMS might return an error message
        return NextResponse.json({ success: false, message: data.message || 'Failed to send SMS.' }, { status: 500 });
    }
  } catch (error) {
    console.error('Fast2SMS API Error:', error);
    return NextResponse.json({ success: false, message: 'An internal server error occurred.' }, { status: 500 });
  }
}
