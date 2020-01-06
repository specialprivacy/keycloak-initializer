# Description

This service is designed to make the configuration of a Keycloak instance easy and automatic.
A config.json file needs to be provided and will be processed to create realms, roles, clients, groups and users.
Payload entries can also be fetched from a different file (to keep credentials secure).

A file named config.json needs to be provided. This can be mounted using docker volumes.