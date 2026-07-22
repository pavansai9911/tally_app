import React from 'react';
import Svg, { Circle, Path, Rect, G, Ellipse } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Tally Assistant avatar — a flat-illustration female support executive with a headset.
 *
 * Drawn as vector rather than shipped as a bitmap: it stays crisp at every density, adapts
 * to the app's accent colour, adds no binary asset to the APK, and carries no image
 * licensing risk.
 */
export function AssistantAvatar({ size = 40 }: { size?: number }) {
  const { colors } = useTheme();

  const accent = colors.accent500;
  const accentDark = colors.accent600;
  const skin = '#F2C9A8';
  const skinShade = '#E0B190';
  const hair = '#2E2A38';
  const headset = '#20242C';
  const shirt = accent;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* Background disc */}
      <Circle cx="50" cy="50" r="50" fill={colors.accentTint} />

      {/* Shoulders / torso */}
      <Path d="M18 100c0-17.5 14.3-29 32-29s32 11.5 32 29H18z" fill={shirt} />
      {/* Collar */}
      <Path d="M40 73l10 11 10-11-10-5-10 5z" fill={colors.neutral0} opacity={0.9} />
      {/* Lanyard hint */}
      <Rect x="47.5" y="80" width="5" height="12" rx="2" fill={accentDark} opacity={0.55} />

      {/* Neck */}
      <Path d="M43 60h14v13c0 3-3.1 5-7 5s-7-2-7-5V60z" fill={skinShade} />

      {/* Hair back */}
      <Path d="M27 46c0-14 10.3-25 23-25s23 11 23 25v11c0 4-2.4 7-5 7V44H32v20c-2.8 0-5-3-5-7V46z" fill={hair} />

      {/* Face */}
      <Path d="M32 38h36v20c0 10-8.1 18-18 18s-18-8-18-18V38z" fill={skin} />

      {/* Fringe */}
      <Path d="M31 42c1-11 9-19 19-19s18 8 19 19c-5-6-11-8-19-8s-14 2-19 8z" fill={hair} />

      {/* Eyes */}
      <Ellipse cx="42" cy="52" rx="2.4" ry="3" fill={headset} />
      <Ellipse cx="58" cy="52" rx="2.4" ry="3" fill={headset} />
      {/* Brows */}
      <Path d="M38.5 46.5c1.6-1.4 4.4-1.4 6 0" stroke={hair} strokeWidth={1.6} strokeLinecap="round" fill="none" />
      <Path d="M55.5 46.5c1.6-1.4 4.4-1.4 6 0" stroke={hair} strokeWidth={1.6} strokeLinecap="round" fill="none" />
      {/* Smile */}
      <Path d="M45 62c1.6 2 3.2 3 5 3s3.4-1 5-3" stroke={headset} strokeWidth={1.8} strokeLinecap="round" fill="none" />
      {/* Blush */}
      <Ellipse cx="37.5" cy="58" rx="3" ry="1.8" fill="#E8917F" opacity={0.35} />
      <Ellipse cx="62.5" cy="58" rx="3" ry="1.8" fill="#E8917F" opacity={0.35} />

      {/* Headset band + earcups */}
      <G>
        <Path d="M28 50v-4c0-12.2 9.8-22 22-22s22 9.8 22 22v4" stroke={headset} strokeWidth={4.5} strokeLinecap="round" fill="none" />
        <Rect x="23" y="46" width="9" height="15" rx="4.5" fill={headset} />
        <Rect x="68" y="46" width="9" height="15" rx="4.5" fill={headset} />
        {/* Mic boom */}
        <Path d="M72 61c0 8-6 13-12 14" stroke={headset} strokeWidth={3} strokeLinecap="round" fill="none" />
        <Circle cx="59" cy="75.5" r="3" fill={accentDark} />
      </G>
    </Svg>
  );
}

/** Small avatar with an online dot, used in the chat header. */
export function AssistantAvatarWithStatus({ size = 40 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <>
      <AssistantAvatar size={size} />
      <Svg
        width={size * 0.32}
        height={size * 0.32}
        viewBox="0 0 10 10"
        style={{ position: 'absolute', right: -1, bottom: -1 }}
      >
        <Circle cx="5" cy="5" r="5" fill={colors.surfaceCard} />
        <Circle cx="5" cy="5" r="3.2" fill={colors.income} />
      </Svg>
    </>
  );
}
