window.onload = () => {
    'use strict';

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
               .register('/pwa/hello/sw.js');
    }
  }

