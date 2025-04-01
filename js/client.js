//Tue Apr 01 2025 09:58:44 GMT+0800 (中国标准时间)
//Base:<url id="cv1cref6o68qmpt26ol0" type="url" status="parsed" title="GitHub - echo094/decode-js: JS混淆代码的AST分析工具 AST analysis tool for obfuscated JS code" wc="2165">https://github.com/echo094/decode-js</url>
//Modify:<url id="cv1cref6o68qmpt26olg" type="url" status="parsed" title="GitHub - smallfawn/decode_action: 世界上本来不存在加密，加密的人多了，也便成就了解密" wc="741">https://github.com/smallfawn/decode_action</url>
let socket, roomId;
function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    "ip": params.get("ip"),
    "port": params.get("port"),
    "roomId": params.get("roomid")
  };
}
function handleConnect() {
  const ip = document.getElementById("ip").value,
    port = document.getElementById("port").value;
  roomId = document.getElementById("roomid").value;
  if (!ip || !port || !roomId) {
    {
      showError("请填写完整的连接信息");
      return;
    }
  }
  saveConnectionInfo(ip, port);
  connect(ip, port, roomId);
}
function connect(ip, port, roomId) {
  const wsUri = "ws://" + ip + ":" + port;
  socket = new WebSocket(wsUri);
  socket.onopen = () => {
    const msg = JSON.stringify({
      "action": "join_room",
      "roomId": roomId
    });
    socket.send(msg);
  };
  socket.onmessage = msg => {
    const data = JSON.parse(msg.data);
    if (data.status === "ok") clearPage(), loadRadar();else data.status === "error" && showError(data.message);
  };
  socket.onclose = () => {
    console.log("WebSocket 连接已关闭");
  };
  socket.onerror = err => {
    showError("WebSocket 连接出错");
    console.error("WebSocket 错误: ", err);
  };
}
function showError(_0x5a04bd) {
  const _0x4f440d = document.getElementById("errorBox");
  _0x4f440d.textContent = _0x5a04bd;
  _0x4f440d.classList.remove("hidden");
  setTimeout(() => {
    _0x4f440d.classList.add("hidden");
  }, 5000);
}
function clearPage() {
  document.body.innerHTML = "";
}
function loadRadar() {
  const _0x4997c6 = document.createElement("script");
  _0x4997c6.src = "js/radar.js";
  document.body.appendChild(_0x4997c6);
}
function saveConnectionInfo(_0x576d10, _0x49523c) {
  localStorage.setItem("connectionInfo", JSON.stringify({
    "ip": _0x576d10,
    "port": _0x49523c
  }));
}
function loadConnectionInfo() {
  const _0x479baa = JSON.parse(localStorage.getItem("connectionInfo"));
  _0x479baa && (document.getElementById("ip").value = _0x479baa.ip || "", document.getElementById("port").value = _0x479baa.port || "");
}
window.onload = function () {
  const _0x2fc606 = getQueryParams();
  _0x2fc606.ip && _0x2fc606.port && _0x2fc606.roomId ? (document.getElementById("ip").value = _0x2fc606.ip, document.getElementById("port").value = _0x2fc606.port, document.getElementById("roomid").value = _0x2fc606.roomId) : loadConnectionInfo();
};