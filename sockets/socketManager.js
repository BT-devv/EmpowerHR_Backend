const WebSocket = require("ws");

let wss;
const clients = new Map(); // employeeID -> ws

function initWebSocket(server) {
  wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    ws.on("message", (msg) => {
      try {
        const data = JSON.parse(msg);
        if (data.type === "register" && data.employeeID) {
          clients.set(data.employeeID, ws);
          console.log(`Employee ${data.employeeID} connected`);
        }
      } catch (err) {
        console.error("WS Message Error:", err);
      }
    });

    ws.on("close", () => {
      for (const [employeeID, client] of clients.entries()) {
        if (client === ws) {
          clients.delete(employeeID);
          break;
        }
      }
    });
  });
}

// Gửi thông báo chung cho tất cả loại thông báo
const sendNotification = (employeeID, notificationType, message, data) => {
  const socket = clients.get(employeeID);
  if (socket && socket.readyState === 1) {
    socket.send(
      JSON.stringify({
        type: notificationType, // Loại thông báo (ví dụ: Absence, Overtime, payroll)
        message: message, // Nội dung thông báo
        data: data, // Dữ liệu thêm nếu có (ví dụ: thông tin về đơn nghỉ phép hoặc OT)
      })
    );
  } else {
    console.log(`Không tìm thấy kết nối socket cho ${employeeID}`);
  }
};

module.exports = {
  initWebSocket,
  sendNotification,
};
