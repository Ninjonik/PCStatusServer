const express = require('express');
const net = require('net');
const path = require('path');
const ping = require('ping');
const cors = require('cors');
const wol = require('wol');

var isElevated;
try {
    child_process.execFileSync( "net", ["session"], { "stdio": "ignore" } );
    isElevated = true;
}
catch ( e ) {
    isElevated = false;
}

const app = express();

// Enable CORS for all routes
app.use(cors());

// Serve the static build files
app.use(express.static(path.join(__dirname, 'pcstatus/build')));

app.get('/ping/:ipAddress', async (req, res) => {
  const { ipAddress } = req.params;
  try {
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => resolve({ time: 'timeout' }), 2000); // Set a timeout of 2000 milliseconds (2 seconds)
    });

    const pingPromise = ping.promise.probe(ipAddress, {
      extra: isElevated ? ['-c', '1'] : [], // Add ['-c', '1'] if program has admin rights
    });

    const response = await Promise.race([timeoutPromise, pingPromise]);

    if (response.time === 'timeout') {
      // If the response time is 'timeout', consider it as a timeout
      res.status(200).json({ status: 'error' });
    } else {
      const status = response.alive ? 'success' : 'error';
      res.status(200).json({ status });
    }
  } catch (error) {
    res.status(200).json({ status: 'error' });
  }
});

app.get('/pingport/:ipAddress/:port', (req, res) => {
  const { ipAddress, port } = req.params;
  const timeout = 2000;

  const client = new net.Socket();

  const timeoutId = setTimeout(() => {
    client.destroy();
    res.status(200).json({ status: 'error' });
  }, timeout);

  client.connect(port, ipAddress, () => {
    clearTimeout(timeoutId);
    client.destroy();
    res.status(200).json({ status: 'success' });
  });

  client.on('error', (error) => {
    clearTimeout(timeoutId);
    res.status(200).json({ status: 'error' });
  });
});

app.get('/wol/:macAddress', (req, res) => {
  const { macAddress } = req.params;

  wol.wake(macAddress, function(err, result) {
    if (err) {
      res.status(200).json({ status: 'error' });
    } else {
      res.status(200).json({ status: 'success' });
    }
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
