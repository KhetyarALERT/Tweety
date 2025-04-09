const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.BOT_TOKEN);

// Simulated hardware specifications
const hardware = {
    basic: { name: 'Basic', hashRate: 10000000, powerConsumption: 100, autoCollect: false },
    premium: { name: 'Premium', hashRate: 1000000000, powerConsumption: 500, autoCollect: true }
};

// Miner class to handle mining logic
class Miner {
    constructor(hardware, electricityCost, userId) {
        this.hardware = hardware;
        this.electricityCost = electricityCost;
        this.coinsMined = 0;
        this.totalEnergyConsumed = 0;
        this.lastCollectionTime = Date.now();
        this.userId = userId;
        this.isMining = false;
    }

    mine(dt) {
        const hashesAttempted = this.hardware.hashRate * dt;
        const coinsFound = Math.floor(hashesAttempted / 1e12);
        const energyConsumedKWh = (this.hardware.powerConsumption * dt) / (1000 * 3600);
        this.totalEnergyConsumed += energyConsumedKWh;
        this.coinsMined += coinsFound;
        return coinsFound;
    }

    collectCoins() {
        const collectedCoins = this.coinsMined;
        this.coinsMined = 0;
        this.lastCollectionTime = Date.now();
        return collectedCoins;
    }

    getEarnings() {
        return this.coinsMined - (this.totalEnergyConsumed * this.electricityCost);
    }
}

// Store miners for each user
const miners = new Map();

// Electricity cost per kWh
const electricityPrice = 0.15;

// Start command
bot.start((ctx) => {
    const userId = ctx.from.id;
    ctx.reply('Welcome to the Mining Bot! Choose your hardware:\n1. /basic\n2. /premium');
});

// Basic hardware selection
bot.command('basic', (ctx) => {
    const userId = ctx.from.id;
    miners.set(userId, new Miner(hardware.basic, electricityPrice, userId));
    ctx.reply('Basic hardware selected! Use /mine to start mining.');
});

// Premium hardware selection
bot.command('premium', (ctx) => {
    const userId = ctx.from.id;
    miners.set(userId, new Miner(hardware.premium, electricityPrice, userId));
    ctx.reply('Premium hardware selected! Use /mine to start mining.');
});

// Mine command
bot.command('mine', (ctx) => {
    const userId = ctx.from.id;
    const miner = miners.get(userId);

    if (!miner) {
        return ctx.reply('Please select hardware first using /basic or /premium.');
    }

    if (miner.isMining) {
        return ctx.reply('Mining is already in progress!');
    }

    miner.isMining = true;
    ctx.reply('Mining started! You will collect coins every 4 hours.');

    const miningInterval = setInterval(() => {
        if (!miner.isMining) {
            clearInterval(miningInterval);
            return;
        }

        const dt = 4 * 3600; // 4 hours in seconds
        miner.mine(dt);

        if (miner.hardware.autoCollect) {
            const collectedCoins = miner.collectCoins();
            ctx.reply(`Premium Miner: Auto-collected ${collectedCoins} coins. Total Earnings: ${miner.getEarnings().toFixed(2)}`);
        } else {
            const timeSinceLastCollection = (Date.now() - miner.lastCollectionTime) / 1000;
            if (timeSinceLastCollection >= dt) {
                ctx.reply('Time to collect your coins! Use /collect to gather your earnings.');
            }
        }
    }, 4 * 60 * 1000); // Simulate 4 hours every 4 minutes for testing
});

// Collect command
bot.command('collect', (ctx) => {
    const userId = ctx.from.id;
    const miner = miners.get(userId);

    if (!miner) {
        return ctx.reply('Please select hardware first using /basic or /premium.');
    }

    if (miner.hardware.autoCollect) {
        return ctx.reply('Premium hardware auto-collects coins. No need to collect manually!');
    }

    const collectedCoins = miner.collectCoins();
    ctx.reply(`Basic Miner: Collected ${collectedCoins} coins. Total Earnings: ${miner.getEarnings().toFixed(2)}`);
});

// Stop command
bot.command('stop', (ctx) => {
    const userId = ctx.from.id;
    const miner = miners.get(userId);

    if (!miner) {
        return ctx.reply('No mining in progress.');
    }

    miner.isMining = false;
    ctx.reply('Mining stopped.');
});

bot.launch();
console.log('Bot is running...');

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));