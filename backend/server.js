const fs = require('fs')
const util = require('util');
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fetch = require('isomorphic-fetch');
const Dropbox = require('dropbox').Dropbox;
const DropBoxStream = require('dropbox-stream');
const MusicMetadata = require('music-metadata');
const config = require('./config')
var mime = require('mime-types');

// LastFM API initialization.
// Todo retrieve albuns covers from last FM.
const LastFM = require('last-fm')
const lastfm = new LastFM(config.lastFmApiKey, { userAgent: 'MyApp/1.0.0 (http://example.com)' })

const dropBoxAccessToken = config.dropBoxApiKey;

// Initial music/song cache initialization
const musicInfoCache = {
  '.info' : {
    type: 'folder',
    path: '',
  }
}

// DropBox API initialization
var DropBox = new Dropbox({ 
  accessToken: dropBoxAccessToken, 
  fetch: fetch 
});

// HTTP Server configuration
const app = express();
app.use('/music', router);
// Servers the static content, the frontend files will be served from there.
app.use(express.static('public'));

// Lists the folder/songs using the URI as selector
router.get('/list/*', function(req, res) {
  let path = decodeURI(req.url).
    replace('/list','').
    replace(/\/$/,'').
    replace(/^\//,'').
    split('/');
  
  let result = musicInfoCache;  
  for (let i=0; i < path.length; i++) {
    result = result[path[i]];
    if (!result) {
      break;
    }
  }

  if (!result) {
    res.status(404).send('Not found.').end();
  } else {

    let folder = {}

    Object.keys(result).forEach(key => {
      if (result.hasOwnProperty(key)) {
        if (key === '.info') {
          folder[key] = result[key];
        }
      }
    })

    res.send(result);
  }
})

// Stream the song directly from the dropbox account.
router.get('/track/*', function(req, res) {
  let path = decodeURI(req.url.replace('/track',''));

  console.log(path);

  // Create the stream targting the request music from the DropBox app folder.
  let stream = DropBoxStream.createDropboxDownloadStream({
    token: dropBoxAccessToken,
    path
  })
  .on('error', err => {
    console.log(err)
    res.status(404).send('File not found.')
  })
  .on('metadata', metadata => {
    res.writeHead(200, {
      'Content-Type': mime.lookup(path),
      'Content-Length': metadata.size
    });
  })
  .pipe(res) 
  .on('progress', res => console.log(res))
  .on('finish', () => console.log('Done!'));
})

// Generates the music info cache
// This reduces the required bandwith to access to the music listings

// Retrieves the information for the song.
function retrieveMusicInformation(entry) {
  return new Promise((resolve, reject) => {

    const info = entry['.info'];
    let stream = DropBoxStream.createDropboxDownloadStream({
      token: dropBoxAccessToken,
      path: info.path,
    })
    .on('error', err => {
      console.log(err)
      reject(err);
    })
    
    MusicMetadata.parseStream(stream, 'audio/mpeg', {}).then( metadata => {
      let info = entry['.info'];
      entry['.info'] = {
        ...entry['.info'],
        album: metadata.common.album,
        track: metadata.common.track,
        dataFormat: metadata.format.dataformat,
        duration: metadata.format.duration,
        genre: metadata.common.genre,
        artist: metadata.common.albumartist,
        year: metadata.common.year
      }
      stream.destroy();
      resolve(entry)
    }).catch(error => {
      stream.destroy();
      reject(error);
    });
  })
}

// Retrieves the information for the folder (recursively).
function retrieveFolderInformation(parent, path) {
  return new Promise((resolve, reject) => {
    let topFolder = false;

    DropBox.filesListFolder({ path })
    .then(function(response) {
      let target = parent
      if (path.trim.length > 0) {
        target = parent[path];
        target = target || {}
      } else { 
        topFolder = true;
      }

      let promises = [];
      for (let i=0; i < response.entries.length; i++) {
        let entry = response.entries[i];  
        let result = {} 
        let type = entry['.tag'];
        let info = {
          id: entry.id,
          path: entry.path_display,
          type,
        }
        result['.info'] = info;
        target[entry.name] = result;

        if (type === 'folder') {
          promises.push(retrieveFolderInformation(result, info.path));
        } else {
          info.size = entry.size;
          promises.push(retrieveMusicInformation(result));
        }
      }

      Promise.all(promises).then(() => {
        resolve(musicInfoCache);
      }).catch(error => {
        console.log(error);
        reject(error);
      })
    })
    .catch(function(error) {
      reject(error);
    });
  })
}

// Creates the listing cache and then starts the HTTP server.
console.log("Creating the music listing cache...");
retrieveFolderInformation(musicInfoCache, '').then(data => {
  console.log('Music listing cache generated.');
  app.listen(config.port, () => {
    console.log(`HTTP Server listening on port ${config.port}.`)
  }).
  on('error', error => {
    console.log(error);
  });
}).catch(error => {
  console.log(error)
});
