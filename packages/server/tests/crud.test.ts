import AdxApi, { ServiceClient as AdxServiceClient } from '@adxp/api'
import * as Post from '@adxp/api/src/types/app/bsky/post'
import { AdxUri } from '@adxp/uri'
import * as util from './_util'

const alice = {
  email: 'alice@test.com',
  username: 'alice.test',
  did: '',
  password: 'alice-pass',
}
const bob = {
  email: 'bob@test.com',
  username: 'bob.test',
  did: '',
  password: 'bob-pass',
}

describe('crud operations', () => {
  let client: AdxServiceClient
  let aliceClient: AdxServiceClient
  let close: util.CloseFn

  beforeAll(async () => {
    const server = await util.runTestServer()
    close = server.close
    client = AdxApi.service(server.url)
    aliceClient = AdxApi.service(server.url)
  })

  afterAll(async () => {
    await close()
  })

  it('registers users', async () => {
    const res = await client.com.atproto.createAccount(
      {},
      {
        email: alice.email,
        username: alice.username,
        password: alice.password,
      },
    )
    aliceClient.setHeader('authorization', `Bearer ${res.data.jwt}`)
    alice.did = res.data.did
    const res2 = await client.com.atproto.createAccount(
      {},
      {
        email: bob.email,
        username: bob.username,
        password: bob.password,
      },
    )
    bob.did = res2.data.did
  })

  it('describes repo', async () => {
    const description = await client.com.atproto.repoDescribe({
      nameOrDid: alice.did,
    })
    expect(description.data.name).toBe(alice.username)
    expect(description.data.did).toBe(alice.did)
    const description2 = await client.com.atproto.repoDescribe({
      nameOrDid: bob.did,
    })
    expect(description2.data.name).toBe(bob.username)
    expect(description2.data.did).toBe(bob.did)
  })

  let uri: AdxUri
  it('creates records', async () => {
    const res = await aliceClient.com.atproto.repoCreateRecord(
      { did: alice.did, type: 'app.bsky.post' },
      {
        $type: 'app.bsky.post',
        text: 'Hello, world!',
        createdAt: new Date().toISOString(),
      },
    )
    uri = new AdxUri(res.data.uri)
    expect(res.data.uri).toBe(
      `adx://${alice.did}/app.bsky.post/${uri.recordKey}`,
    )
  })

  it('lists records', async () => {
    const res1 = await client.com.atproto.repoListRecords({
      nameOrDid: alice.did,
      type: 'app.bsky.post',
    })
    expect(res1.data.records.length).toBe(1)
    expect(res1.data.records[0].uri).toBe(uri.toString())
    expect((res1.data.records[0].value as Post.Record).text).toBe(
      'Hello, world!',
    )

    const res2 = await client.app.bsky.post.list({
      nameOrDid: alice.did,
    })
    expect(res2.records.length).toBe(1)
    expect(res2.records[0].uri).toBe(uri.toString())
    expect(res2.records[0].value.text).toBe('Hello, world!')
  })

  it('gets records', async () => {
    const res1 = await client.com.atproto.repoGetRecord({
      nameOrDid: alice.did,
      type: 'app.bsky.post',
      tid: uri.recordKey,
    })
    expect(res1.data.uri).toBe(uri.toString())
    expect((res1.data.value as Post.Record).text).toBe('Hello, world!')

    const res2 = await client.app.bsky.post.get({
      nameOrDid: alice.did,
      tid: uri.recordKey,
    })
    expect(res2.uri).toBe(uri.toString())
    expect(res2.value.text).toBe('Hello, world!')
  })

  // it('puts records', async () => {
  //   const res1 = await aliceClient.com.atproto.repoPutRecord(
  //     { did: alice.did, type: 'app.bsky.post', tid: uri.recordKey },
  //     {
  //       $type: 'app.bsky.post',
  //       text: 'Hello, universe!',
  //       createdAt: new Date().toISOString(),
  //     },
  //   )
  //   expect(res1.data.uri).toBe(uri.toString())

  //   const res2 = await client.com.atproto.repoGetRecord({
  //     nameOrDid: alice.did,
  //     type: 'app.bsky.post',
  //     tid: uri.recordKey,
  //   })
  //   expect(res2.data.uri).toBe(uri.toString())
  //   expect((res2.data.value as Post.Record).text).toBe('Hello, universe!')

  //   const res3 = await aliceClient.app.bsky.post.put(
  //     { did: alice.did, tid: uri.recordKey },
  //     {
  //       $type: 'app.bsky.post',
  //       text: 'Hello, universe!!!',
  //       createdAt: new Date().toISOString(),
  //     },
  //   )
  //   expect(res3.uri).toBe(uri.toString())

  //   const res4 = await client.app.bsky.post.get({
  //     nameOrDid: alice.did,
  //     tid: uri.recordKey,
  //   })
  //   expect(res4.uri).toBe(uri.toString())
  //   expect(res4.value.text).toBe('Hello, universe!!!')
  // })

  it('deletes records', async () => {
    await aliceClient.com.atproto.repoDeleteRecord({
      did: alice.did,
      type: 'app.bsky.post',
      tid: uri.recordKey,
    })
    const res1 = await client.com.atproto.repoListRecords({
      nameOrDid: alice.did,
      type: 'app.bsky.post',
    })
    expect(res1.data.records.length).toBe(0)
  })

  it('CRUDs records with the semantic sugars', async () => {
    const res1 = await aliceClient.app.bsky.post.create(
      { did: alice.did },
      {
        $type: 'app.bsky.post',
        text: 'Hello, world!',
        createdAt: new Date().toISOString(),
      },
    )
    const uri = new AdxUri(res1.uri)

    const res2 = await client.app.bsky.post.list({
      nameOrDid: alice.did,
    })
    expect(res2.records.length).toBe(1)

    await aliceClient.app.bsky.post.delete({
      did: alice.did,
      tid: uri.recordKey,
    })

    const res3 = await client.app.bsky.post.list({
      nameOrDid: alice.did,
    })
    expect(res3.records.length).toBe(0)
  })

  it('lists records with pagination', async () => {
    const doCreate = async (text: string) => {
      const res = await aliceClient.app.bsky.post.create(
        { did: alice.did },
        {
          $type: 'app.bsky.post',
          text,
          createdAt: new Date().toISOString(),
        },
      )
      return new AdxUri(res.uri)
    }
    const doList = async (params: any) => {
      const res = await client.app.bsky.post.list({
        nameOrDid: alice.did,
        ...params,
      })
      return res
    }
    const uri1 = await doCreate('Post 1')
    const uri2 = await doCreate('Post 2')
    const uri3 = await doCreate('Post 3')
    const uri4 = await doCreate('Post 4')
    {
      const list = await doList({ limit: 2 })
      expect(list.records.length).toBe(2)
      expect(list.records[0].value.text).toBe('Post 1')
      expect(list.records[1].value.text).toBe('Post 2')
    }
    {
      const list = await doList({ limit: 2, reverse: true })
      expect(list.records.length).toBe(2)
      expect(list.records[0].value.text).toBe('Post 4')
      expect(list.records[1].value.text).toBe('Post 3')
    }

    {
      const list = await doList({ after: uri2.recordKey })
      expect(list.records.length).toBe(2)
      expect(list.records[0].value.text).toBe('Post 3')
      expect(list.records[1].value.text).toBe('Post 4')
    }
    {
      const list = await doList({ before: uri3.recordKey })
      expect(list.records.length).toBe(2)
      expect(list.records[0].value.text).toBe('Post 1')
      expect(list.records[1].value.text).toBe('Post 2')
    }
    {
      const list = await doList({
        before: uri4.recordKey,
        after: uri1.recordKey,
      })
      expect(list.records.length).toBe(2)
      expect(list.records[0].value.text).toBe('Post 2')
      expect(list.records[1].value.text).toBe('Post 3')
    }

    await aliceClient.app.bsky.post.delete({
      did: alice.did,
      tid: uri1.recordKey,
    })
    await aliceClient.app.bsky.post.delete({
      did: alice.did,
      tid: uri2.recordKey,
    })
    await aliceClient.app.bsky.post.delete({
      did: alice.did,
      tid: uri3.recordKey,
    })
    await aliceClient.app.bsky.post.delete({
      did: alice.did,
      tid: uri4.recordKey,
    })
  })

  // Validation
  // --------------

  it('requires a $type on records', async () => {
    const prom1 = aliceClient.com.atproto.repoCreateRecord(
      { did: alice.did, type: 'app.bsky.post' },
      {},
    )
    await expect(prom1).rejects.toThrow(
      'The passed value does not declare a $type',
    )
    // const prom2 = aliceClient.com.atproto.repoPutRecord(
    //   { did: alice.did, type: 'app.bsky.post', tid: 'foo' },
    //   {},
    // )
    // await expect(prom2).rejects.toThrow(
    //   'The passed value does not declare a $type',
    // )
  })

  it('requires the schema to be known if validating', async () => {
    // const prom1 = client.com.atproto.repoListRecords(url, {
    //   nameOrDid: alice.did,
    //   type: 'com.example.foobar',
    // })
    // await expect(prom1).rejects.toThrow('Schema not found: com.example.foobar')
    const prom2 = aliceClient.com.atproto.repoCreateRecord(
      { did: alice.did, type: 'com.example.foobar' },
      { $type: 'com.example.foobar' },
    )
    await expect(prom2).rejects.toThrow('Schema not found')
    // const prom3 = aliceClient.com.atproto.repoPutRecord(
    //   { did: alice.did, type: 'com.example.foobar', tid: 'foo' },
    //   { $type: 'com.example.foobar' },
    // )
    // await expect(prom3).rejects.toThrow('Schema not found')
  })

  it('requires the $type to match the schema', async () => {
    await expect(
      aliceClient.com.atproto.repoCreateRecord(
        { did: alice.did, type: 'app.bsky.post' },
        { $type: 'app.bsky.like' },
      ),
    ).rejects.toThrow('Record type app.bsky.like is not supported')
    // await expect(
    //   aliceClient.com.atproto.repoPutRecord(
    //     { did: alice.did, type: 'app.bsky.post', tid: 'foo' },
    //     { $type: 'app.bsky.like' },
    //   ),
    // ).rejects.toThrow('Record type app.bsky.like is not supported')
  })

  it('validates the record on write', async () => {
    await expect(
      aliceClient.com.atproto.repoCreateRecord(
        { did: alice.did, type: 'app.bsky.post' },
        { $type: 'app.bsky.post' },
      ),
    ).rejects.toThrow(
      "Failed app.bsky.post validation for #/required: must have required property 'text'",
    )
    // await expect(
    //   aliceClient.com.atproto.repoPutRecord(
    //     { did: alice.did, type: 'app.bsky.post', tid: 'foo' },
    //     { $type: 'app.bsky.post' },
    //   ),
    // ).rejects.toThrow(
    //   "Failed app.bsky.post validation for #/required: must have required property 'text'",
    // )
  })

  // TODO: does it?
  // it('validates the record on read', async () => {
  //   const res1 = await client.com.atproto.repoCreateRecord(
  //     url,
  //     { did: alice.did, type: 'app.bsky.post', validate: false },
  //     {
  //       encoding: 'application/json',
  //       data: { $type: 'app.bsky.post', record: 'is bad' },
  //     },
  //   )
  //   const res2 = await client.com.atproto.repoCreateRecord(
  //     url,
  //     { did: alice.did, type: 'app.bsky.post', validate: false },
  //     {
  //       encoding: 'application/json',
  //       data: { $type: 'com.example.unknown', dunno: 'lol' },
  //     },
  //   )
  //   const res3 = await client.com.atproto.repoListRecords(url, {
  //     nameOrDid: alice.did,
  //     type: 'app.bsky.post',
  //   })
  //   /** @ts-ignore TODO!!! */
  //   expect(res3.data.records[0].value.record).toBe('is bad')
  //   /** @ts-ignore TODO!!! */
  //   expect(res3.data.records[0].valid).toBeFalsy()
  //   /** @ts-ignore TODO!!! */
  //   expect(res3.data.records[0].fullySupported).toBeFalsy()
  //   /** @ts-ignore TODO!!! */
  //   expect(res3.data.records[0].compatible).toBeTruthy()
  //   /** @ts-ignore TODO!!! */
  //   expect(res3.data.records[0].error).toBe(
  //     `Failed app.bsky.post validation for #/required: must have required property 'text'`,
  //   )
  //   /** @ts-ignore TODO!!! */
  //   expect(res3.data.records[1].value.dunno).toBe('lol')
  //   /** @ts-ignore TODO!!! */
  //   expect(res3.data.records[1].valid).toBeFalsy()
  //   /** @ts-ignore TODO!!! */
  //   expect(res3.data.records[1].fullySupported).toBeFalsy()
  //   /** @ts-ignore TODO!!! */
  //   expect(res3.data.records[1].compatible).toBeFalsy()
  //   /** @ts-ignore TODO!!! */
  //   expect(res3.data.records[1].error).toBe(
  //     `Record type com.example.unknown is not supported`,
  //   )
  //   const res4 = await client.com.atproto.repoGetRecord(url, {
  //     nameOrDid: alice.did,
  //     type: 'app.bsky.post',
  //     tid: new AdxUri(res1.data.uri).recordKey,
  //   })
  //   /** @ts-ignore TODO!!! */
  //   expect(res4.data.value.record).toBe('is bad')
  //   /** @ts-ignore TODO!!! */
  //   expect(res4.data.valid).toBeFalsy()
  //   /** @ts-ignore TODO!!! */
  //   expect(res4.data.fullySupported).toBeFalsy()
  //   /** @ts-ignore TODO!!! */
  //   expect(res4.data.compatible).toBeTruthy()
  //   /** @ts-ignore TODO!!! */
  //   expect(res4.data.error).toBe(
  //     `Failed app.bsky.post validation for #/required: must have required property 'text'`,
  //   )
  //   const res5 = await client.com.atproto.repoGetRecord(url, {
  //     nameOrDid: alice.did,
  //     type: 'app.bsky.post',
  //     tid: new AdxUri(res2.data.uri).recordKey,
  //   })
  //   /** @ts-ignore TODO!!! */
  //   expect(res5.data.value.dunno).toBe('lol')
  //   /** @ts-ignore TODO!!! */
  //   expect(res5.data.valid).toBeFalsy()
  //   /** @ts-ignore TODO!!! */
  //   expect(res5.data.fullySupported).toBeFalsy()
  //   /** @ts-ignore TODO!!! */
  //   expect(res5.data.compatible).toBeFalsy()
  //   /** @ts-ignore TODO!!! */
  //   expect(res5.data.error).toBe(
  //     `Record type com.example.unknown is not supported`,
  //   )
  //   await client.com.atproto.repoDeleteRecord(url, {
  //     did: alice.did,
  //     type: 'app.bsky.post',
  //     tid: new AdxUri(res1.data.uri).recordKey,
  //   })
  //   await client.com.atproto.repoDeleteRecord(url, {
  //     did: alice.did,
  //     type: 'app.bsky.post',
  //     tid: new AdxUri(res2.data.uri).recordKey,
  //   })
  // })
})