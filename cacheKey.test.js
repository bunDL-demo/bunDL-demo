import { generateCacheKeys } from './bunDL-client/src/helpers/cacheKeys.js';
import { expect, test, describe } from 'bun:test';

describe('generateCacheKeys function', () => {
  test('should generate correct cache keys from given proto', () => {
    const proto = {
      fields: {
        user: {
          $id: '123',
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          address: {
            $id: '456',
            street: true,
            city: true,
            state: true,
            zip: true,
            country: true,
          },
        },
      },
      fragsDefinitions: {},
      primaryQueryType: 'user',
      fragmentType: '',
      variableValues: {
        user: {
          id: '123',
        },
        address: {
          id: '456',
        },
      },
      operation: 'query',
    };

    const expectedKeys = [
      'query:user:$123:id',
      'query:user:$123:firstName',
      'query:user:$123:lastName',
      'query:user:$123:email',
      'query:user:$123:phoneNumber',
      'query:address:$456:street',
      'query:address:$456:city',
      'query:address:$456:state',
      'query:address:$456:zip',
      'query:address:$456:country',
      // 'query:user:$123:address:$456:street',
      // 'query:user:$123:address:$456:city',
      // 'query:user:$123:address:$456:state',
      // 'query:user:$123:address:$456:zip',
      // 'query:user:$123:address:$456:country',
    ];

    const resultKeys = generateCacheKeys(proto);
    console.log(resultKeys);
    expect(resultKeys).toEqual(expectedKeys);
  });
});
