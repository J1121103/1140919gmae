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

        this.initializeGame();
        this.setupEventListeners();
        this.createButtons();
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
        const buttonSize = 60;
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
        this.spawnCrocodiles();
        this.showLuckyPhrase("遊戲開始！加油！");

        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
    }

    togglePause() {
        if (!this.gameRunning) return;

        this.gamePaused = !this.gamePaused;

        if (this.gamePaused) {
            clearInterval(this.timer);
            this.showLuckyPhrase("遊戲暫停");
        } else {
            this.startTimer();
            this.showLuckyPhrase("遊戲繼續！");
        }

        document.getElementById('pauseBtn').textContent = this.gamePaused ? '繼續' : '暫停';
    }

    resetGame() {
        this.gameRunning = false;
        this.gamePaused = false;
        clearInterval(this.timer);
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
        const crocodile = {
            id: Date.now() + Math.random(),
            x: randomButton.x,
            y: randomButton.y,
            size: 50,
            visible: true,
            hit: false,
            spawnTime: Date.now(),
            buttonId: randomButton.id
        };

        this.crocodiles.push(crocodile);
        randomButton.visible = true;
        randomButton.crocodile = crocodile;

        // 鱷魚會在2-4秒後消失
        setTimeout(() => {
            this.removeCrocodile(crocodile.id);
        }, 2000 + Math.random() * 2000);

        // 繼續生成鱷魚
        if (this.gameRunning && !this.gamePaused) {
            setTimeout(() => this.spawnCrocodiles(), 500 + Math.random() * 1000);
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

        // 播放音效（模擬）
        this.playSound('hit');

        // 顯示金幣動畫
        this.showCoinAnimation(crocodile.x, crocodile.y);

        // 顯示吉祥話
        this.showLuckyPhrase(this.luckyPhrases[Math.floor(Math.random() * this.luckyPhrases.length)]);

        // 移除鱷魚
        this.removeCrocodile(crocodile.id);

        this.updateDisplay();
        this.draw();

        // 檢查是否達到100分
        if (this.score >= 100) {
            this.endGame();
        }
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
        phraseElement.style.display = 'block';

        setTimeout(() => {
            phraseElement.style.display = 'none';
        }, 2000);
    }

    playSound(type) {
        // 創建音效（使用Web Audio API）
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        if (type === 'hit') {
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
        }

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    }

    endGame() {
        this.gameRunning = false;
        this.gamePaused = false;
        clearInterval(this.timer);
        this.gameEndTime = new Date();

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
                this.ctx.fillStyle = '#4CAF50';
                this.ctx.fillRect(button.x - button.size / 2, button.y - button.size / 2, button.size, button.size);
                this.ctx.strokeStyle = '#2E7D32';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(button.x - button.size / 2, button.y - button.size / 2, button.size, button.size);
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

        // 鱷魚身體
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(x - size / 2, y - size / 3, size, size * 0.6);

        // 鱷魚頭部
        this.ctx.fillStyle = '#66BB6A';
        this.ctx.fillRect(x - size / 2, y - size / 2, size * 0.6, size * 0.4);

        // 眼睛
        this.ctx.fillStyle = '#FF5722';
        this.ctx.fillRect(x - size / 3, y - size / 3, 8, 8);
        this.ctx.fillRect(x - size / 6, y - size / 3, 8, 8);

        // 嘴巴
        this.ctx.strokeStyle = '#2E7D32';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(x, y + size / 6, size / 4, 0, Math.PI);
        this.ctx.stroke();

        // 鱷魚文字
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🐊', x, y + 5);
    }

    gameLoop() {
        if (this.gameRunning && !this.gamePaused) {
            this.draw();
        }
        requestAnimationFrame(() => this.gameLoop());
    }
}

// 全局函數
function resetGame() {
    game.resetGame();
}

// 初始化遊戲
const game = new CrocodileGame();
game.gameLoop();

// 錯誤處理
window.addEventListener('error', (e) => {
    console.error('遊戲錯誤:', e.error);
    alert('遊戲發生錯誤，請重新載入頁面');
});

// 確保頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('打鱷魚遊戲已載入完成！');
});
