import { API_BASE_URL } from '@/config/serverApiConfig';
import storePersist from '@/redux/storePersist';

const normalizeToken = (rawToken) => {
  if (typeof rawToken !== 'string') return null;
  const trimmedToken = rawToken.trim();
  if (!trimmedToken) return null;
  return trimmedToken.toLowerCase().startsWith('bearer ')
    ? trimmedToken.slice(7).trim()
    : trimmedToken;
};

export const downloadPaymentPdf = async (paymentId) => {
  const auth = storePersist.get('auth');
  const token =
    normalizeToken(localStorage.getItem('token')) ||
    normalizeToken(auth?.current?.token) ||
    '';

  window.open(
    `${API_BASE_URL}/payment/download/${paymentId}?token=${encodeURIComponent(token)}`,
    '_blank'
  );
};
