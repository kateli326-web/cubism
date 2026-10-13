let canvas;

// 當網頁完全加載完成後再初始化 Canvas 與事件
window.addEventListener('DOMContentLoaded', function () {
  // 初始化 Fabric.js 畫布
  canvas = new fabric.Canvas('c');

  // 監聽圖片選取事件
  const fileInput = document.getElementById('imageLoader');
  if (fileInput) {
    fileInput.addEventListener('change', handleImageUpload);
  }
});

// 觸發隱藏的檔案上傳/拍攝窗口
function triggerFileInput() {
  const fileInput = document.getElementById('imageLoader');
  if (fileInput) {
    fileInput.click();
  }
}

// 處理圖片上傳與渲染
function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const imgObj = new Image();
    imgObj.src = event.target.result;
    imgObj.onload = function () {
      const fabricImg = new fabric.Image(imgObj);
      
      // 縮放到適合畫布的大小
      fabricImg.scaleToWidth(280);
      
      // 設定畢加索《哭泣的女人》風格：粗黑邊框
      fabricImg.set({
        stroke: 'black',
        strokeWidth: 4,
        cornerColor: '#007bff',
        cornerSize: 12,
        transparentCorners: false
      });

      canvas.add(fabricImg);
      canvas.setActiveObject(fabricImg);
      canvas.renderAll();
    };
  };
  reader.readAsDataURL(file);
  // 清空 input 讓同張照片可以重複選取
  e.target.value = '';
}

// 2. 一鍵轉為高對比黑白線稿功能
function applyBlackAndWhite() {
  if (!canvas) return;
  const activeObj = canvas.getActiveObject();
  if (activeObj && activeObj.isType('image')) {
    activeObj.filters = [];
    activeObj.filters.push(new fabric.Image.filters.Grayscale());
    activeObj.filters.push(new fabric.Image.filters.Contrast({ contrast: 0.8 }));
    activeObj.applyFilters();
    canvas.renderAll();
  } else {
    alert('請先點選畫布上的照片！');
  }
}

// 3. 新增幾何切割線
function addCutLine() {
  if (!canvas) return;
  const line = new fabric.Line([100, 100, 400, 500], {
    stroke: 'black',
    strokeWidth: 5,
    selectable: true
  });
  canvas.add(line);
  canvas.setActiveObject(line);
  canvas.renderAll();
}

// 4. 刪除選取元件
function deleteSelected() {
  if (!canvas) return;
  const activeObjects = canvas.getActiveObjects();
  if (activeObjects.length) {
    activeObjects.forEach(obj => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.renderAll();
  }
}
