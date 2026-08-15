// Ikony kreslené k Bricolage Grotesque: ploché zakončení tahů, ostré rohy
// a jeden plný prvek v každé ikoně, aby držely váhu řezu 600. Proto ne lucide —
// kulaté čepičky a rovnoměrný obrys vedle tohohle písma vypadají jako cizí sada.
//
// Mřížka 24 px, tah 2 px. Velikost se mění jen atributem size; tloušťka tahu
// zůstává, takže ikona v 16 px má stejnou váhu jako ve 44 px a nezřídne.
// Stejná sada je i v preview/index.html — když jednu upravíš, uprav obě.

function Svg({ size = 20, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter"
      aria-hidden="true">
      {children}
    </svg>
  );
}

const solid = { fill: "currentColor", stroke: "none" };

export function CalendarDays(props) {
  return (
    <Svg {...props}>
      <rect x="6.5" y="2" width="2.5" height="4" {...solid} />
      <rect x="15" y="2" width="2.5" height="4" {...solid} />
      <rect x="3" y="4" width="18" height="17" />
      <rect x="3" y="4" width="18" height="5" {...solid} />
      <rect x="6.5" y="12" width="4" height="4" {...solid} />
    </Svg>
  );
}

export function Landmark(props) {
  return (
    <Svg {...props}>
      <path d="M2.5 10 12 4l9.5 6" />
      <path d="M6 12v6M10 12v6M14 12v6M18 12v6" />
      <rect x="2.5" y="19" width="19" height="2.5" {...solid} />
    </Svg>
  );
}

export function Wallet(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="6" width="18" height="14" />
      <rect x="13.5" y="11" width="7.5" height="4.5" {...solid} />
    </Svg>
  );
}

export function Coins(props) {
  return (
    <Svg {...props}>
      <ellipse cx="12" cy="5.5" rx="8" ry="2.8" {...solid} />
      <path d="M4 5.5v13c0 1.55 3.58 2.8 8 2.8s8-1.25 8-2.8v-13" />
      <path d="M4 10c0 1.55 3.58 2.8 8 2.8s8-1.25 8-2.8" />
      <path d="M4 14.4c0 1.55 3.58 2.8 8 2.8s8-1.25 8-2.8" />
    </Svg>
  );
}

export function Banknote(props) {
  return (
    <Svg {...props}>
      <rect x="2" y="6" width="20" height="12" />
      <circle cx="12" cy="12" r="2.75" {...solid} />
      <path d="M5.5 9.5v5M18.5 9.5v5" />
    </Svg>
  );
}

export function CreditCard(props) {
  return (
    <Svg {...props}>
      <rect x="2" y="5" width="20" height="14" />
      <rect x="2" y="8" width="20" height="3.5" {...solid} />
      <path d="M5.5 15.5h4.5" />
    </Svg>
  );
}

export function TrendingUp(props) {
  return (
    <Svg {...props}>
      <path d="M3 17.5 8.5 12l3.5 3.5L20 7" />
      <path d="M14.5 7H21v6.5" />
    </Svg>
  );
}

export function Check(props) {
  return (
    <Svg {...props}>
      <path d="m4.5 12.5 5 5 10-10.5" strokeWidth="2.5" />
    </Svg>
  );
}

export function ArrowRight(props) {
  return (
    <Svg {...props}>
      <path d="M3 12h11" />
      <path d="M12.5 5.5 20.5 12l-8 6.5Z" {...solid} />
    </Svg>
  );
}

export function ChevronLeft(props) {
  return (
    <Svg {...props}>
      <path d="M15 4.5 7.5 12l7.5 7.5" />
    </Svg>
  );
}

// Postava do hlavičky otázky: hlava tahem, ramena plná. Ramena jsou lomená,
// ne oblá — sada nemá nikde měkký přechod a silueta by z ní vypadla.
export function Person(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="7.5" r="4.5" />
      <path d="M12 13.5 L19.5 20 L19.5 21.5 L4.5 21.5 L4.5 20 Z" {...solid} />
    </Svg>
  );
}

// Mars a Venus: kroužek tahem, plný je hrot šipky (Male) a příčka kříže
// (Female) — jeden plný prvek v každé ikoně jako u zbytku sady. Hrot je
// pravoúhlý trojúhelník v rohu mřížky, aby držel ostré rohy řezu.
export function Male(props) {
  return (
    <Svg {...props}>
      <circle cx="10" cy="14" r="6" />
      <path d="M14.25 9.75 17.5 6.5" />
      <path d="M13.5 2.5H21.5V10.5Z" {...solid} />
    </Svg>
  );
}

export function Female(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8.5" r="5.5" />
      <path d="M12 14v7.5" />
      <rect x="8" y="17" width="8" height="2.5" {...solid} />
    </Svg>
  );
}

export function Sparkles(props) {
  return (
    <Svg {...props}>
      <path d="M10 2 12 8.5 18.5 10.5 12 12.5 10 19 8 12.5 1.5 10.5 8 8.5Z" {...solid} />
      <path d="M18 14.5 19 18l3.5 1-3.5 1-1 3.5-1-3.5-3.5-1 3.5-1Z" {...solid} />
    </Svg>
  );
}
