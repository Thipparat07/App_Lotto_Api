import http from "http";
import { app } from "./app";

const port: number = parseInt(process.env.PORT || "3000", 10); // แปลงเป็นตัวเลข
const host: string = "0.0.0.0"; // กำหนดโฮสต์เป็นทุกอินเตอร์เฟซเครือข่าย

const server = http.createServer(app);

server.listen(port, host as any, () => {
  const address = server.address();

  if (typeof address === 'string') {
    console.log(`Server is started at ${address}`);
  } else if (address && address.address) {
    console.log(`Server is started at http://${getIPAddress()}:${address.port}`);
  }
});

// ฟังก์ชันในการดึง IP ของเครื่อง
function getIPAddress() {
  const interfaces = require('os').networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const intf of interfaces[name]) {
      // ถ้าเจอ IP ที่ไม่ใช่ internal (เช่น 127.0.0.1) และเป็น IPv4
      if (!intf.internal && intf.family === 'IPv4') {
        return intf.address;
      }
    }
  }
  return 'localhost'; // กรณีที่ไม่เจอ IP อื่น จะใช้ localhost
}
