import { useState } from 'react';
import api from '../utils/api';

export const useChat = (experiment, activeStep = null, code = '') => {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: `Hello! I am your AI Virtual Lab Agent. I am fully integrated with your current experiment: **"${experiment?.title || 'Experiment'}"**. How can I help you succeed today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeContexts, setActiveContexts] = useState([]);
  const [unlockedSteps, setUnlockedSteps] = useState({});

  const addContext = (ctx) => {
    setActiveContexts(prev => {
      if (prev.some(c => c.name === ctx.name)) return prev;
      return [...prev, ctx];
    });
  };

  const removeContext = (index) => {
    setActiveContexts(prev => prev.filter((_, i) => i !== index));
  };

  const clearContexts = () => {
    setActiveContexts([]);
  };

  const sendMessage = async (text, customSender = 'user', currentCode = '', isHidden = false, stepContext = null) => {
    if (!text.trim()) return;

    // Format user-side display text to show step first, then command/question below it
    let displayText = text;
    if (stepContext) {
      const cleanStepName = stepContext.name.replace(/\s+added$/i, '');
      displayText = `🪜 **${cleanStepName}**\n\`\`\`bash\n$ ${text}\n\`\`\``;
    }

    const userMsg = {
      sender: customSender,
      text: displayText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isHidden
    };

    // Optimistically update standard UI list
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      if (!experiment?.id) {
        throw new Error("Experiment context is not loaded yet.");
      }

      // Map chat states to clean message history matching API models
      const historyList = messages.map(m => ({
        sender: m.sender === 'user' ? 'user' : 'ai',
        text: m.text,
        timestamp: m.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));

      // Enrich message sent to API with step context if present
      let textToSend = text;
      if (stepContext) {
        textToSend = `[Context - Active Step: "${stepContext.title}". Instructions: "${stepContext.description}"] Question: ${text}`;
      }

      // Call live Groq contextual chatbot router endpoint
      const res = await api.post(`/api/ai/chat/${experiment.id}`, {
        message: textToSend,
        query: textToSend,
        current_code: currentCode || code || '',
        history: historyList
      });

      // Resolve response text
      let rawText = res.text || res.response || '';
      
      // Check for verification/unlock tag
      let isUnlockedResponse = false;
      if (rawText.includes('[STEP_UNLOCKED]')) {
        isUnlockedResponse = true;
        rawText = rawText.replace('[STEP_UNLOCKED]', '').trim();
      }

      setMessages(prev => [...prev, {
        sender: 'ai',
        text: rawText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      
      if (isUnlockedResponse) {
        const unlockId = stepContext?.id || activeStep?.id;
        if (unlockId) {
          setUnlockedSteps(prev => ({ ...prev, [unlockId]: true }));
        }
      }
      
      // Auto-clear context chips after successful transmission
      clearContexts();
    } catch (err) {
      console.error("AI service communication failure:", err);
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: `⚠️ **AI Service Error:** Failed to get a response from the agent. ${err.message || 'Is your backend running?'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const askAgent = (currentCode, customPrompt = null) => {
    const prompt = customPrompt || "Analyze my current code implementation. Detect any bugs, formatting issues, or optimizations.";
    sendMessage(prompt, 'user', currentCode, true);
  };

  const suggestAlternate = (currentCode) => {
    sendMessage("Provide an alternate, high-performance solution for my implementation.", 'user', currentCode, true);
  };

  const suggestTestCases = () => {
    sendMessage(`Suggest additional test cases that I can assert against for the experiment "${experiment?.title}".`, 'user', '', true);
  };

  const truncateTitle = (title, maxWords = 5) => {
    const words = title.split(' ');
    if (words.length <= maxWords) return title;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  const debugStep = (stepTitle, stepDesc, stepIndex = null, stepId = null) => {
    const cleanTitle = stepTitle.replace(/^Step\s+\d+:?\s*/i, '');
    const shortTitle = truncateTitle(cleanTitle, 5);
    const name = stepIndex !== null ? `Step ${stepIndex + 1}: ${shortTitle} added` : `${shortTitle} added`;
    setActiveContexts([{ 
      type: 'step', 
      name, 
      title: stepTitle, 
      description: stepDesc,
      id: stepId
    }]);
  };

  return {
    messages,
    isTyping,
    activeContexts,
    unlockedSteps,
    removeContext,
    sendMessage,
    askAgent,
    suggestAlternate,
    suggestTestCases,
    debugStep
  };
};
