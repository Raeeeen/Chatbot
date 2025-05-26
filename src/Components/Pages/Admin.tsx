import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signOut } from "firebase/auth";
import BotIcon from "../../assets/boticon.png";
import HumanIcon from "../../assets/humanicon.png";
import { getDatabase, ref, get, onValue, set } from "firebase/database";

interface User {
  uid: string;
  email: string;
  name: string;
}

function Admin() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>(
    []
  );
  const [newUserQuestion, setNewUserQuestion] = useState("");
  const [newBotAnswer, setNewBotAnswer] = useState("");
  const [userQuestions, setUserQuestions] = useState<string[]>([]);
  const [selectedQuestionIndex, setSelectedQuestionIndex] =
    useState<number>(-1);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getDatabase(app);

  interface UserData {
    uid: string;
    name: string;
  }

  useEffect(() => {
    const retrieveUsersData = async () => {
      try {
        const usersRef = ref(db, "users");

        onValue(usersRef, (snapshot) => {
          if (snapshot.exists()) {
            const usersData: UserData[] = [];
            snapshot.forEach((userSnapshot) => {
              const userData = userSnapshot.val();
              const uid = userSnapshot.key;
              const name = userData.name;
              usersData.push({ uid, name });
            });
            setUsers(usersData);
            console.log(
              "Retrieved user names:",
              usersData.map((user) => user.name)
            );
          } else {
            console.log("No users found in the database");
          }
        });
      } catch (error: any) {
        console.error("Error retrieving user data:", error.message);
      }
    };

    retrieveUsersData();

  }, [db]);

  useEffect(() => {
    const retrieveUserQuestions = async () => {
      if (!db || !selectedUser) return;

      try {
        const questionsRef = ref(db, "questions");

        onValue(questionsRef, (snapshot) => {
          const questionsData = snapshot.val();
          if (questionsData) {
            const userQuestionsData = Object.keys(questionsData).filter(
              (key) => questionsData[key].userId === selectedUser.uid
            );
            setUserQuestions(userQuestionsData);
          } else {
            console.log("No user questions found for selected user");
          }
        });
      } catch (error: any) {
        console.error("Error retrieving user questions:", error.message);
      }
    };

    retrieveUserQuestions();

    return () => {};
  }, [db, selectedUser]);

  useEffect(() => {
    const retrieveBotAnswer = async () => {
      if (!selectedUser || selectedQuestionIndex === -1) return;
      try {
        const question = userQuestions[selectedQuestionIndex];
        const questionRef = ref(db, `questions/${question}`);
        const snapshot = await get(questionRef);
        if (snapshot.exists()) {
          const botAnswerData = snapshot.val().pollonAnswer;
          setNewBotAnswer(botAnswerData);
        } else {
          console.log("No bot answer found for selected question");
        }
      } catch (error: any) {
        console.error("Error retrieving bot answer:", error.message);
      }
    };

    retrieveBotAnswer();
  }, [db, selectedUser, userQuestions, selectedQuestionIndex]);

  const handleUserSelect = (userData: User) => {
    setSelectedUser(userData);
    setSelectedQuestionIndex(-1);
    setMessages([]); 
  };

  const handleQuestionSelect = (index: number) => {
    setSelectedQuestionIndex(index);
    setNewUserQuestion(userQuestions[index]);
  };

  const sendMessage = async () => {
    if (!selectedUser || selectedQuestionIndex === -1) return;

    try {
      const question = userQuestions[selectedQuestionIndex];
      const questionRef = ref(db, `questions/${question}`);

      // Retrieve existing question data including embeddings
      const snapshot = await get(questionRef);
      const existingData = snapshot.val();

      if (existingData) {
        const currentDate = new Date();
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const userid = auth.currentUser?.uid;

        const formattedDate = currentDate.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
          hour12: true,
          timeZone: timeZone, 
        });

        await set(questionRef, {
          ...existingData, 
          pollonAnswer: newBotAnswer,
          timestamp: formattedDate,
          userId: userid,
        });

        setNewBotAnswer("");
      } else {
        console.log("Question not found:", question);
      }
    } catch (error: any) {
      console.error("Error sending message:", error.message);
    }
  };

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        window.location.href = "/signin";
      })
      .catch((error) => {
        console.error("Error logging out:", error.message);
      });
  };

  return (
    <div className="flex h-screen">
      {/* Left Panel */}
      <div
        className={`w-1/4 bg-gray-200 text-black p-4 flex flex-col overflow-y-auto ${
          isLeftPanelOpen ? "block" : "hidden"
        }`}
      >
        <div>
          <h2 className="text-lg font-bold mb-4">USERS</h2>
          <ul>
            {users.map((user) => (
              <li
                key={user.uid}
                className={`p-2 cursor-pointer rounded-md ${
                  user.uid === selectedUser?.uid ? "bg-blue-200" : ""
                }`}
                onClick={() =>
                  handleUserSelect({
                    uid: user.uid,
                    email: "",
                    name: user.name,
                  })
                }
              >
                <span>{user.name}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white rounded-md py-2 px-4 mt-auto focus:outline-none"
        >
          Logout
        </button>
      </div>
      {/* Button to toggle left panel on mobile */}
      <div className="flex justify-center md:hidden">
        <button
          onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
          className="bg-gray-200 text-black rounded-md py-2 px-4 mt-auto focus:outline-none"
        >
          {isLeftPanelOpen ? "Hide" : "Show"} Users
        </button>
      </div>
      {/* Main section */}
      <div className="flex-grow p-4 overflow-y-auto">
        {/* Selected user's name */}
        {selectedUser && (
          <div className="mb-4">
            <h2 className="text-lg font-bold">
              Selected User: {selectedUser.name}
            </h2>
          </div>
        )}

        {/* Chat messages */}
        {selectedUser ? (
          <div className="flex flex-col h-full">
            <div className="overflow-auto flex-grow-1">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`mb-2 flex ${
                    message.sender === "User" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div className="flex items-center">
                    <img
                      src={message.sender === "User" ? BotIcon : HumanIcon}
                      alt={message.sender}
                      className="w-8 h-8 mr-2"
                    />
                    <div
                      className={`inline-block p-2 rounded-md ${
                        message.sender === "User"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-black" // Change text color for user messages
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Right panel for displaying user questions */}
            {selectedUser && (
              <div className="flex-grow border rounded-md py-2 px-4 mr-2 focus:outline-none">
                <h2 className="text-lg font-bold mb-4">USER QUESTIONS</h2>
                <ul>
                  {userQuestions.map((question, index) => (
                    <li
                      key={index}
                      className={`p-2 cursor-pointer rounded-md ${
                        index === selectedQuestionIndex
                          ? "bg-blue-200 text-black"
                          : ""
                      }`}
                      onClick={() => handleQuestionSelect(index)}
                    >
                      <span>{question}</span>
                    </li>
                  ))}
                </ul>
                {/* Display selected question's bot answer */}
                {selectedQuestionIndex !== -1 && (
                  <div className="mt-4">
                    <h2 className="text-lg font-bold mb-2">BOT ANSWER</h2>
                    <div>{newBotAnswer}</div>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center mt-4">
              <input
                type="text"
                value={newUserQuestion}
                readOnly
                className="flex-grow border rounded-md py-2 px-4 mr-2 focus:outline-none"
                placeholder="USER QUESTION"
              />
              <input
                type="text"
                value={newBotAnswer}
                onChange={(e) => setNewBotAnswer(e.target.value)}
                className="flex-grow border rounded-md py-2 px-4 mr-2 focus:outline-none"
                placeholder="BOT ANSWER"
              />
              <button
                onClick={sendMessage}
                className="bg-blue-500 text-white rounded-md py-2 px-4 focus:outline-none"
              >
                Send
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500">
            Select a user to start chatting
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;
