import { graphql } from 'graphql';
import interceptQueryAndParse from './helpers/intercept-and-parse-logic';
import extractAST from './helpers/prototype-logic';
import { extractIdFromQuery } from './helpers/queryObjectFunctions';
import redisCacheMain from './helpers/redisConnection';

const defaultConfig = {
  cacheVariables: true,
  cacheMetadata: false,
  requireArguments: false,
};

export default class BunDL {
  constructor({ schema, cacheExpiration, redisPort, redisHost, userConfig }) {
    this.config = { ...defaultConfig, ...userConfig };
    this.schema = schema;
    this.cacheExpiration = cacheExpiration;
    this.redisPort = redisPort;
    this.redisHost = redisHost;
    this.redisCache = redisCacheMain;
    this.query = this.query.bind(this);
    this.mergeObjects = this.mergeObjects.bind(this);
    this.handleCacheHit = this.handleCacheHit.bind(this);
    this.handleCacheMiss = this.handleCacheMiss.bind(this);
    this.storeDocuments = this.storeDocuments.bind(this);
    this.insertRedisKey = this.insertRedisKey.bind(this);
    this.deepAssign = this.deepAssign.bind(this);
  }

  // Initialize your class properties here using the parameters

  async query(request) {
    try {
      const data = await request.json();
      request.body.query = data.query;
      const redisKey = extractIdFromQuery(request.body.query);
      const start = performance.now();
      // const { AST, sanitizedQuery, variableValues } = await interceptQueryAndParse(
      //   request.body.query
      //   );
      const { sanitizedQuery } = await interceptQueryAndParse(request.body.query);
      console.log('line 42, sanitizedQuery: ', sanitizedQuery);
      const queryHash = this.generateQueryHash(sanitizedQuery);
      const cachedResult = await this.getCachedQueryResult(queryHash);
      if (cachedResult) {
        console.log('cache hit for query');
        return cachedResult;
      } else {
        console.log('Cache miss for query');
        const { AST, variableValues } = await interceptQueryAndParse(request.body.query);
        const obj = extractAST(AST, this.config, variableValues);
        const { proto, operationType, operationMutation } = obj;
        let queryResults;
        if (operationMutation) {
          console.log('in operationMutation if block');
          queryResults = await graphql(this.schema, sanitizedQuery);
          console.log('queryResults: ', queryResults);
          this.clearRedisCache();
        } else {
          queryResults = await graphql(this.schema, sanitizedQuery);
          console.log('in else block: queryResults: ', queryResults);
        }

        await this.storeDocuments(sanitizedQuery, queryResults);
        return queryResults;
      }

      // if (operationType === 'noBuns') {
      //   const queryResults = await graphql(this.schema, sanitizedQuery);
      //   return queryResults;
      // } else if (redisKey) {
      //   let redisData = await this.redisCache.json_get(redisKey);
      //   console.log('redisdata', redisData);
      //   if (redisData) {
      //     return this.handleCacheHit(proto, redisData, start);
      //   } else {
      //     return this.handleCacheMiss(proto, start, redisKey);
      //   }
      // } else if (!redisKey) {
      //   const queryResults = await graphql(this.schema, sanitizedQuery);
      //   console.log('no redis key, query sent to graphql');
      //   // console.log('schema is: ', this.schema);
      //   // console.log('queryresults test', queryResults);
      //   const key = Object.keys(queryResults.data);
      //   const doc = Object.values(queryResults.data);
      //   const docObj = Object.assign({}, doc);
      //   // console.log('docObj is: ', docObj);
      //   this.storeDocuments(sanitizedQuery, docObj);
      //   // console.log('returnobj: ', queryResults.returnObj);
      //   return queryResults;
      // } else {
      //   return this.handleCacheMiss(proto, start, redisKey);
      // }
    } catch (error) {
      console.error('GraphQL Error:', error);
      return {
        log: error.message,
        status: 400,
        message: { err: 'GraphQL query Error' },
      };
    }
  }

  /**
   * Merges specified fields from a source object into a target object, recursively handling nested objects.
   * Only the fields that are specified in the target object will be merged from the source object.
   * @param {Object} proto - The object specifying the structure and fields to be merged from redisData.
   * @param {Object} redisData - The source object from which data will be merged.
   * @returns {Object} - The resultant object after merging specified fields from redisData.
   */
  handleCacheHit(proto, redisData, start) {
    const end = performance.now();
    const speed = end - start;
    console.log('🐇 Data retrieved from Redis Cache 🐇');
    console.log('🐇 cachespeed', speed, ' 🐇');
    const cachedata = { cache: 'hit', speed: end - start };
    const returnObj = this.deepAssign({ ...proto.fields }, redisData);
    return { returnObj, cachedata };
  }

  /**
   * Recursively merges properties from the source object into the target object, but only if they are specified in the target object.
   * @param {Object} target - The object into which properties will be merged.
   * @param {Object} source - The object from which properties will be merged.
   * @returns {Object} - The target object after merging.
   */
  deepAssign(target, source) {
    for (const key in target) {
      if (target.hasOwnProperty(key)) {
        if (Object.prototype.toString.call(target[key]) === '[object Object]' && Object.prototype.toString.call(source[key]) === '[object Object]') {
          target[key] = this.deepAssign(target[key], source[key]);
        } else if (source.hasOwnProperty(key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  }

  async handleCacheMiss(proto, start, redisKey) {
    const fullDocQuery = this.insertRedisKey(process.env.QUERY, redisKey);
    const fullDocData = (await graphql(this.schema, fullDocQuery)).data;
    await this.redisCache.json_set(redisKey, '$', fullDocData);
    const returnObj = { ...proto.fields };

    for (const field in returnObj.user) {
      returnObj.user[field] = fullDocData.user[field];
    }
    const end = performance.now();
    const speed = end - start;
    console.log('🐢 Data retrieved without Cache Results', speed, ' 🐢');
    const cachedata = { cache: 'miss', speed: end - start };
    return { returnObj, cachedata };
  }

  clearRedisCache(request) {
    this.redisCache.flushall();
    return;
  }

  mergeObjects(templateObj, data, mergeObject) {
    // Split recursive call into helper function
    const performMerge = (tempObj, dataObj, mergeObj) => {
      for (const key in mergeObj) {
        if (Object.prototype.hasOwnProperty.call(mergeObj, key)) {
          if (dataObj[key] !== undefined) {
            if (typeof dataObj[key] === 'object' && dataObj[key] !== null) {
              mergeObj[key] = performMerge(tempObj[key], dataObj[key], mergeObj[key] || {});
            } else {
              mergeObj[key] = dataObj[key];
            }
          }
        }
      }
      return mergeObj;
    };
    const result = performMerge(templateObj, data, mergeObject);
    return result;
  }

  async storeDocuments(queryString, queryResults) {
    console.log('queryResults: ', queryResults);
    console.log('queryString: ', queryString);
    console.log('storeDocuments method fired');
    const queryHash = this.generateQueryHash(queryString);
    console.log('queryHash: ', queryHash);
    const resultKey = `result:${new Date().getTime()}:${Math.random()}`;
    console.log('resultKey: ', resultKey);
    const value = JSON.stringify(queryResults);
    console.log('value: ', value);
    await this.redisCache.set(resultKey, value, 'EX', this.cacheExpiration);
    await this.redisCache.set(queryHash, resultKey, 'EX', this.cacheExpiration);
    console.log(`Query results stored under key: ${resultKey}`);
    console.log(`Query hash ${queryHash} linked to results key: ${resultKey}`);
  }

  insertRedisKey(query, redisKey) {
    const index = query.indexOf('id:'); // Find the index of "id:"
    if (index === -1) {
      throw new Error('Query string does not contain "id:"');
    }
    const before = query.substring(0, index + 4); // Extract the substring before and including "id:"
    const after = query.substring(index + 4); // Extract the substring after "id:"
    return `${before}"${redisKey}"${after}`; // Insert the redisKey in between
  }

  generateQueryHash = (query) => {
    let hash = 0,
      i,
      chr;
    for (i = 0; i < query.length; i++) {
      chr = query.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0;
    }
    return 'query:' + hash.toString();
  };

  storeQueryResult = async (queryHash, queryResult) => {
    const resultKey = `result:${new Date().getTime()}:${Math.random()}`;
    await this.redisCache.set(resultKey, JSON.stringify(queryResult), 'EX', this.cacheExpiration);
    await this.redisCache.set(queryHash, resultKey, 'EX', this.cacheExpiration);
  };

  getCachedQueryResult = async (queryHash) => {
    const resultKey = await this.redisCache.get(queryHash);
    if (resultKey) {
      const cachedResult = await this.redisCache.get(resultKey);
      if (cachedResult) {
        return JSON.parse(cachedResult);
      }
    }
    return null;
  };

  // partial queries:
  // if user is querying the same id: but some of the wanted values are null ->
  // iterate through the object -

  // * This is the closing bracket for the whole class!
}
