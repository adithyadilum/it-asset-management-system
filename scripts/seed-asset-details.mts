/**
 * Fills in the detail layer the demo fleet is missing.
 *
 * `seed-demo-data.mts` builds the fleet but leaves three JSON columns almost
 * empty, so the Specifications block on an asset renders blank and the History
 * tab is empty for most of the fleet. This script fills:
 *
 *   categories.custom_schema    the field definitions, split into the
 *                               model-level specs and the per-unit tracking
 *                               fields the asset edit form treats as editable
 *   models.technical_details    one value per modelSpecs field, per model
 *   assets.instance_attributes  one value per assetTracking field, per unit
 *   assets.salvage_value        the expected residual, as a share of cost
 *   system_audit_logs           a per-asset timeline
 *
 * The keys are deliberately the exact `fieldName` strings from the category
 * schema. The edit form derives its editable set from `assetTracking`, so a key
 * that does not match would land in the read-only model-spec list instead.
 *
 * History is derived from rows that already exist -- purchases, assignments and
 * maintenance tickets -- rather than invented, so the History tab agrees with
 * the Assignments and Maintenance tabs on the same asset instead of telling a
 * different story.
 *
 * Everything runs in one transaction, so a dry run rolls back. Re-runnable: it
 * deletes only the history rows it owns before writing.
 *
 *   node scripts/seed-asset-details.mts            # dry run, reports and rolls back
 *   node scripts/seed-asset-details.mts --apply    # writes
 */
import 'dotenv/config';
import postgres from 'postgres';

const APPLY = process.argv.includes('--apply');
const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 1 });

// Deterministic: the same seed gives the same details, so a re-run after a
// mistake reproduces exactly what was reviewed.
let seed = 20260902;
const rand = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};
// Trailing comma required: in .mts a bare `<T>` arrow parses as JSX.
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
const chance = (p: number) => rand() < p;

type FieldType = 'Text' | 'Number' | 'Date' | 'Dropdown' | 'Boolean';
type Field = { fieldName: string; inputType: FieldType; required: boolean };

const t = (fieldName: string, required = true): Field => ({
  fieldName,
  inputType: 'Text',
  required,
});
const n = (fieldName: string, required = false): Field => ({
  fieldName,
  inputType: 'Number',
  required,
});
const d = (fieldName: string, required = false): Field => ({
  fieldName,
  inputType: 'Date',
  required,
});
const b = (fieldName: string, required = false): Field => ({
  fieldName,
  inputType: 'Boolean',
  required,
});
const dd = (fieldName: string, required = false): Field => ({
  fieldName,
  inputType: 'Dropdown',
  required,
});

const iso = (x: Date) => x.toISOString().slice(0, 10);
const daysAgo = (nDays: number) => new Date(Date.now() - nDays * 86_400_000);

/**
 * One fixed "now" for the whole run, so a long run cannot straddle midnight
 * and produce events a few hours apart that sort inconsistently.
 *
 * History must never be stamped in the future: the audit log and every recent
 * activity list order by `performed_at DESC`, so a single event dated next year
 * pins itself to the top and pushes real activity out of view.
 */
const NOW = Date.now();
const monthsAfter = (from: Date, months: number) => {
  const x = new Date(from);
  x.setDate(1);
  x.setMonth(x.getMonth() + months);
  return x;
};

const CONDITION_NOTE = [
  'No visible wear',
  'Light scuffing on the base',
  'Minor scratch on the lid',
  'Corner scuff, cosmetic only',
  'As new',
] as const;
const SURFACE_NOTE = [
  'No marks',
  'Light surface marks',
  'Minor edge chip',
  'Small scratch near the front edge',
  'As new',
] as const;
const COLOURS = ['Space Grey', 'Silver', 'Graphite', 'Matte Black'] as const;
const FURNITURE_COLOURS = [
  'Charcoal',
  'Graphite',
  'Oak / White',
  'Light Grey',
  'Black',
] as const;
const RACKS = [
  'DC-A / U12',
  'DC-A / U18',
  'DC-B / U04',
  'DC-B / U22',
  'Comms room / U06',
] as const;
const ROOMS = [
  'Meeting Room 1',
  'Meeting Room 2',
  'Board Room',
  'Training Room',
  'Open floor - East',
] as const;

/** RFC1918 only -- nothing here should look like a routable address. */
const mgmtIp = () => `10.20.${int(1, 8)}.${int(10, 240)}`;
const macAddr = () =>
  [
    '00',
    '1B',
    ...Array.from({ length: 4 }, () =>
      int(16, 255).toString(16).toUpperCase().padStart(2, '0')
    ),
  ].join(':');

type AssetCtx = {
  tag: string;
  serial: string | null;
  status: string;
  condition: string | null;
  location: string | null;
};

type CategoryDetail = {
  modelSpecs: Field[];
  assetTracking: Field[];
  instance: (a: AssetCtx) => Record<string, string | number | boolean>;
};

const CATEGORY_DETAIL: Record<string, CategoryDetail> = {
  // ── Hardware ──────────────────────────────────────────────────────────────
  Laptop: {
    modelSpecs: [
      t('Processor'),
      t('Memory'),
      t('Storage'),
      t('Display'),
      t('Graphics'),
      t('Ports'),
      n('Weight (kg)'),
    ],
    assetTracking: [
      dd('Colour'),
      dd('Keyboard layout'),
      b('Charger included'),
      t('Body condition'),
      d('Last inspected'),
    ],
    instance: () => ({
      Colour: pick(COLOURS),
      'Keyboard layout': pick(['UK', 'US'] as const),
      'Charger included': chance(0.92),
      'Body condition': pick(CONDITION_NOTE),
      'Last inspected': iso(daysAgo(int(10, 220))),
    }),
  },
  Desktop: {
    modelSpecs: [
      t('Processor'),
      t('Memory'),
      t('Storage'),
      t('Form factor'),
      t('Graphics'),
      t('Ports'),
    ],
    assetTracking: [
      dd('Colour'),
      t('Peripherals included'),
      b('Mounted behind monitor'),
      t('Body condition'),
      d('Last inspected'),
    ],
    instance: () => ({
      Colour: pick(['Black', 'Dark Grey'] as const),
      'Peripherals included': pick([
        'Keyboard + mouse',
        'Keyboard only',
        'Keyboard + mouse + headset',
      ] as const),
      'Mounted behind monitor': chance(0.35),
      'Body condition': pick(CONDITION_NOTE),
      'Last inspected': iso(daysAgo(int(10, 260))),
    }),
  },
  Monitor: {
    modelSpecs: [
      t('Screen size'),
      t('Resolution'),
      t('Panel type'),
      t('Refresh rate'),
      t('Ports'),
      b('Height adjustable'),
    ],
    assetTracking: [
      b('Stand included'),
      t('Cable set'),
      b('Dead pixel check passed'),
      t('Body condition'),
      d('Last inspected'),
    ],
    instance: () => ({
      'Stand included': chance(0.85),
      'Cable set': pick([
        'HDMI + power',
        'DisplayPort + power',
        'USB-C + power',
        'HDMI + DisplayPort + power',
      ] as const),
      'Dead pixel check passed': chance(0.96),
      'Body condition': pick(CONDITION_NOTE),
      'Last inspected': iso(daysAgo(int(10, 240))),
    }),
  },
  'Docking Station': {
    modelSpecs: [
      t('Host connection'),
      t('Power delivery'),
      t('Ports'),
      t('Max displays'),
      t('Network'),
    ],
    assetTracking: [
      b('Power adapter included'),
      t('Firmware version'),
      t('Paired with'),
      t('Body condition'),
    ],
    instance: () => ({
      'Power adapter included': chance(0.9),
      'Firmware version': `01.00.${int(10, 42)}`,
      'Paired with': pick([
        'Dell XPS 15',
        'ThinkPad X1 Carbon',
        'Unassigned - spare',
        'MacBook Pro 16"',
      ] as const),
      'Body condition': pick(CONDITION_NOTE),
    }),
  },
  Firewall: {
    modelSpecs: [
      t('Firewall throughput'),
      t('WAN ports'),
      t('LAN ports'),
      n('Recommended users'),
      t('VPN support'),
    ],
    assetTracking: [
      t('Firmware version'),
      t('Rack position'),
      t('Management IP'),
      d('Licence expiry'),
      t('WAN circuit'),
    ],
    instance: () => ({
      'Firmware version': `18.1${int(0, 7)}`,
      'Rack position': pick(RACKS),
      'Management IP': mgmtIp(),
      'Licence expiry': iso(new Date(Date.now() + int(60, 900) * 86_400_000)),
      'WAN circuit': pick([
        'SLT Fibre 500/500',
        'Dialog Broadband 300/150',
      ] as const),
    }),
  },
  'Network Storage': {
    modelSpecs: [
      t('Drive bays'),
      t('Maximum raw capacity'),
      t('Processor'),
      t('Memory'),
      t('Network'),
    ],
    assetTracking: [
      t('Installed capacity'),
      dd('RAID level'),
      t('Firmware version'),
      t('Rack position'),
      t('Management IP'),
    ],
    instance: () => ({
      'Installed capacity': pick([
        '5 x 8 TB',
        '5 x 12 TB',
        '4 x 16 TB',
      ] as const),
      'RAID level': pick(['SHR-2', 'RAID 6', 'RAID 10'] as const),
      'Firmware version': `DSM 7.2.1-${int(69057, 69090)}`,
      'Rack position': pick(RACKS),
      'Management IP': mgmtIp(),
    }),
  },
  'Network Switch': {
    modelSpecs: [
      t('Ports'),
      t('Port speed'),
      t('Uplinks'),
      t('PoE budget'),
      t('Switching capacity'),
      b('Stackable'),
    ],
    assetTracking: [
      t('Firmware version'),
      t('Rack position'),
      t('Management IP'),
      n('VLANs configured'),
      n('Ports in use'),
    ],
    instance: () => ({
      'Firmware version': `17.${int(9, 12)}.${int(1, 4)}`,
      'Rack position': pick(RACKS),
      'Management IP': mgmtIp(),
      'VLANs configured': int(3, 14),
      'Ports in use': int(8, 24),
    }),
  },
  'Rack server': {
    modelSpecs: [
      t('Processor'),
      t('Memory'),
      t('Storage'),
      t('Form factor'),
      t('Power supply'),
      t('Network'),
    ],
    assetTracking: [
      t('Rack position'),
      t('Management IP'),
      t('BMC firmware'),
      t('Installed capacity'),
      t('Hypervisor'),
    ],
    instance: () => ({
      'Rack position': pick(RACKS),
      'Management IP': mgmtIp(),
      'BMC firmware': `iDRAC 7.${int(0, 3)}.${int(10, 60)}`,
      'Installed capacity': pick([
        '8 x 2.4 TB SAS',
        '6 x 3.84 TB SSD',
        '4 x 1.92 TB SSD',
      ] as const),
      Hypervisor: pick([
        'VMware ESXi 8.0',
        'Proxmox VE 8',
        'Windows Server 2022 Hyper-V',
      ] as const),
    }),
  },
  Tablet: {
    modelSpecs: [
      t('Display'),
      t('Processor'),
      t('Storage'),
      t('Connectivity'),
      n('Weight (g)'),
    ],
    assetTracking: [
      dd('Colour'),
      b('Case included'),
      b('Stylus included'),
      t('Body condition'),
      d('Last inspected'),
    ],
    instance: () => ({
      Colour: pick(['Space Grey', 'Silver', 'Graphite'] as const),
      'Case included': chance(0.8),
      'Stylus included': chance(0.55),
      'Body condition': pick(CONDITION_NOTE),
      'Last inspected': iso(daysAgo(int(10, 200))),
    }),
  },

  // ── Office Electronics ────────────────────────────────────────────────────
  Printer: {
    modelSpecs: [
      t('Print technology'),
      t('Print speed'),
      t('Duplex'),
      t('Connectivity'),
      t('Monthly duty cycle'),
    ],
    assetTracking: [
      n('Page count'),
      t('Toner status'),
      t('Tray configuration'),
      d('Last serviced'),
      t('Body condition'),
    ],
    instance: () => ({
      'Page count': int(4_200, 96_000),
      'Toner status': pick([
        'Black 62%, colour 48%',
        'Black 31%, colour 74%',
        'Black 88%, colour 90%',
        'Black 12% - reorder',
      ] as const),
      'Tray configuration': pick([
        'Tray 1 A4, Tray 2 A4',
        'Tray 1 A4, Tray 2 Letter',
        'Tray 1 A4 only',
      ] as const),
      'Last serviced': iso(daysAgo(int(20, 400))),
      'Body condition': pick(CONDITION_NOTE),
    }),
  },
  Scanner: {
    modelSpecs: [
      t('Scan speed'),
      t('Optical resolution'),
      t('ADF capacity'),
      t('Connectivity'),
      b('Duplex scanning'),
    ],
    assetTracking: [
      n('Page count'),
      d('Roller last replaced'),
      t('Body condition'),
      t('Assigned desk'),
    ],
    instance: () => ({
      'Page count': int(1_800, 52_000),
      'Roller last replaced': iso(daysAgo(int(40, 500))),
      'Body condition': pick(CONDITION_NOTE),
      'Assigned desk': pick([
        'Reception',
        'Finance - desk 4',
        'HR - desk 2',
        'Records room',
      ] as const),
    }),
  },
  Projector: {
    modelSpecs: [
      t('Brightness'),
      t('Native resolution'),
      t('Contrast ratio'),
      t('Lamp life'),
      t('Inputs'),
    ],
    assetTracking: [
      n('Lamp hours'),
      dd('Mount type'),
      b('Remote included'),
      dd('Room'),
      t('Body condition'),
    ],
    instance: () => ({
      'Lamp hours': int(210, 3_400),
      'Mount type': pick(['Ceiling', 'Table top', 'Wall bracket'] as const),
      'Remote included': chance(0.85),
      Room: pick(ROOMS),
      'Body condition': pick(CONDITION_NOTE),
    }),
  },
  'Conference Camera': {
    modelSpecs: [
      t('Video resolution'),
      t('Field of view'),
      t('Zoom'),
      t('Microphone range'),
      t('Connectivity'),
    ],
    assetTracking: [
      dd('Mount type'),
      t('Firmware version'),
      b('Remote included'),
      dd('Room'),
    ],
    instance: () => ({
      'Mount type': pick([
        'Table top',
        'Wall bracket',
        'Display mount',
      ] as const),
      'Firmware version': `1.${int(2, 9)}.${int(100, 480)}`,
      'Remote included': chance(0.9),
      Room: pick(ROOMS),
    }),
  },
  Shredder: {
    modelSpecs: [
      t('Security level'),
      t('Sheet capacity'),
      t('Bin capacity'),
      t('Shred speed'),
      t('Duty cycle'),
    ],
    assetTracking: [
      d('Bin last emptied'),
      d('Last oiled'),
      t('Body condition'),
      t('Located at'),
    ],
    instance: () => ({
      'Bin last emptied': iso(daysAgo(int(1, 21))),
      'Last oiled': iso(daysAgo(int(10, 120))),
      'Body condition': pick(CONDITION_NOTE),
      'Located at': pick([
        'Finance',
        'HR',
        'Records room',
        'Reception',
      ] as const),
    }),
  },
  'TV Display': {
    modelSpecs: [
      t('Screen size'),
      t('Resolution'),
      t('Panel type'),
      t('Brightness'),
      t('Inputs'),
      t('Operating hours rating'),
    ],
    assetTracking: [
      dd('Mount type'),
      b('Remote included'),
      dd('Room'),
      t('Body condition'),
      t('Source device'),
    ],
    instance: () => ({
      'Mount type': pick(['Wall bracket', 'Floor stand', 'Trolley'] as const),
      'Remote included': chance(0.8),
      Room: pick(ROOMS),
      'Body condition': pick(CONDITION_NOTE),
      'Source device': pick([
        'Meeting room PC',
        'Chromecast',
        'Laptop via HDMI',
        'Digital signage player',
      ] as const),
    }),
  },
  UPS: {
    modelSpecs: [
      t('Capacity'),
      t('Output power'),
      t('Runtime at half load'),
      t('Outlets'),
      t('Form factor'),
    ],
    assetTracking: [
      d('Battery installed'),
      d('Battery replacement due'),
      t('Rack position'),
      n('Load percentage'),
      t('Protected equipment'),
    ],
    instance: () => {
      const installed = daysAgo(int(120, 900));
      return {
        'Battery installed': iso(installed),
        'Battery replacement due': iso(monthsAfter(installed, 36)),
        'Rack position': pick(RACKS),
        'Load percentage': int(18, 74),
        'Protected equipment': pick([
          'Rack A servers',
          'Comms room switches',
          'NAS + firewall',
        ] as const),
      };
    },
  },
  'VoIP Phone': {
    modelSpecs: [
      t('Display'),
      t('Line keys'),
      t('Power'),
      t('Codecs'),
      b('Bluetooth'),
    ],
    assetTracking: [
      t('Extension'),
      t('MAC address'),
      t('Firmware version'),
      b('Headset included'),
    ],
    instance: () => ({
      Extension: String(int(1100, 1899)),
      'MAC address': macAddr(),
      'Firmware version': `sip88xx.14-${int(1, 3)}-${int(1, 9)}`,
      'Headset included': chance(0.45),
    }),
  },

  // ── Office Furniture ──────────────────────────────────────────────────────
  Chair: {
    modelSpecs: [
      t('Frame material'),
      t('Upholstery'),
      t('Adjustments'),
      t('Weight capacity'),
      t('Warranty'),
    ],
    assetTracking: [
      dd('Colour'),
      t('Upholstery condition'),
      dd('Castor type'),
      d('Last inspected'),
      t('Assigned desk'),
    ],
    instance: () => ({
      Colour: pick(FURNITURE_COLOURS),
      'Upholstery condition': pick(SURFACE_NOTE),
      'Castor type': pick(['Carpet', 'Hard floor'] as const),
      'Last inspected': iso(daysAgo(int(20, 400))),
      'Assigned desk': `Desk ${int(1, 60)}`,
    }),
  },
  Desk: {
    modelSpecs: [
      t('Dimensions'),
      t('Height range'),
      t('Frame'),
      t('Worktop material'),
      t('Weight capacity'),
    ],
    assetTracking: [
      dd('Colour'),
      t('Surface condition'),
      b('Cable tray fitted'),
      b('Monitor arm fitted'),
      t('Assigned desk'),
    ],
    instance: () => ({
      Colour: pick(FURNITURE_COLOURS),
      'Surface condition': pick(SURFACE_NOTE),
      'Cable tray fitted': chance(0.7),
      'Monitor arm fitted': chance(0.5),
      'Assigned desk': `Desk ${int(1, 60)}`,
    }),
  },
  Bookshelf: {
    modelSpecs: [
      t('Dimensions'),
      t('Shelves'),
      t('Material'),
      t('Load per shelf'),
    ],
    assetTracking: [
      dd('Colour'),
      b('Wall anchored'),
      t('Surface condition'),
      t('Located at'),
    ],
    instance: () => ({
      Colour: pick(FURNITURE_COLOURS),
      'Wall anchored': chance(0.9),
      'Surface condition': pick(SURFACE_NOTE),
      'Located at': pick([
        'Open floor - East',
        'Records room',
        'Reception',
        'HR',
      ] as const),
    }),
  },
  'File Cabinet': {
    modelSpecs: [
      t('Drawers'),
      t('Dimensions'),
      t('Lock type'),
      t('Material'),
      b('Anti-tilt interlock'),
    ],
    assetTracking: [
      dd('Colour'),
      t('Key number'),
      b('Lock working'),
      t('Surface condition'),
      t('Located at'),
    ],
    instance: () => ({
      Colour: pick(FURNITURE_COLOURS),
      'Key number': `K-${int(1000, 9999)}`,
      'Lock working': chance(0.94),
      'Surface condition': pick(SURFACE_NOTE),
      'Located at': pick(['Finance', 'HR', 'Records room'] as const),
    }),
  },
  'Meeting Table': {
    modelSpecs: [
      t('Dimensions'),
      t('Seats'),
      t('Worktop material'),
      t('Frame'),
      b('Cable management'),
    ],
    assetTracking: [
      dd('Colour'),
      t('Surface condition'),
      b('Power module fitted'),
      dd('Room'),
    ],
    instance: () => ({
      Colour: pick(FURNITURE_COLOURS),
      'Surface condition': pick(SURFACE_NOTE),
      'Power module fitted': chance(0.75),
      Room: pick(ROOMS),
    }),
  },
  'Soundproof Pod': {
    modelSpecs: [
      t('External dimensions'),
      t('Occupancy'),
      t('Noise reduction'),
      t('Ventilation'),
      t('Power'),
    ],
    assetTracking: [
      d('Ventilation last serviced'),
      t('Glass condition'),
      b('Lighting working'),
      t('Located at'),
    ],
    instance: () => ({
      'Ventilation last serviced': iso(daysAgo(int(30, 330))),
      'Glass condition': pick(SURFACE_NOTE),
      'Lighting working': chance(0.95),
      'Located at': pick([
        'Open floor - East',
        'Open floor - West',
        'Third floor lobby',
      ] as const),
    }),
  },
  'Storage Locker': {
    modelSpecs: [
      t('Compartments'),
      t('Dimensions'),
      t('Lock type'),
      t('Material'),
    ],
    assetTracking: [
      dd('Colour'),
      t('Key number'),
      n('Compartments in use'),
      t('Surface condition'),
      t('Located at'),
    ],
    instance: () => ({
      Colour: pick(FURNITURE_COLOURS),
      'Key number': `L-${int(100, 999)}`,
      'Compartments in use': int(3, 12),
      'Surface condition': pick(SURFACE_NOTE),
      'Located at': pick([
        'Staff room',
        'Open floor - East',
        'Ground floor lobby',
      ] as const),
    }),
  },
  Whiteboard: {
    modelSpecs: [t('Dimensions'), t('Surface'), t('Mounting'), b('Magnetic')],
    assetTracking: [t('Surface condition'), b('Pen tray fitted'), dd('Room')],
    instance: () => ({
      'Surface condition': pick(SURFACE_NOTE),
      'Pen tray fitted': chance(0.85),
      Room: pick(ROOMS),
    }),
  },
};

/**
 * Every software category shares one shape -- a licence is a licence, and the
 * differences that matter live on the model row, not in the field list.
 */
const SOFTWARE_CATEGORIES = [
  'Operating System',
  'Database',
  'Design Software',
  'IDE',
  'Collaboration',
  'Security Suite',
  'Backup',
  'Password Manager',
] as const;

for (const name of SOFTWARE_CATEGORIES) {
  CATEGORY_DETAIL[name] = {
    modelSpecs: [
      t('Edition'),
      t('Platform'),
      t('Licence model'),
      t('Support channel'),
      t('Renewal term'),
    ],
    assetTracking: [
      t('Licence key reference'),
      dd('Activation type'),
      t('Deployment scope'),
      t('Renewal owner'),
      dd('Environment'),
    ],
    instance: () => ({
      'Licence key reference': `LIC-${int(10000, 99999)}-${pick([
        'A',
        'B',
        'C',
        'D',
      ] as const)}`,
      'Activation type': pick([
        'Volume',
        'Subscription',
        'Named user',
        'Device',
      ] as const),
      'Deployment scope': pick([
        'All staff',
        'IT department',
        'Design team',
        'Finance team',
        'Servers only',
      ] as const),
      'Renewal owner': pick([
        'Nuwan Perera',
        'Dilani Fernando',
        'Kasun Silva',
      ] as const),
      Environment: pick(['Production', 'Production + DR', 'Staging'] as const),
    }),
  };
}

/** Model-level specs, keyed by model name. One entry per row in `models`. */
const MODEL_SPECS: Record<string, Record<string, string | number | boolean>> = {
  'OptiPlex 7010 Micro': {
    Processor: 'Intel Core i5-13500T',
    Memory: '16 GB DDR4-3200',
    Storage: '512 GB NVMe SSD',
    'Form factor': 'Micro (1.0 L)',
    Graphics: 'Intel UHD 770',
    Ports: '4 x USB-A, 2 x USB-C, 2 x DisplayPort, RJ-45',
  },
  'Vostro 3600': {
    Processor: 'Intel Core i3-13100',
    Memory: '8 GB DDR4-3200',
    Storage: '256 GB NVMe SSD',
    'Form factor': 'Small form factor',
    Graphics: 'Intel UHD 730',
    Ports: '6 x USB-A, 1 x HDMI, 1 x VGA, RJ-45',
  },
  'WD22TB4 Thunderbolt Dock': {
    'Host connection': 'Thunderbolt 4',
    'Power delivery': '130 W to host',
    Ports: '5 x USB-A, 2 x USB-C, 2 x DisplayPort, 1 x HDMI',
    'Max displays': 'Three 4K at 60 Hz',
    Network: 'Gigabit Ethernet',
  },
  'Meraki MX68': {
    'Firewall throughput': '450 Mbps',
    'WAN ports': '2 x GbE',
    'LAN ports': '10 x GbE (2 x PoE+)',
    'Recommended users': 50,
    'VPN support': 'Auto VPN, client VPN',
  },
  'MacBook Pro 16"': {
    Processor: 'Apple M3 Pro 12-core',
    Memory: '18 GB unified',
    Storage: '512 GB SSD',
    Display: '16.2" Liquid Retina XDR, 3456 x 2234',
    Graphics: '18-core GPU',
    Ports: '3 x Thunderbolt 4, HDMI, SDXC, MagSafe 3',
    'Weight (kg)': 2.14,
  },
  'XPS 15 9520': {
    Processor: 'Intel Core i7-12700H',
    Memory: '16 GB DDR5-4800',
    Storage: '512 GB NVMe SSD',
    Display: '15.6" FHD+ 1920 x 1200',
    Graphics: 'NVIDIA RTX 3050 4 GB',
    Ports: '2 x Thunderbolt 4, 1 x USB-C 3.2, SDXC',
    'Weight (kg)': 1.86,
  },
  'ThinkPad X1 Carbon G11': {
    Processor: 'Intel Core i7-1355U',
    Memory: '16 GB LPDDR5',
    Storage: '1 TB NVMe SSD',
    Display: '14" WUXGA 1920 x 1200 IPS',
    Graphics: 'Intel Iris Xe',
    Ports: '2 x Thunderbolt 4, 2 x USB-A, HDMI 2.1',
    'Weight (kg)': 1.12,
  },
  '27UN850-W 4K': {
    'Screen size': '27 inch',
    Resolution: '3840 x 2160',
    'Panel type': 'IPS, 99% sRGB',
    'Refresh rate': '60 Hz',
    Ports: '1 x USB-C 90 W, 2 x HDMI, 1 x DisplayPort',
    'Height adjustable': true,
  },
  'ViewFinity S8 32"': {
    'Screen size': '32 inch',
    Resolution: '3840 x 2160',
    'Panel type': 'IPS, 98% DCI-P3',
    'Refresh rate': '60 Hz',
    Ports: '1 x USB-C 90 W, 1 x HDMI, 1 x DisplayPort',
    'Height adjustable': true,
  },
  'DiskStation DS1522+': {
    'Drive bays': '5 (expandable to 15)',
    'Maximum raw capacity': '90 TB',
    Processor: 'AMD Ryzen R1600 dual-core',
    Memory: '8 GB DDR4 ECC',
    Network: '4 x GbE, 10 GbE optional',
  },
  'Catalyst 9200 24-Port': {
    Ports: '24 x GbE',
    'Port speed': '1 Gbps',
    Uplinks: '4 x 1G SFP',
    'PoE budget': '370 W',
    'Switching capacity': '128 Gbps',
    Stackable: true,
  },
  'UniFi Switch Pro 24': {
    Ports: '24 x GbE',
    'Port speed': '1 Gbps',
    Uplinks: '2 x 10G SFP+',
    'PoE budget': '400 W',
    'Switching capacity': '88 Gbps',
    Stackable: false,
  },
  'PowerEdge R750': {
    Processor: '2 x Intel Xeon Silver 4314 (16-core)',
    Memory: '128 GB DDR4-3200 ECC',
    Storage: '8 x 2.5" hot-swap bays',
    'Form factor': '2U rack',
    'Power supply': 'Dual 800 W hot-plug',
    Network: '4 x GbE + 2 x 10 GbE',
  },
  'iPad Pro 13"': {
    Display: '13" Ultra Retina XDR, 2752 x 2064',
    Processor: 'Apple M4',
    Storage: '256 GB',
    Connectivity: 'Wi-Fi 6E + Bluetooth 5.3',
    'Weight (g)': 579,
  },
  'Galaxy Tab S9': {
    Display: '11" Dynamic AMOLED 2X, 2560 x 1600',
    Processor: 'Snapdragon 8 Gen 2',
    Storage: '128 GB',
    Connectivity: 'Wi-Fi 6E + Bluetooth 5.3',
    'Weight (g)': 498,
  },
  'MeetUp 4K': {
    'Video resolution': '4K UHD 30 fps',
    'Field of view': '120 degrees',
    Zoom: '5x digital',
    'Microphone range': 'Up to 4.5 m',
    Connectivity: 'USB-C, Bluetooth',
  },
  'Color LaserJet Pro M479fdw': {
    'Print technology': 'Colour laser',
    'Print speed': '28 ppm mono / 28 ppm colour',
    Duplex: 'Automatic, print and scan',
    Connectivity: 'Gigabit Ethernet, Wi-Fi, USB',
    'Monthly duty cycle': 'Up to 50,000 pages',
  },
  'Pro EX9240 1080p': {
    Brightness: '4000 lumens',
    'Native resolution': '1920 x 1080',
    'Contrast ratio': '16,000:1',
    'Lamp life': 'Up to 10,000 hours (eco)',
    Inputs: '2 x HDMI, VGA, USB-A',
  },
  'ADS-4700W': {
    'Scan speed': '40 ppm / 80 ipm',
    'Optical resolution': '600 x 600 dpi',
    'ADF capacity': '80 sheets',
    Connectivity: 'Gigabit Ethernet, Wi-Fi, USB 3.0',
    'Duplex scanning': true,
  },
  'imageFORMULA DR-C230': {
    'Scan speed': '30 ppm / 60 ipm',
    'Optical resolution': '600 x 600 dpi',
    'ADF capacity': '60 sheets',
    Connectivity: 'USB 2.0',
    'Duplex scanning': true,
  },
  'Powershred 99Ci': {
    'Security level': 'P-4 cross-cut',
    'Sheet capacity': '18 sheets',
    'Bin capacity': '34 litres',
    'Shred speed': '3.4 m/min',
    'Duty cycle': 'Continuous',
  },
  'QM55B 55" Display': {
    'Screen size': '55 inch',
    Resolution: '3840 x 2160',
    'Panel type': 'VA commercial',
    Brightness: '500 nits',
    Inputs: '3 x HDMI, DisplayPort, USB-C',
    'Operating hours rating': '16/7',
  },
  'Smart-UPS 3000VA': {
    Capacity: '3000 VA',
    'Output power': '2700 W',
    'Runtime at half load': 'About 19 minutes',
    Outlets: '8 x IEC C13, 1 x IEC C19',
    'Form factor': '2U rack mount',
  },
  'IP Phone 8845': {
    Display: '5" WVGA colour',
    'Line keys': '5 programmable',
    Power: 'PoE 802.3af',
    Codecs: 'G.711, G.722, Opus',
    Bluetooth: true,
  },
  'Billy Bookcase': {
    Dimensions: '80 x 28 x 202 cm',
    Shelves: '5 adjustable',
    Material: 'Particleboard, oak veneer',
    'Load per shelf': '30 kg',
  },
  'Alt Task Chair': {
    'Frame material': 'Reinforced nylon',
    Upholstery: 'Mesh back, fabric seat',
    Adjustments: 'Height, tilt tension, armrests',
    'Weight capacity': '120 kg',
    Warranty: '8 years',
  },
  'Gesture Office Chair': {
    'Frame material': 'Steel and nylon',
    Upholstery: '3D knit back, fabric seat',
    Adjustments: 'Height, depth, lumbar, 360-degree armrests',
    'Weight capacity': '136 kg',
    Warranty: '12 years',
  },
  'Renew Sit-to-Stand': {
    Dimensions: '160 x 80 cm',
    'Height range': '63 - 128 cm',
    Frame: 'Dual electric motor, steel',
    'Worktop material': 'Laminate',
    'Weight capacity': '90 kg',
  },
  'Bekant Desk': {
    Dimensions: '160 x 80 cm',
    'Height range': '65 - 85 cm (manual)',
    Frame: 'Powder-coated steel',
    'Worktop material': 'Melamine on particleboard',
    'Weight capacity': '70 kg',
  },
  '3-Drawer Lateral': {
    Drawers: '3 lateral',
    Dimensions: '91 x 48 x 104 cm',
    'Lock type': 'Central keyed lock',
    Material: 'Powder-coated steel',
    'Anti-tilt interlock': true,
  },
  'Bekant Conference Table': {
    Dimensions: '280 x 140 cm',
    Seats: '8 - 10',
    'Worktop material': 'Melamine on particleboard',
    Frame: 'Powder-coated steel',
    'Cable management': true,
  },
  'Framery O': {
    'External dimensions': '100 x 100 x 220 cm',
    Occupancy: '1 person',
    'Noise reduction': '30 dB',
    Ventilation: 'Motion-activated, 2 fans',
    Power: '2 x socket, 2 x USB-A',
  },
  'Kajuta Locker Unit': {
    Compartments: '12',
    Dimensions: '90 x 45 x 180 cm',
    'Lock type': 'Individual keyed locks',
    Material: 'Powder-coated steel',
  },
  'Verb Whiteboard': {
    Dimensions: '183 x 122 cm',
    Surface: 'Porcelain enamel steel',
    Mounting: 'Wall mounted',
    Magnetic: true,
  },
  'Backup Essentials': {
    Edition: 'Essentials',
    Platform: 'Windows Server / VMware',
    'Licence model': 'Per socket, annual',
    'Support channel': 'Production 24/7',
    'Renewal term': '12 months',
  },
  'Confluence Premium': {
    Edition: 'Premium (Cloud)',
    Platform: 'Cloud',
    'Licence model': 'Per user, annual',
    'Support channel': 'Premium 24/7',
    'Renewal term': '12 months',
  },
  'Workplace Business': {
    Edition: 'Business',
    Platform: 'Cloud',
    'Licence model': 'Per host, annual',
    'Support channel': 'Business support',
    'Renewal term': '12 months',
  },
  'SQL Server 2022 Standard': {
    Edition: 'Standard',
    Platform: 'Windows Server',
    'Licence model': 'Per core, 2-core pack',
    'Support channel': 'Software Assurance',
    'Renewal term': '36 months',
  },
  'Creative Cloud': {
    Edition: 'All Apps for teams',
    Platform: 'Windows / macOS',
    'Licence model': 'Named user, annual',
    'Support channel': 'Admin console',
    'Renewal term': '12 months',
  },
  'AutoCAD 2026': {
    Edition: 'Single-user',
    Platform: 'Windows / macOS',
    'Licence model': 'Named user, annual',
    'Support channel': 'Autodesk Standard',
    'Renewal term': '12 months',
  },
  'All Products Pack': {
    Edition: 'All Products Pack',
    Platform: 'Windows / macOS / Linux',
    'Licence model': 'Per seat, annual',
    'Support channel': 'Standard',
    'Renewal term': '12 months',
  },
  'Windows 11 Pro': {
    Edition: 'Pro',
    Platform: 'Windows client',
    'Licence model': 'OEM, per device',
    'Support channel': 'Microsoft standard',
    'Renewal term': 'Perpetual',
  },
  'Windows Server 2022 DataCenter': {
    Edition: 'Datacenter',
    Platform: 'Windows Server',
    'Licence model': 'Per core, 16-core base',
    'Support channel': 'Software Assurance',
    'Renewal term': '36 months',
  },
  '1Password Business': {
    Edition: 'Business',
    Platform: 'Cloud',
    'Licence model': 'Per user, annual',
    'Support channel': 'Business support',
    'Renewal term': '12 months',
  },
  'Falcon Endpoint Protection': {
    Edition: 'Falcon Enterprise',
    Platform: 'Windows / macOS / Linux',
    'Licence model': 'Per endpoint, annual',
    'Support channel': 'Standard',
    'Renewal term': '12 months',
  },
};

/**
 * Expected residual value at end of life, as a share of purchase cost.
 *
 * Every asset had this NULL, which the depreciation helper reads as zero. Two
 * things followed: the Salvage & Write-Offs chart had nothing to plot for
 * "expected" and drew a flat line against real realised figures, and every
 * asset depreciated all the way to zero, which no finance team would book.
 *
 * Rates are per asset class because residuals genuinely differ -- office
 * furniture holds value far better than a printer. Software is 0: a lapsed
 * licence has no resale value, and software is not depreciated here anyway.
 */
const SALVAGE_PCT_BY_CATEGORY: Record<string, number> = {
  // Infrastructure holds value best of the hardware.
  'Rack server': 12,
  'Network Switch': 12,
  'Network Storage': 12,
  Firewall: 12,
  // End-user hardware.
  Laptop: 10,
  Desktop: 10,
  Tablet: 10,
  Monitor: 10,
  'Docking Station': 10,
};

/** Fallback by pillar for anything not named above. */
const SALVAGE_PCT_BY_PILLAR: Record<string, number> = {
  Hardware: 10,
  'Office Electronics': 8,
  'Office Furniture': 15,
  Software: 0,
};

class DryRun extends Error {}
const summary: string[] = [];

type AssetRow = {
  id: string;
  tag: string;
  serial: string | null;
  status: string;
  condition: string | null;
  cat: string;
  loc: string | null;
  purchase: Date | null;
};

async function run() {
  try {
    await sql.begin(async (tx) => {
      // ── 1. Category custom schemas ────────────────────────────────────────
      const categories = await tx<
        { id: number; name: string; pillar: string }[]
      >`SELECT id, name, pillar FROM categories ORDER BY id`;

      let schemaWrites = 0;
      const unmapped: string[] = [];
      for (const c of categories) {
        const detail = CATEGORY_DETAIL[c.name];
        if (!detail) {
          unmapped.push(`${c.pillar}/${c.name}`);
          continue;
        }
        await tx`
          UPDATE categories
          SET custom_schema = ${tx.json({
            modelSpecs: detail.modelSpecs,
            assetTracking: detail.assetTracking,
          })}
          WHERE id = ${c.id}`;
        schemaWrites += 1;
      }
      summary.push(
        `category schemas: ${schemaWrites}/${categories.length} written` +
          (unmapped.length ? `  (no mapping: ${unmapped.join(', ')})` : '')
      );

      // ── 2. Model technical details ────────────────────────────────────────
      const models = await tx<{ id: number; name: string; cat: string }[]>`
        SELECT m.id, m.name, c.name AS cat
        FROM models m JOIN categories c ON c.id = m.category_id
        ORDER BY m.id`;

      let modelWrites = 0;
      const missingSpecs: string[] = [];
      for (const m of models) {
        const specs = MODEL_SPECS[m.name];
        if (!specs) {
          missingSpecs.push(m.name);
          continue;
        }
        await tx`
          UPDATE models SET technical_details = ${tx.json(specs)}
          WHERE id = ${m.id}`;
        modelWrites += 1;
      }
      summary.push(
        `model technical details: ${modelWrites}/${models.length} written` +
          (missingSpecs.length
            ? `  (no specs: ${missingSpecs.join(', ')})`
            : '')
      );

      // Every field the schema declares must have a value, or the panel shows
      // a labelled gap -- which is what this script exists to remove.
      const specGaps: string[] = [];
      for (const m of models) {
        const detail = CATEGORY_DETAIL[m.cat];
        const specs = MODEL_SPECS[m.name];
        if (!detail || !specs) continue;
        for (const f of detail.modelSpecs) {
          if (specs[f.fieldName] === undefined) {
            specGaps.push(`${m.name} -> ${f.fieldName}`);
          }
        }
      }
      if (specGaps.length) {
        summary.push(`  WARNING unfilled spec fields: ${specGaps.join('; ')}`);
      }

      // ── 3. Asset instance attributes ──────────────────────────────────────
      const assets = await tx<AssetRow[]>`
        SELECT a.id, a.asset_tag AS tag, a.serial_number AS serial, a.status,
               a.condition::text AS condition, c.name AS cat, l.name AS loc,
               p.purchase_date AS purchase
        FROM assets a
        JOIN models m ON m.id = a.model_id
        JOIN categories c ON c.id = m.category_id
        LEFT JOIN locations l ON l.id = a.location_id
        LEFT JOIN asset_purchases p ON p.asset_id = a.id
        ORDER BY a.asset_tag`;

      let attrWrites = 0;
      for (const a of assets) {
        const detail = CATEGORY_DETAIL[a.cat];
        if (!detail) continue;
        const attrs = detail.instance({
          tag: a.tag,
          serial: a.serial,
          status: a.status,
          condition: a.condition,
          location: a.loc,
        });
        await tx`
          UPDATE assets SET instance_attributes = ${tx.json(attrs)}
          WHERE id = ${a.id}`;
        attrWrites += 1;
      }
      summary.push(
        `asset instance attributes: ${attrWrites}/${assets.length} written`
      );

      // ── 4. Expected salvage value ─────────────────────────────────────────
      let salvageWrites = 0;
      let salvageTotal = 0;
      const salvageRows = await tx<
        {
          id: string;
          pillar: string;
          cat: string;
          cost: string | null;
          rate: string | null;
        }[]
      >`
        SELECT a.id, c.pillar, c.name AS cat,
               p.total_cost AS cost, p.exchange_rate AS rate
        FROM assets a
        JOIN models m ON m.id = a.model_id
        JOIN categories c ON c.id = m.category_id
        LEFT JOIN asset_purchases p ON p.asset_id = a.id
        ORDER BY a.asset_tag`;

      for (const row of salvageRows) {
        const basePct =
          SALVAGE_PCT_BY_CATEGORY[row.cat] ??
          SALVAGE_PCT_BY_PILLAR[row.pillar] ??
          10;

        // Jitter so the chart shows a spread rather than one flat ratio, and
        // so realised figures land both above and below the forecast.
        const pct =
          basePct === 0 ? 0 : Math.max(2, basePct + (rand() * 3 - 1.5));
        const cost = Number(row.cost ?? 0) * Number((row.rate ?? 1) || 1);
        const salvage = Math.round((cost * pct) / 100);
        salvageTotal += salvage;

        await tx`
          UPDATE assets SET salvage_value = ${salvage.toFixed(2)}
          WHERE id = ${row.id}`;
        salvageWrites += 1;
      }
      summary.push(
        `expected salvage: ${salvageWrites}/${salvageRows.length} assets written, ` +
          `LKR ${salvageTotal.toLocaleString('en-US')} total residual`
      );

      const [{ n: disposedWithExpected }] = await tx<{ n: number }[]>`
        SELECT count(*)::int AS n
        FROM asset_disposals d JOIN assets a ON a.id = d.asset_id
        WHERE a.salvage_value IS NOT NULL AND a.salvage_value::numeric > 0`;
      summary.push(
        `  disposals now carrying an expected figure: ${disposedWithExpected}`
      );

      // ── 5. Asset history ──────────────────────────────────────────────────
      // Only rows this script owns are cleared. Anything the running app
      // recorded against an asset -- a real assignment, a real repair -- is
      // left alone, so a re-run does not erase genuine activity.
      const [{ n: cleared }] = await tx<{ n: number }[]>`
        WITH removed AS (
          DELETE FROM system_audit_logs
          WHERE entity_type = 'Asset' AND ip_address = 'seed'
          RETURNING 1
        ) SELECT count(*)::int AS n FROM removed`;

      const actors = await tx<{ id: string }[]>`
        SELECT id FROM users
        WHERE role IN ('GlobalAdmin','ITOperator') AND is_active
        ORDER BY email`;
      if (actors.length === 0) {
        throw new Error('no admin or operator user to attribute history to');
      }
      const actor = () => pick(actors).id;

      const assignments = await tx<
        {
          asset_id: string;
          assigned_date: Date;
          returned_date: Date | null;
          return_condition: string | null;
          user_name: string | null;
          state: string;
        }[]
      >`
        SELECT aa.asset_id, aa.assigned_date, aa.returned_date,
               aa.return_condition::text AS return_condition,
               u.name AS user_name, aa.state::text AS state
        FROM asset_assignments aa
        LEFT JOIN users u ON u.id = aa.assigned_to_user_id
        ORDER BY aa.assigned_date`;

      const tickets = await tx<
        {
          asset_id: string;
          created_at: Date;
          actual_completion_date: Date | null;
          reported_issue: string;
          ticket_type: string;
          vendor_name: string | null;
        }[]
      >`
        SELECT asset_id, created_at, actual_completion_date, reported_issue,
               ticket_type::text AS ticket_type, vendor_name
        FROM maintenance_tickets ORDER BY created_at`;

      const groupByAsset = <T extends { asset_id: string }>(list: T[]) => {
        const m = new Map<string, T[]>();
        for (const r of list) {
          const bucket = m.get(r.asset_id) ?? [];
          bucket.push(r);
          m.set(r.asset_id, bucket);
        }
        return m;
      };
      const assignByAsset = groupByAsset(assignments);
      const ticketByAsset = groupByAsset(tickets);

      type Event = {
        at: Date;
        action: string;
        oldV: unknown;
        newV: unknown;
        by: string;
      };
      const rows: Array<Event & { assetId: string }> = [];
      let droppedFuture = 0;

      for (const a of assets) {
        const events: Event[] = [];
        const created = a.purchase ? new Date(a.purchase) : daysAgo(400);

        events.push({
          at: created,
          action: 'CREATE',
          oldV: null,
          newV: {
            assetTag: a.tag,
            serialNumber: a.serial,
            status: 'New',
            location: a.loc,
          },
          by: actor(),
        });

        // Commissioning: New -> Available, a day or two after it lands.
        //
        // Bounded by how long the asset has actually existed, so an item
        // bought this week is not commissioned next week. Clamping to exactly
        // NOW was not enough either: for an asset bought two days ago that
        // stamped the event on the second the script ran, which then surfaced
        // in recent-activity lists as though it had just happened. Taking a
        // fraction of the available window keeps it in the past instead.
        const sinceCreated = Math.max(0, NOW - created.getTime());
        const commissioned = new Date(
          created.getTime() +
            Math.min(int(1, 4) * 86_400_000, Math.floor(sinceCreated * 0.6))
        );
        events.push({
          at: commissioned,
          action: 'STATUS_CHANGE',
          oldV: { status: 'New' },
          newV: { status: 'Available', note: 'Checked in and tagged' },
          by: actor(),
        });

        for (const asg of assignByAsset.get(a.id) ?? []) {
          events.push({
            at: new Date(asg.assigned_date),
            action: 'ASSIGN',
            oldV: { status: 'Available', assignedTo: null },
            newV: {
              status: 'Assigned',
              assignedTo: asg.user_name ?? 'Unassigned',
              state: asg.state,
            },
            by: actor(),
          });
          if (asg.returned_date) {
            events.push({
              at: new Date(asg.returned_date),
              action: 'RETURN',
              oldV: {
                status: 'Assigned',
                assignedTo: asg.user_name ?? 'Unassigned',
              },
              newV: {
                status: 'Available',
                returnCondition: asg.return_condition ?? 'Good',
              },
              by: actor(),
            });
          }
        }

        for (const tk of ticketByAsset.get(a.id) ?? []) {
          events.push({
            at: new Date(tk.created_at),
            action: 'REPAIR_INITIATED',
            oldV: { status: 'Assigned' },
            newV: {
              status: 'In Repair',
              reportedIssue: tk.reported_issue,
              handledBy:
                tk.ticket_type === 'VENDOR'
                  ? (tk.vendor_name ?? 'Vendor')
                  : 'Internal IT',
            },
            by: actor(),
          });
          if (tk.actual_completion_date) {
            events.push({
              at: new Date(tk.actual_completion_date),
              action: 'REPAIR_COMPLETED',
              oldV: { status: 'In Repair' },
              newV: {
                status: 'Available',
                outcome: 'Repaired and returned to stock',
              },
              by: actor(),
            });
          }
        }

        // One inventory touch, so an asset that never moved still has a
        // plausible middle to its timeline rather than a two-line stub.
        //
        // Placed somewhere inside the window the asset has actually existed
        // for. A fixed forward offset from commissioning was what stamped 18
        // of these into 2027 and buried the genuinely recent activity.
        const livedFor = NOW - commissioned.getTime();
        if (livedFor > 30 * 86_400_000 && chance(0.55)) {
          events.push({
            at: new Date(
              commissioned.getTime() + Math.floor(rand() * livedFor)
            ),
            action: 'UPDATE',
            oldV: { condition: 'New' },
            newV: {
              condition: a.condition ?? 'Good',
              note: 'Annual inventory check',
            },
            by: actor(),
          });
        }

        // Close the timeline on whatever the asset actually is now, so the
        // last entry agrees with the status badge at the top of the panel.
        const TERMINAL = [
          'Retired',
          'Disposed',
          'Pending Disposal',
          'Lost',
          'Defective',
          'In Repair',
        ];
        if (TERMINAL.includes(a.status)) {
          events.push({
            at: daysAgo(int(3, 90)),
            action: a.status === 'Disposed' ? 'DISPOSE' : 'STATUS_CHANGE',
            oldV: { status: 'Available' },
            newV: { status: a.status },
            by: actor(),
          });
        }

        // Backstop, not decoration. Every generator above is meant to produce
        // a past timestamp; this catches the one that stops doing so after an
        // edit, instead of letting it reach the audit log where it would sit
        // at the top of every recent-activity list.
        const past = events.filter((e) => e.at.getTime() <= NOW);
        droppedFuture += events.length - past.length;

        past.sort((x, y) => x.at.getTime() - y.at.getTime());
        for (const e of past) rows.push({ ...e, assetId: a.id });
      }

      if (droppedFuture > 0) {
        summary.push(
          `  WARNING dropped ${droppedFuture} future-dated events -- a generator is producing timestamps after now`
        );
      }

      // Chunked so a single statement does not carry hundreds of tuples.
      const CHUNK = 200;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const slice = rows.slice(i, i + CHUNK).map((r) => ({
          entity_type: 'Asset',
          entity_id: r.assetId,
          action_type: r.action,
          performed_by_id: r.by,
          old_value: r.oldV === null ? null : JSON.stringify(r.oldV),
          new_value: r.newV === null ? null : JSON.stringify(r.newV),
          ip_address: 'seed',
          performed_at: r.at,
        }));
        await tx`INSERT INTO system_audit_logs ${tx(slice)}`;
      }

      const [{ n: withHistory }] = await tx<{ n: number }[]>`
        SELECT count(DISTINCT entity_id)::int AS n
        FROM system_audit_logs WHERE entity_type = 'Asset'`;
      summary.push(
        `asset history: cleared ${cleared} previously seeded rows, wrote ${rows.length}; ` +
          `${withHistory}/${assets.length} assets now have a timeline`
      );

      const [spread] = await tx<{ mn: number; mx: number; avg: number }[]>`
        SELECT min(n)::int AS mn, max(n)::int AS mx, round(avg(n))::int AS avg
        FROM (
          SELECT count(*) AS n FROM system_audit_logs
          WHERE entity_type = 'Asset' GROUP BY entity_id
        ) s`;
      summary.push(
        `  events per asset: min ${spread.mn}, avg ${spread.avg}, max ${spread.mx}`
      );

      const [{ n: future }] = await tx<{ n: number }[]>`
        SELECT count(*)::int AS n FROM system_audit_logs
        WHERE entity_type = 'Asset' AND performed_at > now()`;
      const [{ latest }] = await tx<{ latest: Date }[]>`
        SELECT max(performed_at) AS latest FROM system_audit_logs`;
      summary.push(
        `  future-dated asset events: ${future} (must be 0); newest audit row overall: ${latest?.toISOString() ?? 'none'}`
      );

      const [{ n: emptyAttrs }] = await tx<{ n: number }[]>`
        SELECT count(*)::int AS n FROM assets
        WHERE instance_attributes IS NULL
           OR instance_attributes::text IN ('null','{}')`;
      const [{ n: emptyTech }] = await tx<{ n: number }[]>`
        SELECT count(*)::int AS n FROM models
        WHERE technical_details IS NULL
           OR technical_details::text IN ('null','{}')`;
      summary.push(
        `remaining gaps: ${emptyAttrs} assets without attributes, ${emptyTech} models without specs`
      );

      if (!APPLY) throw new DryRun();
    });
  } catch (err) {
    if (!(err instanceof DryRun)) throw err;
  }

  console.log(summary.join('\n'));
  console.log(
    APPLY ? '\nApplied.' : '\nDry run — rolled back. Pass --apply to write.'
  );
}

await run();
await sql.end();
