import { Button, Result } from 'antd';

import useLanguage from '@/locale/useLanguage';

const About = () => {
  const translate = useLanguage();
  return (
    <Result
      status="info"
      title={'Webaac Solutions Finance Management'}
      subTitle={translate('Do you need help on customize of this app')}
      extra={
        <>
          <p>
            Website : <a href="https://www.webaac.com">www.webaac.com</a>{' '}
          </p>
          <p>
            GitHub :{' '}
            <a href="https://github.com">
              https://github.com
            </a>
          </p>
          <Button
            type="primary"
            onClick={() => {
              window.open(`https://www.webaac.com/contact-us/`);
            }}
          >
            {translate('Contact us')}
          </Button>
        </>
      }
    />
  );
};

export default About;
