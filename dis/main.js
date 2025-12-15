// المنطق الرئيسي للعبة
class SpyfallGame {
    constructor() {
        this.discord = window.discordSDK;
        this.state = window.gameState;
        this.timers = new Map();
        this.currentUserId = null;
        this.isHost = false;
        
        this.initialize();
    }

    async initialize() {
        try {
            // تهيئة Discord SDK
            const sdkReady = await this.discord.initialize();
            if (!sdkReady) {
                this.showError('فشل الاتصال بـ Discord SDK');
                return;
            }

            // الحصول على المستخدم الحالي
            const user = this.discord.getCurrentUser();
            this.currentUserId = user.id;
            
            // تحميل الحالة المحفوظة
            this.state.loadFromStorage();
            
            // إعداد واجهة المستخدم
            this.setupUI();
            this.updateParticipants();
            
            // إخفاء شاشة التحميل
            this.hideLoadingScreen();
            
            // الاستماع للأحداث
            this.setupEventListeners();
            
            console.log('🎮 Spyfall game initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.showError('فشل تحميل اللعبة');
        }
    }

    setupUI() {
        // تحديث عدد اللاعبين
        this.updatePlayerCount();
        
        // إعداد أزرار التحكم
        this.setupControlButtons();
        
        // تحديث حالة اللعبة
        this.updateGamePhase();
    }

    hideLoadingScreen() {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('main-screen').classList.remove('hidden');
    }

    setupEventListeners() {
        // تحديث المشاركين
        window.addEventListener('participants-updated', (e) => {
            this.updateParticipants();
        });

        // تحديث المتحدثين
        window.addEventListener('speaking-updated', (e) => {
            this.updateSpeakingIndicator(e.detail.userId, e.detail.isSpeaking);
        });

        // زر بدء اللعبة
        document.getElementById('start-game-btn').addEventListener('click', () => {
            this.startGame();
        });

        // زر إعادة اللعبة
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restartGame();
        });

        // زر إنهاء السؤال
        document.getElementById('end-question-btn').addEventListener('click', () => {
            this.endCurrentQuestion();
        });

        // تحديث المؤقت
        setInterval(() => {
            this.updateTimers();
        }, 1000);
    }

    updateParticipants() {
        const participants = this.discord.getParticipants();
        const playersList = document.getElementById('players-list');
        
        // تحديث عدد اللاعبين
        this.updatePlayerCount();
        
        // تحويل المشاركين إلى لاعبين
        const players = participants.map(p => ({
            id: p.id,
            name: p.globalName,
            username: p.username,
            isSpeaking: p.isSpeaking,
            role: this.state.getPlayerRole(p.id) || 'unknown'
        }));
        
        // تحديث قائمة اللاعبين
        playersList.innerHTML = '';
        players.forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            playerItem.id = `player-${player.id}`;
            
            if (player.isSpeaking) {
                playerItem.classList.add('speaking');
            }
            
            if (player.id === this.currentUserId) {
                playerItem.classList.add('active');
            }
            
            playerItem.innerHTML = `
                <div class="player-avatar">${player.name.charAt(0)}</div>
                <div class="player-info">
                    <div class="player-name">${player.name}</div>
                    <div class="player-role">${this.getRoleText(player.role)}</div>
                </div>
            `;
            
            playersList.appendChild(playerItem);
        });
        
        // تحديث حالة زر البدء
        this.updateStartButton(players.length);
        
        // حفظ اللاعبين في الحالة
        if (this.state.state.phase === 'setup') {
            this.state.state.players = players;
        }
    }

    getRoleText(role) {
        const roles = {
            'spy': '🎭 جاسوس',
            'civilian': '📍 مدني',
            'unknown': '❓ غير معروف'
        };
        return roles[role] || '❓';
    }

    updateStartButton(playerCount) {
        const startBtn = document.getElementById('start-game-btn');
        
        if (playerCount >= 3 && playerCount <= 8) {
            startBtn.disabled = false;
            startBtn.textContent = `بدء اللعبة (${playerCount} لاعبين)`;
        } else {
            startBtn.disabled = true;
            startBtn.textContent = `بدء اللعبة (مطلوب 3-8 لاعبين، لديك ${playerCount})`;
        }
    }

    updatePlayerCount() {
        const participants = this.discord.getParticipants();
        const spectators = this.discord.getSpectators();
        
        document.getElementById('player-count').textContent = `👥 ${participants.length} لاعبين`;
        document.getElementById('spectator-count').textContent = spectators.length;
    }

    updateSpeakingIndicator(userId, isSpeaking) {
        const playerElement = document.getElementById(`player-${userId}`);
        if (playerElement) {
            if (isSpeaking) {
                playerElement.classList.add('speaking');
            } else {
                playerElement.classList.remove('speaking');
            }
        }
        
        // تحديث مؤشر المتحدث في واجهة السؤال
        if (this.state.state.questionInProgress) {
            const speakerElement = document.getElementById('current-speaker');
            if (isSpeaking && (userId === this.state.state.currentAsker || userId === this.state.state.currentAsked)) {
                speakerElement.textContent = this.getPlayerName(userId);
            }
        }
    }

    getPlayerName(playerId) {
        const player = this.state.state.players.find(p => p.id === playerId);
        return player ? player.name : 'لاعب غير معروف';
    }

    async startGame() {
        try {
            // الحصول على اللاعبين
            const players = this.discord.getParticipants().map(p => ({
                id: p.id,
                name: p.globalName,
                username: p.username
            }));
            
            if (players.length < 3) {
                this.showError('يحتاج إلى 3 لاعبين على الأقل');
                return;
            }
            
            if (players.length > 8) {
                this.showError('الحد الأقصى هو 8 لاعبين');
                return;
            }
            
            // بدء اللعبة
            const gameData = this.state.startGame(players);
            
            // تحديث واجهة المستخدم
            this.updateGamePhase();
            
            // عرض الأدوار للاعبين
            this.showPlayerRole();
            
            // تحديث حالة النشاط في Discord
            await this.discord.updateActivityState({
                state: `جولة ${this.state.state.currentRound} من ${this.state.state.totalRounds}`,
                details: `لاعبين: ${players.length}`,
                startTimestamp: Date.now()
            });
            
            console.log('🎮 Game started successfully');
            
        } catch (error) {
            console.error('Failed to start game:', error);
            this.showError('فشل بدء اللعبة');
        }
    }

    showPlayerRole() {
        const role = this.state.getPlayerRole(this.currentUserId);
        const roleView = document.getElementById('role-view');
        
        // إظهار عرض الأدوار
        roleView.classList.remove('hidden');
        
        // إخفاء جميع البطاقات
        document.getElementById('spy-card').classList.remove('active');
        document.getElementById('civilian-card').classList.remove('active');
        
        if (role === 'spy') {
            // بطاقة الجاسوس
            document.getElementById('spy-card').classList.add('active');
            
            // إرسال رسالة خاصة (محاكاة)
            this.showNotification('🎭 أنت الجاسوس! حاول معرفة المكان دون أن تكتشف');
            
        } else if (role === 'civilian') {
            // بطاقة المدني
            const location = this.state.getPlayerLocation(this.currentUserId);
            
            document.getElementById('civilian-card').classList.add('active');
            document.getElementById('location-name').textContent = location.name;
            
            const hintsList = document.getElementById('location-hints');
            hintsList.innerHTML = '';
            
            location.hints.forEach(hint => {
                const li = document.createElement('li');
                li.textContent = `• ${hint}`;
                hintsList.appendChild(li);
            });
            
            this.showNotification(`📍 أنت مدني. المكان: ${location.name}`);
        }
        
        // إخفاء عرض الأدوار بعد 10 ثواني
        setTimeout(() => {
            roleView.classList.add('hidden');
            this.startRound();
        }, 10000);
    }

    startRound() {
        if (this.state.state.currentRound > this.state.state.totalRounds) {
            this.startFinalVoting();
            return;
        }
        
        // تحديث مرحلة اللعبة
        this.state.state.phase = 'round';
        this.updateGamePhase();
        
        // تحديث رقم الجولة
        document.getElementById('current-round').textContent = this.state.state.currentRound;
        document.getElementById('total-rounds').textContent = this.state.state.totalRounds;
        
        // بدء دور اللاعب الأول
        this.startNextPlayerTurn();
    }

    startNextPlayerTurn() {
        const nextPlayer = this.state.getNextPlayer();
        
        if (!nextPlayer) {
            // تم سؤال الجميع، إنهاء الجولة
            this.endRound();
            return;
        }
        
        // إذا كان اللاعب الحالي هو المستخدم الحالي
        if (nextPlayer.id === this.currentUserId) {
            this.showPlayerSelectView(nextPlayer);
        } else {
            this.showWaitingView(nextPlayer);
        }
    }

    showPlayerSelectView(player) {
        // إظهار واجهة اختيار اللاعب
        const playerSelectView = document.getElementById('player-select-view');
        const selectablePlayers = document.getElementById('selectable-players');
        
        playerSelectView.classList.remove('hidden');
        document.getElementById('question-view').classList.add('hidden');
        document.getElementById('current-player-name').textContent = player.name;
        
        // إعداد قائمة اللاعبين للاختيار
        selectablePlayers.innerHTML = '';
        
        this.state.state.players.forEach(targetPlayer => {
            if (targetPlayer.id !== player.id && 
                !this.state.state.playersAskedThisRound.has(player.id)) {
                
                const button = document.createElement('button');
                button.className = 'player-select-btn';
                button.textContent = targetPlayer.name;
                button.dataset.playerId = targetPlayer.id;
                
                button.addEventListener('click', () => {
                    this.selectPlayerToAsk(player.id, targetPlayer.id);
                });
                
                selectablePlayers.appendChild(button);
            }
        });
    }

    selectPlayerToAsk(askerId, askedId) {
        // تسجيل السؤال
        this.state.recordPlayerAsk(askerId, askedId);
        
        // إخفاء واجهة الاختيار
        document.getElementById('player-select-view').classList.add('hidden');
        
        // إظهار واجهة السؤال
        this.showQuestionView(askerId, askedId);
        
        // بدء مؤقت السؤال (دقيقتان)
        this.startQuestionTimer(120);
    }

    showQuestionView(askerId, askedId) {
        const questionView = document.getElementById('question-view');
        
        questionView.classList.remove('hidden');
        document.getElementById('asker-name').textContent = this.getPlayerName(askerId);
        document.getElementById('asked-name').textContent = this.getPlayerName(askedId);
        
        // تحديث مؤشر المتحدث
        document.getElementById('speaker-indicator').classList.remove('hidden');
        document.getElementById('current-speaker').textContent = this.getPlayerName(askerId);
    }

    startQuestionTimer(seconds) {
        let timeLeft = seconds;
        
        const timerId = setInterval(() => {
            timeLeft--;
            
            // تحديث العرض
            const minutes = Math.floor(timeLeft / 60);
            const secs = timeLeft % 60;
            document.getElementById('question-time').textContent = 
                `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            
            if (timeLeft <= 0) {
                clearInterval(timerId);
                this.endCurrentQuestion();
            }
        }, 1000);
        
        this.timers.set('question', timerId);
    }

    endCurrentQuestion() {
        // إيقاف المؤقت
        const timer = this.timers.get('question');
        if (timer) {
            clearInterval(timer);
            this.timers.delete('question');
        }
        
        // إنهاء السؤال في الحالة
        this.state.endQuestion();
        
        // إخفاء واجهة السؤال
        document.getElementById('question-view').classList.add('hidden');
        document.getElementById('speaker-indicator').classList.add('hidden');
        
        // الانتقال للاعب التالي
        setTimeout(() => {
            this.startNextPlayerTurn();
        }, 2000);
    }

    endRound() {
        // الانتقال لتصويت الجولة
        this.state.state.phase = 'round_vote';
        this.updateGamePhase();
        
        this.showRoundVotingView();
    }

    showRoundVotingView() {
        const roundVoteView = document.getElementById('round-vote-view');
        roundVoteView.classList.remove('hidden');
        
        // إعداد أزرار التصويت
        document.querySelectorAll('.vote-btn').forEach(btn => {
            btn.onclick = (e) => {
                const vote = e.target.dataset.vote;
                this.voteInRound(vote);
            };
        });
        
        // بدء مؤقت التصويت (60 ثانية)
        this.startVoteTimer(60);
    }

    voteInRound(vote) {
        // تسجيل التصويت
        const results = this.state.recordRoundVote(this.currentUserId, vote);
        
        // تحديث العرض
        document.getElementById('continue-count').textContent = results.continueVotes;
        document.getElementById('end-count').textContent = results.endVotes;
        
        const totalVotes = results.continueVotes + results.endVotes;
        const continuePercent = totalVotes > 0 ? (results.continueVotes / totalVotes) * 100 : 0;
        const endPercent = totalVotes > 0 ? (results.endVotes / totalVotes) * 100 : 0;
        
        document.getElementById('continue-progress').style.width = `${continuePercent}%`;
        document.getElementById('end-progress').style.width = `${endPercent}%`;
        
        // التحقق إذا تم التصويت بالكامل
        if (totalVotes === this.state.state.players.length) {
            this.endRoundVoting();
        }
    }

    startVoteTimer(seconds) {
        let timeLeft = seconds;
        
        const timerId = setInterval(() => {
            timeLeft--;
            
            if (timeLeft <= 0) {
                clearInterval(timerId);
                this.endRoundVoting();
            }
        }, 1000);
        
        this.timers.set('vote', timerId);
    }

    endRoundVoting() {
        // إيقاف المؤقت
        const timer = this.timers.get('vote');
        if (timer) {
            clearInterval(timer);
            this.timers.delete('vote');
        }
        
        // حساب النتائج
        const results = this.state.recordRoundVote(this.currentUserId, 'continue'); // للحساب
        
        const totalVotes = this.state.state.roundVotes.size;
        const endVotes = Array.from(this.state.state.roundVotes.values()).filter(v => v === 'end').length;
        
        const endPercentage = totalVotes > 0 ? (endVotes / totalVotes) * 100 : 0;
        
        // إخفاء واجهة التصويت
        document.getElementById('round-vote-view').classList.add('hidden');
        
        if (endPercentage > 50) {
            // الانتقال للتصويت النهائي
            this.showNotification(`📊 ${endPercentage.toFixed(1)}% صوتوا للإنهاء، الانتقال للتصويت النهائي`);
            setTimeout(() => {
                this.startFinalVoting();
            }, 3000);
        } else {
            // استكمال الجولة التالية
            this.showNotification(`📊 ${endPercentage.toFixed(1)}% فقط صوتوا للإنهاء، استكمال الجولة التالية`);
            setTimeout(() => {
                this.state.startRound();
                this.startRound();
            }, 3000);
        }
    }

    startFinalVoting() {
        this.state.state.phase = 'final_vote';
        this.updateGamePhase();
        
        this.showFinalVotingView();
    }

    showFinalVotingView() {
        const finalVoteView = document.getElementById('final-vote-view');
        finalVoteView.classList.remove('hidden');
        
        const playersGrid = document.getElementById('final-vote-players');
        playersGrid.innerHTML = '';
        
        // إعداد أزرار التصويت
        this.state.state.players.forEach(player => {
            if (player.id !== this.currentUserId) { // لا يمكن التصويت للنفس
                const button = document.createElement('button');
                button.className = 'player-select-btn';
                button.textContent = player.name;
                button.dataset.playerId = player.id;
                
                button.addEventListener('click', () => {
                    this.voteInFinal(player.id);
                });
                
                playersGrid.appendChild(button);
            }
        });
        
        // بدء مؤقت التصويت (60 ثانية)
        this.startFinalVoteTimer(60);
    }

    voteInFinal(suspectId) {
        try {
            // تسجيل التصويت
            this.state.recordFinalVote(this.currentUserId, suspectId);
            
            this.showNotification(`✅ صوتت لـ ${this.getPlayerName(suspectId)}`);
            
            // تحديث عرض الأصوات
            this.updateFinalVotesDisplay();
            
            // التحقق إذا تم التصويت بالكامل
            if (this.state.state.finalVotes.size === this.state.state.players.length) {
                this.endFinalVoting();
            }
            
        } catch (error) {
            this.showError(error.message);
        }
    }

    updateFinalVotesDisplay() {
        const display = document.getElementById('final-votes-display');
        const votes = Array.from(this.state.state.finalVotes.entries());
        
        let html = '<h4>الأصوات:</h4>';
        votes.forEach(([voterId, suspectId]) => {
            html += `<p>${this.getPlayerName(voterId)} → ${this.getPlayerName(suspectId)}</p>`;
        });
        
        display.innerHTML = html;
    }

    startFinalVoteTimer(seconds) {
        let timeLeft = seconds;
        
        const timerId = setInterval(() => {
            timeLeft--;
            
            if (timeLeft <= 0) {
                clearInterval(timerId);
                this.endFinalVoting();
            }
        }, 1000);
        
        this.timers.set('final_vote', timerId);
    }

    endFinalVoting() {
        // إيقاف المؤقت
        const timer = this.timers.get('final_vote');
        if (timer) {
            clearInterval(timer);
            this.timers.delete('final_vote');
        }
        
        // حساب النتائج
        const results = this.state.calculateFinalResults();
        
        if (results.isSpyCaught) {
            // المدنيون فازوا
            this.showGameResults(true, results);
        } else {
            // الجاسوس لم يُكتشف، إعطائه فرصة التخمين
            this.showNotification('😞 لم يتم اكتشاف الجاسوس! إعطاء فرصة أخيرة');
            setTimeout(() => {
                this.showSpyGuessView();
            }, 3000);
        }
    }

    showSpyGuessView() {
        this.state.state.phase = 'spy_guess';
        this.updateGamePhase();
        
        // التحقق إذا كان اللاعب الحالي هو الجاسوس
        if (this.state.state.spy !== this.currentUserId) {
            this.showNotification('🎯 الجاسوس يحاول تخمين المكان...');
            return;
        }
        
        const spyGuessView = document.getElementById('spy-guess-view');
        spyGuessView.classList.remove('hidden');
        
        const locationsGrid = document.getElementById('locations-grid');
        locationsGrid.innerHTML = '';
        
        // عرض قائمة الأماكن
        this.state.locations.forEach(location => {
            const button = document.createElement('button');
            button.className = 'location-btn';
            button.textContent = location.name;
            
            button.addEventListener('click', () => {
                this.processSpyGuess(location.name);
            });
            
            locationsGrid.appendChild(button);
        });
        
        // بدء مؤقت التخمين (30 ثانية)
        this.startSpyGuessTimer(30);
    }

    startSpyGuessTimer(seconds) {
        let timeLeft = seconds;
        
        const timerId = setInterval(() => {
            timeLeft--;
            
            document.getElementById('guess-time').textContent = 
                `00:${timeLeft.toString().padStart(2, '0')}`;
            
            if (timeLeft <= 0) {
                clearInterval(timerId);
                this.processSpyGuess(null); // انتهاء الوقت
            }
        }, 1000);
        
        this.timers.set('spy_guess', timerId);
    }

    processSpyGuess(guess) {
        // إيقاف المؤقت
        const timer = this.timers.get('spy_guess');
        if (timer) {
            clearInterval(timer);
            this.timers.delete('spy_guess');
        }
        
        const actualLocation = this.state.state.location.name;
        const isCorrect = guess === actualLocation;
        
        // عرض النتائج
        this.showGameResults(isCorrect, { suspectedPlayer: null });
    }

    showGameResults(isCiviliansWin, votingResults) {
        this.state.state.phase = 'ended';
        this.updateGamePhase();
        
        const resultsView = document.getElementById('results-view');
        resultsView.classList.remove('hidden');
        
        // إخفاء جميع العروض الأخرى
        document.querySelectorAll('.action-view').forEach(view => {
            if (view.id !== 'results-view') {
                view.classList.add('hidden');
            }
        });
        
        // تحديث النتائج
        document.getElementById('winners-text').textContent = 
            isCiviliansWin ? '🏆 المدنيون يفوزون!' : '🏆 الجاسوس يفوز!';
        
        document.getElementById('spy-result').textContent = 
            this.getPlayerName(this.state.state.spy);
        
        document.getElementById('location-result').textContent = 
            this.state.state.location.name;
        
        // تحديث الإحصائيات
        const stats = this.state.getGameStats();
        const statsList = document.getElementById('game-stats');
        statsList.innerHTML = `
            <li>⏰ المدة: ${stats.durationMinutes} دقيقة</li>
            <li>🔄 الجولات المكتملة: ${stats.completedRounds}</li>
            <li>👥 عدد اللاعبين: ${stats.totalPlayers}</li>
            <li>🎯 الجاسوس: ${this.getPlayerName(stats.spyId)}</li>
            <li>📍 المكان: ${stats.location.name}</li>
        `;
        
        // إظهار زر إعادة اللعب
        document.getElementById('restart-btn').classList.remove('hidden');
        
        // تحديث حالة النشاط
        this.discord.updateActivityState({
            state: `انتهت - ${isCiviliansWin ? 'المدنيون فازوا' : 'الجاسوس فاز'}`,
            details: `المكان: ${stats.location.name}`
        });
    }

    updateGamePhase() {
        const phase = this.state.state.phase;
        const phaseElement = document.getElementById('game-phase');
        
        const phases = {
            'setup': '⚙️ جاري الإعداد',
            'role_assignment': '🎭 توزيع الأدوار',
            'round': `🔄 الجولة ${this.state.state.currentRound}`,
            'round_vote': '🗳️ تصويت الجولة',
            'final_vote': '🏁 التصويت النهائي',
            'spy_guess': '🎯 تخمين الجاسوس',
            'ended': '🎮 انتهت اللعبة'
        };
        
        phaseElement.textContent = phases[phase] || '⚙️ جاري الإعداد';
    }

    updateTimers() {
        const timerElement = document.getElementById('timer');
        const now = new Date();
        
        if (this.state.state.gameStartTime) {
            const elapsed = Math.floor((now - this.state.state.gameStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            
            timerElement.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    showWaitingView(player) {
        // إظهار رسالة انتظار
        this.showNotification(`⏳ انتظر دور ${player.name}...`);
    }

    showNotification(message) {
        // إنشاء إشعار مؤقت
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--discord-primary);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showError(message) {
        this.showNotification(`❌ ${message}`);
    }

    restartGame() {
        // إعادة تعيين اللعبة
        this.state.reset();
        this.updateGamePhase();
        
        // إخفاء النتائج
        document.getElementById('results-view').classList.add('hidden');
        document.getElementById('restart-btn').classList.add('hidden');
        
        // بدء لعبة جديدة
        this.startGame();
    }
}

// بدء اللعبة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.spyfallGame = new SpyfallGame();
});