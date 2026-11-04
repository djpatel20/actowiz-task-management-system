import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, afterEach } from 'vitest';

let replset: MongoMemoryReplSet | null = null;

export const initTestDatabase = async () => {
  replset = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  const uri = replset.getUri();
  await mongoose.connect(uri);
  return uri;
};

export const closeTestDatabase = async () => {
  await mongoose.disconnect();
  if (replset) {
    await replset.stop();
  }
};

export const clearTestDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};
