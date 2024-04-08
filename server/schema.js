import { GraphQLObjectType, GraphQLSchema, GraphQLString, GraphQLNonNull, GraphQLList, GraphQLID, GraphQLInt, GraphQLInputObjectType } from 'graphql';
const { faker } = require('@faker-js/faker');

const generateFakeData = (num) => {
  const documents = [];

  for (let i = 0; i < num; i++) {
    const companyId = `company${i}`;
    const departmentId = `department${i}`;
    const productId = `product${i}`;
    const company = {
      _id: companyId,
      type: 'Company',
      company: faker.company.name(),
      city: faker.location.city(),
      state: faker.location.state(),
      departments: [departmentId],
    };
    const department = {
      _id: departmentId,
      type: 'Department',
      departmentName: faker.commerce.department(),
      products: [productId],
    };
    const product = {
      _id: productId,
      type: 'Product',
      productName: faker.commerce.product(),
      productDescription: faker.commerce.productDescription(),
      price: faker.commerce.price(),
    };

    documents.push(company, department, product);
  }
  return documents;
};
// Function to populate the database with fake users
export const populateDB = async (numberOfUsers) => {
  const fakeData = [];
  // Generate fake users
  for (let i = 0; i < numberOfUsers; i++) {
    fakeData.push(...generateFakeData(i));
  }
  try {
    const response = await fetch(`${COUCHDB_URL}/${COUCHDB_DB_NAME}/_bulk_docs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ docs: fakeData }),
    });
    const result = await response.json();
    console.log(result);
    return result;
    console.log('Database populated:', response);
  } catch (err) {
    console.error('Error populating database:', err);
  }
  // Bulk insert into PouchDB
};
// populateDB(5);

// GraphQL Types

const ProductType = new GraphQLObjectType({
  name: 'Product',
  fields: () => ({
    id: { type: GraphQLID, resolve: (product) => product._id },
    productName: { type: GraphQLString },
    productDescription: { type: GraphQLString },
    price: { type: GraphQLInt },
  }),
});

const DepartmentType = new GraphQLObjectType({
  name: 'Department',
  fields: () => ({
    id: { type: GraphQLID, resolve: (department) => department._id }, // Renamed variable
    departmentName: { type: GraphQLString },
    product: {
      type: new GraphQLList(ProductType),
      args: { id: { type: GraphQLString } },
      resolve: async (parent, args) => {
        try {
          const queryParams = new URLSearchParams({
            keys: parent.products,
            include_docs: true,
          });
          console.log('queryParams: ', queryParams.keys);
          const departmentDocs = await fetch(`${COUCHDB_URL}/${COUCHDB_DB_NAME}/_all_docs?${queryParams}`);

          return departmentDocs.rows.map((row) => row.doc);
        } catch (error) {
          console.error(error);
        }
      },
    },
  }),
});

const CompanyType = new GraphQLObjectType({
  name: 'Company',
  fields: () => ({
    id: { type: GraphQLID, resolve: (company) => company._id },
    company: { type: GraphQLString },
    city: { type: GraphQLString },
    state: { type: GraphQLString },
    department: {
      type: new GraphQLList(DepartmentType),
      args: { id: { type: GraphQLString } },
      resolve: async (parent, args) => {
        try {
          const queryParams = new URLSearchParams({
            keys: parent.departments,
            include_docs: true,
          });
          console.log('queryParams for company: ', queryParams.keys);
          const departmentDocs = await fetch(`${COUCHDB_URL}/${COUCHDB_DB_NAME}/_all_docs?${queryParams}`);
          console.log('in sofa');
          return departmentDocs.rows.map((row) => row.doc);
        } catch (error) {
          console.error(error);
        }
      },
    },
  }),
});

const RootQuery = new GraphQLObjectType({
  name: 'RootQueryType',
  fields: {
    company: {
      type: CompanyType,
      args: { id: { type: GraphQLString } },
      async resolve(parent, args) {
        const response = await fetch(`${COUCHDB_URL}/${COUCHDB_DB_NAME}/${args.id}`);
        console.log('in sofa rootQuery: ', response);
        const data = await response.json();
        return data;
      },
    },
    companies: {
      type: new GraphQLList(CompanyType),
      async resolve() {
        const response = await fetch(`${COUCHDB_URL}/${COUCHDB_DB_NAME}/_all_docs?include_docs=true`);
        const data = await response.json();
        return data.rows.filter((row) => row.doc.company && Object.keys(row.doc).length > 0).map((row) => row.doc);
      },
    },

    department: {
      type: DepartmentType,
      args: { id: { type: GraphQLString } },
      async resolve(parent, args) {
        const response = await fetch(`${COUCHDB_URL}/${COUCHDB_DB_NAME}/${args.id}`);
        const data = await response.json();
        return data;
      },
    },
    product: {
      type: ProductType,
      args: { id: { type: GraphQLString } },
      async resolve(parent, args) {
        const response = await fetch(`${COUCHDB_URL}/${COUCHDB_DB_NAME}/${args.id}`);
        const data = await response.json();
        return data;
      },
    },
  },
});

const ProductInputType = new GraphQLInputObjectType({
  name: 'ProductInput',
  fields: {
    productName: { type: GraphQLString },
    productDescription: { type: GraphQLString },
    price: { type: GraphQLInt },
  },
});

const DepartmentInputType = new GraphQLInputObjectType({
  name: 'DepartmentInput',
  fields: {
    departmentName: { type: GraphQLString },
    products: { type: new GraphQLList(GraphQLID) },
  },
});

const CompanyInputType = new GraphQLInputObjectType({
  name: 'CompanyInput',
  fields: {
    company: { type: GraphQLString },
    city: { type: GraphQLString },
    state: { type: GraphQLString },
    departments: { type: new GraphQLList(GraphQLID) },
  },
});

const Mutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    addProduct: {
      type: ProductType,
      args: {
        input: { type: ProductInputType },
      },
      async resolve(parent, args) {
        const productData = args.input;

        const response = await fetch(`${COUCHDB_URL}/${COUCHDB_DB_NAME}/_bulk_docs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ docs: [productData] }),
        });
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        return productData;
      },
    },
    addDepartment: {
      type: DepartmentType,
      args: {
        input: { type: DepartmentInputType },
      },
      async resolve(parent, args) {
        const departmentData = args.input;

        const response = await fetch(`${COUCHDB_URL}/${COUCHDB_DB_NAME}/_bulk_docs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ docs: [departmentData] }),
        });
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        return departmentData;
      },
    },
    addCompany: {
      type: CompanyType,
      args: {
        input: { type: CompanyInputType },
      },
      async resolve(parent, args) {
        const companyData = args.input;

        const response = await fetch(`${COUCHDB_URL}/${COUCHDB_DB_NAME}/_bulk_docs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ docs: [companyData] }),
        });
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        return companyData;
      },
    },
  },
});

export const schema = new GraphQLSchema({
  query: RootQuery,
  mutation: Mutation,
});
