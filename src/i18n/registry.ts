export interface LanguageConfig {
  code: string;
  label: string;
  dict: Record<string, string>;
}

class I18nRegistry {
  private configs = new Map<string, LanguageConfig>();

  register(config: LanguageConfig): void {
    this.configs.set(config.code, config);
  }

  unregister(code: string): void {
    this.configs.delete(code);
  }

  get(code: string): LanguageConfig | undefined {
    return this.configs.get(code);
  }

  list(): LanguageConfig[] {
    return [...this.configs.values()];
  }
}

export const i18nRegistry = new I18nRegistry();