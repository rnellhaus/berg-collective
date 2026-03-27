import { useEffect, useRef } from 'react';
import styles from './DonorboxEmbed.module.css';

export default function DonorboxEmbed() {
  const containerRef = useRef(null);

  useEffect(() => {
    // Load Donorbox widget script
    if (!document.querySelector('script[src*="donorbox.org/widgets.js"]')) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://donorbox.org/widgets.js';
      script.async = true;
      document.body.appendChild(script);
    }

    // Create the widget element via DOM so Donorbox script can detect it
    if (containerRef.current && !containerRef.current.querySelector('dbox-widget')) {
      const widget = document.createElement('dbox-widget');
      widget.setAttribute('campaign', 'berg-collective-donation');
      widget.setAttribute('type', 'donation_form');
      widget.setAttribute('enable-auto-scroll', 'true');
      containerRef.current.appendChild(widget);
    }
  }, []);

  return (
    <div className={styles.wrapper}>
      <div className={styles.embed} ref={containerRef} />
    </div>
  );
}
