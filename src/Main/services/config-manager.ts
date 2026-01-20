import Store from 'electron-store';

interface AppConfig {
    war3Path: string;
    language: 'cn' | 'en' | 'pt' | 'ru' | 'fr' | 'es';
    theme: string;
    // Mods
    antiHarmony: boolean;
    terrainMode: 'classic' | 'hd' | 'custom';
    lightMode: number; // 0-10
    modSettings: any;
}

const schema = {
    war3Path: {
        type: 'string',
        default: ''
    },
    language: {
        type: 'string',
        enum: ['cn', 'en', 'pt', 'ru', 'fr', 'es'],
        default: 'cn'
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
    }
} as const;

export class ConfigManager {
    private store: Store<AppConfig>;

    constructor() {
        this.store = new Store<AppConfig>({ schema: schema as any });
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
