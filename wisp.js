import { Mrrowisp } from "mrrowisp";
import { createServer } from "node:http";

const wisp = new Mrrowisp({ port: 6901, logLevel: "info" });
await wisp.start(1);

const server = createServer();
server.on("upgrade", (req, socket, head) => {
  wisp.route(req, socket, head);
});

server.listen(6900, "127.0.0.1", () => {
  console.log("[mrrowisp] routing on 127.0.0.1:6900");
});

process.on("SIGTERM", () => { wisp.stop(); process.exit(0); });
process.on("SIGINT",  () => { wisp.stop(); process.exit(0); });