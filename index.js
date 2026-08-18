import express from "express";
import { createServer } from "node:http";
import { hostname } from "node:os";
import { join } from "node:path";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
const epoxyPath   = join(process.cwd(), "node_modules/@mercuryworkshop/epoxy-transport/dist");
const libcurlPath = join(process.cwd(), "node_modules/@mercuryworkshop/libcurl-transport/dist");
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import net from "node:net";

const scramjetControllerPath = join(process.cwd(), "node_modules/@mercuryworkshop/scramjet-controller/dist");

function wsSameOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.static("public"));
app.use("/uv/", express.static(uvPath));
app.use("/epoxy/", express.static(epoxyPath));
app.use("/libcurl/", express.static(libcurlPath));
app.use("/baremux/", express.static(baremuxPath));
app.use("/scram/", express.static("scramjet"));
app.use("/controller/", express.static(scramjetControllerPath));

app.get("/education", (req, res) => {
  res.sendFile(join(process.cwd(), "public", "proxy.html"));
});

app.use((req, res) => {
  res.status(404).type("text/plain").send("404 - not found");
});

const server = createServer();

server.on("request", (req, res) => {
  app(req, res);
});
server.on("upgrade", (req, socket, head) => {
  if (req.url.split("?")[0].endsWith("/wisp/")) {
    if (!wsSameOrigin(req)) {
      socket.destroy();
      return;
    }
    socket.setNoDelay(true);
    socket.setKeepAlive(true, 30_000);
    const upstream = net.connect(6900, "127.0.0.1", () => {
      upstream.setNoDelay(true);
      upstream.write(`${req.method} ${req.url} HTTP/1.1\r\n`);
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        upstream.write(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`);
      }
      upstream.write("\r\n");
      if (head && head.length) upstream.write(head);
      socket.pipe(upstream);
      upstream.pipe(socket);
    });
    upstream.on("error", () => socket.destroy());
    socket.on("error", () => upstream.destroy());
  } else socket.end();
});

let port = parseInt(process.env.PORT || "");

if (isNaN(port)) port = 6767;

server.on("listening", () => {
  const address = server.address();

  console.log("Listening on:");
  console.log(`\thttp://localhost:${address.port}`);
  console.log(`\thttp://${hostname()}:${address.port}`);
  console.log(
    `\thttp://${
      address.family === "IPv6" ? `[${address.address}]` : address.address
    }:${address.port}`
  );
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close();
  process.exit(0);
}

server.listen({ port });