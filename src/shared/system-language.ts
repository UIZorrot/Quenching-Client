export const CLIENT_LANGUAGES = ['zh-CN', 'en-US', 'ko-KR', 'fr-FR', 'pt-BR', 'ru-RU', 'es-ES', 'pl-PL'] as const;
export type ClientLanguage = typeof CLIENT_LANGUAGES[number];

export function isClientLanguage(value: unknown): value is ClientLanguage {
  return typeof value === 'string' && (CLIENT_LANGUAGES as readonly string[]).includes(value);
}

/** Map regional OS locales to the translations we ship; unsupported/unknown means Chinese. */
export function systemLanguage(locales: readonly string[] = []): ClientLanguage {
  const languages: Record<string, ClientLanguage> = {
    zh: 'zh-CN', en: 'en-US', ko: 'ko-KR', fr: 'fr-FR', pt: 'pt-BR', ru: 'ru-RU', es: 'es-ES', pl: 'pl-PL',
  };
  for (const locale of locales) {
    const primary = locale.trim().toLowerCase().split(/[-_]/)[0];
    if (languages[primary]) return languages[primary];
  }
  return 'zh-CN';
}
