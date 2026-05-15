// api/works.js — Vercel Serverless Function
// Notion DB에서 작품 데이터를 가져와 JSON으로 반환합니다

const DB_ID = 'b61d7e3bdfff4d78a858f2bfc94a831c';

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
        if (type === 'title') return prop.title?.[0]?.plain_text || '';
        if (type === 'rich_text') return prop.rich_text?.[0]?.plain_text || '';
        if (type === 'number') return prop.number || '';
        if (type === 'select') return prop.select?.name || '';
        if (type === 'url') return prop.url || '';
        return '';
      };
      return {
        번호:        get('번호', 'number'),
        작품제목:    get('작품 제목', 'title'),
        연도:        get('연도', 'number'),
        재료:        get('재료', 'rich_text'),
        설명:        get('설명', 'rich_text'),
        youtubeId:   get('YouTube ID', 'rich_text'),
        트랙명:      get('트랙명', 'rich_text'),
        아티스트:    get('음악 아티스트', 'rich_text'),
        이미지URL:   get('Figma 이미지 URL', 'url') || get('이미지 URL', 'url'),
      };
    });

    res.status(200).json(works);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
