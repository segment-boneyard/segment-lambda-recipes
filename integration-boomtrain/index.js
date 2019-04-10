const axios = require('axios')
const Facade = require('segmentio-facade')
const auth = require('basic-auth')
const { json, createError, send } = require('micro')

class Integration {
  constructor(authToken) {
    this.request = axios.create({
      baseURL: 'https://api.boomtrain.net/201507',
      timeout: 10000,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      auth: {
        username: 'api',
        password: authToken
      }
    })
  }

  async Track(msg) {
    let response = await this.request.post('/activities', {
      activity: {
        subscriber: {
          uid: msg.userId()
        },
        event: msg.event(),
        timestamp: msg.timestamp(),
        properties: msg.properties()
      }
    })

    console.log(response.body)
  }

  async Identify(msg) {
    let response = await this.request.post('/subscribers/identify', {
      subscriber: {
        uid: msg.userId(),
        first_name: msg.firstName(),
        last_name: msg.lastName(),
        properties: {
          ...msg.traits()
        },
        contacts: [...this.extractContacts(msg)]
      }
    })

    console.log(response.body)
  }

  extractContacts(msg) {
    return ['phone', 'email']
      .filter(t => (msg[t]()))
      .map(t => ({
        contact_type: t,
        contact_value: msg[t](),
        subscription_status: 'active'
      }))
  }
}

module.exports = async function (req, res) {  
  // Parse event and ensure we support
  const event = (await json(req))
  const type = event.type.charAt(0).toUpperCase() + event.type.slice(1)
  if (!(type === 'Track' || type === 'Identify')) {
    throw createError('unsupported event')
  }

  var { name: authToken } = auth(req)

  if (!authToken) {
    return await send(res, 401, 'unauthorized')
  }

  const msg = new Facade[type](event)
  const integration = new Integration(authToken)
  await integration[type](msg);

  res.end('👌')
}
