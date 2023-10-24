import fs from 'fs';
import path from 'path';
import redisCacheMain from '../bunDL-server/src/helpers/redisConnection.js';
import BundlServer from '../bunDL-server/src/bundl.js';
import { schema } from './schema.js';
import { extractIdFromQuery } from '../bunDL-server/src/helpers/queryObjectFunctions.js';
import {
  couchDBSchema,
  documentValidation,
} from '../bunDL-server/couchSchema.js';
import { BasicAuthenticator } from 'ibm-cloud-sdk-core';
import graphqlHTTP from 'express-graphql';

import pouchdb from 'pouchdb';
import { CloudantV1 } from '@ibm-cloud/cloudant';
const vcapLocal = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../vcap-local.json'), 'utf8')
); //refactor to use bun syntax ^

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
    // console.log('Membership info: ', info);
  })
  .catch((err) => {
    console.error('Error connecting to Cloudant:', err);
    console.error('Stack: ', err.stack);
  });

export const db = new pouchdb('bundl-database');

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

import {
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
      return bunDLServer.query(req).then((queryResults) => {
        console.log(queryResults);
        return new Response(JSON.stringify(queryResults.cachedata), {
          status: 200,
        });
      });
    }
  },
  '/graphql-test': async (req) => {
    if (req.method === 'POST') {
      const request = await req.json();
      const query = request.query;
      const variables = request.variables || {};

      return graphql({
        schema,
        source: query,
        variableValues: variables,
      })
        .then((result) => {
          return new Response(JSON.stringify(result), { status: 200 });
        })
        .catch((err) => {
          return new Response(JSON.stringify({ errors: [err] }), {
            status: 500,
          });
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
      //todo ======= REFACTOR FOR UPDATED CACHING LOGIC ===============//
      let data = await Bun.readableStreamToJSON(req.body);
      data = JSON.parse(data);
      console.log('data is: ', data);
      const response = await db.post(data);
      console.log('response is: ', response);
      const doc = await db.get(response.id);
      console.log('doc is: ', doc);
      bunDLClient.set(response.id, doc);
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
