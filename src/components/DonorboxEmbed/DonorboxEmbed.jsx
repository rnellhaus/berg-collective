import { useEffect } from 'react';
import styles from './DonorboxEmbed.module.css';

export default function DonorboxEmbed() {
  useEffect(() => {
    // Load Donorbox widget script
    if (!document.querySelector('script[src*="donorbox.org/widgets.js"]')) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://donorbox.org/widgets.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div className={styles.wrapper}>
      <div
        className={styles.embed}
        dangerouslySetInnerHTML={{
          __html: '<dbox-widget campaign="berg-collective-donation" type="donation_form" enable-auto-scroll="true"></dbox-widget>',
        }}
      />
    </div>
  );
}
