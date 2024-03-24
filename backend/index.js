const express = require('express');
const serverless = require('serverless-http');
const path = require('path');
const app = express();
const port = 3000;

const { Anthropic } = require("@anthropic-ai/sdk");
const dotenv = require('dotenv');
const cors = require('cors');
const fs = require('fs');

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let corsOptions = {
    origin: 'https://tarotell.pages.dev',
    credentials: true
};

app.use(cors(corsOptions));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const systemMessage = fs.readFileSync(path.join(__dirname, 'systemMessage.txt'), 'utf-8');

app.post('/chat', async (req, res) => {
  const { conversationHistory, selectedCards } = req.body;

  if (!conversationHistory || conversationHistory.length === 0) {
    return res.status(400).json({ error: 'Conversation history is required' });
  }

  const maxRetries = 3;
  let retries = 0;
  let response;

  // 선택된 카드 정보를 대화 기록에 추가
  let updatedConversationHistory = [...conversationHistory];
  if (selectedCards && selectedCards.length > 0) {
    const cardMessage = `선택한 카드: ${selectedCards.join(', ')}`;
    updatedConversationHistory.push({ role: 'user', content: cardMessage });
  }

  while (retries < maxRetries) {
    try {
      response = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1000,
        temperature: 0.3,
        system: systemMessage,
        messages: updatedConversationHistory,
      });
      break;
    } catch (error) {
      retries++;
      console.log(error);
      console.log(`Error fetching data, retrying (${retries}/${maxRetries})...`);
    }
  }

  if (!response) {
    return res.status(500).json({ error: 'Failed to get response from Anthropic API' });
  }

  const assistantMessage = response.content[0].text;
  res.json({ response: assistantMessage });
});

  
// app.listen(port, () => {
//   console.log(`Server is running at http://localhost:${port}`);
// });

module.exports.handler = serverless(app);