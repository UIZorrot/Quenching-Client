import fs from 'fs-extra';
import path from 'path';
import https from 'https';
import { app } from 'electron';

export interface NewsItem {
    id: string;
    title: string;
    content: string;
    date: string;
    type: 'update' | 'announcement' | 'feature' | 'bugfix';
    author?: string;
}

export class NewsService {
    private cachePath: string;
    private urls = {
        cn: 'https://www.tianxiazhengyi.net/newscn.md',
        en: 'https://www.tianxiazhengyi.net/newsen.md'
    };

    constructor() {
        this.cachePath = path.join(app.getPath('userData'), 'news_cache.json');
    }

    /**
     * 获取新闻数据
     */
    async fetchNews(lang: string = 'cn'): Promise<NewsItem[]> {
        // 映射语言代码：只有 cn 是 cn，其他（en-US, fr-FR 等）全部映射为 en
        const mappedLang = (lang.toLowerCase().includes('cn') || lang === 'cn') ? 'cn' : 'en';

        try {
            console.log(`[NewsService] Fetching news for lang: ${mappedLang} (original: ${lang})`);
            const content = await this.downloadMarkdown(this.urls[mappedLang]);
            const newsItems = this.parseMarkdown(content);
            await this.saveToCache(mappedLang, newsItems);
            return newsItems;
        } catch (error) {
            console.error(`Failed to fetch news (${lang}):`, error);
            const cached = await this.loadFromCache(mappedLang);
            if (cached && cached.length > 0) {
                console.log(`[NewsService] Using cached news for ${mappedLang}`);
                return cached;
            }
            throw error;
        }
    }

    private downloadMarkdown(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 10000
            };

            const doRequest = (targetUrl: string, allowHttpFallback: boolean) => {
                console.log(`[NewsService] Starting download from ${targetUrl}`);
                const request = https.get(targetUrl, options, (res) => {
                    if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                        const next = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, targetUrl).toString();
                        console.log(`[NewsService] Redirecting to ${next}`);
                        return this.downloadMarkdown(next).then(resolve).catch(reject);
                    }

                    if (res.statusCode !== 200) {
                        if (allowHttpFallback && targetUrl.startsWith('https://')) {
                            const httpUrl = 'http://' + targetUrl.slice('https://'.length);
                            console.warn(`[NewsService] HTTP fallback to ${httpUrl}`);
                            return doRequest(httpUrl, false);
                        }
                        reject(new Error(`Request failed with status code ${res.statusCode} for URL: ${targetUrl}`));
                        return;
                    }

                    let data = '';
                    res.on('data', (chunk) => {
                        data += chunk;
                    });
                    res.on('end', () => {
                        console.log(`[NewsService] Downloaded ${data.length} characters from ${targetUrl}`);
                        resolve(data);
                    });
                });

                request.on('error', (err) => {
                    if (allowHttpFallback && targetUrl.startsWith('https://')) {
                        const httpUrl = 'http://' + targetUrl.slice('https://'.length);
                        console.warn(`[NewsService] Error on https, fallback to ${httpUrl}`);
                        return doRequest(httpUrl, false);
                    }
                    console.error(`[NewsService] Error downloading ${targetUrl}:`, err);
                    reject(err);
                });

                request.on('timeout', () => {
                    request.destroy();
                    if (allowHttpFallback && targetUrl.startsWith('https://')) {
                        const httpUrl = 'http://' + targetUrl.slice('https://'.length);
                        console.warn(`[NewsService] Timeout on https, fallback to ${httpUrl}`);
                        return doRequest(httpUrl, false);
                    }
                    reject(new Error(`Timeout downloading ${targetUrl}`));
                });
            };

            doRequest(url, true);
        });
    }

    private parseMarkdown(md: string): NewsItem[] {
        const items: NewsItem[] = [];
        if (!md) return items;

        const cleanMd = md.replace(/^\uFEFF/, '');
        const h1Match = cleanMd.match(/(?:^|\r?\n)#\s+([^\r\n]+)/);
        const pageTitle = h1Match ? h1Match[1].trim() : '';

        // 移除H1行，避免干扰后续分割
        const contentBody = cleanMd.replace(/(?:^|\r?\n)#\s+[^\r\n]+/, '');

        // 使用正则分割，匹配以 ## 开头的行，且排除 #### (即 ## 后面必须跟空格或行尾，且不能是 #)
        const sections = contentBody.split(/(?:\r?\n|^)##\s+(?!#)/);

        console.log(`[NewsService] Total raw sections: ${sections.length}`);

        for (let i = 0; i < sections.length; i++) {
            const section = sections[i].trim();
            if (!section) continue;

            const lines = section.split(/\r?\n/);
            const firstLine = lines[0].trim();

            // 检查第一行是否有日期
            const dateMatch = firstLine.match(/(\d{4}-\d{2}-\d{2})/);

            // 如果没有日期，视为无效段落（除非是兜底逻辑，但这里我们要求严格些）
            if (!dateMatch) {
                console.log(`[NewsService] Skipping section without date: ${firstLine}`);
                continue;
            }

            const date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];
            let title = pageTitle || firstLine.replace(date, '').replace(/[#\[\]\(\)]/g, '').trim();
            let content = '';

            const contentLines = lines.slice(1);
            const h4Index = contentLines.findIndex(l => l.trim().startsWith('####'));
            const h3Index = contentLines.findIndex(l => l.trim().startsWith('###'));
            const useIndex = h4Index !== -1 ? h4Index : h3Index;
            let sectionLabel: string | undefined;

            if (useIndex !== -1) {
                const headerLine = contentLines[useIndex];
                const headerTitle = headerLine.replace(/^####\s+/, '').replace(/^###\s+/, '').trim();
                sectionLabel = headerTitle || undefined;
                content = contentLines.slice(useIndex + 1).join('\n').trim();
            } else {
                content = contentLines.join('\n').trim();
            }

            if (!title) title = `更新公告 ${date}`;

            // 仅仅作为内部标识，UI不显示这个Type Tag
            let type: NewsItem['type'] = 'update';

            items.push({
                id: `news-${date}-${i}`,
                title: title,
                content: content,
                date: date,
                type: type,
                // author 字段移除或留空
                tags: sectionLabel ? [sectionLabel] : []
            });
        }

        console.log(`[NewsService] Successfully parsed ${items.length} news items`);
        if (items.length === 0) {
            // 回退：尝试从全文提取第一处日期，如果没有则使用今天
            const globalDate = cleanMd.match(/(\d{4}-\d{2}-\d{2})/);
            const date = globalDate ? globalDate[1] : new Date().toISOString().split('T')[0];
            const fallbackContent = cleanMd.trim();
            items.push({
                id: `news-${date}-fallback-0`,
                title: globalDate ? `更新公告 ${date}` : '网站新闻',
                content: fallbackContent,
                date,
                type: 'announcement',
                author: 'Official'
            });
            console.log('[NewsService] Applied fallback news item due to empty parse');
        }
        // 按日期排序 (最新的在前)
        return items.sort((a, b) => b.date.localeCompare(a.date));
    }

    private async saveToCache(lang: string, items: NewsItem[]) {
        try {
            let cache: any = {};
            if (await fs.pathExists(this.cachePath)) {
                cache = await fs.readJson(this.cachePath);
            }
            cache[lang] = {
                items,
                updatedAt: new Date().toISOString()
            };
            await fs.writeJson(this.cachePath, cache, { spaces: 2 });
        } catch (error) {
            console.error('Failed to save news cache:', error);
        }
    }

    private async loadFromCache(lang: string): Promise<NewsItem[]> {
        try {
            if (await fs.pathExists(this.cachePath)) {
                const cache = await fs.readJson(this.cachePath);
                return cache[lang]?.items || [];
            }
        } catch (error) {
            console.error('Failed to load news cache:', error);
        }
        return [];
    }
}

export const newsService = new NewsService();
