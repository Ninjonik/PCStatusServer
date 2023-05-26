const express = require('express');
const net = require('net');
const path = require('path');
const ping = require('ping');
const cors = require('cors');
const wol = require('wol');
const fs = require('fs');
const { isIP } = require('net');

const jsonDataPath = path.join(__dirname, 'pcstatus/src/computers.json');

var isElevated;
try {
    child_process.execFileSync( "net", ["session"], { "stdio": "ignore" } );
    isElevated = true;
}
catch ( e ) {
    isElevated = false;
}

const app = express();

app.use(cors());

app.use(express.static(path.join(__dirname, 'pcstatus/build')));

app.get('/ping/:ipAddress', async (req, res) => {
  const { ipAddress } = req.params;
  try {
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => resolve({ time: 'timeout' }), 2000);
    });

    const pingPromise = ping.promise.probe(ipAddress, {
      extra: isElevated ? ['-c', '1'] : [], 
    });

    const response = await Promise.race([timeoutPromise, pingPromise]);

    if (response.time === 'timeout') {
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

app.use(express.json());

app.post('/add-computer', (req, res) => {
  const { name, macAddress, ipAddress } = req.body;

  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})|([0-9a-fA-F]{4}.[0-9a-fA-F]{4}.[0-9a-fA-F]{4})$/;

  if (!macRegex.test(macAddress)) {
    return res.json({ error: 'Neplatná MAC Adresa' });
  }

  if (!isIP(ipAddress)) {
    return res.json({ error: 'Neplatná IP Adresa' });
  }

  const newComputer = { name, macAddress, ipAddress };

  const jsonData = JSON.parse(fs.readFileSync(jsonDataPath, 'utf8'));

  jsonData.push(newComputer);

  fs.writeFileSync(jsonDataPath, JSON.stringify(jsonData, null, 2), 'utf8');

  res.json({ success: true });
});



app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'pcstatus/build', 'index.html'));
});

app.post('/remove-computer', (req, res) => {
  const { macAddress } = req.body;

  const jsonData = JSON.parse(fs.readFileSync(jsonDataPath, 'utf8'));

  const index = jsonData.findIndex((computer) => computer.macAddress === macAddress);

  if (index !== -1) {
    jsonData.splice(index, 1);

    fs.writeFileSync(jsonDataPath, JSON.stringify(jsonData, null, 2), 'utf8');

    res.json({ success: true });
  } else {
    res.json({ success: false, message: 'Computer not found.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'pcstatus/build', 'index.html'));
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
