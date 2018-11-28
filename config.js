module.exports = {
  "settings": {
    "baseUrl": "http://keycloak:8080/auth",
    "authFile": "./test.json",
    "auth" : {
      "username": "keycloak",
      "password": "keycloak",
      "grantType": "password",
      "clientId": "admin-cli"
    }
  },
  "realms": [
  ]
};