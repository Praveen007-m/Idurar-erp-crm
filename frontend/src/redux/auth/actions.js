import * as actionTypes from './types';
import * as authService from '@/auth';
import { request } from '@/request';

const normalizeToken = (rawToken) => {
  if (typeof rawToken !== 'string') return null;
  let token = rawToken.trim();
  if (token.toLowerCase().startsWith('bearer ')) {
    token = token.slice(7).trim();
  }
  return token || null;
};

const isValidJwt = (token) => {
  return typeof token === 'string' && token.split('.').length === 3 && token.split('.').every((part) => part.length > 0);
};

export const login =
  ({ loginData }) =>
  async (dispatch) => {
    dispatch({
      type: actionTypes.REQUEST_LOADING,
    });
    const data = await authService.login({ loginData });

    console.log('LOGIN RESPONSE:', data);

    if (data.success === true) {
      const token = normalizeToken(data.token || data.result?.token);
      if (!token || !isValidJwt(token)) {
        console.error('No valid JWT token found in login response; not storing token');
        localStorage.removeItem('token');
      } else {
        localStorage.setItem('token', token);
        console.log('TOKEN STORED:', localStorage.getItem('token'));
      }
      const auth_state = {
        current: data.result,
        isLoggedIn: true,
        isLoading: false,
        isSuccess: true,
      };
      window.localStorage.setItem('auth', JSON.stringify(auth_state));
      window.localStorage.removeItem('isLogout');
      dispatch({
        type: actionTypes.REQUEST_SUCCESS,
        payload: data.result,
      });
    } else {
      console.log('Login failed:', data);
      dispatch({
        type: actionTypes.REQUEST_FAILED,
      });
    }
  };

export const register =
  ({ registerData }) =>
  async (dispatch) => {
    dispatch({
      type: actionTypes.REQUEST_LOADING,
    });
    const data = await authService.register({ registerData });

    if (data.success === true) {
      dispatch({
        type: actionTypes.REGISTER_SUCCESS,
      });
    } else {
      dispatch({
        type: actionTypes.REQUEST_FAILED,
      });
    }
  };

export const verify =
  ({ userId, emailToken }) =>
  async (dispatch) => {
    dispatch({
      type: actionTypes.REQUEST_LOADING,
    });
    const data = await authService.verify({ userId, emailToken });

    if (data.success === true) {
      const auth_state = {
        current: data.result,
        isLoggedIn: true,
        isLoading: false,
        isSuccess: true,
      };
      const token = normalizeToken(data.token);
      if (!isValidJwt(token)) {
        console.error('Malformed JWT token received from verify; clearing token storage');
        localStorage.removeItem('token');
      } else {
        localStorage.setItem('token', token);
        console.log('TOKEN STORED:', localStorage.getItem('token'));
      }
      window.localStorage.setItem('auth', JSON.stringify(auth_state));
      window.localStorage.removeItem('isLogout');
      dispatch({
        type: actionTypes.REQUEST_SUCCESS,
        payload: data.result,
      });
    } else {
      dispatch({
        type: actionTypes.REQUEST_FAILED,
      });
    }
  };

export const resetPassword =
  ({ resetPasswordData }) =>
  async (dispatch) => {
    dispatch({
      type: actionTypes.REQUEST_LOADING,
    });
    const data = await authService.resetPassword({ resetPasswordData });

    if (data.success === true) {
      const auth_state = {
        current: data.result,
        isLoggedIn: true,
        isLoading: false,
        isSuccess: true,
      };
      const token = normalizeToken(data.token);
      if (!isValidJwt(token)) {
        console.error('Malformed JWT token received from resetPassword; clearing token storage');
        localStorage.removeItem('token');
      } else {
        localStorage.setItem('token', token);
        console.log('TOKEN STORED:', localStorage.getItem('token'));
      }
      window.localStorage.setItem('auth', JSON.stringify(auth_state));
      window.localStorage.removeItem('isLogout');
      dispatch({
        type: actionTypes.REQUEST_SUCCESS,
        payload: data.result,
      });
    } else {
      dispatch({
        type: actionTypes.REQUEST_FAILED,
      });
    }
  };

export const logout = () => (dispatch) => {
  localStorage.removeItem('token');
  sessionStorage.removeItem('dashboard_unlocked');
  dispatch({
    type: actionTypes.LOGOUT_SUCCESS,
  });
};

export const updateProfile =
  ({ entity, jsonData }) =>
  async (dispatch) => {
    let data = await request.updateAndUpload({ entity, id: '', jsonData });

    if (data.success === true) {
      dispatch({
        type: actionTypes.REQUEST_SUCCESS,
        payload: data.result,
      });
      const auth_state = {
        current: data.result,
        isLoggedIn: true,
        isLoading: false,
        isSuccess: true,
      };
      window.localStorage.setItem('auth', JSON.stringify(auth_state));
    }
  };
