import { useEffect, useState } from 'react';
import { Layout, Menu, Tag, Spin, Space, Dropdown, Avatar, Breadcrumb, Button, Drawer, Grid, Alert, Badge, ConfigProvider } from 'antd';
import { TeamOutlined, LogoutOutlined, CalendarOutlined, MenuOutlined, MenuFoldOutlined, MenuUnfoldOutlined, GlobalOutlined, ScheduleOutlined, SettingOutlined, CheckSquareOutlined } from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import pb from '../../core/pocketbase';
import { useServerHealth } from '../hooks/useServerHealth';
import { ConnectionDiagnosticModal } from './ConnectionDiagnosticModal';
import { shellHeaderTheme } from '../../theme/themeConfig';
import styles from './MainLayout.module.css';

const sections = [
  { key: '/app/alumnos', label: 'Alumnos', icon: <TeamOutlined /> },
  { key: '/app/boletines', label: 'Boletines', icon: <ScheduleOutlined /> },
  { key: '/app/boletines/calificaciones', label: 'Bimestres', icon: <CalendarOutlined /> },
  { key: '/app/boletines/constructor', label: 'Constructor', icon: <SettingOutlined /> },
  { key: '/app/asistencias', label: 'Asistencias', icon: <CheckSquareOutlined /> },
];

export const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.lg);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuState, setMenuState] = useState({ pathname, openKeys: pathname.startsWith('/app/boletines') ? ['/app/boletines'] : [] });
  const openKeys = menuState.pathname === pathname
    ? menuState.openKeys
    : pathname.startsWith('/app/boletines') ? ['/app/boletines'] : menuState.openKeys;
  const { cicloActual, isCicloLoading, fetchCicloActual, currentUser } = useAppStore();
  const { status: serverStatus, latencyMs, lastChecked, checkHealth } = useServerHealth();
  const userName = currentUser?.name || currentUser?.email || 'Usuario institucional';
  const currentSection = sections.find((section) => section.key === pathname);
  useEffect(() => { void fetchCicloActual(); }, [fetchCicloActual]);
  const navigation = (compact: boolean) => (
    <div className={styles.navigation}>
      <div className={styles.brandSlot}>
        <Link to="/app/alumnos" className={styles.brand} onClick={() => setMobileOpen(false)} aria-label="Crecer y Ser: inicio">
          <img src={compact ? '/isotype.png' : '/logo.png'} alt="Colegio Crecer y Ser" />
        </Link>
      </div>
      {!compact && <span className={styles.navLabel}>COMUNIDAD EDUCATIVA</span>}
      <Menu
        theme="light"
        mode="inline"
        triggerSubMenuAction="click"
        inlineIndent={0}
        inlineCollapsed={compact}
        className={compact ? undefined : styles.alignedMenu}
        openKeys={compact ? undefined : openKeys}
        onOpenChange={(keys) => setMenuState({ pathname, openKeys: keys })}
        selectedKeys={[currentSection?.key ?? '/app/alumnos']}
        items={[
          sections[0],
          {
            ...sections[1],
            className: compact ? undefined : styles.sectionGroup,
            children: sections.slice(2, 4),
          },
          sections[4],
        ]}
        onClick={({ key }) => { navigate(key); setMobileOpen(false); }}
      />
      <div className={styles.navFooter}>
        {!compact && <span className={styles.slogan}>Educamos para la vida</span>}
        {isDesktop && <Button className={styles.collapseButton} type="text" block icon={compact ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} aria-label={compact ? 'Expandir menú' : 'Contraer menú'}>{!compact && 'Contraer menú'}</Button>}
      </div>
    </div>
  );
  return (
    <Layout className={`app-layout ${styles.shell}`}>
      <a className={styles.skipLink} href="#main-content">Saltar al contenido</a>
      {isDesktop && <Layout.Sider className={styles.sider} theme="light" width={200} collapsedWidth={64} collapsed={collapsed}>{navigation(collapsed)}</Layout.Sider>}
      <Drawer title="Crecer y Ser" placement="left" open={!isDesktop && mobileOpen} onClose={() => setMobileOpen(false)} size={224}
        classNames={{ body: styles.drawerBody, header: styles.drawerHeader }}>{navigation(false)}</Drawer>
      <Layout className={styles.workspace}>
        <ConfigProvider theme={shellHeaderTheme}>
        <Layout.Header className={styles.header}>
          <Space>
            {!isDesktop && <Button type="text" icon={<MenuOutlined />} onClick={() => setMobileOpen(true)} aria-label="Abrir menú de navegación" />}
            <Breadcrumb className={styles.breadcrumb} items={[
              { title: <Link to="/app/alumnos">Gestión escolar</Link> },
              ...(pathname.startsWith('/app/boletines/') ? [{ title: 'Boletines' }] : []),
              { title: currentSection?.label },
            ]} />
          </Space>
          <Space size="small" wrap className={styles.headerActions}>
            {isCicloLoading ? <Spin size="small" /> : <Tag color={cicloActual ? 'green' : 'default'} icon={<CalendarOutlined />}>{cicloActual ? `Ciclo ${cicloActual.ano}` : 'Sin ciclo activo'}</Tag>}
            <Dropdown trigger={['click']} menu={{ items: [
              { key: 'user', label: userName, disabled: true },
              {
                key: 'server-status',
                label: serverStatus === 'online'
                  ? (latencyMs !== null ? `Servidor: Operativo (${latencyMs} ms)` : 'Servidor: Operativo')
                  : serverStatus === 'checking'
                    ? 'Servidor: Comprobando...'
                    : 'Servidor: Sin conexión',
                icon: <Badge status={serverStatus === 'online' ? 'success' : serverStatus === 'offline' ? 'error' : 'processing'} />,
                onClick: () => setIsDiagnosticOpen(true),
              },
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
        </ConfigProvider>
        <Layout.Content id="main-content" tabIndex={-1} className={styles.content}>
          {serverStatus === 'offline' && (
            <Alert
              banner
              type="warning"
              showIcon
              message="Sin conexión con el servidor escolar. Comprobando enlace..."
              action={
                <Button size="small" type="link" onClick={() => void checkHealth()}>
                  Reintentar
                </Button>
              }
            />
          )}
          <div className={styles.contentSurface}><Outlet /></div>
        </Layout.Content>
      </Layout>
      <ConnectionDiagnosticModal
        open={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
        status={serverStatus}
        latencyMs={latencyMs}
        lastChecked={lastChecked}
        onCheckAgain={checkHealth}
      />
    </Layout>
  );
};
