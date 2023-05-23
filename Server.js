const express = require('express');
const net = require('net');
const path = require('path');
const cors = require('cors');

const app = express();

// Enable CORS for all routes
app.use(cors());

// Serve the static build files
app.use(express.static(path.join(__dirname, 'pcstatus/build')));

// Handle ping requests
app.get('/ping/:ipAddress/:port', (req, res) => {
  const { ipAddress, port } = req.params;
  const client = net.createConnection({ host: ipAddress, port });

  client.on('connect', () => {
    res.status(200).json({ status: 'success' });
    client.end();
  });

  client.on('error', (error) => {
    res.status(200).json({ status: 'error' });
  });
});

// Serve the index.html file for all other requests
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'pcstatus/build', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
