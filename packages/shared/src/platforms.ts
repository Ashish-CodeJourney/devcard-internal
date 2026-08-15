// ─── Follow Strategy Types ───

export type FollowStrategy = 'api' | 'webview' | 'link' | 'copy';

// ─── Platform Definition ───

export interface PlatformDef {
  /** Unique platform identifier */
  id: string;
  /** Display name */
  name: string;
  /** Icon name (maps to platform icon set) */
  icon: string;
  /** Brand color hex */
  color: string;
  /** URL pattern — {username} is replaced */
  urlPattern: string;
  /** Deep link pattern for mobile — null if not supported */
  deepLinkPattern: string | null;
  /** WebView profile URL pattern (for Layer 2) */
  webViewUrlPattern: string | null;
  /** Follow/connect strategy */
  followStrategy: FollowStrategy;
  /** OAuth scopes needed for API follow (Layer 1) */
  oauthScopes: string[];
  /** Placeholder text for username input */
  usernamePlaceholder: string;
  /** Whether the platform uses full URL instead of username */
  usesFullUrl: boolean;
  /** Regex pattern to validate usernames */
  validationRegex?: RegExp;
}

export interface DetectedPlatformLink {
  platform: PlatformDef;
  username: string;
  url: string;
}

// ─── Platform Registry ───

export const PLATFORMS: Record<string, PlatformDef> = {
  github: {
    id: 'github',
    name: 'GitHub',
    icon: 'github',
    color: '#181717',
    urlPattern: 'https://github.com/{username}',
    deepLinkPattern: null,
    webViewUrlPattern: null,
    followStrategy: 'api',
    oauthScopes: ['user:follow', 'read:user'],
    usernamePlaceholder: 'e.g. octocat',
    usesFullUrl: false,
    validationRegex: /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/,
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'linkedin',
    color: '#0A66C2',
    urlPattern: 'https://www.linkedin.com/in/{username}',
    deepLinkPattern: 'linkedin://profile?id={username}',
    webViewUrlPattern: 'https://www.linkedin.com/in/{username}',
    followStrategy: 'webview',
    oauthScopes: ['r_liteprofile'],
    usernamePlaceholder: 'e.g. johndoe',
    usesFullUrl: false,
    validationRegex: /^[a-zA-Z0-9-]{3,100}$/,
  },
  twitter: {
    id: 'twitter',
    name: 'Twitter / X',
    icon: 'twitter',
    color: '#000000',
    urlPattern: 'https://x.com/{username}',
    deepLinkPattern: 'twitter://user?screen_name={username}',
    webViewUrlPattern: 'https://x.com/{username}',
    followStrategy: 'webview',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. elonmusk',
    usesFullUrl: false,
    validationRegex: /^[A-Za-z0-9_]{1,15}$/,
  },
  gitlab: {
    id: 'gitlab',
    name: 'GitLab',
    icon: 'gitlab',
    color: '#FC6D26',
    urlPattern: 'https://gitlab.com/{username}',
    deepLinkPattern: null,
    webViewUrlPattern: null,
    followStrategy: 'link',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. gitlab-user',
    usesFullUrl: false,
  },
  devfolio: {
    id: 'devfolio',
    name: 'Devfolio',
    icon: 'devfolio',
    color: '#3770FF',
    urlPattern: 'https://devfolio.co/@{username}',
    deepLinkPattern: null,
    webViewUrlPattern: null,
    followStrategy: 'link',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. hacker123',
    usesFullUrl: false,
  },
  npm: {
    id: 'npm',
    name: 'npm',
    icon: 'npm',
    color: '#CB3837',
    urlPattern: 'https://www.npmjs.com/~{username}',
    deepLinkPattern: null,
    webViewUrlPattern: null,
    followStrategy: 'link',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. sindresorhus',
    usesFullUrl: false,
  },
  devto: {
    id: 'devto',
    name: 'Dev.to',
    icon: 'devto',
    color: '#0A0A0A',
    urlPattern: 'https://dev.to/{username}',
    deepLinkPattern: null,
    webViewUrlPattern: null,
    followStrategy: 'link',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. ben',
    usesFullUrl: false,
  },
  hashnode: {
    id: 'hashnode',
    name: 'Hashnode',
    icon: 'hashnode',
    color: '#2962FF',
    urlPattern: 'https://hashnode.com/@{username}',
    deepLinkPattern: null,
    webViewUrlPattern: null,
    followStrategy: 'link',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. writer',
    usesFullUrl: false,
  },
  medium: {
    id: 'medium',
    name: 'Medium',
    icon: 'medium',
    color: '#000000',
    urlPattern: 'https://medium.com/@{username}',
    deepLinkPattern: null,
    webViewUrlPattern: null,
    followStrategy: 'link',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. writer',
    usesFullUrl: false,
  },
  leetcode: {
    id: 'leetcode',
    name: 'LeetCode',
    icon: 'leetcode',
    color: '#FFA116',
    urlPattern: 'https://leetcode.com/u/{username}',
    deepLinkPattern: null,
    webViewUrlPattern: null,
    followStrategy: 'link',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. coder',
    usesFullUrl: false,
  },
  hackerrank: {
    id: 'hackerrank',
    name: 'HackerRank',
    icon: 'hackerrank',
    color: '#00EA64',
    urlPattern: 'https://www.hackerrank.com/profile/{username}',
    deepLinkPattern: null,
    webViewUrlPattern: null,
    followStrategy: 'link',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. hacker',
    usesFullUrl: false,
  },
  stackoverflow: {
    id: 'stackoverflow',
    name: 'Stack Overflow',
    icon: 'stackoverflow',
    color: '#F58025',
    urlPattern: 'https://stackoverflow.com/users/{username}',
    deepLinkPattern: null,
    webViewUrlPattern: null,
    followStrategy: 'link',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. 1234/username',
    usesFullUrl: false,
  },
  discord: {
    id: 'discord',
    name: 'Discord',
    icon: 'discord',
    color: '#5865F2',
    urlPattern: '', // no profile URL — copy to clipboard
    deepLinkPattern: null,
    webViewUrlPattern: null,
    followStrategy: 'copy',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. user#1234',
    usesFullUrl: false,
  },
  telegram: {
    id: 'telegram',
    name: 'Telegram',
    icon: 'telegram',
    color: '#26A5E4',
    urlPattern: 'https://t.me/{username}',
    deepLinkPattern: 'tg://resolve?domain={username}',
    webViewUrlPattern: null,
    followStrategy: 'link',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. durov',
    usesFullUrl: false,
  },
  email: {
    id: 'email',
    name: 'Email',
    icon: 'email',
    color: '#EA4335',
    urlPattern: 'mailto:{username}',
    deepLinkPattern: 'mailto:{username}',
    webViewUrlPattern: null,
    followStrategy: 'link',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. hello@example.com',
    usesFullUrl: true,
  },
  portfolio: {
    id: 'portfolio',
    name: 'Portfolio',
    icon: 'globe',
    color: '#6366F1',
    urlPattern: '{username}', // full URL provided
    deepLinkPattern: null,
    webViewUrlPattern: null,
    followStrategy: 'link',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. https://mysite.dev',
    usesFullUrl: true,
  },
  custom: {
    id: 'custom',
    name: 'Custom Link',
    icon: 'link',
    color: '#8B5CF6',
    urlPattern: '{username}', // full URL provided
    deepLinkPattern: null,
    webViewUrlPattern: null,
    followStrategy: 'link',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. https://example.com/profile',
    usesFullUrl: true,
  },
};

// ─── Helpers ───

/** Get ordered list of all platform definitions */
export function getAllPlatforms(): PlatformDef[] {
  return Object.values(PLATFORMS);
}

/** Get a platform by ID */
export function getPlatform(id: string): PlatformDef | undefined {
  return PLATFORMS[id];
}

/** Check whether a platform ID exists in the registry */
export function isSupportedPlatform(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(PLATFORMS, id);
}

/** Get the profile URL for a given platform and username */
export function getProfileUrl(platformId: string, username: string): string {
  const platform = PLATFORMS[platformId];
  if (!platform) return '';
  return platform.urlPattern.replace(/{username}/g, username);
}

/** Get the WebView URL for Layer 2 platforms */
export function getWebViewUrl(platformId: string, username: string): string | null {
  const platform = PLATFORMS[platformId];
  if (!platform?.webViewUrlPattern) return null;
  return platform.webViewUrlPattern.replace(/{username}/g, username);
}

/** Get the deep link URL for mobile */
export function getDeepLinkUrl(platformId: string, username: string): string | null {
  const platform = PLATFORMS[platformId];
  if (!platform?.deepLinkPattern) return null;
  return platform.deepLinkPattern.replace(/{username}/g, username);
}

function normalizeLinkInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (/^[a-z][a-z\d+.-]*:/i.test(trimmed)) return trimmed;
  if (trimmed.includes('@') && !trimmed.includes('://') && !trimmed.includes('/')) {
    return `mailto:${trimmed}`;
  }
  return `https://${trimmed}`;
}

function parseLink(input: string): URL | null {
  try {
    return new URL(normalizeLinkInput(input));
  } catch {
    return null;
  }
}

function firstPathSegment(url: URL): string {
  return url.pathname.split('/').filter(Boolean)[0] ?? '';
}

function remainingPath(url: URL, startIndex = 1): string {
  return url.pathname.split('/').filter(Boolean).slice(startIndex).join('/');
}

export function detectPlatformFromUrl(input: string): DetectedPlatformLink | null {
  const raw = input.trim();
  if (!raw) return null;

  if (/^mailto:/i.test(raw)) {
    const email = raw.slice(7).trim();
    if (!email) return null;
    return {
      platform: PLATFORMS.email,
      username: email,
      url: `mailto:${email}`,
    };
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
    return {
      platform: PLATFORMS.email,
      username: raw,
      url: `mailto:${raw}`,
    };
  }

  const url = parseLink(raw);
  if (!url) return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const firstSegment = firstPathSegment(url);
  const exactUrl = `${url.protocol}//${url.host}${url.pathname}`.replace(/\/$/, '');

  if (host === 'github.com' && firstSegment && !['login', 'settings', 'orgs', 'topics', 'marketplace', 'features'].includes(firstSegment)) {
    return {
      platform: PLATFORMS.github,
      username: firstSegment,
      url: getProfileUrl('github', firstSegment),
    };
  }

  if (host.endsWith('linkedin.com') && firstSegment === 'in') {
    const username = remainingPath(url);
    if (username) {
      return {
        platform: PLATFORMS.linkedin,
        username,
        url: getProfileUrl('linkedin', username),
      };
    }
  }

  if ((host === 'x.com' || host === 'twitter.com') && firstSegment && !['home', 'explore', 'intent', 'share', 'search'].includes(firstSegment)) {
    return {
      platform: PLATFORMS.twitter,
      username: firstSegment,
      url: getProfileUrl('twitter', firstSegment),
    };
  }

  if (host === 'gitlab.com' && firstSegment) {
    return {
      platform: PLATFORMS.gitlab,
      username: firstSegment,
      url: getProfileUrl('gitlab', firstSegment),
    };
  }

  if (host === 'instagram.com' && firstSegment && !['p', 'reel', 'reels', 'stories', 'explore'].includes(firstSegment)) {
    return {
      platform: PLATFORMS.instagram,
      username: firstSegment,
      url: getProfileUrl('instagram', firstSegment),
    };
  }

  if ((host === 'youtube.com' || host === 'youtu.be') && firstSegment.startsWith('@')) {
    const username = firstSegment.slice(1);
    if (username) {
      return {
        platform: PLATFORMS.youtube,
        username,
        url: getProfileUrl('youtube', username),
      };
    }
  }

  if (host === 'twitch.tv' && firstSegment) {
    return {
      platform: PLATFORMS.twitch,
      username: firstSegment,
      url: getProfileUrl('twitch', firstSegment),
    };
  }

  if (host === 'behance.net' && firstSegment) {
    return {
      platform: PLATFORMS.behance,
      username: firstSegment,
      url: getProfileUrl('behance', firstSegment),
    };
  }

  if (host === 'dribbble.com' && firstSegment) {
    return {
      platform: PLATFORMS.dribbble,
      username: firstSegment,
      url: getProfileUrl('dribbble', firstSegment),
    };
  }

  if (host === 'figma.com' && firstSegment === '@') {
    const username = remainingPath(url);
    if (username) {
      return {
        platform: PLATFORMS.figma,
        username,
        url: getProfileUrl('figma', username),
      };
    }
  }

  if (host === 'devfolio.co' && firstSegment.startsWith('@')) {
    const username = firstSegment.slice(1);
    if (username) {
      return {
        platform: PLATFORMS.devfolio,
        username,
        url: getProfileUrl('devfolio', username),
      };
    }
  }

  if (host === 'www.npmjs.com' || host === 'npmjs.com') {
    if (firstSegment.startsWith('~')) {
      const username = firstSegment.slice(1) || remainingPath(url);
      if (username) {
        return {
          platform: PLATFORMS.npm,
          username,
          url: getProfileUrl('npm', username),
        };
      }
    }
  }

  if (host === 'dev.to' && firstSegment) {
    return {
      platform: PLATFORMS.devto,
      username: firstSegment,
      url: getProfileUrl('devto', firstSegment),
    };
  }

  if (host === 'hashnode.com' && firstSegment.startsWith('@')) {
    const username = firstSegment.slice(1);
    if (username) {
      return {
        platform: PLATFORMS.hashnode,
        username,
        url: getProfileUrl('hashnode', username),
      };
    }
  }

  if (host === 'medium.com' && firstSegment.startsWith('@')) {
    const username = firstSegment.slice(1);
    if (username) {
      return {
        platform: PLATFORMS.medium,
        username,
        url: getProfileUrl('medium', username),
      };
    }
  }

  if (host === 'leetcode.com' && firstSegment === 'u') {
    const username = remainingPath(url);
    if (username) {
      return {
        platform: PLATFORMS.leetcode,
        username,
        url: getProfileUrl('leetcode', username),
      };
    }
  }

  if (host === 'hackerrank.com' && firstSegment === 'profile') {
    const username = remainingPath(url);
    if (username) {
      return {
        platform: PLATFORMS.hackerrank,
        username,
        url: getProfileUrl('hackerrank', username),
      };
    }
  }

  if (host === 'stackoverflow.com' && firstSegment === 'users') {
    const username = remainingPath(url);
    if (username) {
      return {
        platform: PLATFORMS.stackoverflow,
        username,
        url: getProfileUrl('stackoverflow', username),
      };
    }
  }

  if ((host === 't.me' || host === 'telegram.me') && firstSegment) {
    return {
      platform: PLATFORMS.telegram,
      username: firstSegment,
      url: getProfileUrl('telegram', firstSegment),
    };
  }

  return {
    platform: PLATFORMS.custom,
    username: exactUrl,
    url: exactUrl,
  };
}
