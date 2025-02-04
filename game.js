class CoinCatcher extends Phaser.Scene {
    constructor() {
        super('CoinCatcher');
        this.score = 0;
        this.maxCoins = 500;
        this.gameOver = false;
        this.spawnDelay = 1000; // Initial spawn delay
        this.minSpawnDelay = 300; // Minimum spawn delay
        this.currentSpawnTimer = null;
    }

    preload() {
        this.load.image('coin', 'assets/ronlogo.png');
        this.load.audio('coinSound', 'assets/coin.mp3');
        this.load.audio('bubbleSound', 'assets/bubble.mp3');
    }

    create() {
       // this.add.image(400, 300, 'coin');
        this.load.audio("bubbleSound", 'assets/bubble.mp3', 1);
        // Background and other setup
        this.cameras.main.setBackgroundColor('#FFFF00');
        
        const DEPTH_LAYERS = {
            BACKGROUND: 0,
            FILL: 1,
            COINS: 2,
            CUP: 3
        };

        // Create container for coins
        this.coinContainer = this.add.container(0, 0);
        this.coinContainer.setDepth(DEPTH_LAYERS.COINS);

        // Create cup
        const cupGraphics = this.add.graphics();
        cupGraphics.lineStyle(3, 0x000000, 0.8);
        cupGraphics.fillStyle(0xCCCCCC, 0.2);
        cupGraphics.beginPath();
        cupGraphics.moveTo(330, 450);
        cupGraphics.lineTo(370, 550);
        cupGraphics.lineTo(430, 550);
        cupGraphics.lineTo(470, 450);
        cupGraphics.closePath();
        cupGraphics.fillPath();
        cupGraphics.strokePath();

        this.cup = this.add.container(400, 500);
        this.cup.setDepth(DEPTH_LAYERS.CUP);
        this.cup.add(cupGraphics);
        cupGraphics.x = -400;
        cupGraphics.y = -500;

        const hitbox = this.add.rectangle(0, 0, 120, 100, 0x000000, 0);
        this.cup.add(hitbox);

        this.cupHitbox = this.physics.add.sprite(this.cup.x, this.cup.y, null);
        this.cupHitbox.setSize(120, 100);
        this.cupHitbox.setOffset(-60, -50);
        this.cupHitbox.setVisible(false);
        this.cupHitbox.setImmovable(true);

        this.cup.setInteractive(new Phaser.Geom.Rectangle(-70, -50, 140, 100), Phaser.Geom.Rectangle.Contains);
        this.physics.add.existing(this.cup, true);
        this.cup.body.setSize(140, 100);
        this.cup.body.setOffset(-70, -50);
        this.cup.body.allowGravity = false;
        this.cup.body.immovable = true;

        // Add fill level graphics
        this.fillGraphics = this.add.graphics();
        this.fillGraphics.setDepth(DEPTH_LAYERS.FILL);
        this.currentFillHeight = undefined;

        // Create the coin group
        this.coins = this.physics.add.group({
            allowGravity: true,
            bounceX: 0,
            collideWorldBounds: true,
            dragX: 50
        });

        // Score text
        this.scoreText = this.add.text(16, 16, 'Coins: 0', {
            fontSize: '32px',
            fill: '#000'
        });

        // Input handling for the cup
        this.input.on('pointermove', (pointer) => {
            if (!this.gameOver) {
                const newX = Phaser.Math.Clamp(pointer.x, 50, 750);
                this.cup.setX(newX); // Update the cup position manually
                this.updateFillLevel();
            }
        });
        this.currentFillHeight = 0;

        // Start coin spawning
        this.startCoinSpawning();

        // Timer to decrease spawn delay over time
        this.time.addEvent({
            delay: 5000,
            callback: this.decreaseSpawnDelay,
            callbackScope: this,
            loop: true
        });

        // Add collision detection for coin collection
        this.physics.add.overlap(this.cupHitbox, this.coins, this.collectCoin, null, this);

        // Add invisible floor for missed coins
        this.floor = this.add.rectangle(400, 600, 600, 20, 0x000000).setAlpha(0);
        this.physics.add.existing(this.floor, true);
        this.physics.add.collider(this.floor, this.coins, this.coinHitFloor, null, this);
    }

    update() {
        console.log("Game over" ,this.gameOver);
        this.cupHitbox.x = this.cup.x;
        this.cupHitbox.y = this.cup.y;
        // Ensure the spawn continues if not already happening
        if (!this.gameOver && !this.currentSpawnTimer) {
            this.startCoinSpawning();
        }
    }

    startCoinSpawning() {
        // Clear any existing spawn timer
        if (this.currentSpawnTimer) {
            this.currentSpawnTimer.remove();
        }
        // Start coin spawning timer
        this.currentSpawnTimer = this.time.addEvent({
            delay: this.spawnDelay,
            callback: this.spawnCoin,
            callbackScope: this,
            loop: true
        });
    }

    spawnCoin() {
        if (!this.gameOver) {
            const x = Phaser.Math.Between(100, 700);
            const coin = this.coins.create(x, 0, 'coin');
            this.coinContainer.add(coin);
            coin.setDisplaySize(20, 20);
            coin.body.setSize(15, 15);
            coin.body.setOffset(2, 2);
            coin.setBounce(0.2);
            coin.setVelocityX(Phaser.Math.Between(-50, 50));
            coin.setCollideWorldBounds(true);
            coin.setGravityY(200);
          
            this.sound.play('bubbleSound', { volume: 0.5, duration: 0.3 });
        }
    }

    collectCoin(cup, coin) {
        // Handle coin collection
        coin.body.enable = false;
        this.tweens.add({
            targets: coin,
            x: this.cup.x,
            y: this.cup.y + 35,
            alpha: 0,
            scale: 0.2,
            duration: 200,
            ease: 'Quad.easeOut',
            onComplete: () => {
                coin.destroy();
            }
        });

        this.sound.play('coinSound');
        this.score++;
        this.scoreText.setText('Coins: ' + this.score);

        // Update fill level animation
        const maxFillHeight = 100;
        const targetFillHeight = (this.score / this.maxCoins) * maxFillHeight;
        this.tweens.add({
            targets: this,
            currentFillHeight: Math.min(targetFillHeight, maxFillHeight),
            duration: 200,
            ease: 'Quad.easeOut',
            onUpdate: () => {
                this.updateFillLevel();
            }
        });
    }


    coinHitFloor(floor, coin) {
        if (!this.gameOver && this.score < this.maxCoins) {
            this.gameOver = true;
            coin.destroy();
            if (this.currentSpawnTimer) {
                this.currentSpawnTimer.remove();
            }
            this.time.removeAllEvents();
            this.coins.clear(true, true);
            this.add.text(400, 300, 'Game Over!', {
                fontSize: '64px',
                fill: '#FF0000'
            }).setOrigin(0.5);
        }
    }

    decreaseSpawnDelay() {
        if (!this.gameOver && this.spawnDelay > this.minSpawnDelay) {
            let reductionRate;

            if (this.score >= 400) {
                const progress = (this.score - 400) / 100;
                reductionRate = 0.85 - (progress * 0.1);
            } else {
                reductionRate = 0.98;
            }

            this.spawnDelay = Math.max(this.minSpawnDelay, this.spawnDelay * reductionRate);
            this.startCoinSpawning();
        }
    }

    updateFillLevel() {
        this.fillGraphics.clear();
        if (this.currentFillHeight > 0) {
            const cupWidth = 140;
            const bottomWidth = 60;
            const cupHeight = 100;
            const fillPercent = this.currentFillHeight / cupHeight;
            const currentWidth = bottomWidth + (cupWidth - bottomWidth) * fillPercent;
            const bottomY = this.cup.y + 50;
            const fillY = bottomY - this.currentFillHeight;

            this.fillGraphics.fillStyle(0x4169E1, 0.8);
            this.fillGraphics.beginPath();
            this.fillGraphics.moveTo(this.cup.x - currentWidth / 2, fillY);
            this.fillGraphics.lineTo(this.cup.x - bottomWidth / 2, bottomY);
            this.fillGraphics.lineTo(this.cup.x + bottomWidth / 2, bottomY);
            this.fillGraphics.lineTo(this.cup.x + currentWidth / 2, fillY);
            this.fillGraphics.closePath();
            this.fillGraphics.fillPath();
        }
    }
}

const config = {
    type: Phaser.AUTO,
    parent: 'renderDiv',
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 200 },
            debug: false
        }
    },
    scene: CoinCatcher
};

window.phaserGame = new Phaser.Game(config);
