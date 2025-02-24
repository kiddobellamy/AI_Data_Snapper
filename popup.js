//popup.js
let screenshots = [];
let isEnabled = true;

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['screenshots', 'isEnabled'], (result) => {
    screenshots = result.screenshots || [];
    isEnabled = result.isEnabled !== undefined ? result.isEnabled : true;
    updateStatus();
    updateToggleButton();
  });

  // Escuchar cambios en chrome.storage para actualizar el contador en tiempo real
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.screenshots) {
      screenshots = changes.screenshots.newValue || [];
      updateStatus();
    }
    if (namespace === 'local' && changes.isEnabled) {
      isEnabled = changes.isEnabled.newValue;
      updateToggleButton();
    }
  });

  document.getElementById('captureBtn').addEventListener('click', () => {
    if (!isEnabled) {
      alert('La extensión está desactivada. Actívala primero.');
      return;
    }
    captureAndLabel();
  });

  document.getElementById('labelBtn').addEventListener('click', () => {
    if (!isEnabled) {
      alert('La extensión está desactivada. Actívala primero.');
      return;
    }
    if (screenshots.length === 0) {
      alert('Primero captura una página.');
      return;
    }
    openLabelWindow(screenshots[screenshots.length - 1]);
  });

  document.getElementById('downloadBtn').addEventListener('click', () => {
    if (!isEnabled) {
      alert('La extensión está desactivada. Actívala primero.');
      return;
    }
    if (screenshots.length === 0) {
      alert('No hay capturas para descargar.');
      return;
    }
    chrome.storage.local.get(['screenshots'], (result) => {
      screenshots = result.screenshots || [];
      console.log('Screenshots antes de exportar:', screenshots);
      exportData();
    });
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!isEnabled) {
      alert('La extensión está desactivada. Actívala primero.');
      return;
    }
    screenshots = [];
    chrome.storage.local.set({ screenshots: [], currentScreenshot: null }, () => {
      updateStatus();
      alert('Todas las páginas han sido eliminadas.');
    });
  });

  document.getElementById('toggleBtn').addEventListener('click', () => {
    isEnabled = !isEnabled;
    chrome.storage.local.set({ isEnabled: isEnabled }, () => {
      updateToggleButton();
    });
  });
});

function updateStatus() {
  document.getElementById('status').textContent = `Páginas listas: ${screenshots.length}`;
}

function updateToggleButton() {
  const toggleBtn = document.getElementById('toggleBtn');
  if (isEnabled) {
    toggleBtn.textContent = 'Disable';
    toggleBtn.className = 'active';
  } else {
    toggleBtn.textContent = 'Enable';
    toggleBtn.className = 'inactive';
  }
}

function captureAndLabel() {
  chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const newScreenshot = { 
        image: dataUrl, 
        annotations: [], 
        width: img.width, 
        height: img.height 
      };
      openLabelWindow(newScreenshot);
    };
  });
}

function openLabelWindow(screenshot) {
  console.log('Abriendo labeler con captura:', screenshot);
  chrome.storage.local.set({ currentScreenshot: screenshot }, () => {
    chrome.windows.create({
      url: chrome.runtime.getURL('labeler.html'),
      type: 'popup',
      width: Math.round(1920 * 0.9),
      height: Math.round(1080 * 0.9),
      left: Math.round(1920 * 0.05),
      top: Math.round(1080 * 0.05)
    });
  });
}

function exportData() {
  const zip = new JSZip();

  screenshots.forEach((screenshot, index) => {
    const imageData = screenshot.image.split(',')[1];
    const fileName = `screenshot_${index + 1}.png`;
    zip.file(fileName, imageData, { base64: true });

    const cocoData = {
      info: {
        description: "Anotaciones generadas por AI Data Snapper"
      },
      images: [
        {
          id: index + 1,
          file_name: fileName,
          width: screenshot.width,
          height: screenshot.height
        }
      ],
      annotations: [],
      categories: []
    };

    const categoryMap = new Map();
    let categoryId = 1;
    screenshot.annotations.forEach((ann, annIndex) => {
      if (!categoryMap.has(ann.label)) {
        categoryMap.set(ann.label, categoryId++);
        cocoData.categories.push({ id: categoryMap.get(ann.label), name: ann.label });
      }

      cocoData.annotations.push({
        id: annIndex + 1,
        image_id: index + 1,
        category_id: categoryMap.get(ann.label),
        bbox: [ann.x, ann.y, ann.width, ann.height],
        area: ann.width * ann.height,
        iscrowd: 0
      });
    });

    zip.file(`screenshot_${index + 1}.json`, JSON.stringify(cocoData, null, 2));
  });

  zip.generateAsync({ type: 'blob' }).then((content) => {
    chrome.downloads.download({
      url: URL.createObjectURL(content),
      filename: 'screenshots_con_anotaciones.zip'
    });
  });
}