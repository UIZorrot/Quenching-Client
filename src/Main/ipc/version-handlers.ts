import { ipcMain } from 'electron';
import http from 'http';
import https from 'https';

const fetchText = (url: string, maxRetries: number = 3): Promise<string> => {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    let retries = 0;
    const attemptFetch = () => {
      console.log(`[Version] Fetching version from ${url} (attempt ${retries + 1}/${maxRetries})...`);

      const req = client.get(url, (res) => {
        // 处理重定向
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          console.log(`[Version] Redirecting to ${res.headers.location}`);
          fetchText(res.headers.location, maxRetries).then(resolve).catch(reject);
          return;
        }

        // 处理错误状态码
        if (res.statusCode !== 200) {
          const error = new Error(`HTTP ${res.statusCode}`);
          console.warn(`[Version] HTTP error: ${res.statusCode}`);

          // 重试逻辑
          if (retries < maxRetries - 1) {
            retries++;
            setTimeout(attemptFetch, 1000 * retries); // 递增延迟
          } else {
            reject(error);
          }
          return;
        }

        // 读取响应数据
        let data = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          const trimmed = data.trim();
          console.log(`[Version] Successfully fetched version: ${trimmed}`);
          resolve(trimmed);
        });
        res.on('error', (err) => {
          console.error(`[Version] Response error:`, err);
          if (retries < maxRetries - 1) {
            retries++;
            setTimeout(attemptFetch, 1000 * retries);
          } else {
            reject(err);
          }
        });
      });

      req.on('error', (err) => {
        console.error(`[Version] Request error:`, err);
        if (retries < maxRetries - 1) {
          retries++;
          setTimeout(attemptFetch, 1000 * retries);
        } else {
          reject(err);
        }
      });

      // 增加超时时间到30秒
      req.setTimeout(30000, () => {
        console.warn(`[Version] Request timeout after 30s`);
        req.destroy(new Error('Timeout'));
        if (retries < maxRetries - 1) {
          retries++;
          setTimeout(attemptFetch, 1000 * retries);
        } else {
          reject(new Error('Timeout after all retries'));
        }
      });
    };

    attemptFetch();
  });
};

export function registerVersionHandlers() {
  ipcMain.handle('version:fetch', async () => {
    // 主URL和备用URL
    const urls = [
      'https://www.tianxiazhengyi.net/version.que'
    ];

    // 尝试所有URL
    for (const url of urls) {
      try {
        const text = await fetchText(url, 2); // 每个URL重试2次
        if (text) {
          console.log(`[Version] Got version from ${url}: ${text}`);
          return text;
        }
      } catch (e) {
        console.warn(`[Version] Failed to fetch from ${url}:`, e.message);
        continue; // 尝试下一个URL
      }
    }

    // 所有URL都失败，返回空字符串
    console.error('[Version] All version fetch attempts failed');
    return '';
  });
}

