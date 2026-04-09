import { useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { crud } from '@/redux/crud/actions';
import { erp } from '@/redux/erp/actions';
import PageLoader from '@/components/PageLoader';

const Logout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useLayoutEffect(() => {
    dispatch(crud.resetState());
    dispatch(erp.resetState());
    // Clear dashboard PIN lock on logout
    sessionStorage.removeItem('dashboard_unlocked');
  }, [dispatch]);

  useEffect(() => {
    console.log('LOGOUT PAGE LOADED - no automatic logout dispatched');
    navigate('/login');
  }, [navigate]);

  return <PageLoader />;
};
export default Logout;
