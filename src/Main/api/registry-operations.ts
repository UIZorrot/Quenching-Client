import { ipcMain } from 'electron';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

// 注册表操作API
export class RegistryOperationsAPI {
  static register() {
    // 读取注册表值
    ipcMain.handle('registry:read', async (event, keyPath: string, valueName: string) => {
      try {
        // 使用Windows reg命令读取注册表
        const command = `reg query "${keyPath}" /v "${valueName}"`;
        const { stdout } = await execAsync(command);
        
        // 解析输出
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.includes(valueName)) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
              // 返回值部分（跳过名称和类型）
              return parts.slice(2).join(' ');
            }
          }
        }
        
        return null;
      } catch (error) {
        console.warn(`Failed to read registry key ${keyPath}\\${valueName}:`, error);
        return null;
      }
    });

    // 写入注册表值
    ipcMain.handle('registry:write', async (event, keyPath: string, valueName: string, value: string, type: string = 'REG_SZ') => {
      try {
        const command = `reg add "${keyPath}" /v "${valueName}" /t ${type} /d "${value}" /f`;
        await execAsync(command);
        return true;
      } catch (error) {
        console.error(`Failed to write registry key ${keyPath}\\${valueName}:`, error);
        throw error;
      }
    });

    // 删除注册表值
    ipcMain.handle('registry:delete', async (event, keyPath: string, valueName?: string) => {
      try {
        let command;
        if (valueName) {
          command = `reg delete "${keyPath}" /v "${valueName}" /f`;
        } else {
          command = `reg delete "${keyPath}" /f`;
        }
        await execAsync(command);
        return true;
      } catch (error) {
        console.error(`Failed to delete registry key ${keyPath}:`, error);
        throw error;
      }
    });

    // 检查注册表键是否存在
    ipcMain.handle('registry:exists', async (event, keyPath: string, valueName?: string) => {
      try {
        let command;
        if (valueName) {
          command = `reg query "${keyPath}" /v "${valueName}"`;
        } else {
          command = `reg query "${keyPath}"`;
        }
        await execAsync(command);
        return true;
      } catch (error) {
        return false;
      }
    });

    // 列出注册表键的所有值
    ipcMain.handle('registry:list', async (event, keyPath: string) => {
      try {
        const command = `reg query "${keyPath}"`;
        const { stdout } = await execAsync(command);
        
        const values: { name: string; type: string; value: string }[] = [];
        const lines = stdout.split('\n');
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine && !trimmedLine.startsWith('HKEY_') && trimmedLine.includes('REG_')) {
            const parts = trimmedLine.split(/\s+/);
            if (parts.length >= 3) {
              values.push({
                name: parts[0],
                type: parts[1],
                value: parts.slice(2).join(' ')
              });
            }
          }
        }
        
        return values;
      } catch (error) {
        console.error(`Failed to list registry key ${keyPath}:`, error);
        throw error;
      }
    });

    // 备份注册表键
    ipcMain.handle('registry:backup', async (event, keyPath: string, backupPath: string) => {
      try {
        const command = `reg export "${keyPath}" "${backupPath}"`;
        await execAsync(command);
        return true;
      } catch (error) {
        console.error(`Failed to backup registry key ${keyPath}:`, error);
        throw error;
      }
    });

    // 恢复注册表键
    ipcMain.handle('registry:restore', async (event, backupPath: string) => {
      try {
        const command = `reg import "${backupPath}"`;
        await execAsync(command);
        return true;
      } catch (error) {
        console.error(`Failed to restore registry from ${backupPath}:`, error);
        throw error;
      }
    });
  }
}
