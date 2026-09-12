import type { ThemeConfig } from 'antd';
import { BRAND_COLORS } from './colors';

const sharedTokens: ThemeConfig['token'] = {
  borderRadius: 12,
  borderRadiusLG: 16,
  borderRadiusSM: 8,
  borderRadiusXS: 6,

  fontFamily: 'var(--font-body)',
  fontSize: 14,
  lineHeight: 1.5,

  controlHeight: 38,
  controlHeightLG: 46,
  controlHeightSM: 30,
};

export const lightTokens: ThemeConfig['token'] = {
  colorPrimary: BRAND_COLORS.vibrantBlue.base,
  colorPrimaryHover: BRAND_COLORS.vibrantBlue.hover,
  colorPrimaryActive: BRAND_COLORS.vibrantBlue.active,
  colorInfo: BRAND_COLORS.sky[600],
  colorSuccess: BRAND_COLORS.emerald[500],
  colorWarning: BRAND_COLORS.amber[500],
  colorError: BRAND_COLORS.danger[500],

  colorBgBase: '#ffffff',
  colorBgContainer: '#ffffff',
  colorBgElevated: '#ffffff',
  colorBgLayout: BRAND_COLORS.slate[50],

  colorText: BRAND_COLORS.slate[900],
  colorTextHeading: BRAND_COLORS.slate[900],
  colorTextSecondary: BRAND_COLORS.slate[500],
  colorTextDescription: BRAND_COLORS.slate[600],
  colorPrimaryText: BRAND_COLORS.royalBlue.primary,
  colorTextTertiary: BRAND_COLORS.slate[400],

  colorBorder: BRAND_COLORS.slate[200],
  colorBorderSecondary: BRAND_COLORS.slate[100],

  ...sharedTokens,
};

export const darkTokens: ThemeConfig['token'] = {
  colorPrimary: BRAND_COLORS.vibrantBlue.base,
  colorPrimaryHover: BRAND_COLORS.vibrantBlue.hover,
  colorPrimaryActive: BRAND_COLORS.vibrantBlue.active,
  colorInfo: BRAND_COLORS.sky[400],
  colorSuccess: BRAND_COLORS.emerald[500],
  colorWarning: BRAND_COLORS.amber[400],
  colorError: BRAND_COLORS.danger[500],

  colorBgBase: BRAND_COLORS.slate[900],
  colorBgContainer: BRAND_COLORS.slate[800],
  colorBgElevated: BRAND_COLORS.slate[800],
  colorBgLayout: BRAND_COLORS.slate[900],

  colorText: BRAND_COLORS.slate[50],
  colorTextHeading: BRAND_COLORS.slate[50],
  colorTextSecondary: BRAND_COLORS.slate[400],
  colorTextDescription: BRAND_COLORS.slate[300],
  colorPrimaryText: BRAND_COLORS.sky[300],
  colorSuccessText: BRAND_COLORS.emerald[100],
  colorTextTertiary: BRAND_COLORS.slate[500],

  colorBorder: 'rgba(255, 255, 255, 0.1)',
  colorBorderSecondary: 'rgba(255, 255, 255, 0.06)',

  ...sharedTokens,
};
