import { useState, useEffect, useRef } from "react";
import BotIcon from "../../assets/boticon.png";
import HumanIcon from "../../assets/humanicon.png";
import { initializeApp } from "firebase/app";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, child, get, push, set } from "firebase/database";
import { useNavigate } from "react-router-dom";

type Question = {
  id: string;
  question: string;
  answer: string;
  embeddings: number[];
  followups?: { [key: string]: Question };
};

function Chat() {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hi there! How can I assist you today?", sender: "AI" },
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentUserName, setCurrentUserName] = useState("");
  const [recentQuestionId, setRecentQuestionId] = useState<string | null>(null);
  const [mainQuestionId, setMainQuestionId] = useState<string | null>(null);
  const [expectingFollowUp, setExpectingFollowUp] = useState(false);
  const navigate = useNavigate();
  const inactivityTimeout = useRef<number | null>(null); 
  const endOfMessagesRef = useRef<HTMLDivElement>(null); 

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const realtimeDb = getDatabase(app);
  const apiKey = import.meta.env.VITE_GPT_API_KEY;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = ref(realtimeDb, `users/${user.uid}`);
          const snapshot = await get(child(userRef, "name"));
          if (snapshot.exists()) {
            setCurrentUserName(snapshot.val());
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else if (window.location.pathname !== "/signin") {
        navigate("/signin");
      }
    });

    return () => unsubscribe();
  }, [auth, realtimeDb, navigate]);

  const handleSendMessage = async () => {
    if (newMessage.trim() === "") return;

    setIsTyping(true);

    const userMessage = {
      id: messages.length + 1,
      text: newMessage,
      sender: "user",
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setNewMessage("");

    const userQuestion = newMessage.trim();

    try {
      // Compute embeddings for the user's question
        "https://api.openai.com/v1/embeddings",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            input: userQuestion,
            model: "text-embedding-3-small",
          }),
        }
      );
      const embeddingsData = await embeddingsResponse.json();
      const embeddings = embeddingsData.data[0].embedding;

      const similarQuestion = await findSimilarQuestion(
        embeddings,
        mainQuestionId
      );

      if (similarQuestion) {
        const botReply = {
          id: messages.length + 1,
          text: similarQuestion.answer,
          sender: "AI",
        };
        setMessages((prevMessages) => [...prevMessages, botReply]);

        setRecentQuestionId(similarQuestion.id);
      } else {
        const gptMessages = messages.map((msg) => ({
          role: msg.sender === "AI" ? "assistant" : "user",
          content: msg.text,
        }));
        gptMessages.push({ role: "user", content: userQuestion });

        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4",
              messages: gptMessages,
            }),
          }
        );
        const data = await response.json();

        const newQuestionId = await storeQuestion(
          userQuestion,
          data.choices[0].message.content,
          embeddings,
          recentQuestionId !== null,
          mainQuestionId
        );

        const botReply = {
          id: messages.length + 1,
          text: data.choices[0].message.content,
          sender: "AI",
        };
        setMessages((prevMessages) => [...prevMessages, botReply]);

        setRecentQuestionId(newQuestionId);
        if (mainQuestionId === null) {
          setMainQuestionId(newQuestionId);
        }
      }
    } catch (error) {
      console.error("Error generating response:", error);
    } finally {
      setIsTyping(false);
      setNewMessage("");
      setExpectingFollowUp(true);
      resetInactivityTimeout();
      endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  function calculateSimilarity(embeddings1: number[], embeddings2: number[]) {
    let dotProduct = 0;
    for (let i = 0; i < embeddings1.length; i++) {
      dotProduct += embeddings1[i] * embeddings2[i];
    }

    const magnitude1 = Math.sqrt(
      embeddings1.reduce((acc, val) => acc + val * val, 0)
    );
    const magnitude2 = Math.sqrt(
      embeddings2.reduce((acc, val) => acc + val * val, 0)
    );

    const similarity = dotProduct / (magnitude1 * magnitude2);

    return similarity;
  }

  const storeQuestion = async (
    question: string,
    answer: string,
    embeddings: number[],
    isFollowUp = false,
    mainQuestionId: string | null = null
  ): Promise<string | null> => {
    const questionsRef = ref(realtimeDb, "questions");
    const questionRef = mainQuestionId
      ? child(questionsRef, `${mainQuestionId}/followups`)
      : questionsRef;

    const similarQuestion = await findSimilarQuestion(
      embeddings,
      mainQuestionId
    );
    if (similarQuestion) {
      return null; 
    }

    const newQuestionRef = isFollowUp ? push(questionRef) : push(questionsRef);
    await set(newQuestionRef, {
      question,
      answer,
      embeddings,
    });

    return newQuestionRef.key;
  };

  const findSimilarQuestion = async (
    embeddings: number[],
    mainQuestionId: string | null = null
  ): Promise<Question | null> => {
    const questionsRef = ref(realtimeDb, "questions");
    const questionRef = mainQuestionId
      ? child(questionsRef, `${mainQuestionId}/followups`)
      : questionsRef;

    const questionsSnapshot = await get(questionRef);
    const userQuestions = questionsSnapshot.val() || {};

    let mostSimilarQuestion: Question | null = null;
    let highestSimilarity = -1;
    const THRESHOLD = 0.7;

    const checkSimilarity = (questionData: Question) => {
      const questionEmbeddings = questionData.embeddings;
      const similarity = calculateSimilarity(embeddings, questionEmbeddings);
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        mostSimilarQuestion = questionData;
      }
    };

    for (const questionKey in userQuestions) {
      checkSimilarity(userQuestions[questionKey] as Question);
      const followups = userQuestions[questionKey].followups || {};
      for (const followupKey in followups) {
        checkSimilarity(followups[followupKey] as Question);
      }
    }

    if (highestSimilarity >= THRESHOLD) {
      return mostSimilarQuestion;
    }

    return null;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(event.target.value);
    resetInactivityTimeout();
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUserName(""); 
      navigate("/signin");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const resetInactivityTimeout = () => {
    if (inactivityTimeout.current) {
      clearTimeout(inactivityTimeout.current);
    }
    inactivityTimeout.current = window.setTimeout(() => {
      if (newMessage.trim() === "") {
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: prevMessages.length + 1,
            text: "Do you have any follow-up questions or a new topic to discuss?",
            sender: "AI",
          },
        ]);
        setRecentQuestionId(null);
        setExpectingFollowUp(false);
      }
    }, 10000);
  };

  const handleFollowUpResponse = (response: string) => {
    if (response.toLowerCase() === "follow up") {
      setExpectingFollowUp(false);
    } else if (response.toLowerCase() === "new topic") {
      setRecentQuestionId(null);
      setMainQuestionId(null); 
      setExpectingFollowUp(false);
    }
  };

  useEffect(() => {
    resetInactivityTimeout();
    return () => {
      if (inactivityTimeout.current) {
        clearTimeout(inactivityTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const renderBotReply = (text: string) => {
    const lines: string[] = text.split("\n");
    const isList: boolean = lines.some((line: string) =>
      line.trim().match(/^\d+\./)
    );
    const isCodeBlock: boolean = text.includes("```");

    const formattedText = text
      .replace(/\*([^*]+)\*/g, "<strong>$1</strong>")
      .replace(/_([^_]+)_/g, "<em>$1</em>")
      .replace(/~([^~]+)~/g, "<del>$1</del>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");

    if (isList) {
      return (
        <ul className="list-disc pl-6">
          {lines.map((line: string, index: number) => (
            <li
              key={index}
              dangerouslySetInnerHTML={{
                __html: line.replace(/^\d+\.\s*/, ""),
              }}
            />
          ))}
        </ul>
      );
    } else if (isCodeBlock) {
      return (
        <pre className="bg-gray-100 p-2 rounded">
          <code dangerouslySetInnerHTML={{ __html: formattedText }} />
        </pre>
      );
    } else {
      return (
        <p
          className="whitespace-pre-line"
          dangerouslySetInnerHTML={{ __html: formattedText }}
        />
      );
    }
  };

  return (
    <div className="h-screen flex flex-col relative">
      {/* Menu Icon */}
      <div className="bg-gray-800 p-4 flex items-center justify-between z-10">
        <div className="flex items-center">
          <span className="text-white text-lg font-bold">
            {currentUserName ? currentUserName : "POLLON"}
          </span>
        </div>
        <button onClick={toggleMenu} className="text-white focus:outline-none">
          <svg
            className="h-6 w-6"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16m-7 6h7"
            />
          </svg>
        </button>
      </div>
      {/* Menu */}
      {isMenuOpen && (
        <div className="absolute top-16 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-20">
          <ul>
            <li onClick={handleLogout} className="cursor-pointer block">
              LOGOUT
            </li>
          </ul>
        </div>
      )}
      {/* Chat Messages */}
      <div className="flex-grow bg-gray-100 p-4 overflow-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={
              msg.sender === "AI"
                ? "flex justify-start items-center text-black"
                : "flex justify-end items-center text-black"
            }
          >
            {msg.sender === "AI" && (
              <img src={BotIcon} alt="Bot icon" className="h-8 w-8 mr-2" />
            )}
            <div className="bg-white shadow rounded-lg p-2 m-2">
              <p>{renderBotReply(msg.text)}</p>
            </div>
            {msg.sender === "user" && (
              <img src={HumanIcon} alt="User icon" className="h-8 w-8 ml-2" />
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start items-center text-black">
            <img src={BotIcon} alt="Typing icon" className="h-8 w-8 mr-2" />
            <div className="bg-white shadow rounded-lg p-2 m-2">
              <p className="text-sm">Pollon Bot is Typing...</p>
            </div>
          </div>
        )}
        {/* Prompt for follow-up or new topic */}
        {expectingFollowUp && (
          <div className="flex justify-start items-center text-black">
            <img src={BotIcon} alt="Bot icon" className="h-8 w-8 mr-2" />
            <div className="bg-white shadow rounded-lg p-2 m-2">
              <p className="text-sm">
                Is this a follow-up question or a new topic?
              </p>
              <div>
                <button
                  className="bg-blue-500 text-white rounded-md py-1 px-2 m-1"
                  onClick={() => handleFollowUpResponse("follow up")}
                >
                  Follow Up
                </button>
                <button
                  className="bg-green-500 text-white rounded-md py-1 px-2 m-1"
                  onClick={() => handleFollowUpResponse("new topic")}
                >
                  New Topic
                </button>
              </div>
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>
      {/* User input */}
      <div className="bg-gray-200 p-4 flex">
        <textarea
          value={newMessage}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="flex-grow border rounded-md py-2 px-4 mr-2 focus:outline-none"
          placeholder="Type your message..."
        />
        <button
          onClick={handleSendMessage}
          className="bg-blue-500 text-white rounded-md py-2 px-4 focus:outline-none"
          disabled={expectingFollowUp}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default Chat;
