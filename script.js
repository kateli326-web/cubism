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

      // 外加畢加索風格粗黑邊框
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

// 一鍵轉換：清晰乾淨的白底黑線 Line Drawing
function applyBlackAndWhite() {
  if (selectedIndex !== -1 && elements[selectedIndex].type === 'image') {
    const item = elements[selectedIndex];
    
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = item.img.width;
    tempCanvas.height = item.img.height;

    tempCtx.drawImage(item.img, 0, 0);
    const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imgData.data;

    // 清晰黑白二值化（過濾皮膚陰影，只留深色五官輪廓）
    const threshold = 110; // 線條臨界值

    for (let i = 0; i < data.length; i += 4) {
      // 計算亮度
      const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      
      // 只有眼睛、眉毛、嘴巴與深色輪廓會變成純黑(0)，其餘皮膚與背景全部變成純白(255)
      const val = brightness < threshold ? 0 : 255;
      
      data[i] = val;     // Red
      data[i + 1] = val; // Green
      data[i + 2] = val; // Blue
    }

    tempCtx.putImageData(imgData, 0, 0);

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
