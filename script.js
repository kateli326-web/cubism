let canvas, ctx;
let elements = [];
let selectedIndex = -1;

window.addEventListener('DOMContentLoaded', function () {
  canvas = document.getElementById('c');
  ctx = canvas.getContext('2d');

  const fileInput = document.getElementById('imageLoader');
  if (fileInput) {
    fileInput.addEventListener('change', handleImageUpload);
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
});

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      let initWidth = 260;
      let initHeight = (img.height / img.width) * initWidth;

      const newElement = {
        type: 'image',
        img: img,
        processedImg: null,
        x: 50 + elements.length * 20,
        y: 50 + elements.length * 20,
        width: initWidth,
        height: initHeight,
        isLineArt: false
      };

      elements.push(newElement);
      selectedIndex = elements.length - 1;
      drawCanvas();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function drawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  elements.forEach((item, index) => {
    ctx.save();

    if (item.type === 'image') {
      const renderImg = (item.isLineArt && item.processedImg) ? item.processedImg : item.img;
      ctx.drawImage(renderImg, item.x, item.y, item.width, item.height);

      // 外加畢加索風格粗黑外框
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 5;
      ctx.strokeRect(item.x, item.y, item.width, item.height);

      if (index === selectedIndex) {
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        ctx.strokeRect(item.x - 4, item.y - 4, item.width + 8, item.height + 8);
      }
    } else if (item.type === 'line') {
      ctx.beginPath();
      ctx.moveTo(item.x1, item.y1);
      ctx.lineTo(item.x2, item.y2);
      ctx.strokeStyle = item.color || '#000000';
      ctx.lineWidth = item.lineWidth || 5;
      ctx.stroke();

      if (index === selectedIndex) {
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        ctx.strokeRect(Math.min(item.x1, item.x2) - 5, Math.min(item.y1, item.y2) - 5, Math.abs(item.x2 - item.x1) + 10, Math.abs(item.y2 - item.y1) + 10);
      }
    }

    ctx.restore();
  });
}

// 提取純淨五官輪廓線 (如同圖 10 的 Line Drawing)
function applyBlackAndWhite() {
  if (selectedIndex !== -1 && elements[selectedIndex].type === 'image') {
    const item = elements[selectedIndex];
    
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    const w = item.img.width;
    const h = item.img.height;
    tempCanvas.width = w;
    tempCanvas.height = h;

    tempCtx.drawImage(item.img, 0, 0);
    const imgData = tempCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // 1. 轉灰階
    const gray = new Float32Array(w * h);
    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    // 2. 邊緣抽取演算法 (Outline Detection - 取消陰影填充)
    const output = tempCtx.createImageData(w, h);
    const outData = output.data;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;

        // 計算局部變化梯度（只抓五官輪廓變化）
        const diffX = Math.abs(gray[idx + 1] - gray[idx - 1]);
        const diffY = Math.abs(gray[idx + w] - gray[idx - w]);
        const edge = diffX + diffY;

        const pixelIdx = idx * 4;
        
        // 邊緣強度閾值：大於門檻的才形成黑線，其他全部塗白
        if (edge > 25) { 
          outData[pixelIdx] = 0;     // R (純黑線條)
          outData[pixelIdx + 1] = 0; // G
          outData[pixelIdx + 2] = 0; // B
        } else {
          outData[pixelIdx] = 255;     // R (純白背景)
          outData[pixelIdx + 1] = 255; // G
          outData[pixelIdx + 2] = 255; // B
        }
        outData[pixelIdx + 3] = 255;   // 透明度 (不透明)
      }
    }

    tempCtx.putImageData(output, 0, 0);

    const processedImg = new Image();
    processedImg.onload = function () {
      item.processedImg = processedImg;
      item.isLineArt = true;
      drawCanvas();
    };
    processedImg.src = tempCanvas.toDataURL();
  } else {
    alert('請先點選畫布上的照片！');
  }
}

function addCutLine() {
  const newLine = {
    type: 'line',
    x1: 100,
    y1: 100,
    x2: 400,
    y2: 500,
    lineWidth: 6,
    color: '#000000'
  };
  elements.push(newLine);
  selectedIndex = elements.length - 1;
  drawCanvas();
}

function deleteSelected() {
  if (selectedIndex !== -1) {
    elements.splice(selectedIndex, 1);
    selectedIndex = -1;
    drawCanvas();
  }
}

function handleMouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  let found = false;
  for (let i = elements.length - 1; i >= 0; i--) {
    const item = elements[i];
    if (item.type === 'image') {
      if (mouseX >= item.x && mouseX <= item.x + item.width && mouseY >= item.y && mouseY <= item.y + item.height) {
        selectedIndex = i;
        found = true;
        break;
      }
    }
  }
  if (!found) selectedIndex = -1;
  drawCanvas();
}

function handleTouchStart(e) {
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const mouseX = touch.clientX - rect.left;
    const mouseY = touch.clientY - rect.top;

    for (let i = elements.length - 1; i >= 0; i--) {
      const item = elements[i];
      if (item.type === 'image' && mouseX >= item.x && mouseX <= item.x + item.width && mouseY >= item.y && mouseY <= item.y + item.height) {
        selectedIndex = i;
        break;
      }
    }
    drawCanvas();
  }
}
