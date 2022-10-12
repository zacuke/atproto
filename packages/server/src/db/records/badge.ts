import { Kysely } from 'kysely'
import { AdxUri } from '@adxp/uri'
import * as Badge from '../../lexicon/types/app/bsky/badge'
import { DbRecordPlugin, Notification } from '../types'
import schemas from '../schemas'

const type = 'app.bsky.badge'
const tableName = 'app_bsky_badge'

export interface AppBskyBadge {
  uri: string
  creator: string
  subject: string
  assertionType: string
  assertionTag?: string
  createdAt: string
  indexedAt: string
}

export const createTable = async (db: Kysely<PartialDB>): Promise<void> => {
  await db.schema
    .createTable(tableName)
    .addColumn('uri', 'varchar', (col) => col.primaryKey())
    .addColumn('creator', 'varchar', (col) => col.notNull())
    .addColumn('subject', 'varchar', (col) => col.notNull())
    .addColumn('assertionType', 'varchar', (col) => col.notNull())
    .addColumn('assertionTag', 'varchar')
    .addColumn('createdAt', 'varchar', (col) => col.notNull())
    .addColumn('indexedAt', 'varchar', (col) => col.notNull())
    .execute()
}

export type PartialDB = { [tableName]: AppBskyBadge }

const validator = schemas.createRecordValidator(type)
const isValidSchema = (obj: unknown): obj is Badge.Record => {
  return validator.isValid(obj)
}
const validateSchema = (obj: unknown) => validator.validate(obj)

const translateDbObj = (dbObj: AppBskyBadge): Badge.Record => {
  const badge = {
    assertion: {
      type: dbObj.assertionType,
      tag: dbObj.assertionTag,
    },
    subject: dbObj.subject,
    createdAt: dbObj.createdAt,
  }
  if (badge.assertion.type === 'tag') {
    badge.assertion.tag = dbObj.assertionTag
  }
  return badge
}

const getFn =
  (db: Kysely<PartialDB>) =>
  async (uri: AdxUri): Promise<Badge.Record | null> => {
    const found = await db
      .selectFrom('app_bsky_badge')
      .selectAll()
      .where('uri', '=', uri.toString())
      .executeTakeFirst()
    return !found ? null : translateDbObj(found)
  }

const insertFn =
  (db: Kysely<PartialDB>) =>
  async (uri: AdxUri, obj: unknown): Promise<void> => {
    if (!isValidSchema(obj)) {
      throw new Error(`Record does not match schema: ${type}`)
    }
    const val = {
      uri: uri.toString(),
      creator: uri.host,
      subject: obj.subject,
      assertionType: obj.assertion.type,
      assertionTag: (obj.assertion as Badge.TagAssertion).tag,
      createdAt: obj.createdAt,
      indexedAt: new Date().toISOString(),
    }
    await db.insertInto('app_bsky_badge').values(val).execute()
  }

const deleteFn =
  (db: Kysely<PartialDB>) =>
  async (uri: AdxUri): Promise<void> => {
    await db.deleteFrom('app_bsky_badge').where('uri', '=', uri.toString())
  }

const notifsForRecord = (uri: AdxUri, obj: unknown): Notification[] => {
  if (!isValidSchema(obj)) {
    throw new Error(`Record does not match schema: ${type}`)
  }
  const notif = {
    userDid: obj.subject,
    author: uri.host,
    recordUri: uri.toString(),
    reason: 'badge',
  }
  return [notif]
}

export const makePlugin = (
  db: Kysely<PartialDB>,
): DbRecordPlugin<Badge.Record, AppBskyBadge> => {
  return {
    collection: type,
    tableName,
    validateSchema,
    translateDbObj,
    get: getFn(db),
    insert: insertFn(db),
    delete: deleteFn(db),
    notifsForRecord,
  }
}

export default makePlugin