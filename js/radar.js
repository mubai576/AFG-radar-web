//Tue Apr 01 2025 10:05:05 GMT+0800 (中国标准时间)
//Base:<url id="cv1cref6o68qmpt26ol0" type="url" status="parsed" title="GitHub - echo094/decode-js: JS混淆代码的AST分析工具 AST analysis tool for obfuscated JS code" wc="2165">https://github.com/echo094/decode-js</url>
//Modify:<url id="cv1cref6o68qmpt26olg" type="url" status="parsed" title="GitHub - smallfawn/decode_action: 世界上本来不存在加密，加密的人多了，也便成就了解密" wc="741">https://github.com/smallfawn/decode_action</url>
let canvas,
  ctx,
  img,
  scale = 1,
  offsetX = 0,
  offsetY = 0,
  isDragging = false,
  trackingMode = "none",
  players = [],
  selectedPlayerName = null,
  selectedPlayerTeam = null,
  teamColors = {},
  lastTouchDistance = 0,
  showHealth = true,
  showName = true,
  showHelmet = true,
  showArmor = true,
  showWeapon = true,
  showDirection = true,
  ip = "",
  port = "";
const brightGreen = "#00FF00",
  colorMap = {
    "none": "transparent",
    "white": "#FFF",
    "blue": "#1E90FF",
    "purple": "#8A2BE2",
    "gold": "#FFD700",
    "red": "#DC143C"
  };
function loadSettings() {
  const _0x4858a3 = JSON.parse(localStorage.getItem("radarSettings"));
  if (_0x4858a3) {
    {
      showHealth = _0x4858a3.showHealth;
      showName = _0x4858a3.showName;
      showHelmet = _0x4858a3.showHelmet;
      showArmor = _0x4858a3.showArmor;
      showWeapon = _0x4858a3.showWeapon;
      showDirection = _0x4858a3.showDirection;
      trackingMode = _0x4858a3.trackingMode ? "track" : "none";
      ip = _0x4858a3.ip || "";
      port = _0x4858a3.port || "";
    }
  }
}
function saveSettings() {
  const _0x98374d = {
    "showHealth": showHealth,
    "showName": showName,
    "showHelmet": showHelmet,
    "showArmor": showArmor,
    "showWeapon": showWeapon,
    "showDirection": showDirection,
    "trackingMode": trackingMode !== "none",
    "ip": ip,
    "port": port
  };
  localStorage.setItem("radarSettings", JSON.stringify(_0x98374d));
}
function generateNewTeamColor(_0x2c1ffa) {
  let _0x4d9e61 = 0,
    _0x470450 = "";
  for (let _0xcb0619 = 0; _0xcb0619 < 10; _0xcb0619++) {
    const _0x36ea34 = Math.floor(Math.random() * 360);
    if (_0x36ea34 >= 70 && _0x36ea34 <= 160) continue;
    const _0xc46dad = "hsl(" + _0x36ea34 + ", 70%, 50%)";
    let _0x33b326 = 360;
    _0x2c1ffa.forEach(_0x2fc55b => {
      {
        const _0x18e6ff = getHueDifference(_0x2fc55b, _0xc46dad);
        if (_0x18e6ff < _0x33b326) _0x33b326 = _0x18e6ff;
      }
    });
    _0x33b326 > _0x4d9e61 && (_0x4d9e61 = _0x33b326, _0x470450 = _0xc46dad);
  }
  return _0x470450;
}
function getHueDifference(_0x5b3080, _0x2757b9) {
  const _0x41a483 = parseInt(_0x5b3080.match(/hsl\((\d+)/)[1]),
    _0x35b4a3 = parseInt(_0x2757b9.match(/hsl\((\d+)/)[1]),
    _0x471d17 = Math.abs(_0x41a483 - _0x35b4a3);
  return Math.min(_0x471d17, 360 - _0x471d17);
}
function createRadarPage() {
  loadSettings();
  canvas = document.createElement("canvas");
  document.body.appendChild(canvas);
  ctx = canvas.getContext("2d");
  img = new Image();
  img.src = "db.jpg";
  img.onload = () => {
    adjustImageToFit();
    drawMap();
  };
  canvas.addEventListener("mousedown", startDragging);
  canvas.addEventListener("mousemove", duringDragging);
  canvas.addEventListener("mouseup", stopDragging);
  canvas.addEventListener("wheel", handleZoom);
  canvas.addEventListener("click", handlePlayerClick);
  canvas.addEventListener("touchstart", handleTouchStart, {
    "passive": false
  });
  canvas.addEventListener("touchmove", handleTouchMove, {
    "passive": false
  });
  canvas.addEventListener("touchend", handleTouchEnd, {
    "passive": false
  });
  window.addEventListener("resize", resizeCanvas);
  createControlPanel();
}
function adjustImageToFit() {
  const _0x1a67eb = img.width / img.height,
    _0x7ef429 = window.innerWidth / window.innerHeight;
  scale = _0x1a67eb > _0x7ef429 ? window.innerWidth / img.width : window.innerHeight / img.height;
  offsetX = (window.innerWidth - img.width * scale) / 2;
  offsetY = (window.innerHeight - img.height * scale) / 2;
  resizeCanvas();
}
function handleTouchStart(_0x5e40f6) {
  _0x5e40f6.preventDefault();
  if (_0x5e40f6.touches.length === 1) {
    {
      const _0x3dcb78 = _0x5e40f6.touches[0];
      dragStart = {
        "x": _0x3dcb78.clientX - offsetX,
        "y": _0x3dcb78.clientY - offsetY
      };
      isDragging = true;
    }
  } else _0x5e40f6.touches.length === 2 && (lastTouchDistance = getTouchDistance(_0x5e40f6.touches));
}
function handleTouchMove(_0x5eafac) {
  _0x5eafac.preventDefault();
  if (isDragging && _0x5eafac.touches.length === 1) {
    const _0x5f450a = _0x5eafac.touches[0];
    offsetX = _0x5f450a.clientX - dragStart.x;
    offsetY = _0x5f450a.clientY - dragStart.y;
    drawMap();
  } else {
    if (_0x5eafac.touches.length === 2) {
      const _0x269944 = getTouchDistance(_0x5eafac.touches),
        _0x3a02ac = _0x269944 / lastTouchDistance;
      lastTouchDistance = _0x269944;
      const _0x50fec5 = (_0x5eafac.touches[0].clientX + _0x5eafac.touches[1].clientX) / 2,
        _0x28c97b = (_0x5eafac.touches[0].clientY + _0x5eafac.touches[1].clientY) / 2;
      scale *= _0x3a02ac;
      scale = Math.max(0.1, scale);
      offsetX -= (_0x50fec5 - offsetX) * (_0x3a02ac - 1);
      offsetY -= (_0x28c97b - offsetY) * (_0x3a02ac - 1);
      drawMap();
    }
  }
}
function handleTouchEnd() {
  isDragging = false;
  lastTouchDistance = 0;
}
function getTouchDistance(_0x55ba14) {
  const _0x354df5 = _0x55ba14[0].clientX - _0x55ba14[1].clientX,
    _0x3b1f7e = _0x55ba14[0].clientY - _0x55ba14[1].clientY;
  return Math.sqrt(_0x354df5 * _0x354df5 + _0x3b1f7e * _0x3b1f7e);
}
function startDragging(_0x3fb088) {
  dragStart = {
    "x": _0x3fb088.clientX - offsetX,
    "y": _0x3fb088.clientY - offsetY
  };
  isDragging = true;
}
function duringDragging(_0x4d6504) {
  isDragging && (offsetX = _0x4d6504.clientX - dragStart.x, offsetY = _0x4d6504.clientY - dragStart.y, drawMap());
}
function stopDragging() {
  isDragging = false;
}
function handleZoom(_0x16758c) {
  _0x16758c.preventDefault();
  const _0x19d7e7 = 0.1,
    _0x24f907 = scale;
  scale += _0x16758c.deltaY < 0 ? _0x19d7e7 : -_0x19d7e7;
  scale = Math.max(0.1, scale);
  const _0x457183 = _0x16758c.clientX,
    _0xdad5e0 = _0x16758c.clientY;
  offsetX -= (_0x457183 - offsetX) * (scale / _0x24f907 - 1);
  offsetY -= (_0xdad5e0 - offsetY) * (scale / _0x24f907 - 1);
  drawMap();
}
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  drawMap();
}
function drawMap() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
  drawPlayers();
  if (trackingMode !== "none" && selectedPlayerName) {
    const _0x5a1671 = players.find(_0x25d21d => _0x25d21d.name === selectedPlayerName);
    if (_0x5a1671) centerOnPlayer(_0x5a1671);
  }
}
function drawPlayers() {
  players.forEach(_0x4c3d13 => {
    {
      const _0x3e1a9a = _0x4c3d13.x * scale + offsetX,
        _0x53048d = _0x4c3d13.y * scale + offsetY,
        _0xde7ba5 = 15 * scale;
      if (!teamColors[_0x4c3d13.teamId]) {
        const _0x3f22fe = Object.values(teamColors);
        teamColors[_0x4c3d13.teamId] = generateNewTeamColor(_0x3f22fe);
      }
      let _0x3b8904 = teamColors[_0x4c3d13.teamId];
      if (selectedPlayerName && (_0x4c3d13.name === selectedPlayerName || _0x4c3d13.teamId === selectedPlayerTeam)) {
        _0x3b8904 = brightGreen;
      }
      ctx.save();
      ctx.beginPath();
      ctx.arc(_0x3e1a9a, _0x53048d, _0xde7ba5, 0, 2 * Math.PI);
      ctx.fillStyle = _0x3b8904;
      ctx.fill();
      ctx.restore();
      if (showName) {
        {
          ctx.save();
          ctx.font = 12 * scale + "px Arial";
          ctx.fillStyle = "white";
          ctx.textAlign = "center";
          ctx.fillText(_0x4c3d13.name, _0x3e1a9a, _0x53048d - 20 * scale);
          ctx.restore();
        }
      }
      showWeapon && (ctx.save(), ctx.font = 12 * scale + "px Arial", ctx.fillStyle = "white", ctx.textAlign = "center", ctx.fillText(_0x4c3d13.weapon, _0x3e1a9a, _0x53048d + 30 * scale), ctx.restore());
      if (showHelmet && _0x4c3d13.helmet.level !== "none") drawHelmet(_0x4c3d13, _0x3e1a9a - 30 * scale, _0x53048d);
      if (showArmor && _0x4c3d13.armor.level !== "none") drawArmor(_0x4c3d13, _0x3e1a9a + 30 * scale, _0x53048d);
      if (showHealth) drawHealthBar(_0x4c3d13, _0x3e1a9a, _0x53048d + 45 * scale);
      if (showDirection) drawDirection(_0x4c3d13, _0x3e1a9a, _0x53048d);
    }
  });
}
function handlePlayerClick(_0x454e06) {
  const _0x49ea40 = (_0x454e06.clientX - offsetX) / scale,
    _0x34149e = (_0x454e06.clientY - offsetY) / scale;
  players.forEach(_0x4d507f => {
    const _0x3f8825 = Math.sqrt((_0x4d507f.x - _0x49ea40) ** 2 + (_0x4d507f.y - _0x34149e) ** 2);
    _0x3f8825 < 15 && (selectedPlayerName = _0x4d507f.name, selectedPlayerTeam = _0x4d507f.teamId);
  });
  drawMap();
  saveSettings();
}
function drawDirection(_0x1dc306, _0x40b2f8, _0x21692c) {
  const _0x1609a0 = 20 * scale,
    _0x3bcdac = _0x1dc306.direction * Math.PI / 180,
    _0x287049 = _0x40b2f8 + _0x1609a0 * Math.cos(_0x3bcdac),
    _0x4c1bf8 = _0x21692c + _0x1609a0 * Math.sin(_0x3bcdac);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(_0x40b2f8, _0x21692c);
  ctx.lineTo(_0x287049, _0x4c1bf8);
  ctx.strokeStyle = "yellow";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}
function drawHelmet(_0x4f4089, _0x3810d6, _0x4e1fdc) {
  const _0x2869be = 10 * scale,
    _0x20d241 = -Math.PI / 2,
    _0x24a2b9 = _0x20d241 - 2 * Math.PI * (_0x4f4089.helmet.durability / 100);
  ctx.save();
  ctx.beginPath();
  ctx.arc(_0x3810d6, _0x4e1fdc, _0x2869be, 0, 2 * Math.PI);
  ctx.fillStyle = "#808080";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(_0x3810d6, _0x4e1fdc);
  ctx.arc(_0x3810d6, _0x4e1fdc, _0x2869be, _0x20d241, _0x24a2b9, true);
  ctx.fillStyle = colorMap[_0x4f4089.helmet.level];
  ctx.fill();
  ctx.restore();
}
function drawArmor(_0x2fd8ba, _0x1eea5b, _0x4654aa) {
  const _0x1f3a95 = 10 * scale,
    _0x169eb3 = -Math.PI / 2,
    _0x181d1d = _0x169eb3 - 2 * Math.PI * (_0x2fd8ba.armor.durability / 100);
  ctx.save();
  ctx.beginPath();
  ctx.arc(_0x1eea5b, _0x4654aa, _0x1f3a95, 0, 2 * Math.PI);
  ctx.fillStyle = "#808080";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(_0x1eea5b, _0x4654aa);
  ctx.arc(_0x1eea5b, _0x4654aa, _0x1f3a95, _0x169eb3, _0x181d1d, true);
  ctx.fillStyle = colorMap[_0x2fd8ba.armor.level];
  ctx.fill();
  ctx.restore();
}
function drawHealthBar(_0x1a3815, _0x27eed7, _0x422cf4) {
  const _0x14a3cc = 60 * scale,
    _0x19f182 = 10 * scale,
    _0x2a206d = -10 * scale;
  ctx.save();
  ctx.fillStyle = "#808080";
  ctx.fillRect(_0x27eed7 - _0x14a3cc / 2, _0x422cf4 + _0x2a206d, _0x14a3cc, _0x19f182);
  ctx.fillStyle = "#FF0000";
  ctx.fillRect(_0x27eed7 - _0x14a3cc / 2, _0x422cf4 + _0x2a206d, _0x14a3cc * (_0x1a3815.health / 100), _0x19f182);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1;
  ctx.strokeRect(_0x27eed7 - _0x14a3cc / 2, _0x422cf4 + _0x2a206d, _0x14a3cc, _0x19f182);
  ctx.restore();
}
function createControlPanel() {
  const _0x391fe2 = document.createElement("div");
  _0x391fe2.style.position = "fixed";
  _0x391fe2.style.bottom = "10px";
  _0x391fe2.style.left = "50%";
  _0x391fe2.style.transform = "translateX(-50%)";
  _0x391fe2.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  _0x391fe2.style.padding = "10px";
  _0x391fe2.style.borderRadius = "5px";
  _0x391fe2.style.display = "flex";
  _0x391fe2.style.gap = "20px";
  const _0x3db8ad = [{
    "label": "血量",
    "value": "showHealth",
    "state": showHealth
  }, {
    "label": "名称",
    "value": "showName",
    "state": showName
  }, {
    "label": "头盔",
    "value": "showHelmet",
    "state": showHelmet
  }, {
    "label": "护甲",
    "value": "showArmor",
    "state": showArmor
  }, {
    "label": "武器名称",
    "value": "showWeapon",
    "state": showWeapon
  }, {
    "label": "朝向",
    "value": "showDirection",
    "state": showDirection
  }, {
    "label": "追踪",
    "value": "trackingMode",
    "state": trackingMode !== "none"
  }];
  _0x3db8ad.forEach(_0x533785 => {
    {
      const _0x7e2d0e = document.createElement("label");
      _0x7e2d0e.style.color = "white";
      const _0x2d7eb4 = document.createElement("input");
      _0x2d7eb4.type = "checkbox";
      _0x2d7eb4.checked = _0x533785.state;
      _0x2d7eb4.addEventListener("change", () => handleToggleChange(_0x533785.value, _0x2d7eb4.checked));
      _0x7e2d0e.appendChild(_0x2d7eb4);
      _0x7e2d0e.appendChild(document.createTextNode(_0x533785.label));
      _0x391fe2.appendChild(_0x7e2d0e);
    }
  });
  document.body.appendChild(_0x391fe2);
}
function handleToggleChange(_0x55fa6b, _0x85b2c) {
  if (_0x55fa6b === "showHealth") showHealth = _0x85b2c;
  if (_0x55fa6b === "showName") showName = _0x85b2c;
  if (_0x55fa6b === "showHelmet") showHelmet = _0x85b2c;
  if (_0x55fa6b === "showArmor") showArmor = _0x85b2c;
  if (_0x55fa6b === "showWeapon") showWeapon = _0x85b2c;
  if (_0x55fa6b === "showDirection") showDirection = _0x85b2c;
  if (_0x55fa6b === "trackingMode") trackingMode = _0x85b2c ? "track" : "none";
  saveSettings();
  drawMap();
}
function centerOnPlayer(_0x3952b5) {
  const _0x39e9c9 = canvas.width / 2,
    _0x4fa53a = canvas.height / 2;
  offsetX = _0x39e9c9 - _0x3952b5.x * scale;
  offsetY = _0x4fa53a - _0x3952b5.y * scale;
}
socket.onmessage = _0x174975 => {
  try {
    {
      const _0x1a1bbe = JSON.parse(_0x174975.data);
      if (_0x1a1bbe.type === "map") img.src = _0x1a1bbe.map + ".jpg";else _0x1a1bbe.type === "update" && Array.isArray(_0x1a1bbe.players) && (players = _0x1a1bbe.players, drawMap());
    }
  } catch (_0x1d6bdb) {
    console.error("WebSocket 消息解析错误:", _0x1d6bdb);
  }
};
createRadarPage();