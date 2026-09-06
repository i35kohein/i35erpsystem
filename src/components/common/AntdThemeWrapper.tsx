/**
 * Ant Design theme wrapper — reads active ThemeContext and applies
 * matching antd theme tokens via ConfigProvider.
 */
import React from 'react';
import { ConfigProvider, App as AntApp } from 'antd';
import { useTheme } from '../../context/ThemeContext';
import { getAntdTheme } from '../../lib/antd-theme';

export const AntdThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const antdTheme = getAntdTheme(theme);

  return (
    <ConfigProvider theme={antdTheme}>
      <AntApp>
        {children}
      </AntApp>
    </ConfigProvider>
  );
};