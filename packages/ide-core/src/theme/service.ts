export interface ThemeColors {
  readonly bgBase: string;
  readonly bgSurface: string;
  readonly bgElevated: string;
  readonly text: string;
  readonly textMuted: string;
  readonly accent: string;
  readonly border: string;
}

export interface ThemeDefinition {
  readonly id: string;
  readonly name: string;
  readonly displayName: string;
  readonly author: string;
  readonly type: 'dark' | 'light' | 'high-contrast';
  readonly colors: ThemeColors;
}

export interface ThemeService {
  register(theme: ThemeDefinition): void;
  get(id: string): ThemeDefinition | undefined;
  list(): readonly ThemeDefinition[];
  getActive(): ThemeDefinition;
  setActive(id: string): void;
  toCssVariables(theme: ThemeDefinition): Record<string, string>;
}

const DARK_THEME: ThemeDefinition = {
  id: 'dark',
  name: 'dark',
  displayName: 'Dark',
  author: 'system',
  type: 'dark',
  colors: {
    bgBase: '#0d1117',
    bgSurface: '#161b22',
    bgElevated: '#1c2128',
    text: '#e6edf3',
    textMuted: '#8b949e',
    accent: '#58a6ff',
    border: '#30363d',
  },
};

const LIGHT_THEME: ThemeDefinition = {
  id: 'light',
  name: 'light',
  displayName: 'Light',
  author: 'system',
  type: 'light',
  colors: {
    bgBase: '#ffffff',
    bgSurface: '#f6f8fa',
    bgElevated: '#ffffff',
    text: '#1f2328',
    textMuted: '#656d76',
    accent: '#0969da',
    border: '#d0d7de',
  },
};

export class DefaultThemeService implements ThemeService {
  private readonly themes = new Map<string, ThemeDefinition>();
  private activeId = 'dark';

  constructor() {
    this.register(DARK_THEME);
    this.register(LIGHT_THEME);
  }

  register(theme: ThemeDefinition): void {
    this.themes.set(theme.id, theme);
  }

  get(id: string): ThemeDefinition | undefined {
    return this.themes.get(id);
  }

  list(): readonly ThemeDefinition[] {
    return [...this.themes.values()];
  }

  getActive(): ThemeDefinition {
    return this.themes.get(this.activeId) ?? DARK_THEME;
  }

  setActive(id: string): void {
    if (!this.themes.has(id)) throw new Error(`Theme not found: ${id}`);
    this.activeId = id;
  }

  toCssVariables(theme: ThemeDefinition): Record<string, string> {
    const c = theme.colors;
    return {
      '--bg-base': c.bgBase,
      '--bg-surface': c.bgSurface,
      '--bg-elevated': c.bgElevated,
      '--text': c.text,
      '--text-muted': c.textMuted,
      '--accent': c.accent,
      '--border': c.border,
    };
  }
}
