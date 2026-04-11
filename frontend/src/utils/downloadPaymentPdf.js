import { API_BASE_URL } from '@/config/serverApiConfig';
import storePersist from '@/redux/storePersist';

export const downloadPaymentPdf = async (paymentId) => {
  const auth = storePersist.get('auth');
  const token = auth?.current?.token || '';
  window.open(`${API_BASE_URL}/payment/download/${paymentId}?token=${token}`, "_blank");
};
