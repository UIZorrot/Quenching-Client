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
    tags?: string[];
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
                            const httpUrl = 'https://' + targetUrl.slice('https://'.length);
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
                        const httpUrl = 'https://' + targetUrl.slice('https://'.length);
                        console.warn(`[NewsService] Error on https, fallback to ${httpUrl}`);
                        return doRequest(httpUrl, false);
                    }
                    console.error(`[NewsService] Error downloading ${targetUrl}:`, err);
                    reject(err);
                });

                request.on('timeout', () => {
                    request.destroy();
                    if (allowHttpFallback && targetUrl.startsWith('https://')) {
                        const httpUrl = 'https://' + targetUrl.slice('https://'.length);
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

        // 1. 尝试按 H1 (#) 分割
        // split results: [pre-text, title1, body1, title2, body2, ...]
        const h1Splits = cleanMd.split(/(?:^|\r?\n)#\s+([^\r\n]+)/);

        if (h1Splits.length >= 3) {
            // 存在至少一个 H1 标题
            for (let i = 1; i < h1Splits.length; i += 2) {
                const title = h1Splits[i].trim();
                const body = h1Splits[i + 1];
                this.parseSection(title, body, items);
            }
        } else {
            // 没有 H1 标题，或者格式只有纯文本/H2
            // 尝试提取页面标题（仅作兼容，实际上可能不存在）
            this.parseSection('', cleanMd, items);
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
            });
            console.log('[NewsService] Applied fallback news item due to empty parse');
        }

        // 按日期排序 (最新的在前)
        return items.sort((a, b) => b.date.localeCompare(a.date));
    }

    private parseSection(defaultTitle: string, contentBody: string, items: NewsItem[]) {
        // 使用正则分割，匹配以 ## 开头的行
        // 注意：split 会保留分隔符前面的内容在前一个数组元素，分隔符本身如果没捕获则消失
        // 这里我们主要找 ## Date 这样的结构

        // 如果内容里包含 ##，则尝试分割
        const sections = contentBody.split(/(?:\r?\n|^)##\s+(?!#)/);

        // 如果分割出多段（意味着有 ##），或者虽然只有一段但这一段以 ## 开头（被split吃掉了? 不，split behaviour）
        // split /(?:^|\n)## / on "## Date\nContent" -> ["", "Date\nContent"]

        let foundSubItems = false;

        for (let i = 0; i < sections.length; i++) {
            const section = sections[i].trim();
            if (!section) continue;

            const lines = section.split(/\r?\n/);
            const firstLine = lines[0].trim();

            // 检查第一行是否有日期 (这是识别 ## Date 结构的关键)
            const dateMatch = firstLine.match(/(\d{4}-\d{2}-\d{2})/);

            if (dateMatch) {
                const date = dateMatch[1];
                // 如果有 defaultTitle (来自 H1)，优先使用 H1，否则构造标题
                let title = defaultTitle;

                // 如果 defaultTitle 为空（旧格式），或者我们想把日期从标题移除
                // 旧逻辑里 title 是去掉日期后的 firstLine
                // 但在新格式 (# Ver -> ## Date) 里，title 应该是 Ver。
                // firstLine 只是日期。

                const restOfLine = firstLine.replace(date, '').trim();
                if (!title) {
                    title = restOfLine || `更新公告 ${date}`;
                }

                // 内容去掉第一行（日期行）
                let content = lines.slice(1).join('\n').trim();

                // 提取 tag (#### / ###)
                const { processedContent, tag } = this.extractTag(content);

                items.push({
                    id: `news-${date}-${items.length}`,
                    title: title,
                    content: processedContent,
                    date: date,
                    type: 'update',
                    tags: tag ? [tag] : []
                });
                foundSubItems = true;
            }
        }

        // 如果在这个块里没有找到任何以 ## Date 开头的子项，
        // 那么这整个块就是一个单独的新闻（例如 H1 是标题，内容里没有 ## 日期，或者日期写在正文里）
        if (!foundSubItems && defaultTitle && contentBody.trim()) {
            // 尝试从内容里找第一个日期
            const dateMatch = contentBody.match(/(\d{4}-\d{2}-\d{2})/);
            const date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];

            const { processedContent, tag } = this.extractTag(contentBody.trim());

            items.push({
                id: `news-${date}-${items.length}`,
                title: defaultTitle,
                content: processedContent,
                date: date,
                type: 'update',
                tags: tag ? [tag] : []
            });
        }
    }

    private extractTag(content: string): { processedContent: string, tag?: string } {
        const lines = content.split(/\r?\n/);
        const h4Index = lines.findIndex(l => l.trim().startsWith('####'));
        const h3Index = lines.findIndex(l => l.trim().startsWith('###'));
        const useIndex = h4Index !== -1 ? h4Index : h3Index;

        if (useIndex !== -1) {
            const headerLine = lines[useIndex];
            const headerTitle = headerLine.replace(/^####\s+/, '').replace(/^###\s+/, '').trim();
            const newContent = lines.slice(useIndex + 1).join('\n').trim();
            return { processedContent: newContent, tag: headerTitle || undefined };
        }

        return { processedContent: content, tag: undefined };
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
