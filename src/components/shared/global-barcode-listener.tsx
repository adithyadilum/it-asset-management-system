'use client';

import { useBarcodeInjection } from '@/hooks/use-barcode-injection';
import { tiqriToast } from '@/components/shared/sonner';

export function GlobalBarcodeListener() {
  useBarcodeInjection((barcode) => {
    // Check if the user is focused on a text input
    const activeElement = document.activeElement;
    
    if (activeElement && activeElement.tagName === 'INPUT') {
      const input = activeElement as HTMLInputElement;
      
      // Specifically target serial number inputs as requested
      if (input.id === 'serialNumber' || input.name === 'serialNumber') {
        // Use the native setter to bypass React's event pooling/interception
        // and force the onChange handler to fire when we dispatch the event
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 
          'value'
        )?.set;
        
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(input, barcode);
        } else {
          input.value = barcode;
        }
        
        // Dispatch event so React picks up the change
        input.dispatchEvent(new Event('input', { bubbles: true }));
        
        tiqriToast.success('Serial number pasted into input');
        return;
      }
    }

    // Fallback: copy to clipboard
    const fallbackToast = () => {
      tiqriToast.success(`Scanned: ${barcode}`, {
        action: {
          label: 'Copy',
          onClick: () => {
            navigator.clipboard.writeText(barcode);
            tiqriToast.success('Serial number copied to clipboard');
          }
        },
        duration: 10000 // give user enough time to click
      });
    };

    if (navigator.clipboard) {
      navigator.clipboard.writeText(barcode).then(() => {
        tiqriToast.success('Serial number copied to the clipboard');
      }).catch((err) => {
        console.warn('Clipboard auto-copy failed (likely no user gesture):', err);
        fallbackToast();
      });
    } else {
      fallbackToast();
    }
  });

  return null; // This is a logic-only component
}
