import React, { useState } from 'react';
import { Layout, Menu, theme } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import { Outlet, useNavigate } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

export const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div
          style={{
            height: 32,
            margin: 16,
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 6,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: collapsed ? '12px' : '16px',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s',
          }}
        >
          {collapsed ? 'CyS' : 'Crecer y Ser'}
        </div>
        <Menu
          theme="dark"
          defaultSelectedKeys={['alumnos']}
          mode="inline"
          items={[
            {
              key: 'alumnos',
              icon: <TeamOutlined />,
              label: 'Alumnos',
              onClick: () => navigate('/alumnos'),
            },
          ]}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }} />
        <Content style={{ margin: '16px' }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              height: '100%',
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};
