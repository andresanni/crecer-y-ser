import React, { useEffect, useState } from 'react';
import { Layout, Menu, Tag, Spin, Space, Dropdown, Avatar, Typography, Breadcrumb, Button, Tooltip, Badge } from 'antd';
import {
  TeamOutlined,
  LogoutOutlined,
  UserOutlined,
  DownOutlined,
  CalendarOutlined,
  SunOutlined,
  MoonOutlined,
  BellOutlined,
  BookOutlined,
  SafetyCertificateOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../App';
import pb from '../../core/pocketbase';

const { Header, Sider, Content } = Layout;

export const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { cicloActual, isCicloLoading, fetchCicloActual, currentUser } = useAppStore();
  const { isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
    fetchCicloActual();
  }, [fetchCicloActual]);

  const handleLogout = () => pb.authStore.clear();
  const userName = currentUser?.name || currentUser?.email || 'Usuario Institucional';

  // Breadcrumb items mapping
  const getBreadcrumbItems = () => {
    const items = [{ title: 'Inicio' }];
    if (location.pathname.startsWith('/alumnos')) {
      items.push({ title: 'Gestión de Alumnos' });
    }
    return items;
  };

  return (
    <Layout className={`app-layout ${isDarkMode ? 'theme-dark' : ''}`} style={{ minHeight: '100vh' }}>
      <Sider
        className="app-sider"
        width={250}
        collapsedWidth={80}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        trigger={null}
      >
        <div className="brand" aria-label="Crecer y Ser">
          <span className="brand-mark">CyS</span>
          {!collapsed && (
            <span className="brand-copy">
              <strong>Crecer y Ser</strong>
              <span>Gestión Educativa</span>
            </span>
          )}
        </div>
        <Menu
          theme="dark"
          selectedKeys={location.pathname.startsWith('/alumnos') ? ['alumnos'] : []}
          mode="inline"
          inlineCollapsed={collapsed}
          items={[
            {
              key: 'alumnos',
              icon: <TeamOutlined style={{ fontSize: 18 }} />,
              label: 'Alumnos',
              onClick: () => navigate('/alumnos'),
            },
          ]}
        />

        <div style={{ marginTop: 'auto' }}>
          {!collapsed ? (
            <div className="sider-footer">
              <Space direction="vertical" size={2} style={{ width: '100%' }}>
                <Space size={6} align="center">
                  <span className="pulse-dot" />
                  <Typography.Text style={{ color: '#f1f5f9', fontSize: 12, fontWeight: 600 }}>
                    Sistema Operativo
                  </Typography.Text>
                </Space>
                <Typography.Text type="secondary" style={{ color: '#94a3b8', fontSize: 11, paddingLeft: 14 }}>
                  PocketBase v0.27 (En vivo)
                </Typography.Text>
              </Space>
            </div>
          ) : (
            <div className="sider-footer-collapsed">
              <Tooltip title="Sistema Operativo PocketBase v0.27 (En vivo)" placement="right">
                <span className="pulse-dot" style={{ width: 8, height: 8, cursor: 'pointer' }} />
              </Tooltip>
            </div>
          )}

          <div
            className={`custom-sider-trigger ${collapsed ? 'custom-sider-trigger-collapsed' : ''}`}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <RightOutlined style={{ fontSize: 14 }} />
            ) : (
              <Space size={8} style={{ fontSize: 13, fontWeight: 500 }}>
                <LeftOutlined style={{ fontSize: 13 }} />
                <span>Colapsar menú</span>
              </Space>
            )}
          </div>
        </div>
      </Sider>

      <Layout style={{ background: 'transparent' }}>
        <Header className="app-header">
          <div className="header-left">
            <div className="header-context">
              <Breadcrumb items={getBreadcrumbItems()} className="header-breadcrumb" />
              <strong>Espacio de Trabajo</strong>
            </div>
          </div>

          <Space size="middle" align="center">
            {isCicloLoading ? (
              <Spin size="small" />
            ) : (
              <Tag
                bordered={false}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 14px',
                  margin: 0,
                  borderRadius: 20,
                  background: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
                  color: isDarkMode ? '#34d399' : '#047857',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontSize: 13,
                  fontWeight: 600,
                  lineHeight: 1.2,
                }}
              >
                <CalendarOutlined style={{ fontSize: 14 }} />
                <span>{cicloActual ? `Ciclo Lectivo ${cicloActual.ano}` : 'Sin ciclo activo'}</span>
                <Badge status="success" style={{ marginLeft: 2 }} />
              </Tag>
            )}

            <Tooltip title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
              <Button
                type="text"
                shape="circle"
                icon={isDarkMode ? <SunOutlined style={{ color: '#fbbf24', fontSize: 16 }} /> : <MoonOutlined style={{ color: '#64748b', fontSize: 16 }} />}
                onClick={toggleTheme}
                aria-label="Cambiar tema visual"
              />
            </Tooltip>

            <Tooltip title="Notificaciones del sistema">
              <Badge dot color="#0d9488" offset={[-3, 4]}>
                <Button type="text" shape="circle" icon={<BellOutlined style={{ color: '#64748b', fontSize: 16 }} />} aria-label="Notificaciones" />
              </Badge>
            </Tooltip>

            <Dropdown
              menu={{
                items: [
                  {
                    key: 'user-info',
                    label: (
                      <div style={{ padding: '4px 0' }}>
                        <Typography.Text strong style={{ display: 'block' }}>{userName}</Typography.Text>
                        <Tag color="cyan" style={{ marginTop: 4, borderRadius: 4, fontSize: 10 }}>
                          Administrador/a
                        </Tag>
                      </div>
                    ),
                    disabled: true,
                  },
                  { type: 'divider' },
                  {
                    key: 'alumnos-nav',
                    label: 'Directorio de Alumnos',
                    icon: <BookOutlined />,
                    onClick: () => navigate('/alumnos'),
                  },
                  {
                    key: 'security',
                    label: 'Seguridad y Permisos',
                    icon: <SafetyCertificateOutlined />,
                  },
                  { type: 'divider' },
                  {
                    key: 'logout',
                    label: 'Cerrar sesión',
                    icon: <LogoutOutlined />,
                    onClick: handleLogout,
                    danger: true,
                  },
                ],
              }}
              trigger={['click']}
            >
              <Space className="user-trigger" size={10}>
                <Avatar
                  style={{
                    background: 'linear-gradient(135deg, #0d9488, #10b981)',
                    color: '#ffffff',
                    fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(13, 148, 136, 0.3)',
                  }}
                  icon={<UserOutlined />}
                >
                  {userName.charAt(0).toUpperCase()}
                </Avatar>
                {!collapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.2 }}>
                    <Typography.Text strong style={{ fontSize: 13 }}>
                      {userName}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      Gestión Directiva
                    </Typography.Text>
                  </div>
                )}
                <DownOutlined style={{ color: '#94a3b8', fontSize: 10 }} />
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content className="app-content">
          <main className="content-surface">
            <Outlet />
          </main>
        </Content>
      </Layout>
    </Layout>
  );
};

