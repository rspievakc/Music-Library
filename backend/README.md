# Music Library Backend

## 1. Abstract

  This project implements a music library server, the musics are served from a dropbox account.
  When the server starts it generates an in memory listing cache to prevent doing multiple accesses to retrieve the music listings. It's also configured to used the metadata from the files and to update each entry .info property.

## 2. Configuration

To download all the dependencies you need to run:

```npm init```

You need to copy the file config.js.template to config.js and update the values.

To run the server:

```npm start```

## 3. API

  There are two endpoints for the current API:

  /music/list/:path

    This endpoint will list the files found on the folder defined by the :path URI component.

    This is JSON object format returned by the listing endpoint:

      {
        ".info": {
          "id": String,
          "path": String,
          "type": String, 
          "size": Number,
          "album": String,
          "track": {
            "no": Number,
            "of": Number
            },
          "dataFormat": String,
          "duration": Number,
          "genre":[ String ],
          "artist": String,
          "year": Number
          }
      }

      The properties: size, album, track, dataFormat, duration, genre, artist and year are only available for music files. All the other properties are available for musics and folders.

      All the folders entries are attached as object properties, where the proeperty name refers to the path component.

  /music/track/:file

    This endpoint will stream the song at the :file URI component location.

## 4. TODOs

  These are some optional improvements which can be done:
  
  * Use the lastFM API to retrieve the album covers and the artist/band biography.
  * Separate the library listing cache on a CLI utility and upload the lastest JSON cache file to the dropbox application's folder. Each time the server starts it will check if there is an updated cache file and will download it.
  * Use the REDIS DB to store the music listings and the user status.
  
  These are required functionalities which are going to be addresses during the frontend development.

  * Implement the test cases and verify the test coverage
  * Register the users and return a JSON web token to identify them and to track their current status.
