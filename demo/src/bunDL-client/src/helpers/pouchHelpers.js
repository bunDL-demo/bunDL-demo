import pouchdb from 'pouchdb';

const vcapLocal = {
  services: {
    cloudantnosqldb: {
      credentials: {
        apikey: 'K9StPMhYQ7gGvkVe-6vbB-1_yKoV4hpmIdT9SjJzSp7X',
        host: 'bb239217-6899-4f67-bc43-e8a61ab80e4f-bluemix.cloudantnosqldb.appdomain.cloud',
        iam_apikey_description:
          'Auto-generated for key crn:v1:bluemix:public:cloudantnosqldb:us-south:a/346615b68f04446082a512b3c612e711:44f41151-8ec7-4efd-8b54-b1eb9f927391:resource-key:9b79b4b5-4bfd-4822-91cf-4ee1852e4164',
        iam_apikey_name: 'bundl-brandon',
        iam_role_crn: 'crn:v1:bluemix:public:iam::::serviceRole:Manager',
        iam_serviceid_crn:
          'crn:v1:bluemix:public:iam-identity::a/346615b68f04446082a512b3c612e711::serviceid:ServiceId-7d760fca-83d5-48b1-92cf-d22664ae55cd',
        password: 'f4116c05768ba33c8ae4ce89c6c71a26',
        port: 443,
        url: 'https://apikey-v2-eo862nd3l7nn9eonwj3uwnzviny8k5am6nuzl13f5tq:f4116c05768ba33c8ae4ce89c6c71a26@bb239217-6899-4f67-bc43-e8a61ab80e4f-bluemix.cloudantnosqldb.appdomain.cloud',
        username: 'apikey-v2-eo862nd3l7nn9eonwj3uwnzviny8k5am6nuzl13f5tq',
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
