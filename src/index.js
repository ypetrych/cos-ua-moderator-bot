'use strict'

const TelegramBot = require('node-telegram-bot-api')
const ms = require('ms')

const { TELEGRAM_BOT_TOKEN } = process.env

if (!TELEGRAM_BOT_TOKEN) {
  console.error('Seems like you forgot to pass Telegram Bot Token. I can not proceed...')
  process.exit(1)
}

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true })

const messages = {}
const restrictionTime = '7 days'

bot.on('message', (msg) => {
  if (msg.text.split(' ').length < 5) return

  const userId = msg.from.id
  const chatId = msg.chat.id

  const startRestrictionDate = Math.round((Date.now() - ms(restrictionTime)) / 1000)
  let messagesByUserId = messages[chatId] && messages[chatId][userId] || []
  const foundMessages = []

  messagesByUserId = messagesByUserId.filter(({ date, text }) => {
    if (date >= startRestrictionDate) {
      foundMessages.push(text)
      return true
    }
  })

  if (!msg.from.is_bot && foundMessages.includes(msg.text)) {
    bot.deleteMessage(chatId, msg.message_id)
    bot.restrictChatMember(chatId, userId,  {
      until_date: Math.round((Date.now() + ms(restrictionTime)) / 1000),
    })
  }

  messages[chatId] = messages[chatId] || {}
  messages[chatId][userId] = messagesByUserId || []
  messages[chatId][userId].push({
    date: msg.date,
    text: msg.text,
  })
})

