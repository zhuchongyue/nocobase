import { Database, Model } from '..';
import { mockDatabase } from './index';

describe('collection template', () => {
  let db: Database;

  beforeEach(async () => {
    db = mockDatabase();
  });

  afterEach(async () => {
    await db.close();
  });

  it('should throw error when template not found', async () => {
    expect(() => {
      db.collection({
        name: 'testCollection',
        template: 'notFound',
      });
    }).toThrowError('Collection template "notFound" not found');
  });

  it('should create collection template', async () => {
    const fn = jest.fn();

    db.collectionTemplate({
      name: 'transactionable',
      hooks: {
        async afterSync() {
          fn();
        },
      },
    });

    db.collection({
      name: 'mainData',
    });

    db.collection({
      name: 'testCollection',
      template: 'transactionable',
      fields: [
        {
          name: 'testField',
          type: 'string',
        },
      ],
    });

    await db.sync();
    expect(fn).toHaveBeenCalled();
  });
});