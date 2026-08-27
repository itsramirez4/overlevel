import { Image } from 'react-native';

type LogoVariant = 'icon' | 'horizontal' | 'vertical';
type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  /** White monochrome mark, for use on non-dark or low-contrast surfaces. */
  mono?: boolean;
}

// Base height per size step; width is then derived per-variant below from
// each lockup's real aspect ratio (icon is square, horizontal/vertical are
// not) so the mark is never stretched into a box it wasn't drawn for.
const BASE_HEIGHT: Record<LogoSize, number> = {
  sm: 32,
  md: 48,
  lg: 96,
  xl: 160,
};

// From EXPORT-MANIFEST.txt: horizontal 1800x512, vertical 1040x1280.
const ASPECT_RATIO: Record<LogoVariant, number> = {
  icon: 1,
  horizontal: 1800 / 512,
  vertical: 1040 / 1280,
};

const SOURCES: Record<LogoVariant, { color: any; mono: any }> = {
  icon: {
    color: require('../../../assets/logo/png/1024x1024/logo-icon-1024x1024.png'),
    mono: require('../../../assets/logo/png/1024x1024/logo-icon-bw-1024x1024.png'),
  },
  horizontal: {
    color: require('../../../assets/logo/png/layouts/logo-horizontal.png'),
    mono: require('../../../assets/logo/png/layouts/logo-horizontal-bw.png'),
  },
  vertical: {
    color: require('../../../assets/logo/png/layouts/logo-vertical.png'),
    mono: require('../../../assets/logo/png/layouts/logo-vertical-bw.png'),
  },
};

export const Logo = ({ variant = 'icon', size = 'md', mono = false }: LogoProps) => {
  const height = BASE_HEIGHT[size];
  const width = height * ASPECT_RATIO[variant];
  const source = SOURCES[variant][mono ? 'mono' : 'color'];

  return (
    <Image
      source={source}
      style={{ width, height }}
      resizeMode="contain"
      accessible
      accessibilityRole="image"
      accessibilityLabel="Overlevel"
    />
  );
};
