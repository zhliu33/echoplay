import { useCallback } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import { i18nRegistry } from "./registry";
import { zhConfig } from "./locales/zh";
import { enConfig } from "./locales/en";

i18nRegistry.register(zhConfig);
i18nRegistry.register(enConfig);

export const DEFAULT_LANGUAGE = "zh";

export type Language = string;

export const languages = i18nRegistry.list();

export function useTranslation() {
  const language = useSettingsStore((s) => s.language);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = i18nRegistry.get(language)?.dict ?? i18nRegistry.get(DEFAULT_LANGUAGE)?.dict;
      let str = dict?.[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.split(`{${k}}`).join(String(v));
        }
      }
      return str;
    },
    [language]
  );

  return { t, language };
}