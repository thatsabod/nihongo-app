/* Firebase Cloud Messaging background service worker.
 * Served at /firebase-messaging-sw.js (root scope). Shows notifications when the
 * app is closed/backgrounded and routes clicks into the app. Uses the compat
 * CDN build (service workers can't use ES modules / import.meta env). */
/* eslint-disable */
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyDLzE2f3OvgnwnwVzmx0ttl2zpfU25-E6k',
  authDomain: 'my-japanese-ar.firebaseapp.com',
  projectId: 'my-japanese-ar',
  storageBucket: 'my-japanese-ar.firebasestorage.app',
  messagingSenderId: '580938722409',
  appId: '1:580938722409:web:e02642c7f8abb5bd0a46f8',
})

const messaging = firebase.messaging()

// Background message → show a notification. We send a DATA-only payload from the
// function so we fully control rendering here (avoids the double notification
// that a `notification` payload would auto-show).
messaging.onBackgroundMessage((payload) => {
  const d = payload.data || {}
  const title = d.title || 'نيهونغو'
  const options = {
    body: d.body || '',
    icon: d.icon || '/favicon.svg',
    badge: '/favicon.svg',
    image: d.image || undefined,
    dir: 'rtl',
    data: { clickAction: d.clickAction || '/', type: d.type || 'broadcast' },
    tag: d.tag || undefined,
  }
  return self.registration.showNotification(title, options)
})

// Click → focus an existing tab (navigate it) or open a new one at the route.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const route = (event.notification.data && event.notification.data.clickAction) || '/'
  const target = new URL(route, self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          if ('navigate' in client) { try { client.navigate(target) } catch (e) {} }
          return client.focus()
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(target) : null
    }),
  )
})
