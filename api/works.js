// api/works.js — Vercel Serverless Function
// Google Drive / YouTube URL을 자동으로 변환합니다

const DB_ID = 'b61d7e3bdfff4d78a858f2bfc94a831c';

// ── Google Drive URL → 임베드 가능한 이미지 URL ──────────
function convertDriveUrl(url) {
  if (!url) return '';

  // 이미 변환된 URL이면 그대로
  if (url.includes('lh3.googleusercontent.com')) return url;
  if (url.includes('drive.google.com/uc')) return url;

  // https://drive.google.com/file/d/FILE_ID/view...
  const matchFile = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFile) return `https://lh3.googleusercontent.com/d/${matchFile[1]}`;

  // https://drive.google.com/open?id=FILE_ID
  const matchOpen = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchOpen) return `https://lh3.googleusercontent.com/d/${matchOpen[1]}`;

  // 그 외 그대로 반환
  return url;
}

// ── YouTube URL → Video ID ────────────────────────────────
function extractYoutubeId(input) {
  if (!input) return '';

  // 이미 ID만 있는 경우 (11자리 영숫자)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) return input.trim();

  // https://www.youtube.com/watch?v=VIDEO_ID
  const matchWatch = input.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (matchWatch) return matchWatch[1];

  // https://youtu.be/VIDEO_ID
  const matchShort = input.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (matchShort) return matchShort[1];

  // https://www.youtube.com/embed/VIDEO_ID
  const matchEmbed = input.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  if (matchEmbed) return matchEmbed[1];

  // https://music.youtube.com/watch?v=VIDEO_ID
  const matchMusic = input.match(/music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
  if (matchMusic) return matchMusic[1];

  return input;
}

// ── 메인 핸들러 ───────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const notion = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: {
          property: '공개 여부',
          select: { equals: '공개' }
        },
        sorts: [{ property: '번호', direction: 'ascending' }]
      })
    });

    const data = await notion.json();

    const works = data.results.map(page => {
      const p = page.properties;
      const get = (key, type) => {
        const prop = p[key];
        if (!prop) return '';
        if (type === 'title')     return prop.title?.[0]?.plain_text || '';
        if (type === 'rich_text') return prop.rich_text?.[0]?.plain_text || '';
        if (type === 'number')    return prop.number || '';
        if (type === 'select')    return prop.select?.name || '';
        if (type === 'url')       return prop.url || '';
        return '';
      };

      const rawImage   = get('Figma 이미지 URL', 'url') || get('이미지 URL', 'url');
      const rawYoutube = get('YouTube ID', 'rich_text');

      return {
        번호:      get('번호', 'number'),
        작품제목:  get('작품 제목', 'title'),
        연도:      get('연도', 'number'),
        재료:      get('재료', 'rich_text'),
        설명:      get('설명', 'rich_text'),
        youtubeId: extractYoutubeId(rawYoutube),   // URL or ID 모두 OK
        트랙명:    get('트랙명', 'rich_text'),
        아티스트:  get('음악 아티스트', 'rich_text'),
        이미지URL: convertDriveUrl(rawImage),       // Drive URL 자동 변환
      };
    });

    res.status(200).json(works);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
