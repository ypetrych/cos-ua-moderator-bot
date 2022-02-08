'use strict'

const TelegramBot = require('node-telegram-bot-api')
const ms = require('ms')
const fs = require('fs')

const { TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_OWNER } = process.env

if (!TELEGRAM_BOT_TOKEN) {
  console.error('Seems like you forgot to pass Telegram Bot Token. I can not proceed...')
  process.exit(1)
}

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {polling: true})

console.log('### Telegram Bot is up and running! ### ')

const restrictionTime = '7 days'
const maxWhitespacesAllowed = 4
const logFilePath = './log.txt'

const messages = getOldMessages()

bot.on('message', (msg) => {
  if (msg.text.split(' ').length <= maxWhitespacesAllowed) return

  const { from, chat, text, date } = msg

  const userId = from.id
  const chatId = chat.id

  const startRestrictionDate = Math.round((Date.now() - ms(restrictionTime)) / 1000)
  let messagesByUserId = messages[chatId] && messages[chatId][userId] || []
  const foundMessages = []

  messagesByUserId = messagesByUserId.filter(({ date, text }) => {
    if (date >= startRestrictionDate) {
      foundMessages.push(text)
      return true
    }
  })

  if (isRegularUser && foundMessages.includes(text)) {
    handleDuplicatedMessage(msg, chatId, userId)

    saveNewLog(messages)
    return
  }

  messages[chatId] = messages[chatId] || {}
  messages[chatId][userId] = messagesByUserId || []
  messages[chatId][userId].push({
    date,
    text,
  })

  saveNewLog(messages)
})

function handleDuplicatedMessage(msg, chatId, userId) {
  console.log('duplicated message', msg)

  try {
    bot.deleteMessage(chatId, msg.message_id)
    bot.restrictChatMember(chatId, userId, {
      until_date: Math.round((Date.now() + ms(restrictionTime)) / 1000),
    })
  } catch (e) {
    console.log(e)
  }
}

function getOldMessages() {
  const data = fs.readFileSync(logFilePath, { encoding:'utf8', flag:'r' })

  return data ? JSON.parse(data) : {}
}

function saveNewLog(messages) {
  fs.writeFileSync(logFilePath, JSON.stringify(messages), { encoding:'utf8' })
}

function isRegularUser(from) {
  return !from.is_bot
  && from.username !== TELEGRAM_BOT_OWNER
}
