console.log('Background script cargado');

chrome.commands.onCommand.addListener((command) => {
  console.log('Comando recibido:', command);
  if (command === 'capture-and-label') {
    chrome.storage.local.get(['isEnabled'], (result) => {
      const isEnabled = result.isEnabled !== undefined ? result.isEnabled : true;
      console.log('isEnabled:', isEnabled);
      if (isEnabled) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs || tabs.length === 0) {
            console.error('No se encontró pestaña activa');
            return;
          }
          const tabId = tabs[0].id;
          console.log('Tab ID:', tabId);
          chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
            console.log('Captura tomada:', dataUrl ? 'Sí' : 'No');
            if (dataUrl) {
              const newScreenshot = {
                image: dataUrl,
                annotations: [],
                width: tabs[0].width || 1920,
                height: tabs[0].height || 1080
              };
              chrome.storage.local.set({ currentScreenshot: newScreenshot }, () => {
                console.log('Captura guardada en storage');
                chrome.windows.create({
                  url: chrome.runtime.getURL('labeler.html'),
                  type: 'popup',
                  width: Math.round(1920 * 0.9),
                  height: Math.round(1080 * 0.9),
                  left: Math.round(1920 * 0.05),
                  top: Math.round(1080 * 0.05)
                }, (window) => {
                  console.log('Ventana de etiquetado abierta:', window ? 'Sí' : 'No');
                });
              });
            } else {
              console.error('Error al capturar la pestaña. ¿Es una página especial como chrome://?');
            }
          });
        });
      } else {
        console.log('Extensión desactivada');
      }
    });
  }
});