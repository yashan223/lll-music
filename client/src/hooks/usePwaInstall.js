import { useCallback, useEffect, useState } from 'react';

const IOS_UA_PATTERN = /iphone|ipad|ipod/i;

const getIsStandalone = () => (
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
);

export default function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    setIsStandalone(getIsStandalone());
    setIsIos(IOS_UA_PATTERN.test(window.navigator.userAgent));

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleStandaloneChange = () => {
      setIsStandalone(getIsStandalone());
    };

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleStandaloneChange);
    } else {
      mediaQuery.addListener(handleStandaloneChange);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleStandaloneChange);
      } else {
        mediaQuery.removeListener(handleStandaloneChange);
      }

      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      if (isIos && typeof window.navigator.share === 'function') {
        try {
          await window.navigator.share({
            title: 'LLL Music',
            text: 'Add LLL Music to your Home Screen',
            url: window.location.href,
          });

          return { status: 'ios-share-opened' };
        } catch (error) {
          if (error?.name === 'AbortError') {
            return { status: 'dismissed' };
          }
        }
      }

      return { status: isIos ? 'ios' : 'unavailable' };
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);

    return { status: outcome === 'accepted' ? 'accepted' : 'dismissed' };
  }, [deferredPrompt, isIos]);

  return {
    isStandalone,
    isIos,
    canPromptInstall: !!deferredPrompt,
    promptInstall,
  };
}
