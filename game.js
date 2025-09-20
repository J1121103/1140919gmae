class CrocodileGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.score = 0;
        this.coins = 0;
        this.timeLeft = 60;
        this.gameRunning = false;
        this.gamePaused = false;
        this.timer = null;
        this.crocodiles = [];
        this.buttons = [];
        this.maxButtons = 100;
        this.gameStartTime = null;
        this.gameEndTime = null;
        this.luckyPhrases = [
            "恭喜發財！", "財源滾滾！", "好運連連！", "心想事成！",
            "步步高升！", "大吉大利！", "福星高照！", "萬事如意！",
            "一帆風順！", "五福臨門！", "六六大順！", "七星高照！",
            "八面威風！", "九九歸一！", "十全十美！", "百發百中！"
        ];

        // 打擊樂音樂系統
        this.musicEnabled = true;
        this.volume = 0.4;
        this.percussionLoop = null;
        this.musicStarted = false;
        this.beatPattern = 0;
        this.crocodileSpawnTimer = null;
        this.crocodileDisappearTimers = []; // 儲存鱷魚消失的定時器

        this.setupResponsiveCanvas();
        this.initializeGame();
        this.setupEventListeners();
        this.createButtons();
        this.initializeMusic();
    }

    setupResponsiveCanvas() {
        // 設置響應式canvas
        const resizeCanvas = () => {
            const container = this.canvas.parentElement;
            const containerWidth = container.clientWidth - 40; // 減去padding

            let canvasWidth = Math.min(700, containerWidth);
            let canvasHeight = Math.min(400, canvasWidth * 0.571); // 保持7:4比例

            // 手機版調整
            if (window.innerWidth <= 768) {
                canvasWidth = Math.min(400, containerWidth);
                canvasHeight = Math.min(300, canvasWidth * 0.75);
            }

            if (window.innerWidth <= 480) {
                canvasWidth = Math.min(350, containerWidth);
                canvasHeight = Math.min(250, canvasWidth * 0.714);
            }

            this.canvas.width = canvasWidth;
            this.canvas.height = canvasHeight;
            this.canvas.style.width = canvasWidth + 'px';
            this.canvas.style.height = canvasHeight + 'px';

            // 重新創建按鈕網格
            this.createButtons();
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    initializeGame() {
        this.score = 0;
        this.coins = 0;
        this.timeLeft = 60;
        this.gameRunning = false;
        this.gamePaused = false;
        this.crocodiles = [];
        this.updateDisplay();
        this.drawBackground();
    }

    setupEventListeners() {
        // 按鈕事件
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());

        // Canvas點擊事件
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

        // 鍵盤事件
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (!this.gameRunning) {
                    this.startGame();
                } else {
                    this.togglePause();
                }
            }
        });
    }

    createButtons() {
        this.buttons = [];
        // 根據canvas大小動態調整按鈕大小
        const baseSize = Math.min(this.canvas.width, this.canvas.height) / 12;
        const buttonSize = Math.max(40, Math.min(80, baseSize));
        const cols = Math.floor(this.canvas.width / buttonSize);
        const rows = Math.floor(this.canvas.height / buttonSize);

        for (let i = 0; i < this.maxButtons; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            const x = col * buttonSize + buttonSize / 2;
            const y = row * buttonSize + buttonSize / 2;

            this.buttons.push({
                id: i,
                x: x,
                y: y,
                size: buttonSize,
                visible: false,
                crocodile: null,
                hit: false
            });
        }
    }

    startGame() {
        if (this.gameRunning) return;

        this.gameRunning = true;
        this.gamePaused = false;
        this.gameStartTime = new Date();
        this.timeLeft = 60;
        this.score = 0;
        this.coins = 0;
        this.crocodiles = [];

        this.updateDisplay();
        this.startTimer();
        this.showLuckyPhrase("遊戲開始！加油！");

        // 先播放開始音效，延遲後再開始背景音樂
        this.playGameStartSound();
        setTimeout(() => {
            this.startBackgroundMusic();
            // 背景音樂開始後100毫秒再顯示鱷魚
            setTimeout(() => {
                this.spawnCrocodiles();
            }, 100);
        }, 2000); // 2秒後開始背景音樂

        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
    }

    togglePause() {
        if (!this.gameRunning) return;

        this.gamePaused = !this.gamePaused;

        if (this.gamePaused) {
            // 暫停：停止所有定時器
            clearInterval(this.timer);
            this.stopBackgroundMusic();
            this.pauseAllCrocodileTimers();
            this.showLuckyPhrase("遊戲暫停");
        } else {
            // 繼續：恢復所有定時器
            this.startTimer();
            this.startBackgroundMusic();
            this.resumeAllCrocodileTimers();
            // 背景音樂開始後100毫秒再繼續生成鱷魚
            setTimeout(() => {
                this.resumeCrocodileSpawning();
            }, 100);
            this.showLuckyPhrase("遊戲繼續！");
        }

        document.getElementById('pauseBtn').textContent = this.gamePaused ? '繼續' : '暫停';
    }

    resetGame() {
        this.gameRunning = false;
        this.gamePaused = false;
        clearInterval(this.timer);
        this.stopBackgroundMusic();
        this.initializeGame();
        this.hideGameOver();

        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('pauseBtn').textContent = '暫停';
    }

    startTimer() {
        this.timer = setInterval(() => {
            if (!this.gamePaused) {
                this.timeLeft--;
                this.updateDisplay();

                if (this.timeLeft <= 0) {
                    this.endGame();
                }
            }
        }, 1000);
    }

    spawnCrocodiles() {
        if (!this.gameRunning || this.gamePaused) return;

        // 隨機選擇一個按鈕位置生成鱷魚
        const availableButtons = this.buttons.filter(btn => !btn.visible);
        if (availableButtons.length === 0) return;

        const randomButton = availableButtons[Math.floor(Math.random() * availableButtons.length)];
        // 根據canvas大小動態調整鱷魚大小
        const baseSize = Math.min(this.canvas.width, this.canvas.height) / 8;
        const crocodileSize = Math.max(60, Math.min(120, baseSize));

        const crocodile = {
            id: Date.now() + Math.random(),
            x: randomButton.x,
            y: randomButton.y,
            size: crocodileSize,
            visible: true,
            hit: false,
            spawnTime: Date.now(),
            buttonId: randomButton.id,
            disappearTime: 2000 + Math.random() * 2000, // 儲存消失時間
            remainingTime: 0 // 剩餘時間
        };

        this.crocodiles.push(crocodile);
        randomButton.visible = true;
        randomButton.crocodile = crocodile;

        // 鱷魚會在指定時間後消失
        const disappearTimer = setTimeout(() => {
            if (this.gameRunning && !this.gamePaused) {
                this.removeCrocodile(crocodile.id);
            }
        }, crocodile.disappearTime);

        // 儲存定時器以便暫停時清除
        crocodile.disappearTimer = disappearTimer;
        this.crocodileDisappearTimers.push(disappearTimer);

        // 繼續生成鱷魚
        if (this.gameRunning && !this.gamePaused) {
            this.crocodileSpawnTimer = setTimeout(() => this.spawnCrocodiles(), 500 + Math.random() * 1000);
        }
    }

    // 暫停所有鱷魚相關定時器
    pauseAllCrocodileTimers() {
        // 清除鱷魚生成定時器
        if (this.crocodileSpawnTimer) {
            clearTimeout(this.crocodileSpawnTimer);
            this.crocodileSpawnTimer = null;
        }

        // 清除所有鱷魚消失定時器
        this.crocodileDisappearTimers.forEach(timer => {
            clearTimeout(timer);
        });
        this.crocodileDisappearTimers = [];

        // 記錄每個鱷魚的剩餘時間
        this.crocodiles.forEach(crocodile => {
            if (crocodile.disappearTimer) {
                clearTimeout(crocodile.disappearTimer);
                crocodile.disappearTimer = null;
                // 計算剩餘時間
                const elapsed = Date.now() - crocodile.spawnTime;
                crocodile.remainingTime = Math.max(0, crocodile.disappearTime - elapsed);
            }
        });
    }

    // 恢復所有鱷魚相關定時器
    resumeAllCrocodileTimers() {
        // 為每個鱷魚重新設置消失定時器
        this.crocodiles.forEach(crocodile => {
            if (crocodile.remainingTime > 0) {
                crocodile.disappearTimer = setTimeout(() => {
                    if (this.gameRunning && !this.gamePaused) {
                        this.removeCrocodile(crocodile.id);
                    }
                }, crocodile.remainingTime);
                this.crocodileDisappearTimers.push(crocodile.disappearTimer);
            }
        });
    }

    // 繼續鱷魚生成（不重新開始）
    resumeCrocodileSpawning() {
        // 繼續生成鱷魚
        if (this.gameRunning && !this.gamePaused) {
            this.crocodileSpawnTimer = setTimeout(() => this.spawnCrocodiles(), 500 + Math.random() * 1000);
        }
    }

    removeCrocodile(crocodileId) {
        const crocodileIndex = this.crocodiles.findIndex(c => c.id === crocodileId);
        if (crocodileIndex !== -1) {
            const crocodile = this.crocodiles[crocodileIndex];
            const button = this.buttons.find(b => b.id === crocodile.buttonId);
            if (button) {
                button.visible = false;
                button.crocodile = null;
            }
            this.crocodiles.splice(crocodileIndex, 1);
        }
    }

    handleCanvasClick(e) {
        if (!this.gameRunning || this.gamePaused) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 檢查是否點擊到鱷魚
        for (let crocodile of this.crocodiles) {
            const distance = Math.sqrt(
                Math.pow(x - crocodile.x, 2) + Math.pow(y - crocodile.y, 2)
            );

            if (distance <= crocodile.size && !crocodile.hit) {
                this.hitCrocodile(crocodile);
                break;
            }
        }
    }

    hitCrocodile(crocodile) {
        crocodile.hit = true;
        this.score += 10;
        this.coins += 1;

        // 播放擊中音效
        this.playHitSound();

        // 顯示金幣動畫
        this.showCoinAnimation(crocodile.x, crocodile.y);

        // 顯示吉祥話
        this.showLuckyPhrase(this.luckyPhrases[Math.floor(Math.random() * this.luckyPhrases.length)]);

        // 移除鱷魚
        this.removeCrocodile(crocodile.id);

        this.updateDisplay();
        this.draw();
    }

    showCoinAnimation(x, y) {
        const coin = document.createElement('div');
        coin.className = 'coin-animation';
        coin.textContent = '💰';
        coin.style.left = (x - 15) + 'px';
        coin.style.top = (y - 15) + 'px';
        coin.style.position = 'absolute';

        document.body.appendChild(coin);

        setTimeout(() => {
            document.body.removeChild(coin);
        }, 1000);
    }

    showLuckyPhrase(phrase) {
        const phraseElement = document.getElementById('luckyPhrase');
        phraseElement.textContent = phrase;
        phraseElement.classList.remove('hidden');

        setTimeout(() => {
            phraseElement.classList.add('hidden');
        }, 2000);
    }


    endGame() {
        this.gameRunning = false;
        this.gamePaused = false;
        clearInterval(this.timer);
        this.gameEndTime = new Date();

        // 播放結束音效並停止背景音樂
        this.playGameEndSound();
        this.stopBackgroundMusic();

        this.showGameOver();
        this.updateGameRecord();

        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
    }

    showGameOver() {
        const gameOver = document.getElementById('gameOver');
        document.getElementById('finalScoreDisplay').textContent = this.score;
        document.getElementById('finalCoinsDisplay').textContent = this.coins;
        gameOver.style.display = 'block';
    }

    hideGameOver() {
        document.getElementById('gameOver').style.display = 'none';
    }

    updateGameRecord() {
        const record = document.getElementById('gameRecord');
        document.getElementById('gameDate').textContent = this.gameStartTime.toLocaleDateString('zh-TW');
        document.getElementById('startTime').textContent = this.gameStartTime.toLocaleTimeString('zh-TW');
        document.getElementById('endTime').textContent = this.gameEndTime.toLocaleTimeString('zh-TW');
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalCoins').textContent = this.coins;
        record.style.display = 'block';
    }

    updateDisplay() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('timer').textContent = this.timeLeft;
        document.getElementById('coins').textContent = this.coins;
    }

    drawBackground() {
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 繪製水波紋效果
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            this.ctx.beginPath();
            this.ctx.arc(200 + i * 200, 300 + i * 50, 100 + i * 20, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }

    draw() {
        this.drawBackground();

        // 繪製按鈕
        this.buttons.forEach(button => {
            if (button.visible) {
                // 按鈕背景
                this.ctx.fillStyle = '#4CAF50';
                this.ctx.fillRect(button.x - button.size / 2, button.y - button.size / 2, button.size, button.size);

                // 按鈕邊框 - 更明顯
                this.ctx.strokeStyle = '#2E7D32';
                this.ctx.lineWidth = Math.max(3, button.size / 15);
                this.ctx.strokeRect(button.x - button.size / 2, button.y - button.size / 2, button.size, button.size);

                // 按鈕內部陰影效果
                this.ctx.strokeStyle = '#1B5E20';
                this.ctx.lineWidth = Math.max(1, button.size / 30);
                this.ctx.strokeRect(button.x - button.size / 2 + 2, button.y - button.size / 2 + 2, button.size - 4, button.size - 4);
            }
        });

        // 繪製鱷魚
        this.crocodiles.forEach(crocodile => {
            if (!crocodile.hit) {
                this.drawCrocodile(crocodile);
            }
        });
    }

    drawCrocodile(crocodile) {
        const { x, y, size } = crocodile;

        // 使用鱷魚emoji圖案，與標題一致
        this.ctx.fillStyle = '#FFFFFF';
        const fontSize = size * 0.8; // 根據鱷魚大小調整字體大小
        this.ctx.font = `bold ${fontSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🐊', x, y);
    }

    gameLoop() {
        if (this.gameRunning && !this.gamePaused) {
            this.draw();
        } else if (this.gameRunning && this.gamePaused) {
            // 暫停時只繪製靜態畫面，不更新遊戲邏輯
            this.draw();
        }
        requestAnimationFrame(() => this.gameLoop());
    }

    // 打擊樂音樂系統方法
    initializeMusic() {
        // 等待 Tone.js 載入完成
        if (typeof Tone === 'undefined') {
            console.log('等待 Tone.js 載入...');
            setTimeout(() => this.initializeMusic(), 100);
            return;
        }

        try {
            // 創建打擊樂背景音樂
            this.createPercussionMusic();
            console.log('打擊樂音樂系統初始化完成');
        } catch (error) {
            console.error('音樂系統初始化失敗:', error);
            // 如果音樂系統初始化失敗，繼續遊戲但不播放音樂
            this.musicEnabled = false;
        }
    }

    createPercussionMusic() {
        try {
            // 創建簡化的打擊樂器
            this.kickDrum = new Tone.Synth({
                oscillator: {
                    type: "triangle"
                },
                envelope: {
                    attack: 0.01,
                    decay: 0.3,
                    sustain: 0.0,
                    release: 0.5
                }
            }).toDestination();

            this.snareDrum = new Tone.Synth({
                oscillator: {
                    type: "square"
                },
                envelope: {
                    attack: 0.01,
                    decay: 0.1,
                    sustain: 0.0,
                    release: 0.2
                }
            }).toDestination();

            this.hiHat = new Tone.Synth({
                oscillator: {
                    type: "sine"
                },
                envelope: {
                    attack: 0.01,
                    decay: 0.05,
                    sustain: 0.0,
                    release: 0.1
                }
            }).toDestination();

            // 創建旋律合成器
            this.melodySynth = new Tone.Synth({
                oscillator: {
                    type: "sawtooth"
                },
                envelope: {
                    attack: 0.1,
                    decay: 0.2,
                    sustain: 0.3,
                    release: 0.8
                }
            }).toDestination();

            // 設置音量
            this.kickDrum.volume.value = Tone.gainToDb(this.volume * 0.8);
            this.snareDrum.volume.value = Tone.gainToDb(this.volume * 0.6);
            this.hiHat.volume.value = Tone.gainToDb(this.volume * 0.4);
            this.melodySynth.volume.value = Tone.gainToDb(this.volume * 0.5);

            // 創建簡化的節拍模式
            this.createBeatPattern();
        } catch (error) {
            console.error('創建打擊樂器失敗:', error);
            this.musicEnabled = false;
        }
    }

    createBeatPattern() {
        try {
            // 創建節拍循環（不立即開始）
            this.percussionLoop = new Tone.Loop((time) => {
                if (this.musicEnabled && this.gameRunning && !this.gamePaused) {
                    this.playBeatPattern(time);
                }
            }, "4n");

            // 創建旋律循環（不立即開始）
            this.melodyLoop = new Tone.Loop((time) => {
                if (this.musicEnabled && this.gameRunning && !this.gamePaused) {
                    this.playMelodyPattern(time);
                }
            }, "1m");
        } catch (error) {
            console.error('創建節拍模式失敗:', error);
            this.musicEnabled = false;
        }
    }

    playBeatPattern(time) {
        try {
            const beat = this.beatPattern % 4;

            // 底鼓節拍
            if (beat === 0) {
                this.kickDrum.triggerAttackRelease("C2", "4n", time);
            }

            // 小鼓節拍
            if (beat === 2) {
                this.snareDrum.triggerAttackRelease("C4", "8n", time);
            }

            // 高音鈸
            if (beat % 2 === 0) {
                this.hiHat.triggerAttackRelease("C6", "8n", time);
            }

            this.beatPattern++;
        } catch (error) {
            console.error('播放節拍失敗:', error);
        }
    }

    playMelodyPattern(time) {
        try {
            const melodies = [
                ["C4", "E4", "G4", "C5"],
                ["D4", "F4", "A4", "D5"],
                ["E4", "G4", "B4", "E5"],
                ["F4", "A4", "C5", "F5"]
            ];

            const melody = melodies[Math.floor(Math.random() * melodies.length)];
            melody.forEach((note, index) => {
                this.melodySynth.triggerAttackRelease(note, "4n", time + index * 0.5);
            });
        } catch (error) {
            console.error('播放旋律失敗:', error);
        }
    }

    startBackgroundMusic() {
        if (!this.musicEnabled) return;

        try {
            if (Tone.context.state !== 'running') {
                Tone.start();
            }

            // 重新啟動節拍循環
            if (this.percussionLoop) {
                this.percussionLoop.start(0);
            }
            if (this.melodyLoop) {
                this.melodyLoop.start(0);
            }

            Tone.Transport.start();
            this.musicStarted = true;
            console.log('打擊樂背景音樂開始播放');
        } catch (error) {
            console.log('音樂播放需要用戶互動，請點擊開始遊戲按鈕');
            this.musicEnabled = false;
        }
    }

    stopBackgroundMusic() {
        try {
            if (this.percussionLoop) {
                this.percussionLoop.stop();
            }
            if (this.melodyLoop) {
                this.melodyLoop.stop();
            }
            Tone.Transport.stop();
            this.musicStarted = false;
            this.beatPattern = 0;
            console.log('打擊樂背景音樂停止');
        } catch (error) {
            console.error('停止背景音樂失敗:', error);
        }
    }

    playHitSound() {
        if (!this.musicEnabled) return;

        try {
            // 創建多層擊中音效
            const now = Tone.now();

            // 主音效 - 清脆的鈴聲
            const mainSynth = new Tone.Synth({
                oscillator: {
                    type: 'sine'
                },
                envelope: {
                    attack: 0.01,
                    decay: 0.1,
                    sustain: 0.2,
                    release: 0.3
                }
            }).toDestination();

            // 低音效果
            const bassSynth = new Tone.Synth({
                oscillator: {
                    type: 'triangle'
                },
                envelope: {
                    attack: 0.01,
                    decay: 0.2,
                    sustain: 0.1,
                    release: 0.4
                }
            }).toDestination();

            // 高音裝飾
            const highSynth = new Tone.Synth({
                oscillator: {
                    type: 'square'
                },
                envelope: {
                    attack: 0.01,
                    decay: 0.05,
                    sustain: 0.0,
                    release: 0.1
                }
            }).toDestination();

            // 設置音量
            mainSynth.volume.value = Tone.gainToDb(this.volume * 0.6);
            bassSynth.volume.value = Tone.gainToDb(this.volume * 0.4);
            highSynth.volume.value = Tone.gainToDb(this.volume * 0.3);

            // 播放音效序列
            const notes = ['C5', 'E5', 'G5'];
            const randomNote = notes[Math.floor(Math.random() * notes.length)];

            mainSynth.triggerAttackRelease(randomNote, '8n', now);
            bassSynth.triggerAttackRelease('C3', '4n', now);
            highSynth.triggerAttackRelease('C7', '16n', now + 0.05);
            highSynth.triggerAttackRelease('E7', '16n', now + 0.1);

            // 添加打擊樂效果
            if (this.snareDrum) {
                this.snareDrum.triggerAttackRelease('C4', '16n', now);
            }

        } catch (error) {
            console.log('音效播放需要用戶互動');
        }
    }

    playGameStartSound() {
        if (!this.musicEnabled) return;

        try {
            const now = Tone.now();

            // 創建開始音效的合成器
            const startSynth = new Tone.Synth({
                oscillator: {
                    type: 'sawtooth'
                },
                envelope: {
                    attack: 0.1,
                    decay: 0.2,
                    sustain: 0.3,
                    release: 0.5
                }
            }).toDestination();

            const bassSynth = new Tone.Synth({
                oscillator: {
                    type: 'triangle'
                },
                envelope: {
                    attack: 0.1,
                    decay: 0.3,
                    sustain: 0.2,
                    release: 0.8
                }
            }).toDestination();

            startSynth.volume.value = Tone.gainToDb(this.volume * 0.7);
            bassSynth.volume.value = Tone.gainToDb(this.volume * 0.5);

            // 播放激動人心的開始音效序列
            const melody = ['C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6'];
            melody.forEach((note, index) => {
                startSynth.triggerAttackRelease(note, '4n', now + index * 0.3);
                if (index % 2 === 0) {
                    bassSynth.triggerAttackRelease('C2', '8n', now + index * 0.3);
                }
            });

            // 添加打擊樂重音
            if (this.kickDrum) {
                this.kickDrum.triggerAttackRelease('C2', '4n', now);
                this.kickDrum.triggerAttackRelease('C2', '4n', now + 0.6);
                this.kickDrum.triggerAttackRelease('C2', '4n', now + 1.2);
            }

        } catch (error) {
            console.log('音效播放需要用戶互動');
        }
    }

    playGameEndSound() {
        if (!this.musicEnabled) return;

        try {
            const now = Tone.now();

            // 創建結束音效的合成器
            const endSynth = new Tone.Synth({
                oscillator: {
                    type: 'triangle'
                },
                envelope: {
                    attack: 0.1,
                    decay: 0.4,
                    sustain: 0.3,
                    release: 1.5
                }
            }).toDestination();

            const lowSynth = new Tone.Synth({
                oscillator: {
                    type: 'sine'
                },
                envelope: {
                    attack: 0.1,
                    decay: 0.5,
                    sustain: 0.2,
                    release: 2.0
                }
            }).toDestination();

            endSynth.volume.value = Tone.gainToDb(this.volume * 0.6);
            lowSynth.volume.value = Tone.gainToDb(this.volume * 0.4);

            // 播放結束音效序列 - 下降音階
            const endMelody = ['C6', 'G5', 'E5', 'C5', 'G4', 'E4', 'C4'];
            endMelody.forEach((note, index) => {
                endSynth.triggerAttackRelease(note, '4n', now + index * 0.4);
                lowSynth.triggerAttackRelease('C2', '8n', now + index * 0.4);
            });

            // 添加戲劇性的打擊樂效果
            if (this.crash) {
                this.crash.triggerAttackRelease('C5', '2n', now);
                this.crash.triggerAttackRelease('C4', '1n', now + 1.0);
            }

        } catch (error) {
            console.log('音效播放需要用戶互動');
        }
    }
}

// 全局函數
function resetGame() {
    game.resetGame();
}

// 初始化遊戲
let game;
try {
    game = new CrocodileGame();
    game.gameLoop();
} catch (error) {
    console.error('遊戲初始化失敗:', error);
    // 如果初始化失敗，顯示錯誤信息但不阻止頁面載入
    document.addEventListener('DOMContentLoaded', () => {
        const container = document.querySelector('.game-container');
        if (container) {
            container.innerHTML = '<h1>🐊 打鱷魚遊戲 🐊</h1><p>遊戲載入中遇到問題，請重新整理頁面</p>';
        }
    });
}

// 錯誤處理
window.addEventListener('error', (e) => {
    console.error('遊戲錯誤:', e.error);
    // 不顯示 alert，只在控制台記錄錯誤
    console.log('遊戲遇到錯誤，但會繼續運行');
});

// 確保頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('打鱷魚遊戲已載入完成！');
});


