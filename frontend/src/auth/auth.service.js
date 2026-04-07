import { API_BASE_URL } from '@/config/serverApiConfig';
import axios from 'axios';
import errorHandler from '@/request/errorHandler';
import successHandler from '@/request/successHandler';

/**
 * LOGIN
 */
export const login = async ({ loginData }) => {
  const loginUrl = `${API_BASE_URL}/login`;
  console.log('[Auth] LOGIN URL:', loginUrl);
  console.log('[Auth] LOGIN DATA:', loginData);
  
  try {
    const response = await axios.post(loginUrl, loginData);

    console.log('[Auth] LOGIN RESPONSE:', response.data);
    console.log('[Auth] LOGIN STATUS:', response.status);

    const { status, data } = response;

    successHandler(
      { data, status },
      {
        notifyOnSuccess: false,
        notifyOnFailed: true,
      }
    );

    return data;

  } catch (error) {
    console.error('[Auth] LOGIN ERROR URL:', loginUrl);
    console.error('[Auth] LOGIN ERROR:', error.message);
    if (error.response) {
      console.error('[Auth] LOGIN ERROR STATUS:', error.response.status);
      console.error('[Auth] LOGIN ERROR DATA:', error.response.data);
    }
    return errorHandler(error);
  }
};

/**
 * REGISTER
 */
export const register = async ({ registerData }) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/register`,
      registerData
    );

    const { status, data } = response;

    successHandler(
      { data, status },
      {
        notifyOnSuccess: true,
        notifyOnFailed: true,
      }
    );

    return data;

  } catch (error) {
    return errorHandler(error);
  }
};

/**
 * VERIFY EMAIL
 */
export const verify = async ({ userId, emailToken }) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/verify/${userId}/${emailToken}`
    );

    const { status, data } = response;

    successHandler(
      { data, status },
      {
        notifyOnSuccess: true,
        notifyOnFailed: true,
      }
    );

    return data;

  } catch (error) {
    return errorHandler(error);
  }
};

/**
 * RESET PASSWORD
 */
export const resetPassword = async ({ resetPasswordData }) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/resetpassword`,
      resetPasswordData
    );

    const { status, data } = response;

    successHandler(
      { data, status },
      {
        notifyOnSuccess: true,
        notifyOnFailed: true,
      }
    );

    return data;

  } catch (error) {
    return errorHandler(error);
  }
};

/**
 * LOGOUT
 */
export const logout = async () => {
  axios.defaults.withCredentials = true;

  try {
    const response = await axios.post(
      `${API_BASE_URL}/logout`
    );

    const { status, data } = response;

    successHandler(
      { data, status },
      {
        notifyOnSuccess: false,
        notifyOnFailed: true,
      }
    );

    return data;

  } catch (error) {
    return errorHandler(error);
  }
};