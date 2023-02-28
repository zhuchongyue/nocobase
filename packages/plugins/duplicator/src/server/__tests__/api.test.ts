import { mockServer, MockServer } from '@nocobase/test';

describe('duplicator api', () => {
  let app: MockServer;
  beforeEach(async () => {
    app = mockServer();
    app.plugin(require('../server').default, { name: 'duplicator' });
    app.plugin('error-handler');
    app.plugin('collection-manager');
    await app.loadAndInstall({ clean: true });
  });

  afterEach(async () => {
    await app.destroy();
  });

  it('should get collection groups', async () => {
    await app.db.getRepository('collections').create({
      values: {
        name: 'test_collection',
        title: '测试Collection',
        fields: [
          {
            name: 'test_field1',
            type: 'string',
          },
        ],
      },
      context: {},
    });

    const collectionGroupsResponse = await app.agent().resource('duplicator').dumpableCollections();
    expect(collectionGroupsResponse.status).toBe(200);

    const data = collectionGroupsResponse.body;

    expect(data['collectionGroups']).toBeTruthy();
    expect(data['userCollections']).toBeTruthy();
  });

  it('should request dump api', async () => {
    const dumpResponse = await app.agent().post('/duplicator:dump').send({
      selectedCollectionGroups: [],
      selectedUserCollections: [],
    });

    expect(dumpResponse.status).toBe(200);
  });
});
