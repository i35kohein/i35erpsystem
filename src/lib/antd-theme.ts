/**
 * i35 ERP → Ant Design theme mapping.
 *
 * Maps the i35 design tokens (from index.css / ThemeContext) into antd's
 * ConfigProvider theme so antd components look like the existing UI.
 *
 * Theme presets are read from active ThemeContext; this module provides
 * the antd `theme` config object for the <ConfigProvider>.
 *
 * Tokens referenced:
 *   brand  = #0071E3  / dark #38BDF8
 *   ink    = #1D1D1F  / dark #F8FAFC
 *   muted  = #616161  / dark #CBD5E1
 *   line   = #E5E5EA  / dark #26334D
 *   cardBg = #FFFFFF  / dark #151F32 — antd componentBackground
 *   bg     = #F4F4F4  / dark #0B1120
 *   success= #34C759  / dark #34D399
 *   danger = #FF3B30  / dark #F87171
 *   warning= #FF9500  / dark #FBBF24
 */

import type { ThemeConfig } from 'antd';
import type { ThemeMode } from '../context/ThemeContext';

/** Build antd theme config from the i35 theme id. */
export function getAntdTheme(theme: ThemeMode): ThemeConfig {
  if (theme === 'dark-slate') return darkTheme;
  return lightTheme;
}

const lightTheme: ThemeConfig = {
  token: {
    colorPrimary: '#0071E3',
    colorSuccess: '#34C759',
    colorWarning: '#FF9500',
    colorError: '#FF3B30',
    colorInfo: '#0071E3',
    colorText: '#1D1D1F',
    colorTextSecondary: '#616161',
    colorTextTertiary: '#6E6E73',
    colorBgBase: '#FFFFFF',
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#FFFFFF',
    colorBgLayout: '#F4F4F4',
    colorBorder: '#E5E5EA',
    colorBorderSecondary: '#D2D2D7',
    borderRadius: 12,
    borderRadiusLG: 16,
    borderRadiusSM: 8,
    borderRadiusXS: 6,
    fontFamily: "'IBM Plex Sans', -apple-system, 'Segoe UI', sans-serif",
    fontFamilyCode: "'IBM Plex Mono', 'SF Mono', monospace",
    fontSize: 14,
    fontSizeSM: 12,
    fontSizeLG: 16,
    controlHeight: 40,
    controlHeightSM: 32,
    controlHeightLG: 44,
    controlOutline: 'rgba(0, 113, 227, 0.12)',
    controlItemBgActive: '#F0F6FF',
    controlItemBgActiveHover: '#E0EEFF',
    colorPrimaryBg: '#F0F6FF',
    colorPrimaryBgHover: '#E0EEFF',
    colorPrimaryBorder: '#B3D4FF',
    colorPrimaryBorderHover: '#66A8FF',
    colorPrimaryHover: '#0051B3',
    colorPrimaryActive: '#003D8B',
    colorSuccessBg: '#F0FFF4',
    colorSuccessBorder: '#B7EBC8',
    colorErrorBg: '#FFF0F0',
    colorErrorBorder: '#FFB3B0',
    colorWarningBg: '#FFF8F0',
    colorWarningBorder: '#FFE0B3',
    colorLink: '#0071E3',
    colorLinkHover: '#0051B3',
    colorFill: '#F5F5F7',
    colorFillSecondary: '#F0F0F2',
    colorFillTertiary: '#E8E8EC',
    colorFillQuaternary: '#F5F5F7',
    colorBgSpotlight: '#1D1D1F',
    colorBgMask: 'rgba(0, 0, 0, 0.45)',
  },
  components: {
    Button: {
      borderRadius: 12,
      borderRadiusLG: 12,
      borderRadiusSM: 12,
      fontWeight: 700,
      paddingInline: 16,
      paddingInlineLG: 24,
      paddingInlineSM: 12,
    },
    Menu: {
      itemHeight: 44,
      itemBorderRadius: 10,
      collapsedWidth: 60,
      iconSize: 20,
      collapsedIconSize: 22,
      itemMarginInline: 6,
      itemPaddingInline: 14,
      itemBg: 'transparent',
      popupBg: '#FFFFFF',
      itemColor: '#616161',
      itemHoverColor: '#1D1D1F',
      itemHoverBg: '#F0F6FF',
      itemSelectedColor: '#0071E3',
      itemSelectedBg: '#F0F6FF',
    },
    Table: {
      headerBg: '#F5F5F7',
      headerColor: '#616161',
      headerSortActiveBg: '#E8E8EC',
      headerSortHoverBg: '#F0F0F2',
      headerBorderRadius: 8,
      rowHoverBg: '#F0F6FF',
      borderColor: '#E5E5EA',
      cellPaddingBlock: 10,
      cellPaddingInline: 12,
      stickyScrollBarBg: '#D2D2D7',
    },
    Card: {
      borderRadiusLG: 16,
      paddingLG: 20,
    },
    Modal: {
      borderRadiusLG: 16,
      paddingContentHorizontalLG: 24,
      paddingContentVerticalLG: 20,
      headerBg: '#FFFFFF',
      contentBg: '#FFFFFF',
      footerBg: '#FFFFFF',
    },
    Form: {
      itemMarginBottom: 16,
      verticalLabelMargin: 6,
      labelFontSize: 12,
      labelColor: '#616161',
      labelHeight: 28,
    },
    Input: {
      controlHeight: 40,
      controlHeightSM: 32,
      controlHeightLG: 44,
      borderRadius: 8,
      borderRadiusLG: 10,
      borderRadiusSM: 6,
      paddingBlock: 8,
      paddingInline: 12,
    },
    Select: {
      controlHeight: 40,
      controlHeightSM: 32,
      controlHeightLG: 44,
      borderRadius: 8,
      borderRadiusLG: 10,
      borderRadiusSM: 6,
    },
    DatePicker: {
      controlHeight: 40,
      controlHeightSM: 32,
      borderRadius: 8,
      borderRadiusLG: 10,
      borderRadiusSM: 6,
    },
    Tabs: {
      cardGutter: 6,
      inkBarColor: '#0071E3',
      itemColor: '#616161',
      itemHoverColor: '#1D1D1F',
      itemSelectedColor: '#0071E3',
    },
    Tag: {
      borderRadius: 6,
    },
    Badge: {
      textFontWeight: 700,
    },
    Dropdown: {
      borderRadius: 10,
      paddingBlock: 4,
      controlItemBgActive: '#F0F6FF',
    },
    Switch: {
      trackHeight: 26,
      trackMinWidth: 44,
      handleSize: 22,
    },
    Drawer: {
      paddingLG: 24,
    },
    Progress: {
      borderRadius: 4,
    },
    Tooltip: {
      borderRadius: 8,
    },
    Popover: {
      borderRadius: 10,
      paddingSM: 12,
    },
    Collapse: {
      borderRadiusLG: 12,
    },
    Statistic: {
      contentFontSize: 28,
      titleFontSize: 12,
    },
    Timeline: {
      dotBorderWidth: 2,
    },
  },
};

const darkTheme: ThemeConfig = {
  token: {
    colorPrimary: '#38BDF8',
    colorSuccess: '#4ADE80',
    colorWarning: '#FBBF24',
    colorError: '#F87171',
    colorInfo: '#38BDF8',
    colorText: '#F8FAFC',
    colorTextSecondary: '#CBD5E1',
    colorTextTertiary: '#94A3B8',
    colorBgBase: '#131B2E',
    colorBgContainer: '#131B2E',
    colorBgElevated: '#192238',
    colorBgLayout: '#090D16',
    colorBorder: '#26334D',
    colorBorderSecondary: '#33415E',
    borderRadius: 12,
    borderRadiusLG: 16,
    borderRadiusSM: 8,
    borderRadiusXS: 6,
    fontFamily: "'IBM Plex Sans', -apple-system, 'Segoe UI', sans-serif",
    fontFamilyCode: "'IBM Plex Mono', 'SF Mono', monospace",
    fontSize: 14,
    fontSizeSM: 12,
    fontSizeLG: 16,
    controlHeight: 40,
    controlHeightSM: 32,
    controlHeightLG: 44,
    controlOutline: 'rgba(56, 189, 248, 0.18)',
    controlItemBgActive: '#1E293B',
    controlItemBgActiveHover: '#26334D',
    colorPrimaryBg: '#1E293B',
    colorPrimaryBgHover: '#26334D',
    colorPrimaryBorder: '#33415E',
    colorPrimaryBorderHover: '#4A5A7A',
    colorPrimaryHover: '#0284C7',
    colorPrimaryActive: '#0369A1',
    colorSuccessBg: '#0D2E1A',
    colorSuccessBorder: '#1E4A2A',
    colorErrorBg: '#2E1010',
    colorErrorBorder: '#4A1E1E',
    colorWarningBg: '#2E2010',
    colorWarningBorder: '#4A3A1E',
    colorLink: '#6EA8FE',
    colorLinkHover: '#93C5FD',
    colorFill: '#192238',
    colorFillSecondary: '#1E293B',
    colorFillTertiary: '#26334D',
    colorFillQuaternary: '#131B2E',
    colorBgSpotlight: '#F8FAFC',
    colorBgMask: 'rgba(0, 0, 0, 0.65)',
  },
  components: {
    Button: {
      borderRadius: 12,
      borderRadiusLG: 12,
      borderRadiusSM: 12,
      fontWeight: 700,
      paddingInline: 16,
      paddingInlineLG: 24,
      paddingInlineSM: 12,
      primaryColor: '#090D16',
      primaryShadow: 'none',
    },
    Menu: {
      itemHeight: 44,
      itemBorderRadius: 10,
      collapsedWidth: 60,
      iconSize: 20,
      collapsedIconSize: 22,
      itemMarginInline: 6,
      itemPaddingInline: 14,
      itemBg: 'transparent',
      popupBg: '#192238',
      itemColor: '#CBD5E1',
      itemHoverColor: '#F8FAFC',
      itemHoverBg: '#1E293B',
      itemSelectedColor: '#38BDF8',
      itemSelectedBg: '#1E293B',
    },
    Table: {
      headerBg: '#192238',
      headerColor: '#CBD5E1',
      headerSortActiveBg: '#26334D',
      headerSortHoverBg: '#1E293B',
      headerBorderRadius: 8,
      rowHoverBg: '#1E293B',
      borderColor: '#26334D',
      cellPaddingBlock: 10,
      cellPaddingInline: 12,
      stickyScrollBarBg: '#33415E',
    },
    Card: {
      borderRadiusLG: 16,
      paddingLG: 20,
    },
    Modal: {
      borderRadiusLG: 16,
      paddingContentHorizontalLG: 24,
      paddingContentVerticalLG: 20,
      headerBg: '#131B2E',
      contentBg: '#131B2E',
      footerBg: '#131B2E',
    },
    Form: {
      itemMarginBottom: 16,
      verticalLabelMargin: 6,
      labelFontSize: 12,
      labelColor: '#CBD5E1',
      labelHeight: 28,
    },
    Input: {
      controlHeight: 40,
      controlHeightSM: 32,
      controlHeightLG: 44,
      borderRadius: 8,
      borderRadiusLG: 10,
      borderRadiusSM: 6,
      paddingBlock: 8,
      paddingInline: 12,
    },
    Select: {
      controlHeight: 40,
      controlHeightSM: 32,
      controlHeightLG: 44,
      borderRadius: 8,
      borderRadiusLG: 10,
      borderRadiusSM: 6,
    },
    DatePicker: {
      controlHeight: 40,
      controlHeightSM: 32,
      borderRadius: 8,
      borderRadiusLG: 10,
      borderRadiusSM: 6,
    },
    Tabs: {
      cardGutter: 6,
      inkBarColor: '#38BDF8',
      itemColor: '#CBD5E1',
      itemHoverColor: '#F8FAFC',
      itemSelectedColor: '#38BDF8',
    },
    Tag: {
      borderRadius: 6,
    },
    Badge: {
      textFontWeight: 700,
    },
    Dropdown: {
      borderRadius: 10,
      paddingBlock: 4,
      controlItemBgActive: '#1E293B',
    },
    Switch: {
      trackHeight: 26,
      trackMinWidth: 44,
      handleSize: 22,
    },
    Drawer: {
      paddingLG: 24,
    },
    Progress: {
      borderRadius: 4,
    },
    Tooltip: {
      borderRadius: 8,
    },
    Popover: {
      borderRadius: 10,
      paddingSM: 12,
    },
    Collapse: {
      borderRadiusLG: 12,
    },
    Statistic: {
      contentFontSize: 28,
      titleFontSize: 12,
    },
    Timeline: {
      dotBorderWidth: 2,
    },
  },
};