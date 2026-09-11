import { useEffect, useState } from 'react';
import { Layout, Menu, Tag, Spin, Space, Dropdown, Avatar, Breadcrumb, Button, Tooltip, Drawer, Grid } from 'antd';
import { TeamOutlined, LogoutOutlined, CalendarOutlined, SunOutlined, MoonOutlined, MenuOutlined, MenuFoldOutlined, MenuUnfoldOutlined, GlobalOutlined, ScheduleOutlined, TableOutlined, SettingOutlined, DashboardOutlined } from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../core/themeContext';
import pb from '../../core/pocketbase';
import styles from './MainLayout.module.css';

const sections = [
  { key: '/app/alumnos', label: 'Alumnos', icon: <TeamOutlined /> },
  { key: '/app/boletines', label: 'Boletines', icon: <ScheduleOutlined /> },
  { key: '/app/boletines/calificaciones', label: 'Carga de notas', icon: <TableOutlined /> },
  { key: '/app/boletines/monitoreo', label: 'Monitoreo', icon: <DashboardOutlined /> },
  { key: '/app/boletines/constructor', label: 'Constructor curricular', icon: <SettingOutlined /> },
];

export const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.lg);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuState, setMenuState] = useState({ pathname, openKeys: ['/app/boletines'] });
  const openKeys = menuState.pathname === pathname
    ? menuState.openKeys
    : pathname.startsWith('/app/boletines') ? ['/app/boletines'] : menuState.openKeys;
  const { cicloActual, isCicloLoading, fetchCicloActual, currentUser } = useAppStore();
  const { isDarkMode, toggleTheme } = useTheme();
  const userName = currentUser?.name || currentUser?.email || 'Usuario institucional';
  const currentSection = sections.find((section) => section.key === pathname);
  useEffect(() => { void fetchCicloActual(); }, [fetchCicloActual]);
  const navigation = (compact: boolean) => (
    <div className={styles.navigation}>
      <Link to="/app/alumnos" className={styles.brand} onClick={() => setMobileOpen(false)} aria-label="Crecer y Ser: inicio">
        <img src={compact ? '/isotype.png' : '/logo.png'} alt="Colegio Crecer y Ser" />
      </Link>
      {!compact && <span className={styles.navLabel}>COMUNIDAD EDUCATIVA</span>}
      <Menu
        mode="inline"
        inlineCollapsed={compact}
        openKeys={compact ? undefined : openKeys}
        onOpenChange={(keys) => setMenuState({ pathname, openKeys: keys })}
        selectedKeys={[pathname === '/app/boletines' ? 'boletines-overview' : currentSection?.key ?? '/app/alumnos']}
        items={[
          sections[0],
          {
            ...sections[1],
            children: [
              { key: 'boletines-overview', label: 'Resumen', icon: <ScheduleOutlined /> },
              ...sections.slice(2),
            ],
          },
        ]}
        onClick={({ key }) => { navigate(key === 'boletines-overview' ? '/app/boletines' : key); setMobileOpen(false); }}
      />
      <div className={styles.navFooter}>
        {!compact && <span>Crecer juntos, cada día.</span>}
        {isDesktop && <Button type="text" block icon={compact ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} aria-label={compact ? 'Expandir menú' : 'Contraer menú'}>{!compact && 'Contraer menú'}</Button>}
      </div>
    </div>
  );
  return (
    <Layout className={`app-layout ${styles.shell}`}>
      <a className={styles.skipLink} href="#main-content">Saltar al contenido</a>
      {isDesktop && <Layout.Sider className={styles.sider} theme="light" width={272} collapsedWidth={80} collapsed={collapsed}>{navigation(collapsed)}</Layout.Sider>}
      <Drawer title="Crecer y Ser" placement="left" open={!isDesktop && mobileOpen} onClose={() => setMobileOpen(false)} size={280}>{navigation(false)}</Drawer>
      <Layout className={styles.workspace}>
        <Layout.Header className={styles.header}>
          <Space>
            {!isDesktop && <Button icon={<MenuOutlined />} onClick={() => setMobileOpen(true)} aria-label="Abrir menú de navegación" />}
            <Breadcrumb className={styles.breadcrumb} items={[
              { title: <Link to="/app/alumnos">Gestión escolar</Link> },
              ...(pathname.startsWith('/app/boletines/') ? [{ title: <Link to="/app/boletines">Boletines</Link> }] : []),
              { title: currentSection?.label },
            ]} />
          </Space>
          <Space size="small" wrap className={styles.headerActions}>
            {isCicloLoading ? <Spin size="small" /> : <Tag color={cicloActual ? 'green' : 'default'} icon={<CalendarOutlined />}>{cicloActual ? `Ciclo ${cicloActual.ano}` : 'Sin ciclo activo'}</Tag>}
            <Tooltip title={isDarkMode ? 'Usar tema claro' : 'Usar tema oscuro'}>
              <Button type="text" shape="circle" icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />} onClick={toggleTheme} aria-label={isDarkMode ? 'Usar tema claro' : 'Usar tema oscuro'} />
            </Tooltip>
            <Dropdown trigger={['click']} menu={{ items: [
              { key: 'user', label: userName, disabled: true },
              { key: 'website', label: 'Ver sitio web', icon: <GlobalOutlined />, onClick: () => navigate('/') },
              { type: 'divider' },
              { key: 'logout', label: 'Cerrar sesión', icon: <LogoutOutlined />, danger: true, onClick: () => pb.authStore.clear() },
            ] }}>
              <Button type="text" className={styles.userButton} aria-label={`Abrir menú de ${userName}`}>
                <Avatar size="small" className={styles.avatar}>{userName.charAt(0).toUpperCase()}</Avatar>
                <span className={styles.userName}>{userName}</span>
              </Button>
            </Dropdown>
          </Space>
        </Layout.Header>
        <Layout.Content id="main-content" tabIndex={-1} className={styles.content}>
          <div className={styles.contentSurface}><Outlet /></div>
        </Layout.Content>
      </Layout>
    </Layout>
  );
};
