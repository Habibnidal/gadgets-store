const path = require("path");
const express = require("express");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5173;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

function wrap(handler) {
  return (req, res) => {
    Promise.resolve(handler(req, res)).catch((error) => {
      console.error("API handler failed:", error);
      if (!res.headersSent) {
        res.status(500).json({ ok: false, error: "Server error." });
      }
    });
  };
}

app.post("/api/admin-login", wrap(require("./api/admin-login")));
app.get("/api/products", wrap(require("./api/products")));
app.post("/api/products", wrap(require("./api/products")));
app.delete("/api/products", wrap(require("./api/products")));
app.get("/api/settings", wrap(require("./api/settings")));
app.post("/api/settings", wrap(require("./api/settings")));

app.use(express.static(path.resolve(__dirname)));

app.listen(PORT, () => {
  console.log(`Local server running at http://localhost:${PORT}`);
});
