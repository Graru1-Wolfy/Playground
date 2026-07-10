import preferences from "./preferences.json" with { type: "json" };

export const preferencesConfig = preferences;

export interface PreferenceDefinition {
  id: string;
  label: string;
  defaultWeight: number;
  description: string;
}

export interface PreferenceGroup {
  name: string;
  preferences: PreferenceDefinition[];
}
