import React, { memo } from 'react';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

/**
 * Every glyph is drawn on a 24x24 canvas with a 2px stroke, round caps and
 * round joins so the whole set shares one optical weight.
 */
const PATHS = {
  home: (
    <>
      <Path d="M3.5 10.4 12 3.8l8.5 6.6V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-6h-5.6v6H5A1.5 1.5 0 0 1 3.5 19z" />
    </>
  ),
  envelope: (
    <>
      <Rect x="3.2" y="5.4" width="17.6" height="13.2" rx="2.6" />
      <Path d="M3.9 7.2 11.1 12a1.7 1.7 0 0 0 1.8 0l7.2-4.8" />
    </>
  ),
  activity: (
    <>
      <Polyline points="3 12.4 7.6 12.4 10.2 6.6 13.8 17.4 16.4 12.4 21 12.4" />
    </>
  ),
  profile: (
    <>
      <Circle cx="12" cy="8.4" r="3.9" />
      <Path d="M4.8 20.2a7.6 7.6 0 0 1 14.4 0" />
    </>
  ),
  wallet: (
    <>
      <Rect x="3.2" y="6.2" width="17.6" height="12.4" rx="2.6" />
      <Path d="M3.4 9.4h13.2" />
      <Circle cx="16.6" cy="13.6" r="1.15" />
    </>
  ),
  lock: (
    <>
      <Rect x="5.2" y="10.6" width="13.6" height="9.8" rx="2.4" />
      <Path d="M8.4 10.6V8a3.6 3.6 0 0 1 7.2 0v2.6" />
    </>
  ),
  fingerprint: (
    <>
      <Path d="M5.4 11.4a6.8 6.8 0 0 1 13.2 0c0 2-.2 4-.6 5.8" />
      <Path d="M8.6 11.4a3.4 3.4 0 0 1 6.8 0c0 3.2-.6 6.2-1.8 8.2" />
      <Path d="M11.4 11.6v2.2c0 2.8-.5 5.4-1.4 7.4" />
    </>
  ),
  bell: (
    <>
      <Path d="M6.6 10.4a5.4 5.4 0 0 1 10.8 0c0 3.4.9 5.1 1.6 6.1H5c.7-1 1.6-2.7 1.6-6.1z" />
      <Path d="M10.3 19.3a1.9 1.9 0 0 0 3.4 0" />
    </>
  ),
  eye: (
    <>
      <Path d="M2.8 12S6.2 6.4 12 6.4 21.2 12 21.2 12 17.8 17.6 12 17.6 2.8 12 2.8 12z" />
      <Circle cx="12" cy="12" r="2.7" />
    </>
  ),
  eyeOff: (
    <>
      <Path d="M9.6 6.9A8.7 8.7 0 0 1 12 6.4c5.8 0 9.2 5.6 9.2 5.6a15.6 15.6 0 0 1-2.7 3.4" />
      <Path d="M6.3 8.1A15.4 15.4 0 0 0 2.8 12S6.2 17.6 12 17.6a9.1 9.1 0 0 0 3.5-.7" />
      <Line x1="4.4" y1="4.4" x2="19.6" y2="19.6" />
    </>
  ),
  haptics: (
    <>
      <Rect x="8.4" y="5.6" width="7.2" height="12.8" rx="3.6" />
      <Path d="M4.9 9.2a.9.9 0 0 1 0 5.6" />
      <Path d="M19.1 9.2a.9.9 0 0 0 0 5.6" />
    </>
  ),
  cash: (
    <>
      <Rect x="3.2" y="6.4" width="17.6" height="11.2" rx="2.4" />
      <Circle cx="12" cy="12" r="2.6" />
      <Path d="M6.6 9.4v5.2M17.4 9.4v5.2" />
    </>
  ),
  help: (
    <>
      <Circle cx="12" cy="12" r="8.6" />
      <Path d="M9.6 9.6a2.5 2.5 0 0 1 4.8.8c0 1.7-2.4 2-2.4 3.7" />
      <Circle cx="12" cy="17" r="0.35" />
    </>
  ),
  document: (
    <>
      <Path d="M6.4 3.8h6.8l4.4 4.4v11.9H6.4z" />
      <Path d="M13.2 3.8v4.4h4.4" />
      <Path d="M9.4 12.6h5.2M9.4 15.8h3.4" />
    </>
  ),
  chevronForward: (
    <>
      <Polyline points="9.6 5.6 16 12 9.6 18.4" />
    </>
  ),
  chevronBack: (
    <>
      <Polyline points="14.4 5.6 8 12 14.4 18.4" />
    </>
  ),
  clock: (
    <>
      <Circle cx="12" cy="12" r="8.6" />
      <Polyline points="12 7.2 12 12 15.2 13.9" />
    </>
  ),
  check: (
    <>
      <Polyline points="5 12.6 9.8 17.4 19 6.8" />
    </>
  ),
  checkCircle: (
    <>
      <Circle cx="12" cy="12" r="8.6" />
      <Polyline points="8.2 12.2 11 15 15.8 9.2" />
    </>
  ),
  copy: (
    <>
      <Rect x="8.4" y="8.4" width="11.2" height="11.2" rx="2.4" />
      <Path d="M15.6 8.4V6.8a2.4 2.4 0 0 0-2.4-2.4H6.8a2.4 2.4 0 0 0-2.4 2.4v6.4a2.4 2.4 0 0 0 2.4 2.4h1.6" />
    </>
  ),
  share: (
    <>
      <Path d="M12 3.6v11.2" />
      <Polyline points="8.2 7.2 12 3.4 15.8 7.2" />
      <Path d="M5.6 12.4v6.4a1.6 1.6 0 0 0 1.6 1.6h9.6a1.6 1.6 0 0 0 1.6-1.6v-6.4" />
    </>
  ),
  alert: (
    <>
      <Circle cx="12" cy="12" r="8.6" />
      <Path d="M12 7.6v5.2" />
      <Circle cx="12" cy="16.2" r="0.35" />
    </>
  ),
  sync: (
    <>
      <Path d="M20.2 12a8.2 8.2 0 0 1-13.7 6.1L3.9 15.5" />
      <Path d="M3.8 12A8.2 8.2 0 0 1 17.5 5.9l2.6 2.6" />
      <Polyline points="17.4 3.1 20.4 5.9 17.4 8.7" />
      <Polyline points="6.6 15.3 3.6 18.1 6.6 20.9" />
    </>
  ),
  plus: (
    <>
      <Path d="M12 5.6v12.8M5.6 12h12.8" />
    </>
  ),
  close: (
    <>
      <Path d="M6.6 6.6 17.4 17.4M17.4 6.6 6.6 17.4" />
    </>
  ),
  sun: (
    <>
      <Circle cx="12" cy="12" r="4.2" />
      <Path d="M12 3.2v1.9M12 18.9v1.9M4.5 4.5l1.35 1.35M18.15 18.15l1.35 1.35M3.2 12h1.9M18.9 12h1.9M4.5 19.5l1.35-1.35M18.15 5.85l1.35-1.35" />
    </>
  ),
  moon: (
    <>
      <Path d="M20 14.2A8.4 8.4 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2z" />
    </>
  ),
  system: (
    <>
      <Rect x="3" y="4.6" width="18" height="12.4" rx="2.4" />
      <Path d="M8.6 20.4h6.8M12 17v3.4" />
    </>
  ),
  spark: (
    <>
      <Path d="M12 3.4l1.9 5.2 5.2 1.9-5.2 1.9-1.9 5.2-1.9-5.2L4.9 10.5l5.2-1.9z" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

export type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

/**
 * Single icon source for the whole app. Keeps every glyph on one grid with one
 * stroke weight so the UI does not read as a mix of icon fonts.
 */
function IconBase({ name, size = 22, color = '#FFFFFF', strokeWidth = 1.9 }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name]}
    </Svg>
  );
}

export const Icon = memo(IconBase);

export const ICON_NAMES = Object.keys(PATHS) as IconName[];