import { BrowserWindow, ipcMain, shell, WebContentsView } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { FORUM_SESSION_PARTITION, FORUM_URL, ForumBounds } from '../../shared/forum';

const views = new Map<number, WebContentsView>();
const forumOrigin = new URL(FORUM_URL).origin;

export function hideForum(window: BrowserWindow): void {
  const view = views.get(window.id);
  if (!view) return;
  views.delete(window.id);
  if (!window.isDestroyed()) window.contentView.removeChildView(view);
  if (!view.webContents.isDestroyed()) view.webContents.close();
}

export function setForumBounds(window: BrowserWindow, bounds: ForumBounds): void {
  const view = views.get(window.id);
  if (!view) return;
  if (![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)) throw new Error('Invalid forum bounds');
  const [width, height] = window.getContentSize();
  const zoom = window.webContents.getZoomFactor();
  const x = Math.max(0, Math.min(width, Math.round(bounds.x * zoom)));
  const y = Math.max(0, Math.min(height, Math.round(bounds.y * zoom)));
  view.setBounds({ x, y, width: Math.max(0, Math.min(width - x, Math.round(bounds.width * zoom))),
    height: Math.max(0, Math.min(height - y, Math.round(bounds.height * zoom))) });
}

export async function showForum(window: BrowserWindow, bounds: ForumBounds): Promise<void> {
  if (views.has(window.id)) { setForumBounds(window, bounds); return; }
  // Remote pages have their own browser session and no client preload/Node API.
  const view = new WebContentsView({ webPreferences: {
    partition: FORUM_SESSION_PARTITION, nodeIntegration: false, contextIsolation: true, sandbox: true,
  } });
  views.set(window.id, view);
  view.setBackgroundColor('#17131b');
  window.contentView.addChildView(view);
  setForumBounds(window, bounds);
  const onWindowClosed = () => hideForum(window);
  const onClientReload = () => hideForum(window);
  // The BrowserWindow.webContents getter throws once its owner is destroyed.
  // Retain the emitter while alive so teardown only removes JS listeners.
  const ownerContents = window.webContents;
  window.once('closed', onWindowClosed);
  ownerContents.once('did-start-loading', onClientReload);
  view.webContents.once('destroyed', () => {
    window.removeListener('closed', onWindowClosed);
    ownerContents.removeListener('did-start-loading', onClientReload);
  });
  view.webContents.session.setPermissionRequestHandler((_contents, permission, callback) => {
    callback(permission === 'clipboard-sanitized-write');
  });
  const navigate = (url: string) => {
    const destination = new URL(url);
    if (destination.origin === forumOrigin) void view.webContents.loadURL(url).catch(() => {});
    else if (['https:', 'http:', 'mailto:'].includes(destination.protocol)) void shell.openExternal(url);
  };
  view.webContents.setWindowOpenHandler(({ url }) => { navigate(url); return { action: 'deny' }; });
  view.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== forumOrigin) { event.preventDefault(); navigate(url); }
  });
  try { await view.webContents.loadURL(FORUM_URL); }
  catch (error) { if (views.get(window.id) === view) hideForum(window); throw error; }
}

export async function reloadForum(window: BrowserWindow): Promise<void> {
  const view = views.get(window.id);
  if (view) {
    try { await view.webContents.loadURL(view.webContents.getURL() || FORUM_URL); }
    catch (error) { if (views.get(window.id) === view) hideForum(window); throw error; }
  }
}

export function registerForumHandlers(): void {
  const owner = (event: IpcMainInvokeEvent) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window || window.webContents !== event.sender || event.senderFrame !== event.sender.mainFrame) {
      throw new Error('Forum controls are only available to the client window');
    }
    return window;
  };
  ipcMain.handle('forum:show', (event, bounds: ForumBounds) => showForum(owner(event), bounds));
  ipcMain.handle('forum:bounds', (event, bounds: ForumBounds) => setForumBounds(owner(event), bounds));
  ipcMain.handle('forum:hide', event => hideForum(owner(event)));
  ipcMain.handle('forum:reload', event => reloadForum(owner(event)));
}
