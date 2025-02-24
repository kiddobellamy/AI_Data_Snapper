//labeler.js
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['currentScreenshot', 'screenshots'], (result) => {
    let screenshot = result.currentScreenshot;
    let screenshots = result.screenshots || [];
    if (!screenshot) {
      alert('No hay captura para etiquetar.');
      window.close();
      return;
    }

    console.log('Captura cargada en labeler:', screenshot);

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = screenshot.image;

    let undoStack = []; // Pila para deshacer
    let redoStack = []; // Pila para rehacer

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      drawAnnotations(ctx, screenshot.annotations);
    };

    let rect = {};
    let dragging = false;

    canvas.addEventListener('mousedown', (e) => {
      rect.startX = e.offsetX;
      rect.startY = e.offsetY;
      dragging = true;
      console.log('Inicio:', rect.startX, rect.startY);
    });

    canvas.addEventListener('mousemove', (e) => {
      if (dragging) {
        const currentX = e.offsetX;
        const currentY = e.offsetY;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        drawAnnotations(ctx, screenshot.annotations);

        ctx.beginPath();
        ctx.rect(rect.startX, rect.startY, currentX - rect.startX, currentY - rect.startY);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    canvas.addEventListener('mouseup', (e) => {
      if (dragging) {
        dragging = false;
        const endX = e.offsetX;
        const endY = e.offsetY;

        const label = prompt('Ingresa la etiqueta (ej. search):');
        if (label) {
          const width = endX - rect.startX;
          const height = endY - rect.startY;
          const newAnnotation = {
            label,
            x: width < 0 ? endX : rect.startX,
            y: height < 0 ? endY : rect.startY,
            width: Math.abs(width),
            height: Math.abs(height)
          };
          screenshot.annotations.push(newAnnotation);
          undoStack.push(newAnnotation); // Añadir a la pila de deshacer
          redoStack = []; // Limpiar la pila de rehacer al añadir nuevo label
          console.log('Anotación añadida:', screenshot.annotations);
          drawAnnotations(ctx, screenshot.annotations);
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'z') { // Ctrl+Z para deshacer
        e.preventDefault();
        if (undoStack.length > 0) {
          const lastAnnotation = undoStack.pop();
          const index = screenshot.annotations.findIndex(ann => 
            ann.label === lastAnnotation.label && 
            ann.x === lastAnnotation.x && 
            ann.y === lastAnnotation.y && 
            ann.width === lastAnnotation.width && 
            ann.height === lastAnnotation.height
          );
          if (index !== -1) {
            screenshot.annotations.splice(index, 1);
            redoStack.push(lastAnnotation);
            console.log('Deshacer - Anotación eliminada:', screenshot.annotations);
            console.log('Pila de rehacer:', redoStack);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            drawAnnotations(ctx, screenshot.annotations);
          }
        } else {
          console.log('Nada que deshacer');
        }
      } else if (e.ctrlKey && e.key === 'y') { // Ctrl+Y para rehacer
        e.preventDefault();
        if (redoStack.length > 0) {
          const lastUndone = redoStack.pop();
          screenshot.annotations.push(lastUndone);
          undoStack.push(lastUndone);
          console.log('Rehacer - Anotación restaurada:', screenshot.annotations);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          drawAnnotations(ctx, screenshot.annotations);
        } else {
          console.log('Nada que rehacer');
        }
      }
    });

    document.getElementById('saveBtn').addEventListener('click', () => {
      console.log('Guardando captura con anotaciones:', screenshot);
      const index = screenshots.findIndex(s => s.image === screenshot.image);
      if (index === -1) {
        screenshots.push({ ...screenshot });
      } else {
        screenshots[index] = { ...screenshot };
      }
      console.log('Screenshots actualizado antes de guardar:', screenshots);
      chrome.storage.local.set({ screenshots: screenshots }, () => {
        console.log('Guardado en chrome.storage');
        window.close();
      });
    });
  });
});

function drawAnnotations(ctx, annotations) {
  annotations.forEach(ann => {
    ctx.beginPath();
    ctx.rect(ann.x, ann.y, ann.width, ann.height);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'black';
    ctx.fillText(ann.label, ann.x, ann.y - 5);
  });
}