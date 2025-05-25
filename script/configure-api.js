const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function configureApi() {
    console.log('🔧 TikTok API Configuration Setup\n');
    
    console.log('To enable real TikTok video downloads, you need a RapidAPI key.');
    console.log('Visit: https://rapidapi.com/yi005/api/tiktok-download-without-watermark\n');
    
    const apiKey = await askQuestion('Enter your RapidAPI key (or press Enter to skip): ');
    
    const envPath = path.join(__dirname, '..', '.env');
    
    if (apiKey.trim()) {
        try {
            // Read current .env file
            let envContent = '';
            if (fs.existsSync(envPath)) {
                envContent = fs.readFileSync(envPath, 'utf8');
            }
            
            // Update or add RAPIDAPI_KEY
            if (envContent.includes('RAPIDAPI_KEY=')) {
                envContent = envContent.replace(/RAPIDAPI_KEY=.*/, `RAPIDAPI_KEY=${apiKey.trim()}`);
            } else {
                envContent += `\nRAPIDAPI_KEY=${apiKey.trim()}`;
            }
            
            // Write back to .env
            fs.writeFileSync(envPath, envContent);
            
            console.log('\n✅ API key configured successfully!');
            console.log('🔄 Please restart the application to apply changes.');
            console.log('📋 Run: npm run dev');
            
        } catch (error) {
            console.error('❌ Error updating .env file:', error.message);
        }
    } else {
        console.log('\n⚠️  No API key provided - application will run in demo mode.');
        console.log('💡 You can configure it later by running: npm run configure-api');
    }
    
    console.log('\n📚 API Configuration Guide:');
    console.log('1. Visit RapidAPI and subscribe to TikTok Download API');
    console.log('2. Copy your API key');
    console.log('3. Run this script or manually edit .env file');
    console.log('4. Restart the application');
    
    rl.close();
}

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

configureApi();