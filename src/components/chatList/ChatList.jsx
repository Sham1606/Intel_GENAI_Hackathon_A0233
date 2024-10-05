import { Link } from "react-router-dom";
import "./chatList.css";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from '@clerk/clerk-react';  // Import Clerk's useAuth hook

const ChatList = () => {
  const { getToken } = useAuth();  // Get the token from Clerk

  const { isPending, error, data } = useQuery({
    queryKey: ["userChats"],
    queryFn: async () => {
      const token = await getToken();  // Get the Clerk session token
      return fetch(`${import.meta.env.VITE_API_URL}/api/userchats`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,  // Attach token to Authorization header
        },
      }).then((res) => res.json());
    },
  });

  return (
    <div className="chatList">
      <span className="title">DASHBOARD</span>
      <Link to="/dashboard">Create a new Chat</Link>
      <Link to="/">Explore GenCraft</Link>
      <Link to="/">Contact</Link>
      <hr />
      <span className="title">RECENT CHATS</span>
      <div className="list">
        {isPending
          ? "Loading..."
          : error
          ? "Something went wrong!"
          : data?.map((chat) => (
              <Link to={`/dashboard/chats/${chat._id}`} key={chat._id}>
                {chat.title}
              </Link>
            ))}
      </div>
      <hr />
      <div className="upgrade">
        <img src="/logo.png" alt="" />
        <div className="texts">
          <span>Upgrade to GenCraft Pro</span>
          <span>Get unlimited access to all features</span>
        </div>
      </div>
    </div>
  );  
};

export default ChatList;
