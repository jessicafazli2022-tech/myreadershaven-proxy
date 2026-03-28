const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

const TARGET = 'https://book-preview-80c02836.viktor.space';

app.use('/', createProxyMiddleware({
  target: TARGET,
  changeOrigin: true,
  secure: true,
  ws: true,
  on: {
    error: (err, req, res) => {
      console.error('Proxy error:', err.message);
      res.status(502).send('Bad Gateway');
    }
  }
}));

app.listen(PORT, () => {
  console.log(`Proxy running on port ${PORT} → ${TARGET}`);
});
