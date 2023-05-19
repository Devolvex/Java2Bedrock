const express = require('express');
const multer = require('multer');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;

app.use(express.static('public'));

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/convert', upload.single('file'), (req, res) => {
  const zip = new AdmZip(req.file.path);
  const zipEntries = zip.getEntries();

  const bedrockZip = new AdmZip();

  const manifest = {
    format_version: '2.0',
    header: {
      description: 'Converted texture pack from Java to Bedrock Edition',
      name: 'Converted Texture Pack',
      pack_id: uuidv4(),
      min_engine_version: [1, 13, 0],
      version: [1, 0, 0]
    },
    modules: [
      {
        type: 'resources',
        uuid: uuidv4(),
        version: [1, 0, 0]
      }
    ]
  };

  bedrockZip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2)));

  zipEntries.forEach(entry => {
    const entryName = entry.entryName.toLowerCase();

    if (!entryName.startsWith('assets/minecraft/textures/')) {
      return;
    }

    const entryContent = entry.getData();

    const bedrockPath = entryName
      .replace('assets/minecraft/textures/', '')
      .replace('.png', '.tga');

    bedrockZip.addFile(bedrockPath, entryContent);
  });

  const outputPath = path.join('public', 'converted.mcpack');
  bedrockZip.writeZip(outputPath);

  res.download(outputPath, 'converted.mcpack', (err) => {
    if (err) {
      res.status(500).send('Error downloading the converted file');
    }

    fs.unlink(req.file.path, (err) => {
      if (err) {
        console.error('Error deleting the uploaded file:', err);
      }
    });
    fs.unlink(outputPath, (err) => {
      if (err) {
        console.error('Error deleting the converted file:', err);
      }
    });
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});