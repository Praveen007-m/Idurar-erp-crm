import { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import useLanguage from '@/locale/useLanguage';

import { Form, Button } from 'antd';

import { login } from '@/redux/auth/actions';
import { selectAuth, selectCurrentAdmin } from '@/redux/auth/selectors';
import LoginForm from '@/forms/LoginForm';
import Loading from '@/components/Loading';
import AuthModule from '@/modules/AuthModule';

const LoginPage = () => {
  const translate = useLanguage();
  const { isLoading, isSuccess } = useSelector(selectAuth);
  const currentAdmin = useSelector(selectCurrentAdmin);
  const navigate = useNavigate();

  const dispatch = useDispatch();

  const onFinish = (values) => {
    dispatch(login({ loginData: values }));
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('LOGIN TOKEN:', token);
    console.log('STORED TOKEN:', localStorage.getItem('token'));

    if (isSuccess && token) {
      // Clear dashboard PIN lock on every login
      sessionStorage.removeItem('dashboard_unlocked');
      navigate('/customer');
    }
  }, [navigate, isSuccess]);

  const FormContainer = () => {
    return (
      <Loading isLoading={isLoading}>
        <Form
          layout="vertical"
          name="normal_login"
          className="login-form"
          initialValues={{
            remember: true
          }}
          onFinish={onFinish}
        >
          <LoginForm />

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="login-form-button"
              loading={isLoading}
              size="large"
            >
              {translate('Log in')}
            </Button>
          </Form.Item>

        </Form>
      </Loading>
    );
  };

  return <AuthModule authContent={<FormContainer />} AUTH_TITLE="Sign in" />;
};

export default LoginPage;
