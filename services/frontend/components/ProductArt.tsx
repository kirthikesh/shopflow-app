// Hand-drawn product illustrations, so the store needs no stock photos.
// Colours come from CSS variables, so the art follows light and dark mode.

const S = { stroke: "var(--art-line)", strokeWidth: 2.5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

function Keyboard() {
  const keys = [];
  const rows = [15, 15, 14, 13];
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r]; c++) {
      const x = 38 + r * 4 + c * 11;
      keys.push(<rect key={`${r}-${c}`} x={x} y={80 + r * 12} width={8.5} height={9} rx={2} fill="var(--art-body)" />);
    }
  }
  return (
    <g>
      <rect x={28} y={70} width={184} height={64} rx={10} fill="var(--art-dark)" {...S} />
      {keys}
      <rect x={198} y={80} width={8.5} height={9} rx={2} fill="var(--accent)" />
    </g>
  );
}

function Mouse() {
  return (
    <g>
      <path d="M120 40c-26 0-40 22-40 54 0 30 16 48 40 48s40-18 40-48c0-32-14-54-40-54z" fill="var(--art-body)" {...S} />
      <path d="M120 40v42M80 86h80" {...S} fill="none" />
      <rect x={115} y={52} width={10} height={20} rx={5} fill="var(--accent)" {...S} />
    </g>
  );
}

function Monitor() {
  return (
    <g>
      <rect x={34} y={24} width={172} height={104} rx={8} fill="var(--art-dark)" {...S} />
      <rect x={42} y={32} width={156} height={88} rx={3} fill="var(--art-screen)" />
      <rect x={52} y={42} width={60} height={68} rx={3} fill="var(--art-body)" />
      <rect x={120} y={42} width={68} height={30} rx={3} fill="var(--accent)" />
      <rect x={120} y={80} width={68} height={30} rx={3} fill="var(--art-body)" />
      <path d="M112 128h16l4 22h-24z" fill="var(--art-body)" {...S} />
      <rect x={86} y={150} width={68} height={8} rx={4} fill="var(--art-body)" {...S} />
    </g>
  );
}

function Dock() {
  return (
    <g>
      <path d="M200 98c18 0 22 22 8 34" fill="none" {...S} />
      <rect x={40} y={82} width={160} height={36} rx={10} fill="var(--art-body)" {...S} />
      <rect x={54} y={94} width={14} height={8} rx={3} fill="var(--art-dark)" />
      <rect x={74} y={94} width={14} height={8} rx={3} fill="var(--art-dark)" />
      <rect x={96} y={93} width={20} height={10} rx={2} fill="var(--art-dark)" />
      <rect x={122} y={93} width={20} height={10} rx={2} fill="var(--art-dark)" />
      <circle cx={162} cy={98} r={5} fill="var(--art-dark)" />
      <circle cx={182} cy={98} r={3} fill="var(--accent)" />
    </g>
  );
}

function Headphones() {
  return (
    <g>
      <path d="M68 108V92a52 52 0 0 1 104 0v16" fill="none" {...S} strokeWidth={9} stroke="var(--art-dark)" />
      <path d="M68 108V92a52 52 0 0 1 104 0v16" fill="none" {...S} />
      <rect x={52} y={96} width={34} height={50} rx={14} fill="var(--art-body)" {...S} />
      <rect x={154} y={96} width={34} height={50} rx={14} fill="var(--art-body)" {...S} />
      <rect x={62} y={106} width={14} height={30} rx={7} fill="var(--accent)" />
      <rect x={164} y={106} width={14} height={30} rx={7} fill="var(--accent)" />
    </g>
  );
}

function LaptopStand() {
  return (
    <g>
      <path d="M58 146l40-70h4l-36 70z" fill="var(--art-body)" {...S} />
      <path d="M182 146l-40-70h-4l36 70z" fill="var(--art-body)" {...S} />
      <path d="M54 108l132-34 6 10-132 34z" fill="var(--art-dark)" {...S} />
      <path d="M66 112l118-30" stroke="var(--accent)" strokeWidth={3} strokeLinecap="round" />
    </g>
  );
}

function Webcam() {
  return (
    <g>
      <rect x={70} y={56} width={100} height={46} rx={23} fill="var(--art-body)" {...S} />
      <circle cx={120} cy={79} r={16} fill="var(--art-dark)" {...S} />
      <circle cx={120} cy={79} r={7} fill="var(--accent)" />
      <circle cx={150} cy={70} r={2.5} fill="var(--art-dark)" />
      <path d="M108 102l-6 18h36l-6-18" fill="var(--art-body)" {...S} />
      <path d="M92 120h56v10H92z" fill="var(--art-dark)" {...S} />
    </g>
  );
}

function DeskMat() {
  return (
    <g>
      <rect x={26} y={74} width={188} height={64} rx={12} fill="var(--art-dark)" {...S} />
      <rect x={34} y={82} width={172} height={48} rx={7} fill="none" stroke="var(--art-body)" strokeWidth={1.5} strokeDasharray="4 4" />
      <rect x={52} y={94} width={92} height={24} rx={5} fill="var(--art-body)" opacity={0.85} />
      <path d="M170 98c-8 0-12 6-12 13 0 6 4 9 12 9s12-3 12-9c0-7-4-13-12-13z" fill="var(--accent)" />
    </g>
  );
}

function Package() {
  return (
    <g>
      <path d="M120 40l64 28v60l-64 28-64-28V68z" fill="var(--art-body)" {...S} />
      <path d="M56 68l64 28 64-28M120 96v60" fill="none" {...S} />
      <path d="M88 54l64 28" stroke="var(--accent)" strokeWidth={6} />
    </g>
  );
}

const ART: Record<string, () => React.ReactElement> = {
  "SF-001": Keyboard,
  "SF-002": Mouse,
  "SF-003": Monitor,
  "SF-004": Dock,
  "SF-005": Headphones,
  "SF-006": LaptopStand,
  "SF-007": Webcam,
  "SF-008": DeskMat,
};

export function ProductArt({ sku, title }: { sku: string; title?: string }) {
  const Art = ART[sku] ?? Package;
  return (
    <svg viewBox="0 0 240 180" role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <Art />
    </svg>
  );
}

// A small desk scene for the home page.
export function DeskScene() {
  return (
    <svg viewBox="0 64 480 204" role="img" aria-labelledby="desk-scene-title">
      <title id="desk-scene-title">A monitor, keyboard, mouse and headphones on a desk</title>
      {/* Everything sits on the desk surface at y = 240. */}
      <rect x={20} y={240} width={440} height={12} rx={6} fill="var(--art-dark)" />
      <g transform="translate(-4 160) scale(0.55)">
        <Headphones />
      </g>
      <g transform="translate(80 66) scale(1.1)">
        <Monitor />
      </g>
      <g transform="translate(236 157) scale(0.62)">
        <Keyboard />
      </g>
      <g transform="translate(344 180) scale(0.42)">
        <Mouse />
      </g>
    </svg>
  );
}
