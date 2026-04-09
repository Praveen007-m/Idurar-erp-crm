import React, { useState, useEffect } from 'react';
import Dashboard from '@/pages/Dashboard';
import PinLock from '@/components/PinLock';

const DashboardProtected = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    const unlocked = sessionStorage.getItem('dashboard_unlocked') === 'true';
    setIsUnlocked(unlocked);
  }, []);

  const handleUnlock = () => {
    setIsUnlocked(true);
  };

  if (isUnlocked) {
    return <Dashboard />;
  }

  return <PinLock onUnlock={handleUnlock} />;
};

export default DashboardProtected;