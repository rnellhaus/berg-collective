import { useRef, useCallback } from 'react';

const FIELD_NAME = 'company_url';
const MIN_SUBMIT_TIME_MS = 3000;

/**
 * Honeypot + timing-based bot protection for forms.
 *
 * Usage:
 *   const { honeypotProps, isBot } = useFormProtection();
 *   // Add <input {...honeypotProps} /> inside the form
 *   // Call isBot() in the submit handler — if true, silently discard
 */
export function useFormProtection() {
  const mountedAt = useRef(Date.now());
  const honeypotRef = useRef(null);

  const honeypotProps = {
    name: FIELD_NAME,
    ref: honeypotRef,
    tabIndex: -1,
    autoComplete: 'off',
    'aria-hidden': true,
    className: '_fld_x',
    style: {
      position: 'absolute',
      left: '-9999px',
      top: '-9999px',
      height: 0,
      width: 0,
      overflow: 'hidden',
      opacity: 0,
      zIndex: -1,
      pointerEvents: 'none',
    },
  };

  const isBot = useCallback(() => {
    const honeypotFilled = honeypotRef.current?.value?.length > 0;
    const tooFast = Date.now() - mountedAt.current < MIN_SUBMIT_TIME_MS;
    return honeypotFilled || tooFast;
  }, []);

  return { honeypotProps, isBot, fieldName: FIELD_NAME };
}
