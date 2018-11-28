const KeycloakInitializer = require("./services/keycloak-initializer/keycloak-initializer.class");
const config = require("./config");
start();

async function start() {
  try {
    let initializer = new KeycloakInitializer(config.settings);
    initializer.initiateKeycloak(config.realms);
  } catch (e) {
    console.error(e);
    console.info("Exiting...");
  }
}

