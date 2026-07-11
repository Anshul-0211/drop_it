import { getWebhookInfo, setWebhook, deleteWebhook } from '../lib/telegram/telegramApi';

async function main() {
  const args = process.argv.slice(2);
  const action = args[0]?.toLowerCase() || 'status';

  console.log(`Telegram Bot Token: ${process.env.TELEGRAM_BOT_TOKEN ? 'Loaded' : 'MISSING'}`);
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('Error: TELEGRAM_BOT_TOKEN is not set in environment.');
    process.exit(1);
  }

  if (action === 'status') {
    console.log('\nFetching current webhook configuration from Telegram...');
    try {
      const info = await getWebhookInfo();
      console.log('Webhook Status Response:', JSON.stringify(info, null, 2));
      
      const mode = process.env.TELEGRAM_MODE || 'polling (default in dev)';
      console.log(`\nLocal Configured Mode (TELEGRAM_MODE): "${mode}"`);
      if (info?.result?.url) {
        console.log(`🤖 Active Webhook: ${info.result.url}`);
        console.log('⚠️  Note: Polling will NOT work while a webhook is active on Telegram. Run "npm run webhook delete" if you want to use local polling.');
      } else {
        console.log('🤖 Active Webhook: NONE (Bot is in Polling/GetUpdates mode)');
      }
    } catch (err) {
      console.error('Failed to get webhook info:', err);
    }
  } 
  
  else if (action === 'set') {
    const url = args[1] || process.env.TELEGRAM_WEBHOOK_URL;
    if (!url || url.includes('yourdomain.com')) {
      console.error('\nError: Please provide a valid public URL. Example:');
      console.error('npx tsx scripts/manage-webhook.ts set https://your-vercel-app.vercel.app/api/telegram/webhook\n');
      process.exit(1);
    }

    console.log(`\nRegistering webhook URL: ${url}`);
    try {
      await setWebhook(url);
      console.log('Webhook set request completed. Run status command to verify.');
    } catch (err) {
      console.error('Failed to set webhook:', err);
    }
  } 
  
  else if (action === 'delete') {
    console.log('\nDeleting Telegram Webhook registration...');
    try {
      await deleteWebhook(true);
      console.log('Webhook deleted successfully. You can now use local Polling mode.');
    } catch (err) {
      console.error('Failed to delete webhook:', err);
    }
  } 
  
  else {
    console.log('\nUsage:');
    console.log('  npx tsx scripts/manage-webhook.ts status        - Show current status');
    console.log('  npx tsx scripts/manage-webhook.ts set <url>     - Register a webhook URL');
    console.log('  npx tsx scripts/manage-webhook.ts delete        - Unregister webhook (switch back to polling)');
  }
}

main().catch(console.error);
