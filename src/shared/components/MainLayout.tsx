import React, { useState, useEffect } from 'react';
import { Layout, Menu, theme, Tag, Spin, Space, Dropdown, Avatar } from 'antd';
import { TeamOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import pb from '../../core/pocketbase';

const { Header, Sider, Content } = Layout;

export const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const { cicloActual, isCicloLoading, fetchCicloActual, currentUser } = useAppStore();

  useEffect(() => {
    fetchCicloActual();
  }, [fetchCicloActual]);

  const handleLogout = () => {
    pb.authStore.clear(); // Esto disparará el evento y Zustand limpiará el currentUser, lo que forzará la redirección al login gracias al ProtectedRoute
  };

  const userName = currentUser?.name || currentUser?.email || 'Usuario';

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
        <Header 
          style={{ 
            padding: '0 24px', 
            background: colorBgContainer,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center'
          }}
        >
          <Space size="middle">
            {isCicloLoading ? (
              <Spin size="small" />
            ) : (
              cicloActual ? (
                <Tag color="blue" style={{ margin: 0, fontSize: '14px', padding: '4px 8px' }}>
                  Ciclo Lectivo: {cicloActual.ano}
                </Tag>
              ) : (
                <Tag color="default" style={{ margin: 0 }}>
                  Sin ciclo activo
                </Tag>
              )
            )}
            
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'logout',
                    label: 'Cerrar Sesión',
                    icon: <LogoutOutlined />,
                    onClick: handleLogout,
                    danger: true,
                  },
                ],
              }}
              trigger={['click']}
            >
              <Space style={{ cursor: 'pointer', padding: '0 8px' }}>
                <Avatar icon={<UserOutlined />} />
                <span>{userName}</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
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
