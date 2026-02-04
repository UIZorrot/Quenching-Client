import Store from 'electron-store';

interface AppConfig {
    war3Path: string;
    language: 'zh-CN' | 'en-US' | 'ko-KR' | 'fr-FR' | 'pt-BR' | 'ru-RU' | 'es-ES';
    theme: string;
    // Mods
    antiHarmony: boolean;
    terrainMode: 'classic' | 'hd' | 'custom';
    lightMode: number; // 0-10
    modSettings: any;
    customThemes?: any[];
}

const schema = {
    war3Path: {
        type: 'string',
        default: ''
    },
    language: {
        type: 'string',
        enum: ['zh-CN', 'en-US', 'ko-KR', 'fr-FR', 'pt-BR', 'ru-RU', 'es-ES'],
        default: 'zh-CN'
    },
    theme: {
        type: 'string',
        default: 'quenching'
    },
    antiHarmony: {
        type: 'boolean',
        default: false
    },
    terrainMode: {
        type: 'string',
        enum: ['classic', 'hd', 'custom'],
        default: 'classic'
    },
    lightMode: {
        type: 'number',
        default: 4
    },
    modSettings: {
        type: 'object',
        default: {},
        additionalProperties: true
    },
    customThemes: {
        type: 'array',
        default: [],
        items: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                videoPath: { type: 'string' },
                name: { type: 'string' }
            }
        }
    }
} as const;

export class ConfigManager {
    private store: Store<AppConfig>;

    constructor() {
        try {
            this.store = new Store<AppConfig>({
                schema: schema as any,
                clearInvalidConfig: true
            });
        } catch (error) {
            console.error('[Config] Schema violation detected during initialization. Clearing config and retrying...', error);

            this.store = new Store<AppConfig>({
                schema: schema as any,
                clearInvalidConfig: true
            });
        }
        console.log(`[Config] Store initialized at: ${this.store.path}`);
    }

    get<K extends keyof AppConfig>(key: K): AppConfig[K] {
        const value = this.store.get(key);
        // 增加更显眼的日志，确保他在终端里能被看见
        console.log(`\n[IPC-DEBUG] Config GET request for key: "${key}"`);
        console.log(`[IPC-DEBUG] Value found in disk:`, JSON.stringify(value, null, 2));
        return value;
    }

    set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
        console.log(`[Config] SET ${key}:`, value);
        this.store.set(key, value);
    }

    delete<K extends keyof AppConfig>(key: K): void {
        console.log(`[Config] DELETE ${key}`);
        this.store.delete(key);
    }

    getAll(): AppConfig {
        return this.store.store;
    }

    hasWar3Path(): boolean {
        return !!this.store.get('war3Path');
    }
}

export const configManager = new ConfigManager();
