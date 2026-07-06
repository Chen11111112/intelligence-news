'use server';

import * as cheerio from 'cheerio'; // 💡 記得先執行: npm install cheerio

function getSourceName(url: string): string {
  if (url.includes('theconversation.com')) return 'The Conversation';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'External Source';
  }
}

function extractContentWithCheerio(html: string, url: string): string {
  const $ = cheerio.load(html);
  const paragraphs: string[] = [];

  // 🎯 針對不同主流媒體進行精準的標籤選取
  let selector = 'p'; // 預設撈所有的 p
  
  if (url.includes('theconversation.com')) {
    selector = '.content-body p, [itemprop="articleBody"] p, .entry-content p, p';
  }

  $(selector).each((_, element) => {
    // cheerio 的 .text() 會自動幫你把內部所有的 <a>, <span> 標籤脫掉，只留純文字！
    const text = $(element).text().trim();
    
    // 過濾掉太短的段落、無效的社群分享按鈕文字或版權宣告
    if (text.length > 40 && !paragraphs.includes(text) && !text.startsWith('Follow BBC')) {
      paragraphs.push(text);
    }
  });

  // 將前 30 段內容用兩個換行串接起來
  return paragraphs.slice(0, 30).join('\n\n');
}

export async function fetchArticleBody(url: string) {
  if (!url) {
    throw new Error('缺少原文連結');
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 3600 }, // 💡 緩存 1 小時 (3600秒)，不用每次有人看都重新抓，省頻寬
    });

    if (!response.ok) {
      throw new Error(`無法載入原文內容，狀態碼: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 1. 提取內文
    const fullContentEn = extractContentWithCheerio(html, url);

    // 2. 提取發布時間 (嘗試多種常見的新聞時間標籤)
    let publishedAt = '';
    const timeElement = $('time[datetime]').first();
    if (timeElement.length) {
      publishedAt = timeElement.attr('datetime') || '';
    } else {
      // 備用方案：尋找 meta 標籤的發布時間
      publishedAt = $('meta[property="article:published_time"]').attr('content') || '';
    }

    return {
      fullContentEn,
      sourceName: getSourceName(url),
      publishedAt,
    };
  } catch (error) {
    console.error(`[fetchArticleBody Error] URL: ${url}`, error);
    throw new Error('新聞抓取失敗，伺服器解析異常');
  }
}