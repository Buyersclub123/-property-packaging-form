/**
 * Buyers Club Tools — portal configuration
 *
 * This is the only file you edit to add, remove or reorder tiles.
 * No layout or component code needs to change.
 *
 *   Add a team          → add a TeamTile to `teams`
 *   Add a tool          → add a SubTile to that team's `subTiles`
 *   Repoint a tool      → change its `href`
 *   Mark unavailable    → set `comingSoon: true` (href can be omitted)
 */

export type SubTile = {
  name: string;
  description: string;
  /** URL or route path. Omit when comingSoon. */
  href?: string;
  /** Open in a new browser tab. */
  newTab?: boolean;
  /** Points off this site — shows an arrow indicator. */
  external?: boolean;
  /** Not built yet — renders muted with a badge and is not clickable. */
  comingSoon?: boolean;
  /** Icon shown on the tile. */
  icon?: 'cog';
  /** A tile that opens its own page of tools (/team/[id]/[tile slug]). */
  children?: SubTile[];
  /** Keeps Tile access rules when a tool is renamed (defaults to slug(name)). */
  accessKey?: string;
};

export function slug(s: string): string {
  return s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function groupHref(team: TeamTile, tile: SubTile): string {
  return `/team/${team.id}/${slug(tile.name)}`;
}

export type TeamTile = {
  /** URL-safe slug. Used as /team/[id]. */
  id: string;
  name: string;
  description: string;
  subTiles: SubTile[];
};

export const teams: TeamTile[] = [
  {
    id: 'property',
    name: 'Property Team',
    description: 'Packaging, deal sheets and contract reporting.',
    subTiles: [
      {
        name: 'Packaging Form',
        description: 'Multi-step property packaging workflow',
        href: '/packaging-form',
        newTab: true,
      },
      {
        name: 'Deal Sheet',
        description: 'Deal sheet management and tracking',
        href: '/deal-sheet',
        newTab: true,
      },
      {
        name: 'Contract Team Reporting',
        description: 'Contract team reports and alerts',
        href: '/contract-team-reporting',
        newTab: true,
      },
      {
        name: 'Backend',
        description: 'Templates, market data, duplicate checks and test tools behind the Property Team',
        icon: 'cog',
        children: [
          {
            name: 'EOI Template Admin',
            description: 'Manage EOI template terms, conditions and settings',
            href: '/admin/eoi-templates',
            newTab: true,
          },
          {
            name: 'Market Performance',
            description: 'Market performance data and charts',
            href: '/admin/market-performance',
            newTab: true,
          },
          {
            name: 'Duplicate Checker',
            description: 'Check for duplicate records',
            href: '/admin/duplicate',
            newTab: true,
          },
          {
            name: 'Investment Highlights',
            description: 'Test investment highlights',
            href: '/admin/investment-highlights-test',
            newTab: true,
          },
        ],
      },
    ],
  },
  {
    id: 'contracts',
    name: 'Contracts Team',
    description: 'Reporting and alerts for contracts in progress.',
    subTiles: [
      {
        name: 'Contract Team Reporting',
        description: 'Contract team reports and alerts',
        href: '/contract-team-reporting',
        newTab: true,
      },
    ],
  },
  {
    id: 'sales',
    name: 'Sales Team',
    description: 'Client deal tracking.',
    subTiles: [
      {
        name: 'SPIN Call Coach',
        description: 'SPIN call prep and live-call question coach',
        href: '/team/sales/spin-call-coach',
      },
      {
        name: 'Client Deals Log',
        description: 'Client deals tracking',
        comingSoon: true,
      },
    ],
  },
  {
    id: 'research',
    name: 'Research & Data',
    description: 'Market research and reference data.',
    subTiles: [
      {
        name: 'AMAP Reports',
        description: 'Access AMAP research reports',
        href: '/team/research/amap-reports',
      },
      {
        name: 'Purchase Analytics',
        description: 'Client property purchases 2019–2026',
        href: '/team/research/purchase-analytics',
      },
      {
        name: 'Sales Meeting Outcomes',
        accessKey: 'review-outcomes',
        description: 'Record Portfolio Review and Presentation Meeting 1 outcomes, with stats, sales and lists',
        href: '/review-outcomes',
      },
    ],
  },
  {
    id: 'calculators',
    name: 'Calculators',
    description: 'Client-facing and internal calculation tools.',
    subTiles: [
      { name: 'Sales Calculator', description: 'Sales calculations', href: '/calculators/sales' },
      { name: 'Performance Calculator', description: 'Performance calculations', href: '/calculators/performance' },
      { name: 'Mortgage Paydown', description: 'Mortgage paydown calculator', href: '/calculators/mortgage-paydown' },
      { name: 'Pay & Tax Calculator', description: 'Pay and tax calculations', href: '/calculators/pay' },
      { name: 'Affordability Calculator', description: 'Affordability calculations', href: '/calculators/affordability' },
      { name: 'Retirement Planner', description: 'Retirement planning calculator', href: '/calculators/retirement' },
      { name: 'Market Bottom Calculator', description: 'Market bottom analysis and scenarios', href: '/calculators/market-bottom' },
      { name: 'Build Drawdown Calculator', description: 'Build stage drawdown timing and interest', href: '/calculators/drawdown' },
    ],
  },
  {
    id: 'sops',
    name: 'SOPs',
    description: 'Standard operating procedures.',
    subTiles: [
      { name: 'SOPs & Procedures', description: 'Standard operating procedures', comingSoon: true },
    ],
  },
  {
    id: 'training',
    name: 'Training Docs',
    description: 'Training resources and guides.',
    subTiles: [
      { name: 'Training Materials', description: 'Training resources and guides', comingSoon: true },
    ],
  },
  {
    id: 'resources',
    name: 'Resources',
    description: 'Procedures, training and external subscriptions.',
    subTiles: [
      {
        name: 'New Initiatives',
        description: 'Sandpit of read-only demos: Portfolio View and Inbox Mining',
        href: '/new-initiatives',
      },
      { name: 'Reference Documents', description: 'Reference documentation', comingSoon: true },
      { name: 'Company Calendar', description: 'Company event calendar', comingSoon: true },
      { name: 'Links — Internal', description: 'Internal tool links', comingSoon: true },
      {
        name: 'GHL',
        description: 'GoHighLevel CRM',
        href: 'https://app.gohighlevel.com/v2/location/UJWYn4mrgGodB7KZUcHt/dashboard',
        external: true,
        newTab: true,
      },
      {
        name: 'Hotspotting',
        description: 'Property research',
        href: 'https://www.hotspotting.com.au/my-account',
        external: true,
        newTab: true,
      },
      {
        name: 'Smart Property Investment',
        description: 'Property investment news',
        href: 'https://www.smartpropertyinvestment.com.au/',
        external: true,
        newTab: true,
      },
      {
        name: 'Real Estate Investar',
        description: 'Investment analysis',
        href: 'https://info.realestateinvestar.com.au/pro-member-login?tier=1',
        external: true,
        newTab: true,
      },
      {
        name: 'Stash Property',
        description: 'Property search',
        href: 'https://www.stashproperty.com.au/',
        external: true,
        newTab: true,
      },
      {
        name: 'CoreLogic',
        description: 'Property data and analytics',
        href: 'https://rpp.corelogic.com.au/',
        external: true,
        newTab: true,
      },
      {
        name: 'Washington Brown',
        description: 'Depreciation calculator',
        href: 'https://www.washingtonbrown.com.au/depreciation/calculator/',
        external: true,
        newTab: true,
      },
      {
        name: 'Terri Scheer',
        description: 'Landlord insurance',
        href: 'https://online.terrischeer.com.au/',
        external: true,
        newTab: true,
      },
      {
        name: 'Duotax',
        description: 'Tax depreciation',
        href: 'https://duotax.com.au/',
        external: true,
        newTab: true,
      },
      {
        name: 'Buyers Club Website',
        description: 'Company public website',
        href: 'https://buyersclub.com.au/',
        external: true,
        newTab: true,
      },
    ],
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'System configuration and internal utilities.',
    subTiles: [
      { name: 'Tool Management', description: 'Manage tool configurations', comingSoon: true },
      { name: 'User & Access Management', description: 'User and access management', comingSoon: true },
      { name: 'System Performance', description: 'System performance monitoring', comingSoon: true },
      { name: 'IT Architecture Map', description: 'IT architecture documentation', comingSoon: true },
      {
        name: 'GHL Config Changes',
        description: 'Pipeline, stage and field changes detected in GHL',
        href: '/admin/ghl-changes',
        newTab: true,
      },
      {
        name: 'Tile Access',
        description: 'Who sees which tile and tool on this portal (groups and emails)',
        href: '/admin/tile-access',
        newTab: true,
      },
      {
        name: 'Access Policies (Cloudflare)',
        description: 'Who can access which section of this portal',
        href: 'https://dash.cloudflare.com/e042ae740af8318d0a2ed0fe46c8eefc/one/access-controls/apps',
        newTab: true,
        external: true,
      },
    ],
  },
];

/** Sandpit opened from Resources > New Initiatives (who sees it: Admin > Tile Access). Not under Admin: Cloudflare locks that section separately. */
export const newInitiatives: TeamTile = {
  id: 'new-initiatives',
  name: 'New Initiatives',
  description: 'Sandpit for work in progress: read-only demos before they become team tools.',
  subTiles: [
    {
      name: 'Portfolio View',
      description:
        'Client picture: contact, opportunities and properties with purchase cost, valuation and growth, from the unloaded purchase files and GHL snapshots.',
      href: '/portfolio',
    },
    {
      name: 'Inbox Mining',
      description: 'Team mailbox emails matched to GHL opportunities and classified by activity.',
      href: '/inbox-mining',
    },
  ],
};

/** Look up a team by its slug. Returns undefined if not found. */
export function getTeam(id: string): TeamTile | undefined {
  return teams.find((team) => team.id === id);
}

/** Number of tools in a team that are actually available. */
export function availableCount(team: TeamTile): number {
  return team.subTiles.filter((tile) => !tile.comingSoon).length;
}
