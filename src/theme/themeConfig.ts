import { theme as antdTheme } from 'antd';
import type { ThemeConfig } from 'antd';
import { lightTokens } from './tokens';
import { BRAND_COLORS } from './colors';

export const shellHeaderTheme: ThemeConfig = {
  components: {
    Breadcrumb: {
      itemColor: BRAND_COLORS.slate[700],
      lastItemColor: BRAND_COLORS.slate[900],
      linkColor: BRAND_COLORS.slate[700],
      linkHoverColor: BRAND_COLORS.royalBlue.primary,
      separatorColor: BRAND_COLORS.slate[500],
      colorBgTextHover: 'rgba(37, 99, 235, 0.08)',
    },
    Button: {
      textTextColor: BRAND_COLORS.slate[900],
      textTextHoverColor: BRAND_COLORS.royalBlue.primary,
      textTextActiveColor: BRAND_COLORS.royalBlue.dark,
      textHoverBg: 'rgba(37, 99, 235, 0.08)',
      colorBgTextActive: 'rgba(37, 99, 235, 0.12)',
    },
    Spin: { colorPrimary: BRAND_COLORS.royalBlue.primary },
  },
};

export const getAntdTheme = (): ThemeConfig => {
  return {
    algorithm: antdTheme.defaultAlgorithm,
    cssVar: { prefix: 'cys' },
    token: lightTokens,
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
        colorBgContainer: '#ffffff',
        colorBorderSecondary: 'rgba(226, 232, 240, 0.8)',
      },
      Table: {
        headerBg: BRAND_COLORS.slate[50],
        headerColor: BRAND_COLORS.slate[600],
        rowHoverBg: '#eff6ff',
        colorBgContainer: '#ffffff',
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
        contentBg: '#ffffff',
        headerBg: BRAND_COLORS.slate[50],
      },
      Menu: {
        itemBg: 'transparent',
        subMenuItemBg: 'transparent',
        itemSelectedBg: '#ffffff',
        itemBorderRadius: 10,
        itemHeight: 44,
        itemMarginInline: 8,
        iconSize: 18,
        activeBarBorderWidth: 0,
        itemSelectedColor: lightTokens?.colorPrimaryText,
        subMenuItemSelectedColor: lightTokens?.colorPrimaryText,
        borderRadius: 10,
      },
      Tag: {
        borderRadiusSM: 6,
        fontSize: 12,
      },
      Segmented: {
        itemSelectedBg: '#ffffff',
        itemSelectedColor: BRAND_COLORS.royalBlue.primary,
        trackBg: BRAND_COLORS.slate[100],
        borderRadius: 10,
      },
      Checkbox: {
        borderRadiusSM: 5,
        colorPrimary: BRAND_COLORS.vibrantBlue.base,
        colorPrimaryHover: BRAND_COLORS.vibrantBlue.hover,
      },
      Tooltip: {
        colorBgSpotlight: BRAND_COLORS.slate[900],
        colorTextLightSolid: BRAND_COLORS.slate[50],
        borderRadiusSM: 8,
      },
      Dropdown: {
        colorBgElevated: '#ffffff',
        borderRadiusLG: 12,
      },
      Tabs: {
        colorPrimary: BRAND_COLORS.vibrantBlue.base,
        itemHoverColor: BRAND_COLORS.vibrantBlue.hover,
        itemActiveColor: BRAND_COLORS.vibrantBlue.active,
        cardBg: BRAND_COLORS.slate[50],
      },
    },
  };
};
