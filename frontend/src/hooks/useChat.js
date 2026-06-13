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

  const sendMessage = async (text, customSender = 'user', currentCode = '', isHidden = false, stepContext = null, isSilent = false) => {
    if (!text.trim()) return;

    // Format user-side display text to show step first, then the user's question below it
    let displayText = text;
    if (stepContext) {
      const cleanStepName = stepContext.name.replace(/\s+added$/i, '');
      displayText = `**${cleanStepName}**\n\n${text}`;
    }

    const userMsg = {
      sender: customSender,
      text: displayText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isHidden,
      isStep: !!stepContext
    };

    if (!isSilent) {
      // Optimistically update standard UI list
      setMessages(prev => [...prev, userMsg]);
      setIsTyping(true);
    }

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
        history: historyList,
        step_id: stepContext?.id || activeStep?.id || null
      });

      // Resolve response text
      let rawText = res.text || res.response || '';
      
      // Check for verification/unlock tag
      let isUnlockedResponse = false;
      if (rawText.includes('[STEP_UNLOCKED]')) {
        isUnlockedResponse = true;
        rawText = rawText.replace('[STEP_UNLOCKED]', '').trim();
      }

      if (!isSilent) {
        setMessages(prev => [...prev, {
          sender: 'ai',
          text: rawText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
      
      if (isUnlockedResponse) {
        const unlockId = stepContext?.id || activeStep?.id;
        if (unlockId) {
          setUnlockedSteps(prev => ({ ...prev, [unlockId]: true }));
        }
      }
      
      // Auto-clear context chips after successful transmission
      clearContexts();
      
      return rawText;
    } catch (err) {
      console.error("AI service communication failure:", err);
      if (!isSilent) {
        setMessages(prev => [...prev, {
          sender: 'ai',
          text: `**AI Service Error:** Failed to get a response from the agent. ${err.message || 'Is your backend running?'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
      return null;
    } finally {
      if (!isSilent) {
        setIsTyping(false);
      }
    }
  };

  const askAgent = (currentCode, customPrompt = null) => {
    const prompt = customPrompt || "Analyze my current code implementation. Detect any bugs, formatting issues, or optimizations.";
    sendMessage(prompt, 'user', currentCode, true);
  };

  const suggestAlternate = (currentCode) => {
    return sendMessage("Provide an alternate, high-performance solution for my implementation.", 'user', currentCode, true);
  };
  
  const findMistake = async (currentCode) => {
    const numberedCode = currentCode.split('\n').map((line, idx) => `${idx + 1} | ${line}`).join('\n');
    const prompt = `Here is my code with line numbers:\n\n${numberedCode}\n\nFind the mistakes in my code. Output NOTHING ELSE except the exact line number of the mistake and the corrected line of code in this exact format: \`[LINE: X] [FIX: <corrected line>]\`. If there are multiple mistakes, return multiple lines of this format. If there is no mistake, return \`[LINE: 0] [FIX: none]\`. DO NOT EXPLAIN. DO NOT SAY ANYTHING ELSE. ONLY return the tags.`;
    return await sendMessage(prompt, 'user', currentCode, false, null, true);
  };

  const suggestTestCases = () => {
    sendMessage(`Suggest additional test cases that I can assert against for the experiment "${experiment?.title}".`, 'user', '', true);
  };

  const verifyCommand = (command, stepId, stepTitle) => {
    const verifyPrompt = `Please verify my command for the step "${stepTitle}". Here is the command I typed:\n\`${command}\`\n\nIs this correct? If yes, confirm and unlock the next step. If not, give me a hint.`;
    const userDisplayMsg = `**Verifying command for: ${stepTitle}**\n\`\`\`\n${command}\n\`\`\``;

    // Add user message directly for display
    setMessages(prev => [...prev, {
      sender: 'user',
      text: userDisplayMsg,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setIsTyping(true);

    // Build step context so step_id is passed in payload
    const fakeStepCtx = { id: stepId, title: stepTitle };
    
    (async () => {
      try {
        const historyList = messages.map(m => ({
          sender: m.sender === 'user' ? 'user' : 'ai',
          text: m.text,
          timestamp: m.timestamp || ''
        }));

        const res = await api.post(`/api/ai/chat/${experiment.id}`, {
          message: verifyPrompt,
          query: verifyPrompt,
          current_code: '',
          history: historyList,
          step_id: stepId
        });

        let rawText = res.text || res.response || '';
        let isUnlocked = false;
        if (rawText.includes('[STEP_UNLOCKED]')) {
          isUnlocked = true;
          rawText = rawText.replace('[STEP_UNLOCKED]', '').trim();
        }

        setMessages(prev => [...prev, {
          sender: 'ai',
          text: rawText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);

        if (isUnlocked) {
          setUnlockedSteps(prev => ({ ...prev, [stepId]: true }));
        }
      } catch (err) {
        setMessages(prev => [...prev, {
          sender: 'ai',
          text: `**Verification Error:** ${err.message || 'Could not reach AI agent.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      } finally {
        setIsTyping(false);
      }
    })();
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
    findMistake,
    suggestTestCases,
    verifyCommand,
    debugStep
  };
};
