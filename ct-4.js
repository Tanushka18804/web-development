// PWA E-Commerce Platform

// Backend (Node.js with Express)
const express = require("express");
const path = require("path");
const webpush = require("web-push");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// VAPID keys for push notifications
const vapidKeys = webpush.generateVAPIDKeys();
webpush.setVapidDetails("mailto:test@example.com", vapidKeys.publicKey, vapidKeys.privateKey);

const subscriptions = [];

app.post("/subscribe", (req, res) => {
  const subscription = req.body;
  subscriptions.push(subscription);
  res.status(201).json({ message: "Subscription received" });
});

app.post("/sendNotification", (req, res) => {
  const payload = JSON.stringify({ title: "New Product Alert", body: "Check out our latest products!" });
  subscriptions.forEach(sub => webpush.sendNotification(sub, payload).catch(err => console.error(err)));
  res.status(200).json({ message: "Notification sent" });
});

app.listen(5000, () => console.log("Server running on port 5000"));

// Frontend (PWA setup in public folder)

// service-worker.js
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open("static").then(cache => {
      return cache.addAll([
        "/index.html",
        "/styles.css",
        "/app.js",
        "/images/logo.png",
      ]);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener("push", event => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/images/logo.png"
  });
});

// app.js
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js")
    .then(reg => console.log("Service Worker registered", reg))
    .catch(err => console.error("Service Worker registration failed", err));
}

document.getElementById("subscribe").addEventListener("click", () => {
  Notification.requestPermission().then(permission => {
    if (permission === "granted") {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKeys.publicKey
        }).then(sub => {
          fetch("/subscribe", {
            method: "POST",
            body: JSON.stringify(sub),
            headers: { "Content-Type": "application/json" }
          }).then(() => alert("Subscribed for notifications!"));
        });
      });
    }
  });
});
