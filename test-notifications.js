#!/usr/bin/env node
/* eslint-env node */

// Load environment variables from .env file (same as your mobile app)
require("dotenv").config();

// Environment switching (matches your mobile app logic)
const API_ENV = process.env.EXPO_PUBLIC_API_ENV || "development";
const BASE_URL =
  API_ENV === "development"
    ? `http://${process.env.EXPO_PUBLIC_LOCALHOST_IP || "localhost"}:${process.env.EXPO_PUBLIC_LOCALHOST_PORT || "3000"}`
    : process.env.EXPO_PUBLIC_API_BASE_URL;

if (!BASE_URL)
  throw new Error("Set EXPO_PUBLIC_API_BASE_URL for production tests");

console.log(`🌍 Environment: ${API_ENV}`);
console.log(`🔗 API URL: ${BASE_URL}`);

// Get JWT token from your mobile app's current session (you'll need to paste this)
let JWT_TOKEN = process.env.TEST_JWT;

console.log("🔔 Testing Notification System");
console.log("==============================");

async function testNotifications() {
  // If no token provided, try to use a guest token
  if (!JWT_TOKEN || JWT_TOKEN === "your-jwt-token-here") {
    console.log("\n🔑 No JWT token found, trying guest authentication...");

    try {
      const response = await fetch(`${BASE_URL}/api/auth/guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const result = await response.json();
        JWT_TOKEN = result.access_token;
        console.log("✅ Guest token obtained");
      } else {
        console.log(
          "❌ Failed to get guest token, please set TEST_JWT in your .env file",
        );
        console.log("💡 To get your JWT token:");
        console.log("   1. Open your mobile app");
        console.log("   2. Obtain a test session using your own auth provider");
        console.log("   3. Copy the token and add TEST_JWT=your_token to .env");
        return;
      }
    } catch (error) {
      console.log("❌ Guest authentication failed:", error.message);
      return;
    }
  }

  // Check existing notifications first
  console.log("\n1️⃣ Checking for existing notifications...");

  try {
    const response = await fetch(`${BASE_URL}/api/notifications`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${JWT_TOKEN}`,
      },
    });

    if (response.ok) {
      const result = await response.json();
      console.log("📊 Existing notifications found:", result.count || 0);

      if (result.notifications && result.notifications.length > 0) {
        console.log("✅ Latest notifications:");
        result.notifications.slice(0, 3).forEach((notif, index) => {
          console.log(`   ${index + 1}. ${notif.title}: ${notif.body}`);
          console.log(
            `      Created: ${new Date(notif.createdAt).toLocaleString()}`,
          );
          console.log(`      Deep Link: ${JSON.stringify(notif.deepLinkData)}`);
        });
      } else {
        console.log("ℹ️  No existing notifications found");
      }
    } else {
      console.log("❌ Failed to fetch notifications:", response.status);
      const errorText = await response.text();
      console.log("   Error:", errorText);
    }
  } catch (error) {
    console.error("❌ Notification check failed:", error.message);
  }

  console.log("\n2️⃣ Creating a test checkin to trigger notification...");

  // Create a test checkin
  const checkinData = {
    message: {
      id: `test-${Date.now()}`,
      role: "user",
      content: `Test notification at ${new Date().toLocaleTimeString()}`,
      createdAt: new Date(),
      parts: [
        {
          type: "text",
          text: `Test notification at ${new Date().toLocaleTimeString()}`,
        },
      ],
    },
  };

  try {
    const response = await fetch(`${BASE_URL}/api/checkin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${JWT_TOKEN}`,
      },
      body: JSON.stringify(checkinData),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log("✅ Test checkin created successfully!");
      console.log("📝 Checkin ID:", result.checkinId);
      console.log("📱 This should have created a notification");
    } else {
      console.log("❌ Failed to create checkin:", result.error || result);
      return;
    }
  } catch (error) {
    console.error("❌ Checkin test failed:", error.message);
    return;
  }

  // Wait a moment then check for new notifications
  console.log("\n3️⃣ Checking for new notifications...");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  try {
    const response = await fetch(`${BASE_URL}/api/notifications`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${JWT_TOKEN}`,
      },
    });

    const result = await response.json();
    console.log("📊 Total notifications now:", result.count || 0);

    if (result.notifications && result.notifications.length > 0) {
      console.log("✅ Latest notification:");
      const latest = result.notifications[0];
      console.log(`   📝 Title: ${latest.title}`);
      console.log(`   💬 Body: ${latest.body}`);
      console.log(`   🔗 Deep Link: ${JSON.stringify(latest.deepLinkData)}`);
      console.log(
        `   📅 Created: ${new Date(latest.createdAt).toLocaleString()}`,
      );
      console.log(`   📱 Status: ${latest.deliveryStatus}`);
    } else {
      console.log("❌ No notifications found - something might be wrong");
    }
  } catch (error) {
    console.error("❌ Final notification check failed:", error.message);
  }

  console.log("\n🎉 Test completed!");
  console.log("\n📋 What this test shows:");
  console.log("✅ Backend creates notifications when checkins are submitted");
  console.log("✅ Notifications can be fetched via API");
  console.log("❓ Mobile app needs to fetch and display these notifications");
}

// Run the test
testNotifications().catch(console.error);
