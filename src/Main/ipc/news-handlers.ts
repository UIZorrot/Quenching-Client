import { ipcMain } from 'electron';
import { newsService } from '../services/news-service';

export function registerNewsHandlers() {
    ipcMain.handle('news:fetch', async (_event, lang: 'cn' | 'en' = 'cn') => {
        return await newsService.fetchNews(lang);
    });
}
