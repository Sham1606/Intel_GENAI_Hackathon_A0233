import { useMutation, useQueryClient } from "@tanstack/react-query";
import "./dashboardPage.css";
import { useNavigate } from "react-router-dom";
import { useRef, useState } from "react";

const DashboardPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [file, setFile] = useState(null); // State to handle file input
  const fileInputRef = useRef(null); // Ref for file input
  const [fileType, setFileType] = useState("image/*"); // Default file type
  const [showOptions, setShowOptions] = useState(false); // State to toggle options

  const mutation = useMutation({
    mutationFn: (formData) => {
      return fetch(`${import.meta.env.VITE_API_URL}/api/chats`, {
        method: "POST",
        credentials: "include",
        body: formData, // Sending formData instead of JSON string
      }).then((res) => res.json());
    },
    onSuccess: (id) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["userChats"] });
      navigate(`/dashboard/chats/${id}`);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = e.target.text.value;
    if (!text && !file) return;

    const formData = new FormData(); // FormData object to hold text and file
    if (text) formData.append("text", text);
    if (file) formData.append("file", file); // Append file if available

    mutation.mutate(formData);
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]); // Set the selected file in the state
  };

  const triggerFileInput = () => {
    fileInputRef.current.click(); // Trigger the hidden file input
  };

  const toggleOptions = () => {
    setShowOptions(!showOptions); // Toggle the visibility of the options box
  };

  const handleOptionSelect = (option) => {
    // Set the file type based on the selected option
    switch (option) {
      case "Modify Audio":
        setFileType("audio/*"); // Accept only audio files
        break;
      case "Edit Video":
        setFileType("video/*"); // Accept only video files
        break;
      case "Edit Image":
        setFileType("image/*"); // Accept only image files
        break;
      default:
        setFileType("image/*");
    }
    setShowOptions(false); // Hide the options after selecting
    triggerFileInput(); // Trigger the file input to select a file
  };

  return (
    <div className="dashboardPage">
      <div className="texts">
        <div className="logo">
          <img src="/logo.png" alt="" />
          <h1>GenCraft</h1>
        </div>
        <div className="options">
          <div className="option">
            <img src="/chat.png" alt="" />
            <span>Create a New Chat</span>
          </div>
          <div className="option" onClick={triggerFileInput}>
            <img src="/image.png" alt="" />
            <span>Analyze Images</span>
          </div>
          <div className="option">
            <img src="/code.png" alt="" />
            <span>Help me with my Code</span>
          </div>
        </div>
      </div>
      <div className="formContainer">
        <form onSubmit={handleSubmit}>
          <input type="text" name="text" placeholder="Ask me anything..." />
          <input
            type="file"
            name="file"
            ref={fileInputRef}
            accept={fileType} // Accept the selected file type (image/audio/video)
            onChange={handleFileChange}
            id="fileInput"
            style={{ display: "none" }} // Hide the file input
          />
          <div className="attachmentContainer">
            <img
              src="/attachment.png"
              alt="Attach File"
              className="attachmentIcon"
              onClick={toggleOptions} // Toggle options on click
            />
            {showOptions && (
              <div className="optionsBox">
                <div onClick={() => handleOptionSelect("Modify Audio")}>Modify Audio</div>
                <div onClick={() => handleOptionSelect("Edit Video")}>Edit Video</div>
                <div onClick={() => handleOptionSelect("Edit Image")}>Edit Image</div>
              </div>
            )}
          </div>
          <button>
            <img src="/arrow.png" alt="" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default DashboardPage;
