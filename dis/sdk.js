// sdk.js — FINAL WORKING VERSION

const CLIENT_ID = "1428774370012041246";

class SpyfallSDK {
  constructor() {
    this.sdk = null;
    this.user = null;
  }

  async init() {
    try {
      if (!window.DiscordSDK) {
        throw new Error("Discord SDK not loaded");
      }

      this.sdk = new window.DiscordSDK(CLIENT_ID);
      await this.sdk.ready();

      // ⭐ السطر المهم اللي كان ناقص
      await this.sdk.commands.authorize({
        client_id: CLIENT_ID,
        response_type: "code",
        scope: "identify",
        redirect_uri: window.location.origin
      });

      this.user = await this.sdk.commands.getCurrentUser();
      return true;

    } catch (err) {
      console.error("SDK INIT ERROR:", err);
      return false;
    }
  }
}

window.spyfallSDK = new SpyfallSDK();
