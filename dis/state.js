// إدارة حالة اللعبة
class GameState {
    constructor() {
        // حالة اللعبة الأساسية
        this.state = {
            phase: 'setup', // setup, role_assignment, round, round_vote, final_vote, spy_guess, ended
            players: [],
            spy: null,
            location: null,
            currentRound: 1,
            totalRounds: 3,
            currentPlayerIndex: 0,
            playersAskedThisRound: new Map(),
            roundVotes: new Map(), // continue/end
            finalVotes: new Map(),
            gameStartTime: null,
            questionStartTime: null,
            questionInProgress: false,
            currentAsker: null,
            currentAsked: null,
            revealed: false
        };

        // قائمة الأماكن
        this.locations = [
            {
                name: "مطعم",
                hints: ["طعام", "طاولات", "نادل", "قائمة طعام", "مشروبات", "زبائن", "مطبخ"]
            },
            {
                name: "مدرسة",
                hints: ["فصول", "معلمون", "طباشير", "كتب", "طلاب", "سبورة", "مختبر"]
            },
            {
                name: "سينما",
                hints: ["أفلام", "تذاكر", "بوشار", "شاشة", "مقاعد", "إعلانات", "أضواء"]
            },
            {
                name: "مكتبة",
                hints: ["كتب", "هدوء", "رفوف", "قراءة", "مجلدات", "مكتب", "مسؤول"]
            },
            {
                name: "مستشفى",
                hints: ["أطباء", "مرضى", "أدوية", "ممرضات", "عمليات", "معدات", "زائرون"]
            },
            {
                name: "فندق",
                hints: ["غرف", "مفتاح", "استقبال", "حجز", "خدمة", "مسبح", "مطعم"]
            },
            {
                name: "مطار",
                hints: ["طائرات", "تذاكر", "أمتعة", "بوابات", "مسافرون", "جوازات", "محلات"]
            },
            {
                name: "سوبرماركت",
                hints: ["تسوق", "عربات", "أسعار", "أقسام", "خضار", "معلبات", "مبردات"]
            },
            {
                name: "ملعب",
                hints: ["رياضة", "جمهور", "أهداف", "عشب", "لاعبون", "مدرجات", "أضواء"]
            },
            {
                name: "حديقة",
                hints: ["أشجار", "أزهار", "مقاعد", "هواء نقي", "ألعاب", "نوافير", "مشاة"]
            },
            {
                name: "بنك",
                hints: ["أموال", "صراف", "ودائع", "قبو", "عملاء", "شيكات", "أمان"]
            },
            {
                name: "صيدلية",
                hints: ["أدوية", "وصفات", "صيدلي", "مستحضرات", "أجهزة", "مكملات", "كريمات"]
            },
            {
                name: "صالون حلاقة",
                hints: ["شعر", "مقص", "كرسي", "مرآة", "حلاقة", "صبغة", "عطور"]
            },
            {
                name: "مقهى",
                hints: ["قهوة", "مقاعد", "واي فاي", "حلويات", "مجلات", "اجتماعات", "إنترنت"]
            },
            {
                name: "محطة قطار",
                hints: ["قطارات", "تذاكر", "مواعيد", "محطات", "مسافرون", "حقائب", "جسر"]
            }
        ];
    }

    // إعادة تعيين اللعبة
    reset() {
        this.state = {
            phase: 'setup',
            players: this.state.players, // الاحتفاظ باللاعبين
            spy: null,
            location: null,
            currentRound: 1,
            totalRounds: 3,
            currentPlayerIndex: 0,
            playersAskedThisRound: new Map(),
            roundVotes: new Map(),
            finalVotes: new Map(),
            gameStartTime: null,
            questionStartTime: null,
            questionInProgress: false,
            currentAsker: null,
            currentAsked: null,
            revealed: false
        };
    }

    // بدء لعبة جديدة
    startGame(players) {
        this.state.players = players;
        this.state.gameStartTime = new Date();
        this.assignRoles();
        this.state.phase = 'role_assignment';
        
        // حفظ في localStorage
        this.saveToStorage();
        
        return {
            players: this.state.players,
            spy: this.state.spy,
            location: this.state.location
        };
    }

    // توزيع الأدوار
    assignRoles() {
        if (this.state.players.length < 3) {
            throw new Error('يحتاج إلى 3 لاعبين على الأقل');
        }

        // اختيار مكان عشوائي
        this.state.location = this.locations[Math.floor(Math.random() * this.locations.length)];

        // اختيار جاسوس عشوائي
        const spyIndex = Math.floor(Math.random() * this.state.players.length);
        this.state.spy = this.state.players[spyIndex].id;

        // تعيين أدوار المدنيين
        this.state.players.forEach(player => {
            player.role = player.id === this.state.spy ? 'spy' : 'civilian';
            player.location = player.role === 'civilian' ? this.state.location : null;
        });

        console.log('🎭 Roles assigned:', {
            spy: this.state.spy,
            location: this.state.location.name,
            players: this.state.players.length
        });
    }

    // الحصول على دور اللاعب
    getPlayerRole(playerId) {
        const player = this.state.players.find(p => p.id === playerId);
        return player ? player.role : null;
    }

    // الحصول على مكان اللاعب (للمدنيين فقط)
    getPlayerLocation(playerId) {
        if (this.getPlayerRole(playerId) === 'civilian') {
            return this.state.location;
        }
        return null;
    }

    // بدء جولة جديدة
    startRound() {
        this.state.currentRound++;
        this.state.playersAskedThisRound.clear();
        this.state.roundVotes.clear();
        this.state.currentPlayerIndex = 0;
        this.state.questionInProgress = false;
        this.state.phase = 'round';
        
        this.saveToStorage();
        
        return {
            round: this.state.currentRound,
            totalRounds: this.state.totalRounds
        };
    }

    // الحصول على اللاعب التالي
    getNextPlayer() {
        if (this.state.playersAskedThisRound.size >= this.state.players.length) {
            return null; // تم سؤال الجميع
        }

        let nextPlayer = null;
        const startIndex = this.state.currentPlayerIndex;

        for (let i = 0; i < this.state.players.length; i++) {
            const index = (startIndex + i) % this.state.players.length;
            const player = this.state.players[index];
            
            if (!this.state.playersAskedThisRound.has(player.id)) {
                nextPlayer = player;
                this.state.currentPlayerIndex = (index + 1) % this.state.players.length;
                break;
            }
        }

        return nextPlayer;
    }

    // تسجيل سؤال لاعب
    recordPlayerAsk(askerId, askedId) {
        this.state.playersAskedThisRound.set(askerId, askedId);
        this.state.currentAsker = askerId;
        this.state.currentAsked = askedId;
        this.state.questionInProgress = true;
        this.state.questionStartTime = new Date();
        
        this.saveToStorage();
        
        return {
            askerId,
            askedId,
            timeStarted: this.state.questionStartTime
        };
    }

    // إنهاء السؤال
    endQuestion() {
        this.state.questionInProgress = false;
        this.saveToStorage();
    }

    // تسجيل تصويت الجولة
    recordRoundVote(playerId, vote) {
        this.state.roundVotes.set(playerId, vote); // 'continue' أو 'end'
        
        this.saveToStorage();
        
        return {
            totalVotes: this.state.roundVotes.size,
            continueVotes: Array.from(this.state.roundVotes.values()).filter(v => v === 'continue').length,
            endVotes: Array.from(this.state.roundVotes.values()).filter(v => v === 'end').length
        };
    }

    // تسجيل تصويت نهائي
    recordFinalVote(voterId, suspectId) {
        if (voterId === suspectId) {
            throw new Error('لا يمكنك التصويت لنفسك');
        }
        
        this.state.finalVotes.set(voterId, suspectId);
        
        this.saveToStorage();
        
        return {
            totalVotes: this.state.finalVotes.size,
            votes: Array.from(this.state.finalVotes.entries())
        };
    }

    // حساب نتائج التصويت النهائي
    calculateFinalResults() {
        const voteCount = new Map();
        
        // حساب عدد الأصوات لكل لاعب
        this.state.finalVotes.forEach(suspectId => {
            voteCount.set(suspectId, (voteCount.get(suspectId) || 0) + 1);
        });

        // العثور على اللاعب الأكثر أصواتاً
        let maxVotes = 0;
        let suspectedPlayers = [];

        voteCount.forEach((count, playerId) => {
            if (count > maxVotes) {
                maxVotes = count;
                suspectedPlayers = [playerId];
            } else if (count === maxVotes) {
                suspectedPlayers.push(playerId);
            }
        });

        // في حالة التعادل، اختيار عشوائي
        const suspectedId = suspectedPlayers.length > 0 
            ? suspectedPlayers[Math.floor(Math.random() * suspectedPlayers.length)]
            : null;

        const isSpyCaught = suspectedId === this.state.spy;
        
        return {
            suspectedPlayer: suspectedId,
            isSpyCaught,
            voteCount: Array.from(voteCount.entries()),
            maxVotes
        };
    }

    // الحصول على إحصائيات اللعبة
    getGameStats() {
        const now = new Date();
        const duration = this.state.gameStartTime 
            ? Math.floor((now - this.state.gameStartTime) / 60000) // دقائق
            : 0;

        return {
            durationMinutes: duration,
            completedRounds: this.state.currentRound - 1,
            totalPlayers: this.state.players.length,
            spyId: this.state.spy,
            location: this.state.location
        };
    }

    // حفظ الحالة
    saveToStorage() {
        try {
            const saveData = {
                ...this.state,
                playersAskedThisRound: Array.from(this.state.playersAskedThisRound.entries()),
                roundVotes: Array.from(this.state.roundVotes.entries()),
                finalVotes: Array.from(this.state.finalVotes.entries())
            };
            
            localStorage.setItem('spyfall_game_state', JSON.stringify(saveData));
        } catch (error) {
            console.error('Failed to save game state:', error);
        }
    }

    // تحميل الحالة
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('spyfall_game_state');
            if (saved) {
                const loaded = JSON.parse(saved);
                
                // استعادة Maps
                this.state = {
                    ...loaded,
                    playersAskedThisRound: new Map(loaded.playersAskedThisRound || []),
                    roundVotes: new Map(loaded.roundVotes || []),
                    finalVotes: new Map(loaded.finalVotes || [])
                };
                
                return true;
            }
        } catch (error) {
            console.error('Failed to load game state:', error);
        }
        
        return false;
    }

    // تنظيف الحالة
    clearStorage() {
        localStorage.removeItem('spyfall_game_state');
    }
}

// إنشاء نسخة عامة
window.gameState = new GameState();