// import PouchDB from 'pouchdb';

// const localDB = new PouchDB('bundl-database');

const generateGraphQLQuery = (keys) => {
  const queryMap = {};

  // Loop through the keys to build the query map
  keys.forEach((key) => {
    const parts = key.split(':');
    const typeName = parts[1];
    const typeID = parts[2];
    const field = parts.slice(3).join(':');
    console.log(field);

    if (!queryMap[typeName]) {
      queryMap[typeName] = {
        id: typeID,
        fields: [],
      };
    }

    queryMap[typeName].fields.push(field);
  });

  // Generate the GraphQL query
  const queries = Object.keys(queryMap).map((typeName) => {
    const type = queryMap[typeName];
    const fields = type.fields.join('\n');
    return `${typeName}(id: "${type.id}") {
        id
        ${fields}
    }`;
  });

  let query = `query {
      ${queries.join('\n')}
  `;

  for (const keys in queryMap) {
    query += '}';
  }

  return query;
};

const generateMissingPouchDBCachekeys = async (cacheKeys, graphQLcachedata, localDB) => {
  //console.log('thisis result from pouchdb', result)
  //console.log('localDB', localDB)
  //create new arr
  const missingPouchCacheKeys = [];
  //copy graphqlcachedata
  let data = graphQLcachedata.data;

  //create empty object to store ids and requested fields
  const docRequests = {};
  console.log('cachekeys', cacheKeys);

  //loop through missing keys
  cacheKeys.forEach((keys) => {
    const key = keys.split(':').slice(0, 3).join(':'); // query:department:department1
    //if object exists with id, push to array as value, if it does not exist, create key value pair with empty arr as value
    if (!docRequests[key]) docRequests[key] = [];
    docRequests[key].push(keys.split(':').slice(3).join(''));
  });
  //query:user:$123:name
  //query:user:$123:city
  //docRequests = {query:user:$123: [name, city], query:product:$234: [productname, price]}

  console.log('docrequests here', docRequests);

  for (const key in docRequests) {
    //get typename = 'user'
    const typeName = key.split(':').slice(1, 2).join('');
    //retrieve document from pouchDB with id // department1
    const id = key.split(':').slice(2).join('');
    console.log('idddddd', id);
    try {
      let doc = await localDB.get(id);
      console.log('pouchdoc city', doc.city);
      if (doc) {
        const fields = docRequests[key];
        console.log('fieldssssssss', fields);
        fields.forEach((field) => {
          console.log('field', field);
          console.log('docfield', doc[field]);
          if (doc[field]) {
            data[typeName] = data[typeName] || {};
            data[typeName][field] = doc[field];
          } else {
            missingPouchCacheKeys.push(`${key}:${field}`);
          }
        });
      } else {
        const fields = docRequests[key];
        fields.forEach((field) => {
          missingPouchCacheKeys.push(`${key}:${field}`);
        });
      }
    } catch (err) {
      console.log('this is pouch error', err);
      //docRequests = {query:user:$123: [name, city], query:product:$234: [productname, price]}
    }
  }

  const updatedgraphQLcachedata = data;
  console.log('data: ', data);
  console.log('graphQLcachedata: ', graphQLcachedata);
  console.log('missingPouchCacheKeys', missingPouchCacheKeys);

  return { updatedgraphQLcachedata, missingPouchCacheKeys };
};

const updatePouchDB = async (updatedCacheKeys, localDB) => {
  //updatedcachekeys = {'query:company:$123:name': 'bundl'}
  // create empty obj
  const obj = {};
  // //loop through missing keys

  for (const keys in updatedCacheKeys) {
    const key = keys.split(':').slice(0, 3).join(':'); // query:company:$123
    const field = keys.split(':').slice(3).join(''); // name
    //check if object has id
    if (!obj[key]) {
      obj[key] = {};
    }
    //update obj[id] with 'field' as key and value from updated cachekeys
    obj[key][field] = updatedCacheKeys[keys];
  }

  //obj = {'query:company:$123': {name:dddd, city:4444, state:444}}

  for (const key in obj) {
    //assign fields to value of obj[key] //example fields = {name:dddd, city:4444, state:444}
    const fields = obj[key];
    //check pouchdb document
    try {
      const id = key.split(':').slice(2).join('');
      //retrieve document frompouch using id
      const doc = await localDB.get(id);
      console.log('localdb', doc);

      //if doc exists
      if (doc) {
        //update doc name
        let copy = { ...doc };
        console.log(copy);
        for (const field in fields) {
          copy[field] = fields[field];
        }
        //update fields in current doc
        console.log('fields: ', fields);
        console.log('doc in pooch', copy);
        // const sample = "{ example: 'example' }";
        await localDB.put(copy);
        console.log('this is post pouch');
        const results = localDB.get(id);
        console.log(results);
      } else {
        //update pouchdb with a new document with id as id, and fields as new fields
        await localDB.put(id, fields);
        const results = localDB.get(id);
        console.log(results);
      }
    } catch (err) {
      console.log(err);
    }
  }
};

const updateMissingCache = (queryResults, missingCacheKeys) => {
  const updatedCache = {};
  const data = Object.values(queryResults)[0];
  console.log(data);

  missingCacheKeys.forEach((cacheKey) => {
    const key = cacheKey.split(':');
    const field = key.slice(3);
    console.log('field', field);
    field.forEach((eachField) => {
      if (data[eachField]) updatedCache[cacheKey] = data[eachField];
      // lastname: 'dl'
    });
  });

  return updatedCache;
};

const mergeGraphQLresponses = (obj1, obj2) => {
  const merged = { ...obj1 };

  for (const key in obj2) {
    if (typeof obj2[key] === 'object' && obj1[key] && typeof obj1[key] === 'object') {
      merged[key] = mergeGraphQLresponses(obj1[key], obj2[key]);
    } else {
      merged[key] = obj2[key];
    }
  }
  return merged;
};

const generateMissingLRUCachekeys = (cacheKeys, LRUcache) => {
  // // Initialize an array to track missing cache keys
  // const missingCacheKeys = [];

  // const graphQLcachedata = {
  //   data: {},
  // };

  // // Loop through the cacheKeys
  // cacheKeys.forEach((key) => {
  //   // Check if the cache key exists in the LRU cache
  //   if (!LRUcache.has(key)) {
  //     missingCacheKeys.push(key);
  //   } else {
  //     // Split the key into parts
  //     // query: user: 123: name: age = > ['query', 'user', '123' 'name', 'age']
  //     const fieldKey = key.split(':');
  //     const typeName = fieldKey[1]; // ['user']
  //     const fields = fieldKey.slice(3); // ['name', 'age']

  //     let data = graphQLcachedata.data;
  //     if (!graphQLcachedata.data[typeName]) {
  //       graphQLcachedata.data[typeName] = {};
  //     }

  //     if (!graphQLcachedata.data[typeName].id) graphQLcachedata.data[typeName].id = fieldKey[2];

  //     // Loop through the fields and create the nested structure
  //     for (let i = 0; i < fields.length; i++) {
  //       const field = fields[i];
  //       //console.log(field)
  //       if (i === fields.length - 1) {
  //         // If it's the last field, assign the value from the LRU cache
  //         data[typeName][field] = LRUcache.get(key);
  //       } else {
  //         // Otherwise, create a nested object if it doesn't exist
  //         if (!data[typeName][field]) {
  //           data[typeName][field] = {};
  //         }
  //         // Move the data reference to the next level
  //         data = data[typeName][field];
  //         //['query', 'user', '123' 'name', 'age', 'location']
  //         //data => data[user][name]
  //       }
  //     }
  //   }
  // });

  const organizedKeys = {};
  cacheKeys.foreach((key) => {
    const [_, entityType, entityId, ...fields] = key.split(':');
    if (!organizedKeys[entityType]) {
      organizedKeys[entityType] = {};
    }
    if (!organizedKeys[entityType][entityId]) {
      organizedKeys[entityType][entityId] = {};
    }
    organizedKeys[entityType][entityId].push(fields.join(':'));
  });

  const buildData = (entityType, entityId, graphQLcachedata) => {
    const fields = organizedKeys[entityType][entityId];
    const result = { id: parseInt(entityId, 10) };

    fields.forEach((field) => {
      const value = LRUcache.get(`query:${entityType}:${entityId}:${field}`);
      if (organizedKeys[field]) {
        const nestedEntityId = Object.keys(organizedKeys[field])[0];
        result[field] = buildData(field, nestedEntityId, graphQLcachedata);
      } else {
        result[field] = value;
      }
    });
    if (!graphQLcachedata.data[entityType]) graphQLcachedata.data[entityType] = [];
    graphQLcachedata.data[entityType].push(result);
    return result;
  };
  const graphQLcachedata = {
    data: {},
  };

  const topLevelEntity = 
  const topLevelEntityId = Object.keys(organizedKeys[topLevelEntity])[0];
  buildData(topLevelEntity, topLevelEntityId, graphQLcachedata);

  // Return the missing cache keys and the updated GraphQL data
  return { missingCacheKeys, graphQLcachedata };
};

export {
  generateGraphQLQuery,
  generateMissingLRUCachekeys,
  mergeGraphQLresponses,
  updateMissingCache,
  generateMissingPouchDBCachekeys,
  updatePouchDB,
};
