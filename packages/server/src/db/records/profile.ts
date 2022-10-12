import { Kysely } from 'kysely'
import { AdxUri } from '@adxp/uri'
import * as Profile from '../../lexicon/types/app/bsky/profile'
import { DbRecordPlugin, Notification } from '../types'
import schemas from '../schemas'

const type = 'app.bsky.profile'
const tableName = 'app_bsky_profile'

export interface AppBskyProfile {
  uri: string
  creator: string
  displayName: string
  description: string | null
  indexedAt: string
}

const supportingTableName = 'app_bsky_profile_badge'
export interface AppBskyProfileBadge {
  profileUri: string
  badgeUri: string
}

export const createTable = async (db: Kysely<PartialDB>): Promise<void> => {
  await db.schema
    .createTable(tableName)
    .addColumn('uri', 'varchar', (col) => col.primaryKey())
    .addColumn('creator', 'varchar', (col) => col.notNull())
    .addColumn('displayName', 'varchar', (col) => col.notNull())
    .addColumn('description', 'varchar')
    .addColumn('indexedAt', 'varchar', (col) => col.notNull())
    .execute()

  await db.schema
    .createTable(supportingTableName)
    .addColumn('profileUri', 'varchar', (col) => col.notNull())
    .addColumn('badgeUri', 'varchar', (col) => col.notNull())
    .addPrimaryKeyConstraint('primary_key', ['profileUri', 'badgeUri'])
    .execute()
}

export type PartialDB = {
  [tableName]: AppBskyProfile
  [supportingTableName]: AppBskyProfileBadge
}

const validator = schemas.createRecordValidator(type)
const isValidSchema = (obj: unknown): obj is Profile.Record => {
  return validator.isValid(obj)
}
const validateSchema = (obj: unknown) => validator.validate(obj)

const translateDbObj = (dbObj: AppBskyProfile): Profile.Record => {
  return {
    displayName: dbObj.displayName,
    description: dbObj.description ?? undefined,
  }
}

const getFn =
  (db: Kysely<PartialDB>) =>
  async (uri: AdxUri): Promise<Profile.Record | null> => {
    const profileQuery = db
      .selectFrom('app_bsky_profile')
      .selectAll()
      .where('uri', '=', uri.toString())
      .executeTakeFirst()
    const badgesQuery = db
      .selectFrom('app_bsky_profile_badge')
      .select('badgeUri as uri')
      .where('profileUri', '=', uri.toString())
      .execute()
    const [profile, badges] = await Promise.all([profileQuery, badgesQuery])
    if (!profile) return null
    const record = translateDbObj(profile)
    record.badges = badges
    return record
  }

const insertFn =
  (db: Kysely<PartialDB>) =>
  async (uri: AdxUri, obj: unknown): Promise<void> => {
    if (!isValidSchema(obj)) {
      throw new Error(`Record does not match schema: ${type}`)
    }

    const badges = (obj.badges || []).map((badge) => ({
      badgeUri: badge.uri,
      profileUri: uri.toString(),
    }))
    const profile = {
      uri: uri.toString(),
      creator: uri.host,
      displayName: obj.displayName,
      description: obj.description,
      indexedAt: new Date().toISOString(),
    }
    const promises = [
      db.insertInto('app_bsky_profile').values(profile).execute(),
    ]
    if (badges.length > 0) {
      promises.push(
        db.insertInto('app_bsky_profile_badge').values(badges).execute(),
      )
    }
    await Promise.all(promises)
  }

const deleteFn =
  (db: Kysely<PartialDB>) =>
  async (uri: AdxUri): Promise<void> => {
    await Promise.all([
      db.deleteFrom('app_bsky_profile').where('uri', '=', uri.toString()),
      db
        .deleteFrom('app_bsky_profile_badge')
        .where('profileUri', '=', uri.toString()),
    ])
  }

const notifsForRecord = (_uri: AdxUri, _obj: unknown): Notification[] => {
  return []
}

export const makePlugin = (
  db: Kysely<PartialDB>,
): DbRecordPlugin<Profile.Record, AppBskyProfile> => {
  return {
    collection: type,
    tableName,
    get: getFn(db),
    validateSchema,
    insert: insertFn(db),
    delete: deleteFn(db),
    translateDbObj,
    notifsForRecord,
  }
}

export default makePlugin