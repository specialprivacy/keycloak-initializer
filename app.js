const KeycloakInitializer = require("./services/keycloak-initializer/keycloak-initializer.class");
const fs = require("fs");
const path = require("path");

// reading in config file
const pathToJson = path.resolve(__dirname, "./config.json");

start();

async function start() {
  try {
    let config = await readConfig();
    let initializer = new KeycloakInitializer(config.settings);
    initializer.initiateKeycloak(config.realms);
  } catch (e) {
    console.error(e);
    console.info("Exiting...");
  }
}

async function readConfig() {
  return new Promise(function(resolve, reject) {
    console.debug("Reading config at [%s]", pathToJson);
    fs.readFile(pathToJson, function(err, data) {
      // exit if there is an error
      if (err) {
        if (err.code === "ENOENT") {
          console.info(
            "Could not find config file at [%s], exiting.",
            pathToJson
          );
        } else {
          console.info("An error occurred when opening the config file.");
        }
        return reject(err);
      }
      // parse config
      return resolve(JSON.parse(data));
    });
  });
}
