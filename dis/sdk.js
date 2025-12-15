// sdk.js — FINAL REAL FIX (Discord Activities)

const CLIENT_ID = "1428774370012041246";

class SpyfallSDK {
  constructor() {
    this.sdk = null;
    this.user = null;
    this.instance = null;
  }

  async init() {
    try {
      if (!window.DiscordSDK) {
        throw new Error("Discord SDK not found");
      }

      // إنشاء SDK
      this.sdk = new window.DiscordSDK(CLIENT_ID);

      // انتظار Discord Activity
      await this.sdk.ready();
      console.log("✅ SDK Ready");

      // جلب بيانات الـ Activity Instance
      this.instance = await this.sdk.commands.getInstance();
      console.log("🎮 Instance:", this.instance);

      // جلب المستخدم الحالي
      this.user = await this.sdk.commands.getCurrentUser();
      console.log("👤 User:", this.user);

      return true;

    } catch (err) {
      console.error("❌ SDK INIT FAILED:", err);
      return false;
    }
  }
}

window.spyfallSDK = new SpyfallSDK();
