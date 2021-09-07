const { getDb } = require('./database')

module.exports.getTestHoloports = async () => {
  let testHoloports = []

  const collection = await getCollection('test_holoports')
  const cursor = await collection.find({})

  await cursor.forEach((el) => {
    if (el.enabled) testHoloports.push(el.name)
  })

  return testHoloports
}

module.exports.getHoloportDetails = async (holoports = undefined) => {
  let holoportDetails = []

  const collection = await getCollection('performance_summary')
  let searchParams = {}
  if (!!holoports) searchParams = { name: { $in: holoports }}

  const cursor = await collection.find(searchParams)

  await cursor.forEach((el) => {
    if (!el.zt_ipaddress.includes("172.26.")) return
    holoportDetails.push({name: el.name, IP: el.zt_ipaddress})
  })

  const retrieved_hps = holoportDetails.map(a => a.name)
  if (!!holoports) console.log("Missing holoports are \n:", holoports.filter(e => !retrieved_hps.includes(e)) )

  return holoportDetails
}

module.exports.insertHolportsStatus = async (pingResults) => {
  const collection = await getCollection('holoports_status')
  const response = await collection.insertMany(pingResults)
  console.log(`Saving ${response.insertedCount} ping results in database`)
}

module.exports.disableUnswitchedHoloports = async (switchResults) => {
  const collection = await getCollection('test_holoports')
  const unswitchedHoloports = switchResults.map(a => a.name)
  const filter = {name:{$in: unswitchedHoloports}}
  const update = { $set : {enabled : false } }
  const response = await collection.updateMany(filter, update)
  console.log(`Update ${response.modifiedCount} holoport records in database`)
}

getCollection = async (name) => {
  db = await getDb()
  return await db.collection(name);
}
