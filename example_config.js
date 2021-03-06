module.exports = {
  "settings": {
    "baseUrl": "http://keycloak:8080/auth",
    "auth" : {
      "username": "keycloak",
      "password": "keycloak",
      "grantType": "password",
      "clientId": "admin-cli"
    }
  },
  "realms": [
    {
      "payload": {
        "realm": "example_realm"
      },

      "roles": [
        {
          "payload": {
            "name": "example_realm_role_1"
          },
        },
        {
          "payload": {
            "name": "example_realm_role_2"
          }
        }
      ],
      "clients": [
        {
          "payload": {
            "clientId": "example_client",
            "secret": "example_client_secret",
            "redirectUris": [
              "/callback/*",
              "http://localhost/callback/*"
            ]
          },
          "roles": [{ "name": "example_client_role_1" }, { "name": "example_client_role_2" }]
        }
      ],
      "groups": [
        {
          "payload": {
            "name": "example_group"
          },
          "clientRoles": [{ "clientId": "example_client", "name": "example_client_role_1"}],
          "realmRoles": [{ "name": "example_realm_role_1"}]
        }
      ],
      "users": [
        {
          "payload": {
            "username": "example_user_1",
            "enabled": true,
            "credentials": [{
              "type": "password",
              "temporary": false,
              "value": "password"
            }]
          },
          "groups": ["example_group"],
          "clientRoles": [{ "clientId": "example_client", "name": "example_client_role_2"}],
          "realmRoles": [{ "name": "example_realm_role_2"}]
        }
      ]
    }
  ]
};