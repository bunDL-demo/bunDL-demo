import fs from 'fs';
import path from 'path';
// import redisCacheMain from '../bunDL-server/src/helpers/redisConnection.js';
import BundlServer from 'bundl-server';
import { schema } from './schema.js';
// import { extractIdFromQuery } from '../bunDL-server/src/helpers/queryObjectFunctions.js';
// import { couchDBSchema, documentValidation } from '../bunDL-server/couchSchema.js';
// import graphqlHTTP from 'express-graphql';

const COUCHDB_BASE_URL = Bun.env.COUCHDB_URL;

const COUCHDB_USER = Bun.env.COUCHDB_USER;
const COUCHDB_PASSWORD = Bun.env.COUCHDB_PASSWORD;
const AUTH_HEADER = `Basic ${Buffer.from(`${COUCHDB_USER}:${COUCHDB_PASSWORD}`).toString('base64')}`;

async function listDatabases() {
  const response = await fetch(`${COUCHDB_BASE_URL}/bundl-demodb`, {
    headers: {
      Authorization: AUTH_HEADER,
    },
  });
  const data = await response.json();
  console.log('Databases: ', data);
}

listDatabases();

const bunDLServer = new BundlServer({
  schema: schema,
  cacheExpiration: 3600,
  redisPort: process.env.REDIS_PORT,
  redisHost: process.env.REDIS_HOST,
  userConfig: {},
});

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
    console.log('graphql endpoint reached');
    if (req.method === 'POST') {
      return bunDLServer.query(req).then((queryResults) => {
        // console.log('queryResults are: ', queryResults);
        return new Response(JSON.stringify(queryResults), {
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
  '/api/clearCache': async (req) => {
    if (req.method === 'GET') {
      bunDLServer.clearRedisCache(req);
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
  '/test': (req) => {
    return new Response('🚀 You found me! 🚀');
  },
};

function setCORSHeaders(res) {
  if (res && res instanceof Response) {
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  }
  // add Access-Control-Allow-Headers if needed
  return res;
}

const corsheaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Bun.serve({
  hostname: 'localhost',
  port: 3000,
  async fetch(req) {
    const handler = handlers[new URL(req.url).pathname];
    if (handler) {
      console.log('request in Bun.serve is: ', req);
      const response = await handler(req);
      return setCORSHeaders(response);
    }
    return setCORSHeaders(new Response('This is a 404 error', { status: 404 }));
  },
  error(err) {
    console.error(err);
    return setCORSHeaders(new Response('An error occurred', { status: 500 }));
  },
});
