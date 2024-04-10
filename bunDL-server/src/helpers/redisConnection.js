// import Redis from 'ioredis';
import RedisReJSON from 'ioredis-rejson';
// import Redis from 'ioredis-rejson';
import { createClient } from 'redis';

// manually set port and host for now
// const redisPort = 6379;
// const redisHost = '127.0.0.1';

const redisPort = Bun.env.REDIS_PORT;
const redisHost = Bun.env.REDIS_HOST;
const redisPass = Bun.env.REDIS_PASSWORD;

// const redisCacheMain = createClient({
//   password: ,
//   socket: {
//     host: 'redis-17788.c1.us-west-2-2.ec2.cloud.redislabs.com',
//     port: 17788,
//   },
// });

const redisCacheMain = new RedisReJSON({
  host: redisHost,
  port: redisPort,
  password: redisPass,
});

redisCacheMain.on('error', (error) => {
  console.error(`Error when trying to connect to redisCacheMain: ${error}`);
});

redisCacheMain.on('connect', () => {
  console.log('Connected to redisCacheMain');
});

export default redisCacheMain;
