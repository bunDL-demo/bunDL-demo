import fs from 'fs';
import path from 'path';
import redisCacheMain from '../bunDL-server/src/helpers/redisConnection.js';
import BundlServer from '../bunDL-server/src/bundl.js';
// import BunCache from '../bunDL-client/src/bunCache.js';
import { schema } from './schema.js';
import { extractIdFromQuery } from '../bunDL-server/src/helpers/queryObjectFunctions.js';
import {
  couchDBSchema,
  documentValidation,
} from '../bunDL-server/src/couchSchema.js';
import { BasicAuthenticator } from 'ibm-cloud-sdk-core';
import graphqlHTTP from 'express-graphql';

const { faker } = require('@faker-js/faker');

const pouchdb = require('pouchdb');
const { CloudantV1 } = require('@ibm-cloud/cloudant');
const vcapLocal = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../vcap-local.json'), 'utf8')
); //refactor to use bun syntax ^

// const populateDB = require('../fakeData.js');

const cloudantCredentials = vcapLocal.services.cloudantnosqldb.credentials;
const authenticator = new BasicAuthenticator({
  username: cloudantCredentials.username,
  password: cloudantCredentials.password,
});

const service = new CloudantV1({
  authenticator: authenticator,
});

service.setServiceUrl(Bun.env.URL);

service
  .getMembershipInformation()
  .then((info) => {
    //console.log('Membership info: ', info);
  })
  .catch((err) => {
    console.error('Error connecting to Cloudant:', err);
    console.error('Stack: ', err.stack);
  });

export const pouchDB = new pouchdb('bundl-database'); // local
const pouchURL = cloudantCredentials.url;
const remoteDB = new pouchdb(`${pouchURL}/bundl-test`, {
  auth: {
    username: cloudantCredentials.username,
    password: cloudantCredentials.password,
  },
});

const sync = pouchDB.sync(remoteDB, { live: true }); // sync local and remote, but only interact with db
sync.on('error', function (err) {
  console.error('Sync Error', err);
});

// populateDB(db, 100);
db.changes({
  since: 0,
  include_docs: true
}).then(function (changes) {
  console.log(changes);
}).catch(function (err) {
  console.error(err);
});

const {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLFloat,
  GraphQLInt,
  GraphQLID,
  graphql,
} from 'graphql';

import {
  getRedisInfo,
  getRedisKeys,
  getRedisValues,
} from '../bunDL-server/src/helpers/redisHelper.js';

// const bunDLClient = new BunCache(couchDBSchema, 100);

const bunDLServer = new BundlServer(
  schema,
  3600,
  redisCacheMain.redisPort,
  redisCacheMain.redisHost
);

const BASE_PATH = path.join(__dirname, '../bunDL-client/front-end/public/');

const handlers = {
  '/': async (req) => {
    try {
      const filePath = BASE_PATH + new URL(req.url).pathname;
      const file = await Bun.file(filePath + 'index.html');
      console.log('delivering index.html');
      return new Response(file);
    } catch {
      (err) => new Response('File not found', { status: 404 });
    }
  },
  '/graphql': async (req) => {
    if (req.method === 'POST') {
      // return bunDLServer.query(req).then((queryResults) => {
      // uncomment the above or below line depending on which middleware you want to test (bundlServer vs bunDLClient)
      return bunDLClient.query(req).then((queryResults) => {
        return new Response(JSON.stringify(queryResults), { status: 200 });
      });
    }
  },
  '/bunCache': async (req) => {
    try {
      // const filePath = BASE_PATH + new URL(req.url).pathname;
      const file = await Bun.file(BASE_PATH + 'bunCacheTest.html');
      return new Response(file);
    } catch (error) {
      console.error(error);
    }
  },
  '/setDocument': async (req) => {
    try {
      // let data = {
      //   firstName: 'Amy',
      //   lastName: 'Prosacco',
      //   email: 'amy1234@yahoo.com',
      //   phoneNumber: '546.234.0262 x9801',
      //   animal: 'snake',
      //   avatar:
      //     'https://cloudflare-ipfs.com/ipfs/Qmd3W5DuhgHirLHGVixi6V76LhCkZUz6pnFt5AJBiyvHye/avatar/147.jpg',
      //   subscriptionTier: 'basic',
      // };
//todo ======= REFACTOR FOR UPDATED CACHING LOGIC ===============//
      let data = await Bun.readableStreamToJSON(req.body);
      data = JSON.parse(data);
      console.log('data is: ', data);
      const response = await db.post(data); // insert an id
      console.log('response is: ', response); // get response
      const doc = await db.get(response.id); // then you can access id value
      console.log('doc is: ', doc);
      bunDLClient.set(response.id, doc); // use that value as key for lru cache
      const lruValue = bunDLClient.get(response.id);
      console.log('lruValue is: ', lruValue);
      return new Response(doc);
    } catch (err) {
      console.error(err);
    }
    //todo =========================================================//

    // query -> LRU Cache (map) -> pouchDB -> database (couchDB) -> if exist in couchDB: store it in both pouchDB and LRU Cache (map)

  },
  '/getDocument': async (req) => {
    const doc = await db.get(req);
    console.log(doc);
    return new Response('Document retrieved', { status: 200 });
  },
  // clearCache endpoint is missing - ITS ALWAYS MISSING. iTS A SIGN - Shi
  '/test': (req) => {
    return new Response('🚀 You found me! 🚀');
  },
};

Bun.serve({
  hostname: 'localhost',
  port: 3000,
  async fetch(req) {
    //const data = await req;
    const handler = handlers[new URL(req.url).pathname];
    if (handler) {
      return handler(req);
    }
    return new Response('This is a 404 error', { status: 404 });
  },
  error(err) {
    console.error(err);
    return new Response('An error occurred', { status: 500 });
  },
});
