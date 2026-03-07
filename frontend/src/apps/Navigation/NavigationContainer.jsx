import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Button, Drawer, Layout, Menu } from 'antd';

import { useAppContext } from '@/context/appContext';
import useLanguage from '@/locale/useLanguage';
import logoIcon from '@/style/images/logo-icon.svg';
import useResponsive from '@/hooks/useResponsive';

import {
  SettingOutlined,
  CustomerServiceOutlined,
  ContainerOutlined,
  FileSyncOutlined,
  DashboardOutlined,
  CreditCardOutlined,
  MenuOutlined,
  ShopOutlined,
  WalletOutlined,
  ReconciliationOutlined,
  TeamOutlined
} from '@ant-design/icons';

const { Sider } = Layout;

export default function Navigation() {
  const { isMobile } = useResponsive();
  return isMobile ? <MobileSidebar /> : <Sidebar collapsible={false} />;
}

function Sidebar({ collapsible, isMobile = false }) {
  let location = useLocation();

  const { state: stateApp, appContextAction } = useAppContext();
  const { isNavMenuClose } = stateApp;
  const { navMenu } = appContextAction;

  const [showLogoApp, setLogoApp] = useState(isNavMenuClose);
  const [currentPath, setCurrentPath] = useState(location.pathname.slice(1));

  const { current: currentAdmin } = useSelector((state) => state.auth);

  const isStaff = currentAdmin?.role === 'staff';
  const isAdmin = currentAdmin?.role !== 'staff';

  const translate = useLanguage();
  const navigate = useNavigate();

  let items = [

    // DASHBOARD ONLY ADMIN
    ...(isAdmin
      ? [{
          key: 'dashboard',
          icon: <DashboardOutlined />,
          label: <Link to={'/'}>{translate('dashboard')}</Link>,
        }]
      : []),

    {
      key: 'customer',
      icon: <CustomerServiceOutlined />,
      label: <Link to={'/customer'}>{translate('customers')}</Link>,
    },

    {
      key: 'invoice',
      icon: <ContainerOutlined />,
      label: <Link to={'/invoice'}>{translate('invoices')}</Link>,
    },

    {
      key: 'quote',
      icon: <FileSyncOutlined />,
      label: <Link to={'/quote'}>{translate('quote')}</Link>,
    },

    {
      key: 'payment',
      icon: <CreditCardOutlined />,
      label: <Link to={'/payment'}>{translate('payments')}</Link>,
    },

    {
      key: 'repayment',
      icon: <ReconciliationOutlined />,
      label: <Link to={'/repayment'}>{translate('repayment')}</Link>,
    },

    {
      key: 'paymentMode',
      label: <Link to={'/payment/mode'}>{translate('payments_mode')}</Link>,
      icon: <WalletOutlined />,
    },

    {
      key: 'taxes',
      label: <Link to={'/taxes'}>{translate('taxes')}</Link>,
      icon: <ShopOutlined />,
    },

    // STAFF MANAGEMENT (ADMIN ONLY)
    ...(isAdmin
      ? [{
          key: 'staff',
          icon: <TeamOutlined />,
          label: <Link to={'/staff'}>{translate('staff')}</Link>,
        }]
      : []),

    {
      key: 'generalSettings',
      label: <Link to={'/settings'}>{translate('settings')}</Link>,
      icon: <SettingOutlined />,
    },

    {
      key: 'about',
      label: <Link to={'/about'}>{translate('about')}</Link>,
      icon: <ReconciliationOutlined />,
    },
  ];

  useEffect(() => {
    if (location)
      if (currentPath !== location.pathname) {
        if (location.pathname === '/') {
          setCurrentPath('dashboard');
        } else {
          setCurrentPath(location.pathname.slice(1));
        }
      }
  }, [location, currentPath]);

  useEffect(() => {
    if (isNavMenuClose) {
      setLogoApp(isNavMenuClose);
    }

    const timer = setTimeout(() => {
      if (!isNavMenuClose) {
        setLogoApp(isNavMenuClose);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [isNavMenuClose]);

  const onCollapse = () => {
    navMenu.collapse();
  };

  return (
    <Sider
      collapsible={collapsible}
      collapsed={collapsible ? isNavMenuClose : collapsible}
      onCollapse={onCollapse}
      className="navigation"
      width={256}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: isMobile ? 'absolute' : 'relative',
        bottom: '20px',
        ...(!isMobile && {
          left: '20px',
          top: '20px',
        }),
      }}
      theme={'light'}
    >
      <div
        className="logo"
        onClick={() => {
          // Navigate based on role - staff goes to /customer, others go to /
          if (currentAdmin?.role === 'staff') {
            navigate('/customer');
          } else {
            navigate('/');
          }
        }}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <img
          src={logoIcon}
          alt="Logo"
          style={{ marginLeft: '0px', height: '40px', width: '40px' }}
        />

        {!showLogoApp && (
          <div
            style={{
              marginTop: '0',
              marginLeft: '8px',
              fontSize: '13px',
              fontWeight: 700,
              lineHeight: 1.15,
              color: '#0f2d52',
              letterSpacing: '0.2px',
              maxWidth: '180px',
              whiteSpace: 'nowrap',
            }}
          >
            Webaac Solutions
            <br />
            Finance Management
          </div>
        )}
      </div>

      <Menu
        items={items}
        mode="inline"
        theme={'light'}
        selectedKeys={[currentPath]}
        style={{
          width: 256,
        }}
      />
    </Sider>
  );
}

function MobileSidebar() {
  const [visible, setVisible] = useState(false);

  const showDrawer = () => {
    setVisible(true);
  };

  const onClose = () => {
    setVisible(false);
  };

  return (
    <>
      <Button
        type="text"
        size="large"
        onClick={showDrawer}
        className="mobile-sidebar-btn"
        style={{ marginLeft: 25 }}
      >
        <MenuOutlined style={{ fontSize: 18 }} />
      </Button>

      <Drawer
        width={250}
        placement={'left'}
        closable={false}
        onClose={onClose}
        open={visible}
      >
        <Sidebar collapsible={false} isMobile={true} />
      </Drawer>
    </>
  );
}