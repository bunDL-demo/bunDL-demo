import pouchdb from 'pouchdb';

const vcapLocal = {
  services: {
    cloudantnosqldb: {
      credentials: {
        apikey: 'QTT6SHWVIWE-KV6GdC-PGZPS8kw28lwt0fBwunhFbqjP',
        host: 'bb239217-6899-4f67-bc43-e8a61ab80e4f-bluemix.cloudantnosqldb.appdomain.cloud',
        iam_apikey_description:
          'Auto-generated for key crn:v1:bluemix:public:cloudantnosqldb:us-south:a/346615b68f04446082a512b3c612e711:44f41151-8ec7-4efd-8b54-b1eb9f927391:resource-key:93dddfcd-1d05-4966-9ba8-a0ad001ec6c0',
        iam_apikey_name: 'bundl-ken',
        iam_role_crn: 'crn:v1:bluemix:public:iam::::serviceRole:Manager',
        iam_serviceid_crn:
          'crn:v1:bluemix:public:iam-identity::a/346615b68f04446082a512b3c612e711::serviceid:ServiceId-398be17c-76a8-42b3-aed5-f38ff8ba2961',
        password: 'ef39c77d041563fad50dd8806bf186c6',
        port: 443,
        url: 'https://apikey-v2-2jehgk0zb28hoy53isl47s86nu1uz6kr3zirqaa4s80k:ef39c77d041563fad50dd8806bf186c6@bb239217-6899-4f67-bc43-e8a61ab80e4f-bluemix.cloudantnosqldb.appdomain.cloud',
        username: 'apikey-v2-2jehgk0zb28hoy53isl47s86nu1uz6kr3zirqaa4s80k',
      },
      label: 'cloudantnosqldb',
    },
  },
};

const cloudantCredentials = vcapLocal.services.cloudantnosqldb.credentials;

const db = new pouchdb('bundl-database');

const pouchURL = cloudantCredentials.url;
const remoteDB = new pouchdb(`${pouchURL}/bundl-test`, {
  auth: {
    username: cloudantCredentials.username,
    password: cloudantCredentials.password,
  },
});

const sync = db.sync(remoteDB, { live: true });
sync.on('error', function (err) {
  console.error('Sync Error', err);
});

export { db };
