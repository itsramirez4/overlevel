import Svg, { Circle, Ellipse, Path, Rect, Line, G } from 'react-native-svg';
import { CharacterType } from '../../types';

interface CharacterAvatarProps {
  type: CharacterType;
  size?: number;
}

const BG: Record<CharacterType, string> = {
  powerlifter: '#e5342b',
  bodybuilder: '#d98c3f',
  crossfitter: '#3fa758',
  calisthenics: '#4f6ef7',
  fracasado: '#6b7280',
};

const SKIN = '#e0a868';

/** Flat "portrait badge" caricatures — one exaggerated gym stereotype per
 * class, built from primitive shapes so each reads instantly at badge size
 * without needing generated artwork. */
export const CharacterAvatar = ({ type, size = 64 }: CharacterAvatarProps) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Circle cx="50" cy="50" r="50" fill={BG[type]} />
    {type === 'powerlifter' && <PowerlifterFace />}
    {type === 'bodybuilder' && <BodybuilderFace />}
    {type === 'crossfitter' && <CrossfitterFace />}
    {type === 'calisthenics' && <CalisthenicsFace />}
    {type === 'fracasado' && <FracasadoFace />}
  </Svg>
);

/** El Reventado — cara morada de aguantar la respiración, venas del cuello a punto de explotar. */
const PowerlifterFace = () => (
  <G>
    <Path d="M20 92 Q50 68 80 92 Z" fill="#111" />
    <Line x1="38" y1="70" x2="34" y2="90" stroke="#a52a20" strokeWidth="3" />
    <Line x1="62" y1="70" x2="66" y2="90" stroke="#a52a20" strokeWidth="3" />
    <Circle cx="50" cy="52" r="26" fill="#c9564a" />
    <Path d="M30 44 Q38 38 46 44" stroke="#5a1f18" strokeWidth="3" fill="none" strokeLinecap="round" />
    <Path d="M54 44 Q62 38 70 44" stroke="#5a1f18" strokeWidth="3" fill="none" strokeLinecap="round" />
    <Circle cx="38" cy="50" r="3.5" fill="#111" />
    <Circle cx="62" cy="50" r="3.5" fill="#111" />
    <Path d="M42 66 Q50 62 58 66" stroke="#5a1f18" strokeWidth="3" fill="none" strokeLinecap="round" />
    <Circle cx="22" cy="80" r="2.5" fill="#fff" opacity="0.85" />
    <Circle cx="78" cy="82" r="2" fill="#fff" opacity="0.85" />
    <Circle cx="16" cy="72" r="1.8" fill="#fff" opacity="0.7" />
  </G>
);

/** El Bronceado — piel naranja de rayos UVA, gafas de sol en el gimnasio, tirantes imposibles. */
const BodybuilderFace = () => (
  <G>
    <Path d="M18 94 Q50 66 82 94 Z" fill="#f2f2f2" />
    <Path d="M40 94 L40 74 M60 94 L60 74" stroke="#d98c3f" strokeWidth="6" />
    <Circle cx="50" cy="50" r="26" fill="#dd9a54" />
    <Path d="M22 44 Q26 30 50 30 Q74 30 78 44 L78 32 Q50 18 22 32 Z" fill="#2b1a10" />
    <Rect x="30" y="44" width="40" height="10" rx="5" fill="#161618" />
    <Path d="M44 68 Q50 71 56 68" stroke="#5a3418" strokeWidth="3" fill="none" strokeLinecap="round" />
  </G>
);

/** El Gritón — gorra del revés, grito de WOD, tirita de nariz, tiza por todas partes. */
const CrossfitterFace = () => (
  <G>
    <Path d="M18 94 Q50 70 82 94 Z" fill="#161618" />
    <Circle cx="50" cy="52" r="26" fill={SKIN} />
    <Path d="M24 40 Q50 20 76 40 L76 34 Q50 30 24 34 Z" fill="#2e7d46" />
    <Rect x="20" y="30" width="10" height="8" rx="2" fill="#2e7d46" />
    <Path d="M32 44 Q38 40 44 44" stroke="#6b3f22" strokeWidth="3" fill="none" strokeLinecap="round" />
    <Path d="M56 44 Q62 40 68 44" stroke="#6b3f22" strokeWidth="3" fill="none" strokeLinecap="round" />
    <Circle cx="38" cy="49" r="3.2" fill="#111" />
    <Circle cx="62" cy="49" r="3.2" fill="#111" />
    <Ellipse cx="50" cy="66" rx="9" ry="7" fill="#7a2a20" />
    <Circle cx="15" cy="60" r="3" fill="#fff" opacity="0.9" />
    <Circle cx="84" cy="55" r="2.5" fill="#fff" opacity="0.9" />
    <Circle cx="12" cy="75" r="2" fill="#fff" opacity="0.7" />
    <Circle cx="88" cy="70" r="2.2" fill="#fff" opacity="0.7" />
  </G>
);

/** El Influencer — gorra del revés, sonrisa de sobrado, móvil siempre grabando. */
const CalisthenicsFace = () => (
  <G>
    <Path d="M18 94 Q50 70 82 94 Z" fill="#1f2937" />
    <Circle cx="50" cy="52" r="25" fill={SKIN} />
    <Path d="M23 40 Q50 18 77 40 L77 32 Q50 26 23 32 Z" fill="#1d3a8f" />
    <Rect x="18" y="28" width="11" height="9" rx="2" fill="#1d3a8f" />
    <Path d="M33 45 L45 43" stroke="#6b3f22" strokeWidth="3" strokeLinecap="round" />
    <Path d="M55 43 L67 45" stroke="#6b3f22" strokeWidth="3" strokeLinecap="round" />
    <Circle cx="39" cy="49" r="3" fill="#111" />
    <Circle cx="61" cy="49" r="3" fill="#111" />
    <Path d="M42 65 Q50 70 60 63" stroke="#6b3f22" strokeWidth="3" fill="none" strokeLinecap="round" />
    <Rect x="74" y="66" width="14" height="22" rx="3" fill="#111" stroke="#333" strokeWidth="1.5" />
    <Circle cx="81" cy="83" r="1.5" fill="#555" />
  </G>
);

/** El Fracasado — la broma: pese al nombre, está fortísimo, ganando y feliz de verdad. */
const FracasadoFace = () => (
  <G>
    {/* cuello y trapecios enormes, como el powerlifter pero sin sufrir */}
    <Path d="M14 96 Q50 62 86 96 Z" fill="#111" />
    <Path d="M30 78 Q50 88 70 78" stroke="#3f3f46" strokeWidth="4" fill="none" strokeLinecap="round" />
    <Circle cx="50" cy="51" r="27" fill={SKIN} />
    {/* cejas levantadas, ojos bien abiertos y felices */}
    <Path d="M30 40 Q38 34 46 39" stroke="#5a3418" strokeWidth="3" fill="none" strokeLinecap="round" />
    <Path d="M54 39 Q62 34 70 40" stroke="#5a3418" strokeWidth="3" fill="none" strokeLinecap="round" />
    <Circle cx="38" cy="47" r="4" fill="#111" />
    <Circle cx="62" cy="47" r="4" fill="#111" />
    <Circle cx="39.5" cy="45.5" r="1.2" fill="#fff" />
    <Circle cx="63.5" cy="45.5" r="1.2" fill="#fff" />
    {/* sonrisa enorme y genuina, con dientes */}
    <Path d="M34 60 Q50 76 66 60 Q50 68 34 60 Z" fill="#fff" />
    <Path d="M34 60 Q50 76 66 60" stroke="#7a2a20" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    {/* mofletes de felicidad */}
    <Circle cx="27" cy="56" r="4" fill="#d97a4a" opacity="0.5" />
    <Circle cx="73" cy="56" r="4" fill="#d97a4a" opacity="0.5" />
    {/* medalla de oro en vez de mancuerna */}
    <Line x1="18" y1="72" x2="24" y2="86" stroke="#e5342b" strokeWidth="4" />
    <Line x1="30" y1="72" x2="24" y2="86" stroke="#3f3f46" strokeWidth="4" />
    <Circle cx="24" cy="90" r="8" fill="#f2c14e" stroke="#c99a2e" strokeWidth="1.5" />
    <Path d="M20 88 L23 92 L29 86" stroke="#8a6a1e" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    {/* brillos de triunfo */}
    <Path d="M80 30 L82 36 L88 38 L82 40 L80 46 L78 40 L72 38 L78 36 Z" fill="#f2c14e" />
    <Circle cx="14" cy="34" r="2.5" fill="#f2c14e" />
  </G>
);
