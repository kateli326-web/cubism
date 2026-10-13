// 初始化 Fabric.js 畫布
const canvas = new fabric.Canvas('c');

// 1. 監聽照片上傳/拍攝
document.getElementById('imageLoader').addEventListener('change', function (e) {
  const reader = new FileReader();
  reader.onload = function (event) {
    const imgObj = new Image();
    imgObj.src = event.target.result;
    imgObj.onload = function () {
      const fabricImg = new fabric.Image(imgObj);
      // 縮放到合適尺寸
      fabricImg.scaleToWidth(280);
      
      // 自動加上畢加索《哭泣的女人》風格粗黑邊框
      fabricImg.set({
        stroke: 'black',
        strokeWidth: 4,
        cornerColor: '#007bff',
        cornerSize: 12,
        transparentCorners: false
      });

      canvas.add(fabricImg);
      canvas.setActiveObject(fabricImg);
    };
  };
  if (e.target.files[0]) {
    reader.readAsDataURL(e.target.files[0]);
  }
});

// 2. 一鍵轉為高對比黑白線稿功能
function applyBlackAndWhite() {
  const activeObj = canvas.getActiveObject();
  if (activeObj && activeObj.isType('image')) {
    // 清除舊濾鏡並套用黑白與高對比
    activeObj.filters = [];
    activeObj.filters.push(new fabric.Image.filters.Grayscale());
    activeObj.filters.push(new fabric.Image.filters.Contrast({ contrast: 0.8 }));
    activeObj.applyFilters();
    canvas.renderAll();
  } else {
    alert('請先點選畫布上的照片！');
  }
}

// 3. 新增幾何切割線 (劃分空間)
function addCutLine() {
  const line = new fabric.Line([100, 100, 400, 500], {
    stroke: 'black',
    strokeWidth: 5,
    selectable: true
  });
  canvas.add(line);
  canvas.setActiveObject(line);
}

// 4. 刪除選取元件
function deleteSelected() {
  const activeObjects = canvas.getActiveObjects();
  if (activeObjects.length) {
    activeObjects.forEach(obj => canvas.remove(obj));
    canvas.discardActiveObject();
  }
}
