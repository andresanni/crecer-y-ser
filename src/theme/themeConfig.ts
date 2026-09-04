import { theme as antdTheme } from 'antd';
import type { ThemeConfig } from 'antd';
import { lightTokens, darkTokens } from './tokens';
import { BRAND_COLORS } from './colors';

/**
 * Genera la configuración de tema centralizada para Ant Design ConfigProvider
 */
export const getAntdTheme = (isDarkMode: boolean): ThemeConfig => {
  const activeTokens = isDarkMode ? darkTokens : lightTokens;

  return {
    algorithm: isDarkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    cssVar: { prefix: 'cys' },
    token: activeTokens,
    components: {
      Button: {
        controlHeightLG: 46,
        controlHeight: 38,
        fontWeight: 600,
        borderRadius: 10,
        colorPrimary: BRAND_COLORS.vibrantBlue.base,
        colorPrimaryHover: BRAND_COLORS.vibrantBlue.hover,
        colorPrimaryActive: BRAND_COLORS.vibrantBlue.active,
        primaryShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
      },
      Card: {
        borderRadiusLG: 16,
        colorBgContainer: isDarkMode ? BRAND_COLORS.slate[800] : '#ffffff',
        colorBorderSecondary: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.8)',
      },
      Table: {
        headerBg: isDarkMode ? BRAND_COLORS.slate[900] : BRAND_COLORS.slate[50],
        headerColor: isDarkMode ? BRAND_COLORS.slate[300] : BRAND_COLORS.slate[600],
        rowHoverBg: isDarkMode ? 'rgba(37, 99, 235, 0.15)' : '#eff6ff',
        colorBgContainer: isDarkMode ? BRAND_COLORS.slate[800] : '#ffffff',
        borderRadius: 12,
      },
      Input: {
        controlHeightLG: 46,
        controlHeight: 38,
        borderRadius: 10,
        activeBorderColor: BRAND_COLORS.vibrantBlue.base,
        hoverBorderColor: BRAND_COLORS.vibrantBlue.hover,
      },
      Select: {
        controlHeightLG: 46,
        controlHeight: 38,
        borderRadius: 10,
        colorPrimary: BRAND_COLORS.vibrantBlue.base,
        colorPrimaryHover: BRAND_COLORS.vibrantBlue.hover,
      },
      DatePicker: {
        controlHeightLG: 46,
        controlHeight: 38,
        borderRadius: 10,
        colorPrimary: BRAND_COLORS.vibrantBlue.base,
        colorPrimaryHover: BRAND_COLORS.vibrantBlue.hover,
      },
      InputNumber: {
        controlHeightLG: 46,
        controlHeight: 38,
        borderRadius: 10,
        colorPrimary: BRAND_COLORS.vibrantBlue.base,
        colorPrimaryHover: BRAND_COLORS.vibrantBlue.hover,
      },
      Modal: {
        borderRadiusLG: 20,
        contentBg: isDarkMode ? BRAND_COLORS.slate[800] : '#ffffff',
        headerBg: isDarkMode ? BRAND_COLORS.slate[900] : BRAND_COLORS.slate[50],
      },
      Menu: {
        darkItemBg: 'transparent',
        darkItemSelectedBg: BRAND_COLORS.vibrantBlue.base,
        darkItemColor: BRAND_COLORS.slate[300],
        darkItemSelectedColor: '#ffffff',
        darkItemHoverBg: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 10,
      },
      Tag: {
        borderRadiusSM: 6,
        fontSize: 12,
      },
      Segmented: {
        itemSelectedBg: isDarkMode ? BRAND_COLORS.vibrantBlue.base : '#ffffff',
        itemSelectedColor: isDarkMode ? '#ffffff' : BRAND_COLORS.royalBlue.primary,
        trackBg: isDarkMode ? BRAND_COLORS.slate[900] : BRAND_COLORS.slate[100],
        borderRadius: 10,
      },
      Checkbox: {
        borderRadiusSM: 5,
        colorPrimary: BRAND_COLORS.vibrantBlue.base,
        colorPrimaryHover: BRAND_COLORS.vibrantBlue.hover,
      },
      Tooltip: {
        colorBgSpotlight: isDarkMode ? BRAND_COLORS.slate[800] : BRAND_COLORS.slate[900],
        colorTextLightSolid: BRAND_COLORS.slate[50],
        borderRadiusSM: 8,
      },
      Dropdown: {
        colorBgElevated: isDarkMode ? BRAND_COLORS.slate[800] : '#ffffff',
        borderRadiusLG: 12,
      },
      Tabs: {
        colorPrimary: BRAND_COLORS.vibrantBlue.base,
        itemHoverColor: BRAND_COLORS.vibrantBlue.hover,
        itemActiveColor: BRAND_COLORS.vibrantBlue.active,
        cardBg: isDarkMode ? BRAND_COLORS.slate[900] : BRAND_COLORS.slate[50],
      },
    },
  };
};
