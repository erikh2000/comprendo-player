import {keyToPath} from "./pathUtil";
import {MIMETYPE_OCTET_STREAM, MIMETYPE_PLAIN_TEXT} from "./mimeTypes";
import {createNonGlobalRegex, escapeRegexCharacters} from "common/regexUtil";

const DB_NAME = 'comprendo';
const KEY_VALUE_STORE = 'KeyValue';
const PATH_INDEX_NAME = 'pathIndex';

type IndexConfig = {
  name:string,
  keypath:string,
  options:IDBIndexParameters
}

const SCHEMA = {
  __version:1,
  [KEY_VALUE_STORE]: {
    __options:{keyPath:'key'},
    __indexes:[{name:PATH_INDEX_NAME, keypath:'path', options:{unique:false, multiEntry:false}}]
  }
};

export type KeyValueRecord = {
  key:string,
  path:string,
  mimeType:string,
  lastModified:number,
  text:string|null,
  bytes:Uint8Array|null
};

function _getStoreNamesFromSchema(schema:any):string[] {
  return Object.keys(schema).filter(key => key !== '__version');
}

function _createStores(db:IDBDatabase, schema:any) {
  const storeNames = _getStoreNamesFromSchema(schema);
  storeNames.forEach(storeName => {
    const storeSchema = schema[storeName];
    const store = db.createObjectStore(storeName, storeSchema.__options);
    const indexes:IndexConfig[] = storeSchema.__indexes ?? [];
    indexes.forEach(indexConfig => {
      store.createIndex(indexConfig.name, indexConfig.keypath, indexConfig.options);
    });
  });
}

function _populateStores(_db:IDBDatabase, _schema:any) {
  // If you need this, then add something into your schema definition above that says how records will be populated.
  // For a reference implementation, see encryption-at-rest-poc database.ts.
}

async function _open(name:string, schema:any):Promise<IDBDatabase> {
  const version = schema.__version;
  let wereStoresCreated = false;
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onerror = (event:any) => reject(`Failed to open "${name}" database with error code ${event.target.errorCode}.`);
    request.onupgradeneeded = (event:any) => {
      const db = event.target.result as IDBDatabase;
      _createStores(db, schema);
      wereStoresCreated = true;
    }
    request.onsuccess = (event:any) => {
      const db = event.target.result as IDBDatabase;
      db.onerror = (event:any) => { throw Error("Database error: " + event.target.errorCode); } // Not using reject() since error could come later after this promise completes.
      if (wereStoresCreated) _populateStores(db, schema);
      resolve(db);
    }
  });
}

async function _get(db:IDBDatabase, storeName:string, key:string):Promise<object> {
  const transaction = db.transaction(storeName);
  const objectStore = transaction.objectStore(storeName);
  const request = objectStore.get(key);
  return new Promise((resolve, reject) => {
    transaction.onerror = (event:any) => reject(`Failed to get from "${storeName} with error code ${event.target.errorCode}.`);
    transaction.oncomplete = (_event:any) => resolve(request.result)
  });
}

async function _put(db:IDBDatabase, storeName:string, objectToStore:object):Promise<void> {
  const transaction = db.transaction(storeName, 'readwrite');
  const objectStore = transaction.objectStore(storeName);
  objectStore.put(objectToStore);
  return new Promise((resolve, reject) => {
    transaction.onerror = (event:any) => reject(`Failed to put to "${storeName} with error code ${event.target.errorCode}.`);
    transaction.oncomplete = () => resolve();
  });

}

async function _delete(db:IDBDatabase, storeName:string, key:string):Promise<void> {
  const transaction = db.transaction(storeName, 'readwrite');
  const objectStore = transaction.objectStore(storeName);
  objectStore.delete(key);
  return new Promise((resolve, reject) => {
    transaction.onerror = (event:any) => reject(`Failed to delete record at "${key}" in "${storeName} with error code ${event.target.errorCode}.`);
    transaction.oncomplete = () => resolve();
  });
}

export async function deleteDatabase():Promise<void> {
  const request = indexedDB.deleteDatabase(DB_NAME);
  return new Promise((resolve, reject) => {
    request.onerror = (event:any) => reject(`Failed to delete "${DB_NAME}}" database with error code ${event.target.errorCode}.`);
    request.onsuccess = () => resolve();
  });
}

async function _getRecordByKey(key:string):Promise<KeyValueRecord> {
  const db = await _open(DB_NAME, SCHEMA);
  return (await _get(db, KEY_VALUE_STORE, key)) as KeyValueRecord;
}

export async function getText(key:string):Promise<string|null> {
  const record = await _getRecordByKey(key);
  return record?.text ?? null;
}

export async function getTextIfModified(key:string, since:number):Promise<string|null> {
  const record = await _getRecordByKey(key);
  return (record && record.text !== null && record.lastModified > since) ? record.text : null;
}

export async function getBytes(key:string):Promise<Uint8Array|null> {
  const record = await _getRecordByKey(key);
  return record?.bytes ?? null;
}

export async function getBytesIfModified(key:string, since:number):Promise<Uint8Array|null> {
  const record = await _getRecordByKey(key);
  return (record && record.bytes !== null && record.lastModified > since) ? record.bytes : null;
}

export type FileStorageData = {
  fileName:string,
  path:string,
  mimeType:string,
  lastModified:number,
  blob:Blob
}

async function _setFieldValue(key:string, fieldName:string, fieldValue:any, mimeType:string) {
  const db = await _open(DB_NAME, SCHEMA);
  const record = await _getRecordByKey(key)
    ?? { key } as KeyValueRecord;
  (record as any)[fieldName] = fieldValue;
  record.path = keyToPath(key);
  record.mimeType = mimeType;
  record.lastModified = Date.now();
  await _put(db, KEY_VALUE_STORE, record);
}

export async function setText(key:string, text:string|null, mimeType:string = MIMETYPE_PLAIN_TEXT) {
  await _setFieldValue(key, 'text', text, mimeType);
}

export async function setBytes(key:string, bytes:Uint8Array|null, mimeType = MIMETYPE_OCTET_STREAM) {
  await _setFieldValue(key, 'bytes', bytes, mimeType);
}

export async function doesDatabaseExist():Promise<boolean> {
  const dbInfos:IDBDatabaseInfo[] = await indexedDB.databases();
  const found = dbInfos.find(dbInfo => dbInfo.name === DB_NAME);
  return found !== undefined;
}

export async function getAllKeys():Promise<string[]> {
  const db = await _open(DB_NAME, SCHEMA);
  const transaction = db.transaction(KEY_VALUE_STORE);
  const objectStore = transaction.objectStore(KEY_VALUE_STORE);
  const request = objectStore.getAllKeys();
  return new Promise((resolve, reject) => {
    request.onerror = (event:any) => reject(`Failed to get all keys with error code ${event.target.errorCode}.`);
    request.onsuccess = () => resolve(request.result as string[])
  });
}

export async function getAllKeysAtPath(path:string):Promise<string[]> {
  const db = await _open(DB_NAME, SCHEMA);
  const transaction = db.transaction(KEY_VALUE_STORE);
  const objectStore = transaction.objectStore(KEY_VALUE_STORE);
  const pathIndex = objectStore.index(PATH_INDEX_NAME);
  const request = pathIndex.getAllKeys(path);
  return new Promise((resolve, reject) => {
    request.onerror = (event:any) => reject(`Failed to get all keys from "${path}" path with error code ${event.target.errorCode}.`);
    request.onsuccess = () => resolve(request.result as string[]);
  });
}

export async function getAllKeysMatchingRegex(regex:RegExp):Promise<string[]> {
  const db = await _open(DB_NAME, SCHEMA);
  const transaction = db.transaction(KEY_VALUE_STORE);
  const objectStore = transaction.objectStore(KEY_VALUE_STORE);
  const request = objectStore.getAllKeys();
  regex = createNonGlobalRegex(regex);
  return new Promise((resolve, reject) => {
    request.onerror = (event:any) => reject(`Failed to get all keys with error code ${event.target.errorCode}.`);
    request.onsuccess = () => {
      const keys:string[] = request.result as string[];
      const filteredKeys = keys.filter(key => regex.test(key));
      resolve(filteredKeys);
    }
  });
}

export async function getAllValuesAtPath(path:string):Promise<KeyValueRecord[]> {
  const db = await _open(DB_NAME, SCHEMA);
  const transaction = db.transaction(KEY_VALUE_STORE);
  const objectStore = transaction.objectStore(KEY_VALUE_STORE);
  const pathIndex = objectStore.index(PATH_INDEX_NAME);
  const request = pathIndex.getAll(path);
  return new Promise((resolve, reject) => {
    request.onerror = (event:any) => reject(`Failed to get all values from "${path}" path with error code ${event.target.errorCode}.`);
    request.onsuccess = () => resolve(request.result as KeyValueRecord[]);
  });
}

export async function getValuesForKeys(keys:string[]):Promise<KeyValueRecord[]> {
  const db = await _open(DB_NAME, SCHEMA);
  const transaction = db.transaction(KEY_VALUE_STORE);
  const objectStore = transaction.objectStore(KEY_VALUE_STORE);

  function _getValueByKey(key:string):Promise<KeyValueRecord> {
    const request = objectStore.get(key);
    return new Promise((resolve, reject) => {
      request.onerror = (event:any) => reject(`Failed to get ${key} from "${KEY_VALUE_STORE} with error code ${event.target.errorCode}.`);
      request.onsuccess = (_event:any) => resolve(request.result)
    });
  }

  const promises = keys.map(_key => _getValueByKey(_key));
  return Promise.all(promises);
}

function _changePathOfKey(key:string, path:string, nextPath:string):string {
  return nextPath + key.slice(path.length);
}

async function _replaceRecordUsingNewKey(db:IDBDatabase, key:string, nextKey:string, updateLastModified:boolean) {
  const record:KeyValueRecord|null = await _get(db, KEY_VALUE_STORE, key) as KeyValueRecord|null;
  if (!record) throw Error(`Did not find existing record matching "${key}" key.`);
  record.key = nextKey;
  record.path = keyToPath(nextKey);
  if (updateLastModified) record.lastModified = Date.now();
  await _put(db, KEY_VALUE_STORE, record);
  await _delete(db, KEY_VALUE_STORE, key);
}

async function _renamePath(db:IDBDatabase, currentPath:string, nextPath:string) {
  const currentPathEscaped = escapeRegexCharacters(currentPath);
  const regExp:RegExp = new RegExp(`${currentPathEscaped}.*`, '');
  const descendentKeys:string[] = await getAllKeysMatchingRegex(regExp);

  const promises:Promise<void>[] = [];
  for(let keyI = 0; keyI < descendentKeys.length; ++keyI) {
    const descendentKey:string = descendentKeys[keyI];
    const descendentNextKey = _changePathOfKey(descendentKey, currentPath, nextPath);
    promises.push(_replaceRecordUsingNewKey(db, descendentKey, descendentNextKey, false));
  }
  await Promise.all(promises);
}

export async function renamePath(currentPath:string, nextPath:string):Promise<void> {
  const db = await _open(DB_NAME, SCHEMA);
  return _renamePath(db, currentPath, nextPath);
}

export async function renameKey(currentKey:string, nextKey:string):Promise<void> {
  const db = await _open(DB_NAME, SCHEMA);
  await _replaceRecordUsingNewKey(db, currentKey, nextKey, true);
  const currentDescendantPath = `${currentKey}/`;
  const nextDescendantPath = `${nextKey}/`;
  return await _renamePath(db, currentDescendantPath, nextDescendantPath);
}

export async function deleteByKey(key:string):Promise<void> {
  const db = await _open(DB_NAME, SCHEMA);
  await _delete(db, KEY_VALUE_STORE, key);
}

export async function deleteAllKeys(keys:string[]):Promise<void> {
  const db = await _open(DB_NAME, SCHEMA);
  const transaction = db.transaction(KEY_VALUE_STORE, 'readwrite');
  const objectStore = transaction.objectStore(KEY_VALUE_STORE);
  keys.forEach(key => objectStore.delete(key));
  return new Promise((resolve, reject) => {
    transaction.onerror = (event:any) => reject(`Failed to delete records with error code ${event.target.errorCode}.`);
    transaction.oncomplete = () => resolve();
  });
}

export async function deleteAllKeysAtPathExcept(path:string, exceptKeys:string[]) {
  const keys = await getAllKeysAtPath(path);
  const keysToDelete = keys.filter(key => !exceptKeys.includes(key));
  if (!keysToDelete.length) return;
  await deleteAllKeys(keysToDelete);
}

export async function deleteAllKeysAtPath(path:string):Promise<void> {
  const keys = await getAllKeysAtPath(path);
  if (!keys.length) return;
  await deleteAllKeys(keys);
}

export async function doesKeyExist(key:string):Promise<boolean> {
  const db = await _open(DB_NAME, SCHEMA);
  const transaction = db.transaction(KEY_VALUE_STORE, 'readonly');
  const cursorRequest = transaction.objectStore(KEY_VALUE_STORE).openCursor(key);
  return new Promise((resolve, reject) => {
    cursorRequest.onerror = (event:any) => reject(`Failed to check if key "${key}" exists with error code ${event.target.errorCode}.`);
    cursorRequest.onsuccess = (event:any) => {
      const cursor = event.target.result;
      resolve(cursor !== null);
    }
  });
}