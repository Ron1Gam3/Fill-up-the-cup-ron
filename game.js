class CoinCatcher extends Phaser.Scene {
    constructor() {
        super();
        this.score = 0;
        this.maxCoins = 500;
        this.gameOver = false;
        this.spawnDelay = 1000; // Initial spawn delay
        this.minSpawnDelay = 300; // Minimum spawn delay
        this.currentSpawnTimer = null;
    }
    preload() {
        this.load.image('coin', 'ronlogo.png');
        this.load.audio('coinSound', 'coin.mp3');
        this.load.audio('bubbleSound', 'bubble.mp3');
    }
    create() {
        // Background
        this.cameras.main.setBackgroundColor('#FFFF00');

        // Set up depth layers
        const DEPTH_LAYERS = {
            BACKGROUND: 0,
            FILL: 1,
            COINS: 2,
            CUP: 3
        };

        // Create container for coins
        this.coinContainer = this.add.container(0, 0);
        this.coinContainer.setDepth(DEPTH_LAYERS.COINS);

        // Create cup using graphics
        const cupGraphics = this.add.graphics();

        // Draw cup shape
        cupGraphics.lineStyle(3, 0x000000, 0.8);
        cupGraphics.fillStyle(0xCCCCCC, 0.2);

        // Draw conical cup
        cupGraphics.beginPath();
        cupGraphics.moveTo(330, 450); // Left top
        cupGraphics.lineTo(370, 550); // Left bottom
        cupGraphics.lineTo(430, 550); // Right bottom
        cupGraphics.lineTo(470, 450); // Right top
        cupGraphics.closePath();
        cupGraphics.fillPath();
        cupGraphics.strokePath();

        // Create a container for the cup
        this.cup = this.add.container(400, 500);
        this.cup.setDepth(DEPTH_LAYERS.CUP);
        this.cup.add(cupGraphics);
        cupGraphics.x = -400;
        cupGraphics.y = -500;

        // Add hitbox for the cup
        const hitbox = this.add.rectangle(0, 0, 120, 100, 0x000000, 0);
        this.cup.add(hitbox);

        // Make cup interactive
        this.cup.setInteractive(new Phaser.Geom.Rectangle(-70, -50, 140, 100), Phaser.Geom.Rectangle.Contains);

        // Add physics
        this.physics.add.existing(this.cup, true);
        this.cup.body.setSize(140, 100);
        this.cup.body.setOffset(-70, -50);
        this.cup.body.allowGravity = false;
        this.cup.body.immovable = true;
        this.cup.body.moves = true;

        // Create fill level graphics
        this.fillGraphics = this.add.graphics();
        this.fillGraphics.setDepth(DEPTH_LAYERS.FILL);

        // Initial fill height
        this.currentFillHeight = undefined;

        // Coins group
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

        // Input handling
        this.input.on('pointermove', (pointer) => {
            if (!this.gameOver) {
                const newX = Phaser.Math.Clamp(pointer.x, 50, 750);
                this.cup.x = newX;
                this.cup.body.position.x = newX + this.cup.body.offset.x;
                this.updateFillLevel();
            }
        });

        // Start coin spawning
        this.startCoinSpawning();

        // Add timer to decrease spawn delay
        this.time.addEvent({
            delay: 5000, // Check every 5 seconds
            callback: this.decreaseSpawnDelay,
            callbackScope: this,
            loop: true
        });

        // Add collision detection
        this.physics.add.overlap(this.cup, this.coins, this.collectCoin, null, this);

        // Add floor for missed coins
        // Invisible floor for collision
        this.floor = this.add.rectangle(400, 600, 600, 20, 0x000000);
        this.floor.setAlpha(0); // Make the floor invisible
        this.physics.add.existing(this.floor, true);
        this.physics.add.collider(this.floor, this.coins, this.coinHitFloor, null, this);
    }
    updateFillLevel() {
        this.fillGraphics.clear();
        // Only draw if there's a fill height
        if (this.currentFillHeight > 0) {
            const cupWidth = 140; // Width of cup at top
            const bottomWidth = 60; // Width of cup at bottom
            const cupHeight = 100; // Total height of cup
            // Calculate the width at current fill height
            const fillPercent = this.currentFillHeight / cupHeight;
            const currentWidth = bottomWidth + (cupWidth - bottomWidth) * fillPercent;
            // Calculate positions relative to cup position
            const bottomY = this.cup.y + 50; // Bottom of cup
            const fillY = bottomY - this.currentFillHeight;
            // Draw fill with royal blue color
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
            this.sound.play('bubbleSound', {
                volume: 0.5,
                duration: 0.3
            });
        }
    }

    collectCoin(cup, coin) {
        // Remove physics from the coin
        coin.body.enable = false;
        // Animate coin to center of cup and fade out
        this.tweens.add({
            targets: coin,
            x: this.cup.x,
            y: this.cup.y + 35,
            alpha: 0,
            scale: 0.2,
            duration: 200,
            ease: 'Quad.easeOut',
            onComplete: () => {
                coin.destroy(); // Remove the coin from the scene
            }
        });

        this.sound.play('coinSound');
        this.score++;
        this.scoreText.setText('Coins: ' + this.score);
        // Animate the fill level
        // Calculate fill height based on score
        const maxFillHeight = 100;
        const targetFillHeight = (this.score / this.maxCoins) * maxFillHeight;

        // Set initial fill height if not set
        if (this.currentFillHeight === undefined) {
            this.currentFillHeight = 0;
        }

        // Animate fill level
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
        if (!this.gameOver) {
            this.gameOver = true;
            coin.destroy();
            // Stop all timers
            if (this.currentSpawnTimer) {
                this.currentSpawnTimer.destroy();
            }
            this.time.removeAllEvents();
            // Destroy all existing coins
            this.coins.clear(true, true);
            this.add.text(400, 300, 'Game Over!', {
                fontSize: '64px',
                fill: '#FF0000'
            }).setOrigin(0.5);
        }
    }
    startCoinSpawning() {
        // Clear any existing spawn timer
        if (this.currentSpawnTimer) {
            this.currentSpawnTimer.destroy();
        }
        // Create new spawn timer
        this.currentSpawnTimer = this.time.addEvent({
            delay: this.spawnDelay,
            callback: this.spawnCoin,
            callbackScope: this,
            loop: true
        });
    }
    decreaseSpawnDelay() {
        if (!this.gameOver && this.spawnDelay > this.minSpawnDelay) {
            let reductionRate;

            if (this.score >= 400) {
                // Exponential reduction after 400 coins
                const progress = (this.score - 400) / 100; // Progress from 400 to 500
                reductionRate = 0.85 - (progress * 0.1); // Gets more aggressive as score increases
            } else {
                // Normal reduction before 400 coins
                reductionRate = 0.98;
            }

            // Apply the reduction
            this.spawnDelay = Math.max(this.minSpawnDelay, this.spawnDelay * reductionRate);

            // Restart spawning with new delay
            this.startCoinSpawning();
        }
    }
}

// const container = document.getElementById('renderDiv');
window.onload = function() {
    const config = {
        type: Phaser.AUTO,
        parent: 'renderDiv', // Use the id directly
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

    new Phaser.Game(config);
};
