// تكامل Discord Embedded App SDK
class DiscordSDK {
    constructor() {
        this.sdk = null;
        this.user = null;
        this.participants = [];
        this.spectators = [];
        this.channelId = null;
        this.guildId = null;
        this.instanceId = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            // تحميل SDK
            this.sdk = new Discord.App({ clientId: '1428774370012041246' });
            
            // انتظار تهيئة SDK
            await this.sdk.ready();
            
            // الحصول على بيانات المستخدم
            this.user = await this.sdk.commands.getCurrentUser();
            
            // الحصول على معلومات النشاط
            const instance = await this.sdk.instance.getInstance();
            this.instanceId = instance.instance_id;
            this.channelId = instance.channel_id;
            this.guildId = instance.guild_id;
            
            // اشتراك في تحديثات المشاركين
            this.subscribeToParticipants();
            
            // اشتراك في تحديثات الصوت
            this.subscribeToVoice();
            
            // تحديث الحالة
            await this.updateActivityState();
            
            this.initialized = true;
            console.log('✅ Discord SDK initialized successfully');
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Discord SDK:', error);
            return false;
        }
    }

    async subscribeToParticipants() {
        // الحصول على المشاركين الحاليين
        const voiceState = await this.sdk.commands.getVoiceStates();
        this.updateParticipants(voiceState.voice_states);
        
        // اشتراك في تحديثات المشاركين
        this.sdk.subscribe('VOICE_STATE_UPDATE', (voiceStates) => {
            this.updateParticipants(voiceStates.voice_states);
            
            // إرسال حدث لتحديث UI
            const event = new CustomEvent('participants-updated', {
                detail: { participants: this.participants }
            });
            window.dispatchEvent(event);
        });
    }

    updateParticipants(voiceStates) {
        this.participants = [];
        this.spectators = [];
        
        voiceStates.forEach(state => {
            const user = state.user;
            const isSpeaking = state.speaking || false;
            
            const participant = {
                id: user.id,
                username: user.username,
                globalName: user.global_name || user.username,
                avatar: user.avatar,
                isSpeaking: isSpeaking,
                isMuted: state.mute || false,
                isDeafened: state.deaf || false
            };
            
            if (state.channel_id === this.channelId) {
                this.participants.push(participant);
            } else {
                this.spectators.push(participant);
            }
        });
        
        console.log(`👥 Participants: ${this.participants.length}, Spectators: ${this.spectators.length}`);
    }

    subscribeToVoice() {
        // اشتراك في تحديثات الصوت
        this.sdk.subscribe('SPEAKING_START', ({ user_id }) => {
            this.setSpeaking(user_id, true);
        });
        
        this.sdk.subscribe('SPEAKING_STOP', ({ user_id }) => {
            this.setSpeaking(user_id, false);
        });
    }

    setSpeaking(userId, isSpeaking) {
        const participant = this.participants.find(p => p.id === userId);
        if (participant) {
            participant.isSpeaking = isSpeaking;
            
            // إرسال حدث تحديث المتحدث
            const event = new CustomEvent('speaking-updated', {
                detail: { userId, isSpeaking }
            });
            window.dispatchEvent(event);
        }
    }

    async updateActivityState(state = null) {
        if (!this.sdk) return;
        
        try {
            if (state) {
                await this.sdk.commands.setActivity({
                    state: state.state || 'Playing Spyfall',
                    details: state.details || 'Spy Game',
                    instance: true,
                    buttons: state.buttons || [
                        { label: 'Join Game', url: 'https://discord.com' }
                    ],
                    ...state
                });
            }
        } catch (error) {
            console.error('Failed to update activity state:', error);
        }
    }

    getCurrentUser() {
        return this.user;
    }

    getParticipants() {
        return this.participants;
    }

    getSpectators() {
        return this.spectators;
    }

    async sendMessageToUser(userId, message) {
        try {
            // إرسال رسالة خاصة عبر SDK
            await this.sdk.commands.openPrivateChannel(userId);
            // Note: قد تتطلب إصدارات SDK أحدث طرق مختلفة
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    }

    async closeActivity() {
        try {
            await this.sdk.commands.closeActivity();
        } catch (error) {
            console.error('Failed to close activity:', error);
        }
    }
}

// إنشاء نسخة عامة
window.discordSDK = new DiscordSDK();