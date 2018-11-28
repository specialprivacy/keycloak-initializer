const KcAdminClient = require("keycloak-admin").default;
const fs = require("fs");

class KeycloakInitializer {
  constructor(settings) {
    this.settings = settings;
    this.keycloakClient = null;
  }

  async initiateKeycloak(realms) {
    if (!this.keycloakClient) {
      await this.authenticateKeycloak(this.settings);
    }
    await this.createRealms(realms);
  }

  async authenticateKeycloak(settings) {
    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    await this.loadPayload(settings, "auth");
    console.log("\nAuthenticating to Keycloak.");
    let authenticated = false;
    let retryCounter = 0;
    while (!authenticated && retryCounter < 30) {
      try {
        this.keycloakClient = new KcAdminClient(settings);
        await this.keycloakClient.auth(settings.auth);
        authenticated = true;
      } catch (e) {
        if (e.response && e.response.status === 401) {
          throw new Error("Invalid Keycloak credentials.");
        }
        console.info("Keycloak is not available yet.");
        retryCounter++;
        await sleep(5000);
      }
    }
    if (!authenticated) {
      throw new Error(
        `Could not connect to Keycloak after ${retryCounter} attempts.`
      );
    }
    console.log("Authenticated to Keycloak.\n");
    return authenticated;
  }
  async loadPayload(json, fileNameAttribute = "payload") {
    return new Promise(function(resolve, reject) {
      if(!json) {
        resolve();
      }
      const filePath = json[fileNameAttribute + "File"];
      if (!filePath) {
        resolve();
      }
      fs.readFile(filePath, function(err, data) {
        if (err) {
          if (err.code === "ENOENT") {
            console.info(
              "Could not find payload file at [%s], exiting.",
              filePath
            );
          } else {
            console.info("An error occurred when opening the payload file.");
          }
          return reject(err);
        }
        json[fileNameAttribute] = JSON.parse(data);
        return resolve(json);
      });
    });
  }

  // This function ensures all promises have been resolved before continuing.
  async processArray(array, process) {
    const promises = array.map(process.bind(this));
    return await Promise.all(promises);
  }
  async createRealms(realms = []) {
    return this.processArray(realms, this.createRealm);
  }
  async createRealm(realm) {
    try {
      await this.loadPayload(realm);
      console.info("\nInitializing realm [%s].", realm.payload.realm);
      if (await this.keycloakClient.realms.findOne(realm.payload)) {
        console.info(
          "Realm [%s] already exists, updating.",
          realm.payload.realm
        );
        await this.keycloakClient.realms.update(
          { realm: realm.payload.realm },
          realm.payload
        );
        console.info("Realm [%s] updated.", realm.payload.realm);
      } else {
        await this.keycloakClient.realms.create(realm.payload);
      }
      this.keycloakClient.setConfig({
        realmName: realm.payload.realm
      });
      console.info("Created realm [%s].", realm.payload.realm);
      console.log("\nCreating roles...");
      await this.processArray(realm.roles || [], this.createRole);
      console.log("Roles created...\n");
      console.log("Creating clients...");
      await this.processArray(realm.clients || [], this.createClient);
      console.log("Clients created...\n");
      console.log("Creating groups...");
      await this.processArray(realm.groups || [], this.createGroup);
      console.log("Groups created...\n");
      console.log("Creating users...");
      await this.processArray(realm.users || [], this.createUser);
      console.log("Users created...\n");
      console.info("Done initializing realm [%s].", realm.payload.realm);
    } catch (e) {
      console.error(e);
      console.info("Could not create realm [%s].", realm.payload.realm);
    }
  }
  async createRole(role) {
    try {
      await this.loadPayload(role);
      if (
        await this.keycloakClient.roles.findOneByName({
          name: role.payload.name
        })
      ) {
        console.info("Role [%s] already exists, updating.", role.payload.name);
        await this.keycloakClient.roles.updateByName(
          { name: role.payload.name },
          role.payload
        );
        console.info("Role [%s] updated.", role.payload.name);
      } else {
        await this.keycloakClient.roles.create(role.payload);
        console.info("Created role [%s].", role.payload.name);
      }
    } catch (e) {
      console.error(e);
      console.info("Could not create role [%s].", role.payload.name);
    }
  }
  async createClient(client) {
    try {
      await this.loadPayload(client);
      let exists = (await this.keycloakClient.clients.find({
        clientId: client.payload.clientId
      }))[0];

      if (exists) {
        console.info(
          "Client [%s] already exists, updating.",
          client.payload.clientId
        );
        await this.keycloakClient.clients.update(
          { id: exists.id },
          client.payload
        );
        console.info("Client [%s] updated.", client.payload.clientId);
      } else {
        await this.keycloakClient.clients.create(client.payload);
        console.info("Created client [%s].", client.payload.clientId);
      }
      await this.createClientRoles(client);
    } catch (e) {
      console.error(e);
      console.info("Could not create client [%s].", client.payload.clientId);
    }
  }
  async createClientRoles(inputClient) {
    if (!inputClient.roles || inputClient.roles.length === 0) {
      return;
    }
    return this.processArray(inputClient.roles, async inputRole => {
      try {
        const client = (await this.keycloakClient.clients.find({
          clientId: inputClient.payload.clientId
        }))[0];
        const role = await this.keycloakClient.clients.findRole({
          id: client.id,
          roleName: inputRole.name
        });
        if (role) {
          console.log(
            "Client role [%s] for client [%s] already exists, updating.",
            inputRole.name,
            inputClient.payload.clientId
          );
          await this.keycloakClient.clients.updateRole(
            {
              id: client.id,
              roleName: role.name
            },
            inputRole
          );
          console.log(
            "Client role [%s] for client [%s] updated.",
            inputRole.name,
            inputClient.payload.clientId
          );
          return;
        }
        inputRole["id"] = client.id;
        await this.keycloakClient.clients.createRole(inputRole);
        console.log(
          "Created client role [%s] for client [%s].",
          inputRole.name,
          inputClient.payload.clientId
        );
      } catch (e) {
        console.error(e);
        console.log(
          "Could not create client role [%s] for client [%s].",
          inputRole.name,
          inputClient.payload.clientId
        );
      }
    });
  }
  async createGroup(group) {
    try {
      await this.loadPayload(group);
      let exists = (await this.keycloakClient.groups.find({
        search: group.payload.name
      }))[0];

      if (exists) {
        console.info(
          "Group [%s] already exists, updating.",
          group.payload.name
        );
        await this.keycloakClient.groups.update(
          { id: exists.id },
          group.payload
        );
        console.info("Group [%s] updated.", group.payload.name);
      } else {
        await this.keycloakClient.groups.create(group.payload);
        console.info("Created group [%s].", group.payload.name);
        exists = (await this.keycloakClient.groups.find({
          search: group.payload.name
        }))[0];
      }
      await this.mapToRealmRoles(exists, group["realmRoles"], "groups");
      await this.mapToClientRoles(exists, group["clientRoles"], "groups");
    } catch (e) {
      console.error(e);
      console.info("Could not create group [%s].", group.payload.name);
    }
  }
  async createUser(user) {
    try {
      await this.loadPayload(user);
      let exists = (await this.keycloakClient.users.find({
        username: user.payload.username
      }))[0];
      if (exists) {
        console.info(
          "User [%s] already exists, updating.",
          user.payload.username
        );
        await this.keycloakClient.users.update({ id: exists.id }, user.payload);
        console.info("User [%s] updated.", user.payload.username);
      } else {
        await this.keycloakClient.users.create(user.payload);
        console.info("Created user [%s].", user.payload.username);
        exists = (await this.keycloakClient.users.find({
          username: user.payload.username
        }))[0];
      }
      await this.mapToGroups(exists, user.groups);
      await this.mapToRealmRoles(exists, user["realmRoles"], "users");
      return await this.mapToClientRoles(exists, user["clientRoles"], "users");
    } catch (e) {
      console.error(e);
      console.info("Could not create user [%s].", user.payload.username);
    }
  }
  async mapToGroups(user, groups) {
    try {
      let func = async function(group) {
        return this.mapUserGroup(user, group);
      };
      return this.processArray(groups, func);
    } catch (e) {
      console.error(e);
      console.info("Could not map user [%s] to groups.", user.username);
    }
  }
  async mapUserGroup(user, groupName) {
    try {
      const groups = await this.keycloakClient.users.listGroups({
        id: user.id
      });
      const group = (await this.keycloakClient.groups.find({
        search: groupName
      }))[0];
      if (!group) {
        throw new Error(`Group [${groupName}] does not exist.`);
      }
      if (
        groups.some(userGroup => {
          return group.id === userGroup["id"];
        })
      ) {
        console.info(
          "Mapping between group [%s] and user [%s] already exists, skipping.",
          group.name,
          user.username
        );
        return;
      }

      await this.keycloakClient.users.addToGroup({
        id: user.id,
        groupId: group.id
      });
      console.info(
        "Created mapping between user [%s] and group [%s].",
        user.username,
        groupName
      );
    } catch (e) {
      console.error(e);
      console.info(
        "Could not create mapping between user [%s] and group [%s].",
        user.username,
        groupName
      );
    }
  }
  async mapToRealmRoles(resource, roles, type) {
    const promises = (roles || []).map(async role => {
      return this.mapToRealmRole(resource, role, type);
    });
    return await Promise.all(promises);
  }
  async mapToRealmRole(resource, inputRole, type) {
    try {
      let realmRoles = await this.keycloakClient[type].listRealmRoleMappings({
        id: resource.id
      });
      let role = await this.keycloakClient.roles.findOneByName({
        name: inputRole.name
      });
      if (!role) {
        throw new Error(`Realm role [${inputRole.name}] does not exist.`);
      }

      if (
        realmRoles.some(realmRole => {
          return role["id"] === realmRole.id;
        })
      ) {
        console.info(
          "Mapping between %s [%s] and realm role [%s] already exists, skipping.",
          type.substr(0, type.length - 1),
          resource.username || resource.name,
          role["name"]
        );
        return;
      }

      await this.keycloakClient[type].addRealmRoleMappings({
        id: resource.id,

        // at least id and name should appear
        roles: [
          {
            id: role["id"],
            name: role["name"]
          }
        ]
      });
      console.info(
        "Created mapping between %s [%s] and realm role [%s].",
        type.substr(0, type.length - 1),
        resource.username || resource.name,
        role["name"]
      );
    } catch (e) {
      console.error(e);
      console.info(
        "Could not create mapping between %s [%s] and realm role [%s].",
        type.substr(0, type.length - 1),
        resource.username || resource.name,
        inputRole.name
      );
    }
  }
  async mapToClientRoles(resource, roles, type) {
    const promises = (roles || []).map(async role => {
      return this.mapToClientRole(resource, role, type);
    });
    return await Promise.all(promises);
  }
  async mapToClientRole(resource, inputRole, type) {
    try {
      let client = (await this.keycloakClient.clients.find({
        clientId: inputRole.clientId
      }))[0];
      if (!client) {
        throw new Error(`Client [${inputRole.clientId}] does not exist.`);
      }
      let clientRoles = await this.keycloakClient[type].listClientRoleMappings({
        id: resource.id,
        clientUniqueId: client.id
      });
      let role = await this.keycloakClient.clients.findRole({
        id: client.id,
        roleName: inputRole.name
      });
      if (!role) {
        throw new Error(
          `Client role [${inputRole.name}] does not exist for client [${
            inputRole.clientId
          }].`
        );
      }

      if (
        clientRoles.some(clientRole => {
          return role["id"] === clientRole.id;
        })
      ) {
        console.info(
          "Mapping between %s [%s] and client role [%s/%s] already exists, skipping.",
          type.substr(0, type.length - 1),
          resource.username || resource.name,
          client.clientId,
          role["name"]
        );
        return;
      }

      await this.keycloakClient[type].addClientRoleMappings({
        id: resource.id,
        clientUniqueId: client.id,

        // at least id and name should appear
        roles: [
          {
            id: role["id"],
            name: role["name"]
          }
        ]
      });
      console.info(
        "Created mapping between %s [%s] and client role [%s/%s].",
        type.substr(0, type.length - 1),
        resource.username || resource.name,
        client.clientId,
        role["name"]
      );
    } catch (e) {
      console.error(e);
      console.info(
        "Could not create mapping between %s [%s] and client role [%s/%s].",
        type.substr(0, type.length - 1),
        resource.username || resource.name,
        inputRole.clientId,
        inputRole.name
      );
    }
  }
}

module.exports = function(config) {
  return new KeycloakInitializer(config);
};

module.exports.KeycloakInitializer = KeycloakInitializer;
